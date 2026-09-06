# n8n Benchmark Harness: n8n-as-code vs. n8n Native MCP

A standardized, rigorous benchmark harness comparing **n8n-as-code** with **n8n Native MCP** for AI-driven workflow creation.

---

## 🎯 Benchmark Matrix

- **Host Environment:** Same machine (Windows).
- **LLM Harness:** Antigravity + Gemini 3.8 Flash High.
- **Evaluation Harness:** Antigravity + Gemini 3.8 Flash High.
- **Test Prompt:**
  > *"use [n8n native MCP / n8n-as-code] to build on my n8n instance a multi agent n8n workflow to check daily Google mails and calendar, triage data, and present an html dashboard of the day"*
- **Isolation:** Pristine, isolated filesystem sandboxes for every run (`benchmark/sandboxes/run_<timestamp>_<tool>/`).
- **2 Execution Modes:**
  1. **Interactive Mode**: You get the user role, Antigravity acts as the assistant, guiding you through installation and workflow authoring.
  2. **Auto Mode**: The agent acts autonomously, picks credentials from `.env`, executes end-to-end, and outputs reports.

---

## 📐 Evaluated Metrics

1. **Ease of Installation** (20%): Official documentation setup, instance prep, step count, setup time, friction points.
2. **Ease of Use** (20%): Turns to working workflow, schema validation loop, error recovery ergonomics, human cognitive load.
3. **Token Consumption** (15%): Prompt tokens, completion tokens, tool call overhead.
4. **Time to Create Workflow** (15%): Total elapsed wall-clock duration.
5. **Quality of the Workflow** (30%):
   - Initial brief following (Gmail + Calendar + Triage Multi-Agent + HTML Dashboard)
   - Nodes correctness & connection wiring (including AI sub-nodes)
   - Wow effect & dashboard aesthetics
   - Workflow execution / dry-run readiness

---

## 🚀 Quick Start

### 1. Configure Credentials (for Auto Mode)
Copy the example environment file:
```bash
cp benchmark/config/.env.benchmark.example .env
```
Populate your credentials:
```env
N8N_HOST=http://localhost:5678
N8N_API_KEY=your_n8n_api_key
N8N_NATIVE_MCP_URL=http://localhost:5678/mcp-server/http
N8N_NATIVE_MCP_TOKEN=your_mcp_token
GEMINI_API_KEY=your_gemini_api_key
```

### 2. Run Mode 2: Auto Mode (Autonomous)
```bash
npm run benchmark:auto
# Or directly:
node benchmark/cli.mjs --mode=auto
```

### 3. Run Mode 1: Interactive Mode (Human in the Loop)
```bash
npm run benchmark:interactive
# Or directly:
node benchmark/cli.mjs --mode=interactive
```

---

## 📊 Output Reports

Each run automatically compiles three reporting artifacts in `benchmark/reports/`:
1. `benchmark_report.md`: Executive summary table, delta comparisons, and qualitative takeaways.
2. `benchmark_results.json`: Full machine-readable telemetry data (timestamps, tokens, scores).
3. `benchmark_dashboard.html`: Interactive, responsive Generative UI dashboard with radar charts, bar graphs, and metrics breakdown.

---

## 📚 Documentation
- [n8n-as-code Setup Guide](docs/N8N_AS_CODE_SETUP.md)
- [n8n Native MCP Setup Guide](docs/N8N_NATIVE_MCP_SETUP.md)
- [Evaluation Rubric & Methodology](docs/EVALUATION_RUBRIC.md)
