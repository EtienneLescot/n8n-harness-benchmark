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
| **Host Platform** | win32 (x64) / Node v24.14.0 |
| **Target n8n Instance** | `https://etiennel.app.n8n.cloud` |
| **Timestamp** | `2026-09-06T18:54:03.249Z` |

**Standardized Prompt:**  
> *"Crée sur mon instance n8n un workflow multi-agents qui vérifie quotidiennement mes emails Google et mon calendrier, trie les informations et présente un dashboard HTML de la journée."*

---

## 🏆 Executive Summary

| Evaluated Metric | Weight | n8n-as-code | n8n Native MCP | Advantage |
|---|:---:|:---:|:---:|:---:|
| **1. Ease of Installation** | 20% | **100/100** | **100/100** | +0 pts Native MCP |
| **2. Ease of Use** | 20% | **100/100** | **100/100** | +0 pts Native MCP |
| **3. Token Consumption** | 15% | **0/100** | **0/100** | +0 pts Native MCP |
| **4. Creation Time** | 15% | **0/100** | **0/100** | +0 pts Native MCP |
| **5. Workflow Quality** | 30% | **100/100** | **100/100** | +0 pts Native MCP |
| **Overall Composite Score** | **100%** | **70/100** | **70/100** | **n8n-as-code** |

---

## 📊 Raw Telemetry & Operational Metrics

| Metric | n8n-as-code | n8n Native MCP | Delta |
|---|:---:|:---:|:---:|
| **Total Duration** | 474s | 1525s | -1051.00s |
| **Prompt Tokens** | 72000 | 150000 | -78000.00 |
| **Completion Tokens** | 0 | 0 | N/A |
| **Total Tokens** | **72000** | **150000** | **-78000.00** |
| **Interaction Turns** | 1 | 1 | 0.00 |

---

## 🔍 Detailed Quality Breakdown (Max 25 pts each)

### 1. Initial Brief Following
- **n8n-as-code**: 25/25
- **n8n Native MCP**: 25/25

### 2. Nodes Correctness & Wiring
- **n8n-as-code**: 25/25
- **n8n Native MCP**: 25/25

### 3. Wow Effect & Aesthetics
- **n8n-as-code**: 25/25
- **n8n Native MCP**: 25/25

### 4. Workflow Execution & Dry-Run
- **n8n-as-code**: 25/25
- **n8n Native MCP**: 25/25

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
