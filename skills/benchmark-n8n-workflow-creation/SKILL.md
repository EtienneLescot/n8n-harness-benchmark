---
name: benchmark-n8n-workflow-creation
description: Standardized benchmark harness comparing n8n-as-code with n8n Native MCP for AI-driven workflow creation under identical, scientifically impartial conditions.
---

# Skill: Benchmark n8n-as-code vs. n8n Native MCP

Use this skill when you are asked to benchmark, compare, or scientifically evaluate **n8n-as-code** versus **n8n Native MCP**.

---

## 🎯 Benchmark Matrix & Impartiality Guarantees

- **Host Machine**: Same machine, same OS environment, same network latency.
- **LLM Engine**: Antigravity with **Gemini 3.8 Flash (High)**.
- **Evaluation Engine**: Antigravity with **Gemini 3.8 Flash (High)**.
- **Standardized Prompt**:
  > *"build a multi agent n8n workflow to check daily Google mails and calendar, triage data, and present an html dashboard of the day"*
- **Temperature**: `0.2` (deterministic).
- **Environment Isolation**:
  - Independent filesystem sandboxes: `benchmark/sandboxes/run_<timestamp>_n8n_as_code/` and `benchmark/sandboxes/run_<timestamp>_native_mcp/`.
  - Zero shared memory or cross-talk between runs.
  - Distinct workflow namespaces on the instance.
  - Complete details in [references/ISOLATION_AND_IMPARTIALITY.md](references/ISOLATION_AND_IMPARTIALITY.md).

---

## 📊 The 5 Evaluated Metrics

1. **Ease of Installation (20%)**: Setup simplicity, command count, instance prep guidance, time taken, friction points.
2. **Ease of Use (20%)**: Interaction turns, schema validation loops, error recovery ergonomics, human cognitive load.
3. **Token Consumption (15%)**: Prompt tokens, completion tokens, tool payload overhead.
4. **Time to Create Workflow (15%)**: Elapsed wall-clock time from prompt to verified live deployment.
5. **Quality of the Workflow (30%)**:
   - Initial brief following (Gmail + Calendar + Multi-Agent Triage + HTML Dashboard)
   - Nodes correctness & wiring (including AI sub-nodes)
   - Wow effect & dashboard aesthetics
   - Workflow execution / live deploy readiness

Full scoring details: [references/EVALUATION_RUBRIC.md](references/EVALUATION_RUBRIC.md).

---

## 🛠️ Execution Modes

### Mode 1: Interactive Mode (In-Chat Pair Programming)
- **User Role**: Human user (Etienne).
- **Builder & Judge Role**: Antigravity (Gemini 3.8 Flash High).

**Protocol:**
1. Ask the user for their n8n instance URL (`N8N_HOST`).
2. Guide the user step-by-step on how to generate the API key (`Settings > n8n API > Create API Key`).
3. Guide the user step-by-step on how to enable Native MCP (`Settings > Instance-level MCP > Connect a client`).
4. Execute installation for **n8n-as-code** in its sandbox:
   ```bash
   n8nac env add Cloud --base-url <url> --workflows-path workflows
   echo "<api_key>" | n8nac env auth set Cloud --api-key-stdin
   n8nac env use Cloud
   n8nac update-ai
   ```
5. Execute connection verification for **Native MCP** using Streamable HTTP with `Accept: application/json, text/event-stream` and `Authorization: Bearer <token>`.
6. Prompt the builder with the standardized prompt for each branch.
7. Author, validate (via `n8nac skills validate` and `validate_workflow`), and deploy both workflows.
8. Evaluate both workflows against the 5 metrics, compile the comparative report and interactive HTML dashboard.

---

### Mode 2: Auto Mode (Autonomous Subagent Orchestration)
- **User & Judge Role**: Main Antigravity Agent.
- **Builder Role**: Subagents spawned via `invoke_subagent`.

**Protocol:**
1. Load credentials from `.env` (`N8N_HOST`, `N8N_API_KEY`, `N8N_NATIVE_MCP_URL`, `N8N_NATIVE_MCP_TOKEN`).
2. Spawn Subagent 1 for **n8n-as-code** with isolated workspace. Pass the standardized prompt. Supply credentials when requested. Record execution time, tokens, turns, and friction.
3. Spawn Subagent 2 for **Native MCP** with isolated workspace. Pass the standardized prompt. Supply credentials when requested. Record execution time, tokens, turns, and friction.
4. Retrieve the resulting workflow JSON definitions.
5. Run the objective evaluation engine, calculate scores, and generate:
   - `benchmark/reports/live_benchmark_report.md`
   - `benchmark/reports/live_benchmark_results.json`
   - `benchmark/reports/live_benchmark_dashboard.html`

---

## 📚 References & Resources

- [Isolation & Impartiality Protocol](references/ISOLATION_AND_IMPARTIALITY.md)
- [Standardized Evaluation Rubric](references/EVALUATION_RUBRIC.md)
- [n8n-as-code Guide](references/N8N_AS_CODE_GUIDE.md)
- [n8n Native MCP Guide](references/N8N_NATIVE_MCP_GUIDE.md)
