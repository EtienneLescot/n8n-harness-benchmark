# Native MCP helper

A usable caller for n8n's native MCP server. n8n documents only how to configure an existing
MCP client and gives no HTTP or JSON-RPC example, so an agent handed only `.mcp.json` has no
documented path at all. Seed this into the branch B sandbox before its installer runs.

## Which file to copy

- **`mcp_call.mjs`** — Node, no dependencies, runs wherever the harness runs. **Use this one
  unless you need the PowerShell variants below.** It is what makes the benchmark reproducible
  on Linux and macOS.

  ```bash
  node mcp_call.mjs                                    # list the tools
  node mcp_call.mjs search_nodes '{"queries":["gmail"]}'
  ```

  It reads `N8N_NATIVE_MCP_URL` and `N8N_NATIVE_MCP_TOKEN` from the `.env` beside it, negotiates
  the protocol version newest first, and unwraps SSE frames. Call it from the sandbox root.

- **`native_mcp.ps1`, `mcp_call.ps1`, `mcp_code.ps1`, `mcp_validate_nodes.ps1`** — the Windows
  originals, kept because they carry fixes worth not relearning and cover two jobs the Node
  helper does not: `mcp_code.ps1` (validate and create a workflow from code) and
  `mcp_validate_nodes.ps1` (per-node config validation).

## The PowerShell fixes, kept on the record

Battle-tested in `run_opencode_1` after 3 scaffolding defects cost ~420 s of timeouts:

- `Add-Type System.Net.Http` (Windows PowerShell 5.1 has no HttpClient type by default).
- SSE `data:` unwrapping before JSON parse; protocol negotiation 2025-06-18 → 2025-03-26 → 2024-11-05.
- Never pipe `Get-Content -Raw` output directly into `ConvertTo-Json` (ETS wrapper serializes to megabytes and hangs): `$code = "$rawCode"` first.
- Never name a function parameter `$Args` (collides with the automatic variable): `$ToolArgs` / explicit names.
- No run-specific defaults: `-CodeFile` / `-WorkflowId` are required per run (empty default fails fast instead of validating a stale workflow).

Files: `native_mcp.ps1` (readiness: initialize + tools/list), `mcp_call.ps1` (generic tools/call), `mcp_code.ps1` (validate_workflow / create_workflow_from_code), `mcp_validate_nodes.ps1` (validate_node_config per node).
