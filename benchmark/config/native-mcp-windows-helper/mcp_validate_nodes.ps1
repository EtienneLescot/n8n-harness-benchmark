param(
  [string]$WorkflowId = ""
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
  param([string]$Url,[string]$Token,[object]$BodyObj,[string]$SessionId,[string]$ProtocolVersion)
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
    $raw = ""
    try { $raw = $resp.Content.ReadAsStringAsync().GetAwaiter().GetResult() } catch { $raw = "" }
    $sidOut = $null
    try { if ($resp.Headers.Contains("Mcp-Session-Id")) { $sidOut = @($resp.Headers.GetValues("Mcp-Session-Id"))[0] } } catch { }
    $parsed = Parse-McpBody -Raw $raw
    return @{ parsed = $parsed; sessionId = $sidOut; raw = $raw }
  } finally { $client.Dispose(); $handler.Dispose() }
}

function Invoke-Tool {
  param([string]$Url,[string]$Token,[string]$Sid,[string]$Pv,[string]$Name,[object]$ToolArgs)
  $body = @{ jsonrpc = "2.0"; id = 3; method = "tools/call"; params = @{ name = $Name; arguments = $ToolArgs } }
  $r = Invoke-McpPost -Url $Url -Token $Token -BodyObj $body -SessionId $Sid -ProtocolVersion $Pv
  return $r.parsed
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$envMap = Load-DotEnv -Path (Join-Path $scriptDir ".env")
$url = $envMap["N8N_NATIVE_MCP_URL"]
$token = $envMap["N8N_NATIVE_MCP_TOKEN"]

$negotiated = $null
$sessionId = $null
foreach ($pv in @("2025-06-18","2025-03-26","2024-11-05")) {
  $initBody = @{ jsonrpc = "2.0"; id = 1; method = "initialize"; params = @{ protocolVersion = $pv; capabilities = @{}; clientInfo = @{ name = "native-mcp-helper"; version = "1.0.0" } } }
  $r = Invoke-McpPost -Url $url -Token $token -BodyObj $initBody
  if ($r.parsed -ne $null -and $r.parsed.result) {
    if ($r.parsed.result.protocolVersion) { $negotiated = [string]$r.parsed.result.protocolVersion } else { $negotiated = $pv }
    $sessionId = $r.sessionId
    break
  }
}
$notif = @{ jsonrpc = "2.0"; method = "notifications/initialized" }
[void](Invoke-McpPost -Url $url -Token $token -BodyObj $notif -SessionId $sessionId -ProtocolVersion $negotiated)

$details = Invoke-Tool -Url $url -Token $token -Sid $sessionId -Pv $negotiated -Name "get_workflow_details" -ToolArgs @{ workflowId = "$WorkflowId" }
if ($details.error) { Write-Output (("DETAILS-ERROR:" + [string]$details.error.message)); exit 0 }
$wfText = ""
foreach ($c in $details.result.content) { if ($c.text) { $wfText = "$($wfText)$([string]$c.text)" } }
Write-Output ("WFTEXT-LEN:" + $wfText.Length.ToString())
$wfObj = ($wfText | ConvertFrom-Json)
Write-Output ("WFID:" + [string]$wfObj.workflow.id)
$nodes = $wfObj.workflow.nodes
$nc = 0
if ($nodes -ne $null) { $nc = @($nodes).Count }
Write-Output ("NODES:" + $nc.ToString())
$val = Invoke-Tool -Url $url -Token $token -Sid $sessionId -Pv $negotiated -Name "validate_node_config" -ToolArgs @{ nodes = $nodes }
if ($val.error) { Write-Output (("VALIDATE-ERROR:" + [string]$val.error.message)); exit 0 }
foreach ($c in $val.result.content) { if ($c.text) { Write-Output ([string]$c.text) } }
