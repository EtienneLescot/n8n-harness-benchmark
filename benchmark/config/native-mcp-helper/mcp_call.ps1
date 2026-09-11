param(
  [string]$ToolName = "__list",
  [string]$ArgumentsJson = "{}"
)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Net.Http

function Load-DotEnv {
  param([string]$Path)
  $map = @{}
  if (-not (Test-Path -LiteralPath $Path)) { return $map }
  foreach ($line in (Get-Content -LiteralPath $Path)) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $t = $line.Trim()
    if ($t.StartsWith("#")) { continue }
    $idx = $t.IndexOf("=")
    if ($idx -lt 1) { continue }
    $k = $t.Substring(0, $idx).Trim()
    $v = $t.Substring($idx + 1).Trim()
    if ($v.Length -ge 2 -and (($v.StartsWith('"') -and $v.EndsWith('"')) -or ($v.StartsWith("'") -and $v.EndsWith("'")))) {
      $v = $v.Substring(1, $v.Length - 2)
    }
    $map[$k] = $v
  }
  return $map
}

function Parse-McpBody {
  param([string]$Raw)
  if ([string]::IsNullOrWhiteSpace($Raw)) { return $null }
  if ($Raw -match "(?m)^data:\s*") {
    $objs = @()
    foreach ($m in [regex]::Matches($Raw, "(?m)^data:\s*(.+)\s*$")) {
      $d = $m.Groups[1].Value.Trim()
      if ($d -eq "[DONE]") { continue }
      try { $objs += ($d | ConvertFrom-Json) } catch { }
    }
    if ($objs.Count -eq 1) { return $objs[0] }
    if ($objs.Count -gt 1) {
      foreach ($o in $objs) { if ($o.result) { return $o } }
      return $objs[0]
    }
    return $null
  }
  try { return ($Raw | ConvertFrom-Json) } catch { return $null }
}

function Invoke-McpPost {
  param(
    [string]$Url,
    [string]$Token,
    [object]$BodyObj,
    [string]$SessionId,
    [string]$ProtocolVersion
  )
  $handler = New-Object System.Net.Http.HttpClientHandler
  $client = New-Object System.Net.Http.HttpClient($handler)
  try {
    $client.Timeout = [TimeSpan]::FromSeconds(60)
    $client.DefaultRequestHeaders.Accept.Clear()
    $client.DefaultRequestHeaders.Accept.Add((New-Object System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json")))
    $client.DefaultRequestHeaders.Accept.Add((New-Object System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("text/event-stream")))
    $client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $Token)
    if ($SessionId) { $client.DefaultRequestHeaders.Add("Mcp-Session-Id", $SessionId) }
    if ($ProtocolVersion) { $client.DefaultRequestHeaders.Add("MCP-Protocol-Version", $ProtocolVersion) }
    $json = ($BodyObj | ConvertTo-Json -Depth 20 -Compress)
    $content = New-Object System.Net.Http.StringContent($json, [System.Text.Encoding]::UTF8, "application/json")
    $resp = $client.PostAsync($Url, $content).GetAwaiter().GetResult()
    $status = [int]$resp.StatusCode
    $raw = ""
    try { $raw = $resp.Content.ReadAsStringAsync().GetAwaiter().GetResult() } catch { $raw = "" }
    $sidOut = $null
    try {
      if ($resp.Headers.Contains("Mcp-Session-Id")) { $sidOut = @($resp.Headers.GetValues("Mcp-Session-Id"))[0] }
      if (-not $sidOut -and $resp.Headers.Contains("mcp-session-id")) { $sidOut = @($resp.Headers.GetValues("mcp-session-id"))[0] }
    } catch { }
    $parsed = Parse-McpBody -Raw $raw
    return @{ status = $status; raw = $raw; parsed = $parsed; sessionId = $sidOut }
  } finally {
    $client.Dispose()
    $handler.Dispose()
  }
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $scriptDir ".env"
$envMap = Load-DotEnv -Path $envFile
$url = $envMap["N8N_NATIVE_MCP_URL"]
$token = $envMap["N8N_NATIVE_MCP_TOKEN"]
if ([string]::IsNullOrWhiteSpace($url) -or [string]::IsNullOrWhiteSpace($token)) {
  Write-Output '{"error":"missing env"}'
  exit 1
}

$clientVersions = @("2025-06-18", "2025-03-26", "2024-11-05")
$initOk = $false
$negotiated = $null
$sessionId = $null
foreach ($pv in $clientVersions) {
  $initBody = @{
    jsonrpc = "2.0"
    id = 1
    method = "initialize"
    params = @{
      protocolVersion = $pv
      capabilities = @{}
      clientInfo = @{ name = "native-mcp-helper"; version = "1.0.0" }
    }
  }
  try {
    $r = Invoke-McpPost -Url $url -Token $token -BodyObj $initBody
    $p = $r.parsed
    if ($r.status -ge 200 -and $r.status -lt 300 -and $p -ne $null -and $p.result) {
      $initOk = $true
      if ($p.result.protocolVersion) { $negotiated = [string]$p.result.protocolVersion } else { $negotiated = $pv }
      $sessionId = $r.sessionId
      break
    }
  } catch { }
}
if (-not $initOk) { Write-Output '{"error":"init failed"}'; exit 1 }

try {
  $notif = @{ jsonrpc = "2.0"; method = "notifications/initialized" }
  [void](Invoke-McpPost -Url $url -Token $token -BodyObj $notif -SessionId $sessionId -ProtocolVersion $negotiated)
} catch { }

if ($ToolName -eq "__list") {
  $tlBody = @{ jsonrpc = "2.0"; id = 2; method = "tools/list"; params = @{} }
  $tr = Invoke-McpPost -Url $url -Token $token -BodyObj $tlBody -SessionId $sessionId -ProtocolVersion $negotiated
  $p = $tr.parsed
  $names = @()
  try {
    if ($p.result.tools) { foreach ($t in $p.result.tools) { $names += [string]$t.name } }
    elseif ($p.result) { $names += "result-no-tools-field" }
  } catch { $names += "parse-error" }
  ($names | ConvertTo-Json -Compress) | Write-Output
  exit 0
}

$argsObj = @{}
if (-not [string]::IsNullOrWhiteSpace($ArgumentsJson)) {
  try { $argsObj = ($ArgumentsJson | ConvertFrom-Json) } catch { $argsObj = @{} }
}
# Convert PSCustomObject to hashtable recursively via JSON roundtrip is fine; keep as object
$callBody = @{ jsonrpc = "2.0"; id = 3; method = "tools/call"; params = @{ name = $ToolName; arguments = $argsObj } }
$cr = Invoke-McpPost -Url $url -Token $token -BodyObj $callBody -SessionId $sessionId -ProtocolVersion $negotiated
$p = $cr.parsed
try {
  if ($p -ne $null -and $p.result -and $p.result.content) {
    $texts = @()
    foreach ($c in $p.result.content) {
      if ($c.text) { $texts += [string]$c.text }
    }
    $joined = ($texts -join "`n---CONTENT---`n")
    Write-Output $joined
    exit 0
  }
  if ($p -ne $null -and $p.error) {
    Write-Output (@{ error = [string]$p.error.message } | ConvertTo-Json -Compress)
    exit 0
  }
} catch { }
$raw = [string]$cr.raw
if ($raw.Length -gt 15000) { $raw = $raw.Substring(0,15000) + "...TRUNCATED..." }
Write-Output $raw
