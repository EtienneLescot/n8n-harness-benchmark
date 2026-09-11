param(
  [string]$Action = "readiness"
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
  # SSE form: lines starting with data:
  if ($Raw -match "(?m)^data:\s*") {
    $objs = @()
    foreach ($m in [regex]::Matches($Raw, "(?m)^data:\s*(.+)\s*$")) {
      $d = $m.Groups[1].Value.Trim()
      if ($d -eq "[DONE]") { continue }
      try { $objs += ($d | ConvertFrom-Json) } catch { }
    }
    if ($objs.Count -eq 1) { return $objs[0] }
    if ($objs.Count -gt 1) {
      # prefer object with result or id
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
    $client.Timeout = [TimeSpan]::FromSeconds(30)
    $client.DefaultRequestHeaders.Accept.Clear()
    $client.DefaultRequestHeaders.Accept.Add((New-Object System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json")))
    $client.DefaultRequestHeaders.Accept.Add((New-Object System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("text/event-stream")))
    $client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $Token)
    if ($SessionId) { $client.DefaultRequestHeaders.Add("Mcp-Session-Id", $SessionId) }
    if ($ProtocolVersion) { $client.DefaultRequestHeaders.Add("MCP-Protocol-Version", $ProtocolVersion) }
    $json = ($BodyObj | ConvertTo-Json -Depth 10 -Compress)
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
  $out = @{ authenticated = $false; initialize = "fail"; tools_list = "fail"; tool_count = 0; error = "missing N8N_NATIVE_MCP_URL or N8N_NATIVE_MCP_TOKEN in .env" }
  $out | ConvertTo-Json -Depth 5 -Compress
  exit 1
}

$clientVersions = @("2025-06-18", "2025-03-26", "2024-11-05")
$initOk = $false
$initParsed = $null
$negotiated = $null
$sessionId = $null
$lastStatus = 0
$lastError = $null

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
    $lastStatus = $r.status
    if ($r.status -eq 401 -or $r.status -eq 403) {
      $lastError = "http_$($r.status)"
      break
    }
    $p = $r.parsed
    if ($r.status -ge 200 -and $r.status -lt 300 -and $p -ne $null -and $p.result) {
      $initOk = $true
      $initParsed = $p
      if ($p.result.protocolVersion) { $negotiated = [string]$p.result.protocolVersion } else { $negotiated = $pv }
      $sessionId = $r.sessionId
      break
    } else {
      # keep trying next version; capture error text without secrets
      $msg = ""
      if ($p -ne $null -and $p.error) { $msg = [string]$p.error.message }
      $lastError = "init_status_$($r.status)_$msg"
    }
  } catch {
    $lastError = [string]$_.Exception.Message
  }
}

if (-not $initOk) {
  $auth = $false
  if ($lastStatus -eq 401 -or $lastStatus -eq 403) { $auth = $false } else { $auth = $false }
  $out = @{ authenticated = $auth; initialize = "fail"; tools_list = "fail"; tool_count = 0; error = [string]$lastError; http_status = $lastStatus }
  $out | ConvertTo-Json -Depth 5 -Compress
  exit 1
}

# notifications/initialized (fire-and-forget, ignore errors)
try {
  $notif = @{ jsonrpc = "2.0"; method = "notifications/initialized" }
  [void](Invoke-McpPost -Url $url -Token $token -BodyObj $notif -SessionId $sessionId -ProtocolVersion $negotiated)
} catch { }

# tools/list
$toolsOk = $false
$toolCount = 0
$toolsError = $null
$toolsStatus = 0
try {
  $tlBody = @{ jsonrpc = "2.0"; id = 2; method = "tools/list"; params = @{} }
  $tr = Invoke-McpPost -Url $url -Token $token -BodyObj $tlBody -SessionId $sessionId -ProtocolVersion $negotiated
  $toolsStatus = $tr.status
  $tp = $tr.parsed
  if ($tr.status -ge 200 -and $tr.status -lt 300 -and $tp -ne $null -and $tp.result -and $tp.result.tools) {
    $toolsOk = $true
    $toolCount = @($tp.result.tools).Count
    if ($null -ne $tr.sessionId -and [string]::IsNullOrWhiteSpace($sessionId)) { $sessionId = $tr.sessionId }
  } else {
    if ($tp -ne $null -and $tp.error) { $toolsError = [string]$tp.error.message } else { $toolsError = "tools_list_status_$($tr.status)" }
  }
} catch {
  $toolsError = [string]$_.Exception.Message
}

$authenticated = ($initOk -and $toolsOk)
$out = @{
  authenticated = $authenticated
  initialize = $(if ($initOk) { "ok" } else { "fail" })
  tools_list = $(if ($toolsOk) { "ok" } else { "fail" })
  tool_count = $toolCount
  protocolVersion = [string]$negotiated
}
if ($toolsError -and -not $toolsOk) { $out["error"] = [string]$toolsError }
$out | ConvertTo-Json -Depth 5 -Compress
if (-not $authenticated) { exit 1 }
