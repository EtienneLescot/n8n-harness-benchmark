# Guide: n8n Native MCP Setup & Workflow Authoring

## 1. Enabling Instance-Level MCP in n8n
1. In the n8n UI, navigate to **Settings > Instance-level MCP**.
2. Toggle the switch to **Enabled**.
3. Under **Client Connections**, open **Connect a client**.
4. Retrieve the **MCP Server URL** (e.g. `https://<instance>/mcp-server/http`) and the **Bearer Token**.

## 2. Connecting the MCP Client
Ensure headers include:
- `Authorization: Bearer <MCP_TOKEN>`
- `Accept: application/json, text/event-stream` (required by n8n streamable HTTP server).

## 3. Workflow Authoring Flow via MCP Tools
1. **Initialize session**: Send JSON-RPC `initialize`.
2. **Consult SDK Reference**: Call `get_workflow_sdk_reference` with `section: 'patterns'` or `section: 'rules'`.
3. **Draft Workflow Code**: Use `@n8n/workflow-sdk` imports:
   ```javascript
   import { workflow, node, trigger, languageModel, expr } from '@n8n/workflow-sdk';
   ```
4. **Validate**: Call tool `validate_workflow` with the draft code.
5. **Create**: Call tool `create_workflow_from_code` with the validated code to persist it directly on the server.
