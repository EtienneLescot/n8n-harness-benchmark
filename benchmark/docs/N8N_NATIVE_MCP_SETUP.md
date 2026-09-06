# Installation & Preparation Guide: n8n Native MCP

This guide provides the official procedure to enable and configure n8n's native Model Context Protocol (MCP) server and connect AI clients.

---

## 1. Prerequisites

- **n8n Version**: `1.68.0` or later (native MCP server support was introduced in 1.68+).
- **Environment Setting**: If managing via environment variables, ensure `N8N_MCP_MANAGED_BY_ENV=true` or use the n8n UI.

---

## 2. Enabling Native MCP on n8n Instance

### Method A: Through n8n Settings UI (Instance-Level MCP)
1. Open your n8n instance (e.g. `http://localhost:5678`).
2. Go to **Settings > Instance-level MCP**.
3. Toggle MCP **Enabled**.
4. Under **Client Connections**, click **Connect a client**.
5. n8n will display:
   - **MCP Server URL**: e.g. `http://localhost:5678/mcp-server/http`
   - **Authorization Token**: e.g. Bearer token or API token.
6. Under **Exposed Workflows**, select which workflows the AI agent is allowed to access and edit (or allow all).

### Method B: Through Environment Variables (Headless / Docker)
Add to your n8n Docker `.env` or container startup:
```bash
N8N_MCP_MANAGED_BY_ENV=true
N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true
```

---

## 3. Configuring the AI Client (MCP Client)

### In Claude Desktop / Antigravity / Cursor
In your client's MCP configuration (`claude_desktop_config.json` or Antigravity MCP settings):

#### Streamable HTTP / Supergateway:
```json
{
  "mcpServers": {
    "n8n-native-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "supergateway",
        "--streamableHttp",
        "http://localhost:5678/mcp-server/http",
        "--header",
        "Authorization:Bearer <YOUR_N8N_MCP_TOKEN>"
      ]
    }
  }
}
```

#### Direct SSE Connection (Native Protocol):
Endpoint: `http://localhost:5678/mcp-server/sse`
Headers: `Authorization: Bearer <YOUR_N8N_MCP_TOKEN>`

---

## 4. Verification Check

Using `mcp-client` or the harness client:
```bash
node -e "
  import('./benchmark/harness/native-mcp-client.mjs').then(async ({ NativeMcpClient }) => {
    const client = new NativeMcpClient({ endpoint: 'http://localhost:5678/mcp-server/http', token: 'YOUR_TOKEN' });
    const tools = await client.listTools();
    console.log('Available MCP tools:', tools.map(t => t.name));
  });
"
```

Expected tools include:
- `search_workflows`
- `get_workflow_details`
- `create_workflow` (or `create_workflow_from_code`)
- `update_workflow`
- `activate_workflow`
- `execute_workflow`
- `search_nodes`
- `get_node_types`

---

## 5. How Workflows are Authored & Deployed

1. **Tool Invocation**: The AI agent calls `search_nodes` or `get_node_types` to query node parameters.
2. **Direct Mutation**: The AI agent calls `create_workflow` or `update_workflow` with the full workflow JSON graph.
3. **Execution**: The agent calls `execute_workflow` to test or activate the workflow directly on the live server.
