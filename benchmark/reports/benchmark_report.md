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
| **Timestamp** | `2026-09-06T19:50:13.564Z` |

**Standardized Prompt:**  
> *"Crée sur mon instance n8n un workflow multi-agents qui vérifie quotidiennement mes emails Google et mon calendrier, trie les informations et présente un dashboard HTML de la journée."*

---

## 🏆 Executive Summary (Minimax & Deterministic Quality)

| Evaluated Dimension | Weight | n8n-as-code | n8n Native MCP | Advantage |
|---|:---:|:---:|:---:|:---:|
| **1. Workflow Quality (API Ground Truth)** | 35% | **60.59 / 100** | **100 / 100** | +39.41 pts Native MCP |
| **2. Creation Time (Minimax Ratio)** | 25% | **100 / 100** | **31.08 / 100** | +68.92 pts n8n-as-code |
| **3. Token Efficiency (Minimax Ratio)** | 20% | **100 / 100** | **48 / 100** | +52.00 pts n8n-as-code |
| **4. Setup Time (Minimax Ratio)** | 20% | **100 / 100** | **81.82 / 100** | +18.18 pts n8n-as-code |
| **Overall Composite Score** | **100%** | **86.21 / 100** | **68.73 / 100** | 🏆 **n8n-as-code** |

---

## 📊 Physical Telemetry & Operational Metrics

| Metric | n8n-as-code | n8n Native MCP | Delta | Interpretation |
|---|:---:|:---:|:---:|---|
| **Setup Time** | **18s** | **22s** | -4.00s | n8n-as-code setup is 1.2x faster |
| **Setup Commands** | 3 | 3 | 0.00 | Both headless, zero UI navigation |
| **Creation Duration** | **474s** | **1525s** | **-1051.00s** | n8n-as-code is **3.2x faster** |
| **Total Tokens** | **72000** | **150000** | **-78000.00** | n8n-as-code consumes **52% fewer tokens** |
| **Interaction Turns** | 1 | 1 | 0 | Both completed autonomously in 1 turn |

---

## 🔬 Ground-Truth Workflow Quality Breakdown (Audited by n8n Cloud API)

| Quality Dimension | Verification Method | n8n-as-code | n8n Native MCP | Fact-Grounded Observation |
|---|---|:---:|:---:|---|
| **Total Nodes on Canvas** | `GET /api/v1/workflows/:id` | **17** | **14** | Total functional and context nodes deployed |
| **Node Schema Validity** | Server `validate_node_config` | **76.47%** (13/17) | **100%** (14/14) | Native MCP achieves 100% parameter compliance; n8n-as-code had minor schema mismatches |
| **Graph Topology & Integrity** | Graph adjacency traversal | **100%** (0 orphans) | **100%** (0 orphans) | All functional nodes completely connected in the graph |
| **Live Cloud Execution** | `GET /api/v1/executions` | **none** (0 nodes) | **success** (11 nodes) | Native MCP verified end-to-end execution #16 live in production |
| **Composite Quality Score** | 40% Schema + 30% Graph + 30% Live | **60.59 / 100** | **100 / 100** | **Native MCP holds superior ground-truth verification** |

---

## 💡 Engineering Insights & Takeaways

### 1. Speed & Token Efficiency Advantage (n8n-as-code)
- **3.2x Faster Build Time**: Local TypeScript code authoring with instantaneous file edits completely avoids network roundtrips during graph design.
- **52% Token Reduction**: Generating a single cohesive TypeScript workflow file saves tens of thousands of tokens otherwise spent transporting expansive MCP tool schemas.

### 2. Schema Rigor & Execution Validation Advantage (n8n Native MCP)
- **100% Schema Validity**: Because Native MCP performs iterative remote validations against the live server schema, zero parameter mismatches occurred in production.
- **End-to-End Live Verification**: Native MCP automatically triggered and verified execution #16 live on n8n Cloud before reporting completion.

---
*Report generated automatically by Antigravity Benchmark Harness Framework (Option B: Ground-Truth API Validation & Universal Minimax).*
