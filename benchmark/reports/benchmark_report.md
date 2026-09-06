# Benchmark Report: n8n-as-code vs. n8n Native MCP

## ⚙️ Execution Environment & Manifest

| Dimension | Specification |
|---|---|
| **Orchestrating Harness** | **Antigravity** |
| **Primary Agent** | Antigravity Orchestrator |
| **Subagent Model** | **Gemini 3.8 Flash High** |
| **Temperature** | `0.2` |
| **Evaluation Engine** | **Deterministic n8n API Validator + Universal Minimax (Option B)** |
| **Host Platform** | win32 (x64) / Node v24.14.0 |
| **Target n8n Instance** | `https://etiennel.app.n8n.cloud` |
| **Timestamp** | `2026-09-06T20:22:34.676Z` |

**Standardized Prompt:**  
> *"Crée sur mon instance n8n un workflow multi-agents qui vérifie quotidiennement mes emails Google et mon calendrier, trie les informations et présente un dashboard HTML de la journée."*

---

## 🏆 Executive Summary (Minimax & Deterministic Quality)

| Evaluated Dimension | Weight | n8n-as-code | n8n Native MCP | Advantage |
|---|:---:|:---:|:---:|:---:|
| **1. Workflow Quality (API Ground Truth)** | 35% | **80 / 100** | **100 / 100** | +20.00 pts Native MCP |
| **2. Creation Time (Minimax Ratio)** | 25% | **72.58 / 100** | **100 / 100** | +27.42 pts Native MCP |
| **3. Token Efficiency (Minimax Ratio)** | 20% | **100 / 100** | **80.88 / 100** | +19.12 pts n8n-as-code |
| **4. Setup Time (Minimax Ratio)** | 20% | **100 / 100** | **81.82 / 100** | +18.18 pts n8n-as-code |
| **Overall Composite Score** | **100%** | **86.14 / 100** | **92.54 / 100** | 🏆 **n8n Native MCP** |

---

## 📊 Physical Telemetry & Operational Metrics

| Metric | n8n-as-code | n8n Native MCP | Delta | Interpretation |
|---|:---:|:---:|:---:|---|
| **Setup Time** | **18s** | **22s** | -4.00s | n8n-as-code setup is 1.2x faster |
| **Setup Commands** | 3 | 3 | 0.00 | Both headless, zero UI navigation |
| **Creation Duration** | **372s** | **270s** | **102.00s** | Native MCP is **1.4x faster** |
| **Total Tokens** | **55000** | **68000** | **-13000.00** | n8n-as-code consumes **19% fewer tokens** |
| **Interaction Turns** | 1 | 1 | 0 | Both completed autonomously in 1 turn |

---

## 🔬 Ground-Truth Workflow Quality Breakdown (Audited by n8n Cloud API)

| Quality Dimension | Verification Method | n8n-as-code | n8n Native MCP | Fact-Grounded Observation |
|---|---|:---:|:---:|---|
| **Total Nodes on Canvas** | `GET /api/v1/workflows/:id` | **12** | **23** | Total functional and context nodes deployed |
| **Node Schema Validity** | Server `validate_node_config` | **66.67%** (8/12) | **100%** (23/23) | Validated against official n8n server parameter definitions |
| **Graph Topology & Integrity** | Graph adjacency traversal | **100%** (0 orphans) | **100%** (0 orphans) | All functional nodes completely connected in the graph |
| **Live Cloud Execution (Informative)** | `GET /api/v1/executions` | **none** (0 nodes) | **none** (0 nodes) | Non-noté : les credentials tiers (Google OAuth2) ne peuvent être configurés en benchmark |
| **Composite Quality Score** | 60% Schema + 40% Graph | **80 / 100** | **100 / 100** | **Native MCP** |

---

## 💡 Engineering Insights & Takeaways (Run 3)

### 1. Speed & Schema Validity (n8n Native MCP)
- **Fast Build Duration (270s)**: With the extraneous verification loop removed, Native MCP built and deployed a comprehensive 23-node multi-agent architecture in just 4m30s.
- **100% Server Schema Compliance (23/23)**: Iterative JSON-RPC validation against `validate_node_config` guaranteed zero parameter or subnode errors in production.

### 2. Token & Setup Efficiency (n8n-as-code)
- **Fastest Setup (18s)**: Pure headless CLI setup (`n8nac setup` and `n8nac env`) completed in 18 seconds with zero HTTP bearer token / MCP bridging overhead.
- **19% Token Reduction**: Declarative TypeScript authoring required 55k tokens vs 68k tokens for MCP schema introspection.
- **Node Schema Discrepancies**: 4 nodes encountered server schema warnings (e.g. `sessionKey` without `customKey`, `parameters.calendar.__rl`), highlighting areas where local TypeScript validation schemas can be tightened to match n8n Cloud's RPC validator.

---
*Report generated automatically by Antigravity Benchmark Harness Framework (Option B: Ground-Truth API Validation & Universal Minimax).*
