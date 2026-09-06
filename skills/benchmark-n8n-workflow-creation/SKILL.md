---
name: benchmark-n8n-workflow-creation
description: Standardized, scientifically impartial benchmark harness comparing n8n-as-code with n8n Native MCP for AI-driven workflow creation using hermetic subagents and zero context contamination.
---

# Skill: Benchmark n8n-as-code vs. n8n Native MCP

Use this skill when asked to benchmark, compare, or scientifically evaluate **n8n-as-code** versus **n8n Native MCP**.

---

## 🎯 Unified Architecture: Orchestrator & Hermetic Subagents

Rather than running sequential tests in a single conversation (which causes **context contamination** and bias), this benchmark uses a **Unified Orchestration Protocol**:
1. **The Primary Agent (You)** acts as the **Benchmark Orchestrator & Impartial Judge**.
2. **The User** provides the prompt / trigger and answers any missing credential prompts.
3. **Two Isolated Subagents** are spawned concurrently via `invoke_subagent` to act as independent workflow builders. Each subagent has zero access to the other's conversation, files, or thought process.

```
                  ┌───────────────────────────────┐
                  │    User (Etienne Lescot)      │
                  └──────────────┬────────────────┘
                                 │ "Lance le benchmark"
                                 ▼
                  ┌───────────────────────────────┐
                  │   Primary Agent / Orchestrator│
                  │   - Step 1: Credentials Gate  │
                  │   - Step 2: Model Locking     │
                  │   - Step 3: Sandbox Prep      │
                  │   - Step 4: Subagents Spawn   │
                  │   - Step 5: Impartial Judge   │
                  └──────┬─────────────────┬──────┘
                         │                 │
           invoke_subagent                 invoke_subagent
     (Isolated Sandbox 1)                 (Isolated Sandbox 2)
     (Model: locked)                      (Model: locked)
                         │                 │
                         ▼                 ▼
          ┌──────────────────────┐  ┌──────────────────────┐
          │  Subagent A (n8nac)  │  │ Subagent B (Native)  │
          │  - Own isolated .env │  │ - Own isolated .env │
          │  - n8n-as-code docs  │  │ - Native MCP docs   │
          │  - Builds & Deploys  │  │ - Builds & Deploys  │
          └──────────┬───────────┘  └──────────┬───────────┘
                     │                         │
                     └───────────┬─────────────┘
                                 │ Telemetry & Workflows
                                 ▼
                  ┌───────────────────────────────┐
                  │     Evaluator & Dashboard     │
                  │   (Reports & Visualizations)  │
                  └───────────────────────────────┘
```

---

## 📋 Execution Protocol (Step-by-Step)

### Step 1: Credentials Gate
Before launching any subagents, check if the required n8n credentials exist:
1. Check `.env` (or local environment):
   - `N8N_HOST`: URL of the n8n instance (e.g., `https://etiennel.app.n8n.cloud` or `http://localhost:5678`)
   - `N8N_API_KEY`: n8n REST API key
   - `N8N_NATIVE_MCP_URL`: MCP endpoint (e.g., `https://etiennel.app.n8n.cloud/mcp-server/http`)
   - `N8N_NATIVE_MCP_TOKEN`: MCP bearer token (with `"aud": "mcp-server-api"`)
2. **Interactive Fallback**:
   If any credentials are missing:
   - Ask the user directly in the chat for the missing information.
   - Provide exact instructions on how to generate them:
     - **API Key**: `Settings > n8n API > Create API Key`.
     - **MCP Token**: `Settings > Instance-level MCP > Connect a client > Copy JSON configuration`.
   - Save or stage the credentials into `.env`.

---

### Step 2: LLM Model Alignment & Locking
To ensure total scientific fairness:
- Both subagents **MUST** be launched with the exact same LLM configuration (`Model: 'inherit'`, `'flash'`, or `'pro'`).
- The model configuration is recorded in the benchmark telemetry and displayed on the final dashboard.
- Default: `inherit` (uses the active agent model).

---

