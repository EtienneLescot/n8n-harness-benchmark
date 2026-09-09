# Native MCP Windows helper (reference, fixed)

Battle-tested in `run_opencode_1` after 3 scaffolding defects cost ~420 s of timeouts. Future Windows installers/builders: copy these into the sandbox, point at the sandbox-local `.env`, pass explicit arguments. Fixes already applied here:

- `Add-Type System.Net.Http` (Windows PowerShell 5.1 has no HttpClient type by default).
- SSE `data:` unwrapping before JSON parse; protocol negotiation 2025-06-18 → 2025-03-26 → 2024-11-05.
- Never pipe `Get-Content -Raw` output directly into `ConvertTo-Json` (ETS wrapper serializes to megabytes and hangs): `$code = "$rawCode"` first.
- Never name a function parameter `$Args` (collides with the automatic variable): `$ToolArgs` / explicit names.
- No run-specific defaults: `-CodeFile` / `-WorkflowId` are required per run (empty default fails fast instead of validating a stale workflow).

Files: `native_mcp.ps1` (readiness: initialize + tools/list), `mcp_call.ps1` (generic tools/call), `mcp_code.ps1` (validate_workflow / create_workflow_from_code), `mcp_validate_nodes.ps1` (validate_node_config per node).
