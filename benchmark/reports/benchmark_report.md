# Benchmark Report: n8n-as-code vs. n8n Native MCP

## ⚙️ Execution Environment & Manifest

| Dimension | Specification |
|---|---|
| **Orchestrating Harness** | **Antigravity** |
| **Primary Agent** | Antigravity Orchestrator |
| **Subagent Model** | **Gemini 3.8 Flash High** |
| **Temperature** | `0.2` |
| **Subagent Runtime** | `invoke_subagent` |
| **Evaluation Mode** | Double-Blind Symmetrical (One independent judge per branch) |
| **Host Platform** | win32 (x64) (x64) / Node v24.14.0 |
| **Target n8n Instance** | `https://etiennel.app.n8n.cloud` |
| **Timestamp** | `2026-09-06T12:23:44.926Z` |

**Standardized Prompt:**  
> *"build a multi agent n8n workflow to check daily Google mails and calendar, triage data, and present an html dashboard of the day"*

---

## 🏆 Executive Summary

| Evaluated Metric | Weight | n8n-as-code | n8n Native MCP | Advantage |
|---|:---:|:---:|:---:|:---:|
| **1. Ease of Installation** | 20% | **90/100** | **65/100** | +25 pts n8n-as-code |
| **2. Ease of Use** | 20% | **75/100** | **65/100** | +10 pts n8n-as-code |
| **3. Token Consumption** | 15% | **7.15/100** | **22.15/100** | +14.999999999999998 pts Native MCP |
| **4. Creation Time** | 15% | **0/100** | **100/100** | +100 pts Native MCP |
| **5. Workflow Quality** | 30% | **96/100** | **97/100** | +1 pts Native MCP |
| **Overall Composite Score** | **100%** | **62.87/100** | **73.42/100** | **n8n Native MCP** |

---

## 📊 Raw Telemetry & Operational Metrics

| Metric | n8n-as-code | n8n Native MCP | Delta |
|---|:---:|:---:|:---:|
| **Total Duration** | 404.02s | 0.43s | 403.6s |
| **Prompt Tokens** | 18450 | 18450 | 0 |
| **Completion Tokens** | 5120 | 2120 | 3000 |
| **Total Tokens** | **23570** | **20570** | **3000** |
| **Interaction Turns** | 27 | 40 | -13 |
| **Tool Calls Executed** | 0 | 0 | 0 |
| **Friction / Error Events** | 0 | 0 | 0 |

---

## 🔍 Detailed Quality Breakdown (Max 25 pts each)

### 1. Initial Brief Following
- **n8n-as-code**: N/A/25

- **n8n Native MCP**: N/A/25


### 2. Nodes Correctness & Wiring
- **n8n-as-code**: N/A/25

- **n8n Native MCP**: N/A/25


### 3. Wow Effect & Aesthetics
- **n8n-as-code**: N/A/25

- **n8n Native MCP**: N/A/25


### 4. Workflow Execution & Dry-Run
- **n8n-as-code**: N/A/25

- **n8n Native MCP**: N/A/25


---

## 💡 Qualitative Analysis & Observations

### n8n-as-code
- **Strengths**: Local offline validation catches parameter schema violations and pin errors *before* pushing to the instance. Allows version control (GitOps) and code diffs.
- **Trade-offs**: Requires initial workspace setup (`n8nac env add` / `n8nac env auth set`).

### n8n Native MCP
- **Strengths**: Direct remote mutation without local repo footprint. Native integration into n8n server UI.
- **Trade-offs**: Requires instance-level MCP configuration and token management; errors are only discovered upon API rejection rather than local pre-flight linting.

---
*Report generated automatically by Antigravity Benchmark Harness Framework.*
