/**
 * Client for interacting with n8n's Native Model Context Protocol (MCP) server
 * using native fetch.
 * Implements JSON-RPC 2.0 over Streamable HTTP / SSE.
 */
export class NativeMcpClient {
  constructor(config = {}) {
    this.endpoint = config.endpoint || process.env.N8N_NATIVE_MCP_URL || 'http://localhost:5678/mcp-server/http';
    this.token = config.token || process.env.N8N_NATIVE_MCP_TOKEN || '';
    this.timeout = config.timeout || 30000;
    this.protocolVersion = '2024-11-05';
    this.nextId = 1;
  }

  getHeaders(sessionId = null) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    if (sessionId) {
      headers['Mcp-Session-Id'] = sessionId;
    }
    return headers;
  }

  async checkConnection() {
    try {
      const result = await this.listTools();
      return { ok: result.ok, toolCount: result.tools?.length || 0, tools: result.tools, error: result.error };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  async listTools() {
    try {
      const response = await this.rpc('tools/list', {});
      const tools = Array.isArray(response?.tools) ? response.tools : [];
      return { ok: true, tools };
    } catch (error) {
      return { ok: false, error: error.message, tools: [] };
    }
  }

  async callTool(name, args = {}) {
    try {
      const response = await this.rpc('tools/call', {
        name,
        arguments: args,
      });
      return { ok: true, result: response };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  async rpc(method, params = {}) {
    const payload = {
      jsonrpc: '2.0',
      id: this.nextId++,
      method,
      params,
    };

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(`Native MCP server responded with HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // Parse SSE stream format: data: {"jsonrpc": "2.0", ...}
      for (const line of text.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          try {
            data = JSON.parse(trimmed.slice(5).trim());
            break;
          } catch {
            // Keep looking
          }
        }
      }
    }

    if (!data) {
      throw new Error(`Failed to parse MCP response: ${text.slice(0, 200)}`);
    }

    if (data?.error) {
      throw new Error(`Native MCP RPC error (${data.error.code}): ${data.error.message}`);
    }

    return data?.result || data;
  }
}
