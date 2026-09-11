# Verifies .mcp.json itself: initialize + tools/list using only values read from that file.
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$srv = (Get-Content (Join-Path $dir '.mcp.json') -Raw | ConvertFrom-Json).mcpServers.n8n
$hdr = @{ Authorization = $srv.headers.Authorization; Accept = 'application/json, text/event-stream' }

function Send($body) {
  $r = Invoke-WebRequest -Uri $srv.url -Method Post -Headers $hdr -ContentType 'application/json' `
       -Body ($body | ConvertTo-Json -Depth 6 -Compress) -UseBasicParsing
  $txt = $r.Content
  if ($txt -match '(?m)^data:\s*(.+)$') { $txt = $Matches[1] }   # unwrap SSE
  ,($txt | ConvertFrom-Json), $r.Headers['Mcp-Session-Id']
}

$init, $sid = Send @{ jsonrpc='2.0'; id=1; method='initialize'; params=@{
  protocolVersion='2025-06-18'; capabilities=@{}; clientInfo=@{ name='verify'; version='1.0.0' } } }
if ($sid) { $hdr['Mcp-Session-Id'] = $sid }
$hdr['MCP-Protocol-Version'] = $init.result.protocolVersion

$tools, $null = Send @{ jsonrpc='2.0'; id=2; method='tools/list'; params=@{} }

$ok = [bool]$init.result -and @($tools.result.tools).Count -gt 0
@{ config = '.mcp.json'; url = $srv.url; authenticated = $ok
   protocolVersion = $init.result.protocolVersion
   serverInfo = "$($init.result.serverInfo.name) $($init.result.serverInfo.version)"
   tool_count = @($tools.result.tools).Count } | ConvertTo-Json -Compress
if (-not $ok) { exit 1 }