### Step 3: Sandboxes & Isolated `.env` Preparation
Generate two distinct timestamped sandbox directories:
- `benchmark/sandboxes/run_<timestamp>_n8nac/`
- `benchmark/sandboxes/run_<timestamp>_native_mcp/`

In each directory, write an isolated `.env` containing only what the specific tool requires:
- For **n8n-as-code**:
  ```env
  N8N_HOST=...
  N8N_API_KEY=...
  ```
- For **n8n Native MCP**:
  ```env
  N8N_NATIVE_MCP_URL=...
  N8N_NATIVE_MCP_TOKEN=...
  ```

---

### Step 4: Spawning Hermetic Subagents (`invoke_subagent`)
Spawn both subagents concurrently using `invoke_subagent`.

#### Subagent 1: `n8n-as-code Builder`
- **Role**: `n8n-as-code Builder`
- **Model**: Same locked model
- **Workspace**: `benchmark/sandboxes/run_<timestamp>_n8nac/`
- **Prompt**:
  ```
  You are an expert n8n developer evaluated in a benchmark.
  Your task is to build and deploy a workflow using n8n-as-code.
  Standardized prompt: "build a multi agent n8n workflow to check daily Google mails and calendar, triage data, and present an html dashboard of the day"
  
  Instructions:
  1. Read credentials from .env in your current working directory.
  2. Configure n8n-as-code:
     npx --yes n8nac env add Cloud --base-url <url> --workflows-path workflows
     echo "<api_key>" | npx --yes n8nac env auth set Cloud --api-key-stdin
     npx --yes n8nac env use Cloud
     npx --yes n8nac update-ai
  3. Author the workflow, validate it with `npx --yes n8nac skills validate`, and push with `npx --yes n8nac push <file>`.
  4. Return a JSON summary with: workflowId, workflowUrl, executionTimeMs, tokensUsed, errorsEncountered, and the complete workflow JSON.
  ```

#### Subagent 2: `n8n Native MCP Builder`
- **Role**: `n8n Native MCP Builder`
- **Model**: Same locked model
- **Workspace**: `benchmark/sandboxes/run_<timestamp>_native_mcp/`
- **Prompt**:
  ```
  You are an expert n8n developer evaluated in a benchmark.
  Your task is to build and deploy a workflow using n8n Native MCP.
  Standardized prompt: "build a multi agent n8n workflow to check daily Google mails and calendar, triage data, and present an html dashboard of the day"
  
  Instructions:
  1. Read MCP credentials from .env in your current working directory.
  2. Interact with the n8n Native MCP server via Streamable HTTP (headers: Content-Type: application/json, Accept: application/json, text/event-stream, Authorization: Bearer <token>).
  3. Consult tools (`get_workflow_sdk_reference`, `search_nodes`).
  4. Author the workflow using @n8n/workflow-sdk and deploy using `create_workflow_from_code` (or JSON via `create_workflow`).
  5. Return a JSON summary with: workflowId, workflowUrl, executionTimeMs, tokensUsed, errorsEncountered, and the complete workflow JSON.
  ```

---

### Step 5: Evaluation & Reporting
Upon receiving responses from both subagents:
1. Run the objective scoring rubric ([`references/EVALUATION_RUBRIC.md`](references/EVALUATION_RUBRIC.md)) across the 5 dimensions:
   - **Ease of Installation (20%)**
   - **Ease of Use (20%)**
   - **Token Consumption (15%)**
   - **Creation Time (15%)**
   - **Workflow Quality (30%)**
2. Explicitly note the LLM model and operating conditions.
3. Generate reports in `benchmark/reports/`:
   - `live_benchmark_report.md`
   - `live_benchmark_results.json`
   - `live_benchmark_dashboard.html`
4. Present the summary and clickable workflow URLs to the user.

---

## 📚 References
- [Isolation & Impartiality Protocol](references/ISOLATION_AND_IMPARTIALITY.md)
- [Standardized Evaluation Rubric](references/EVALUATION_RUBRIC.md)
- [n8n-as-code Authoring Guide](references/N8N_AS_CODE_GUIDE.md)
- [n8n Native MCP Authoring Guide](references/N8N_NATIVE_MCP_GUIDE.md)
