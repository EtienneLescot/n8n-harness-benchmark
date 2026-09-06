/**
 * REST API client for communicating directly with an n8n instance using native fetch.
 */
export class N8nClient {
  constructor(config = {}) {
    this.baseUrl = (config.baseUrl || process.env.N8N_HOST || 'http://localhost:5678').replace(/\/+$/, '');
    this.apiKey = config.apiKey || process.env.N8N_API_KEY || '';
    this.timeout = config.timeout || 30000;
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (this.apiKey) {
      headers['X-N8N-API-KEY'] = this.apiKey;
    }
    return headers;
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/healthz`, {
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return { ok: true, status: data?.status || 'ok' };
      }
    } catch {
      // Fallback
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      return { ok: response.ok, status: response.ok ? 'ok' : `HTTP ${response.status}` };
    } catch (innerError) {
      return { ok: false, error: innerError.message };
    }
  }

  async listWorkflows(tags = []) {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(this.timeout),
      });
      if (!response.ok) {
        return { ok: false, error: `HTTP ${response.status}: ${response.statusText}`, workflows: [] };
      }
      const data = await response.json();
      let workflows = data?.data || data || [];
      if (tags.length > 0) {
        workflows = workflows.filter(w => {
          const wTags = (w.tags || []).map(t => typeof t === 'string' ? t : t.name);
          return tags.some(tag => wTags.includes(tag));
        });
      }
      return { ok: true, workflows };
    } catch (error) {
      return { ok: false, error: error.message, workflows: [] };
    }
  }

  async getWorkflow(workflowId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows/${workflowId}`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(this.timeout),
      });
      if (!response.ok) {
        return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }
      const data = await response.json();
      return { ok: true, workflow: data?.data || data };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  async createWorkflow(workflowData) {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(workflowData),
        signal: AbortSignal.timeout(this.timeout),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { ok: false, error: data?.message || `HTTP ${response.status}`, details: data };
      }
      return { ok: true, workflow: data?.data || data };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  async deleteWorkflow(workflowId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows/${workflowId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(this.timeout),
      });
      return { ok: response.ok };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  async cleanBenchmarkWorkflows(tag = 'benchmark') {
    const listResult = await this.listWorkflows([tag]);
    if (!listResult.ok) return 0;
    let deletedCount = 0;
    for (const w of listResult.workflows) {
      const del = await this.deleteWorkflow(w.id);
      if (del.ok) deletedCount += 1;
    }
    return deletedCount;
  }
}
