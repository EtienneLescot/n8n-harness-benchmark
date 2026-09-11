param(
  [string]$Action = "validate",
  [string]$CodeFile = ""
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

$codePath = Join-Path $scriptDir $CodeFile
$rawCode = Get-Content -LiteralPath $codePath -Raw
$code = "$rawCode"

$negotiated = $null
$sessionId = $null
foreach ($pv in @("2025-06-18","2025-03-26","2024-11-05")) {
  $initBody = @{ jsonrpc = "2.0"; id = 1; method = "initialize"; params = @{ protocolVersion = $pv; capabilities = @{}; clientInfo = @{ name = "native-mcp-helper"; version = "1.0.0" } } }
  $r = Invoke-McpPost -Url $url -Token $token -BodyObj $initBody
  if ($r.status -ge 200 -and $r.status -lt 300 -and $r.parsed -ne $null -and $r.parsed.result) {
    if ($r.parsed.result.protocolVersion) { $negotiated = [string]$r.parsed.result.protocolVersion } else { $negotiated = $pv }
    $sessionId = $r.sessionId
    break
  }
}
$notif = @{ jsonrpc = "2.0"; method = "notifications/initialized" }
[void](Invoke-McpPost -Url $url -Token $token -BodyObj $notif -SessionId $sessionId -ProtocolVersion $negotiated)

$toolName = "validate_workflow"
if ($Action -eq "create") { $toolName = "create_workflow_from_code" }
$callBody = @{ jsonrpc = "2.0"; id = 3; method = "tools/call"; params = @{ name = $toolName; arguments = @{ code = $code } } }
$cr = Invoke-McpPost -Url $url -Token $token -BodyObj $callBody -SessionId $sessionId -ProtocolVersion $negotiated
$p = $cr.parsed
if ($p -ne $null -and $p.result -and $p.result.content) {
  foreach ($c in $p.result.content) { if ($c.text) { Write-Output ([string]$c.text) } }
} elseif ($p -ne $null -and $p.error) {
  Write-Output (@{ error = [string]$p.error.message } | ConvertTo-Json -Compress)
} else {
  $raw = [string]$cr.raw
  if ($raw.Length -gt 15000) { $raw = $raw.Substring(0,15000) + "...TRUNCATED..." }
  Write-Output $raw
}
