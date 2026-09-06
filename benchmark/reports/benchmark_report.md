# Benchmark Report: n8n-as-code vs. n8n Native MCP

**Execution Date:** 2026-09-06T10:02:42.654Z  
**LLM Harness:** Antigravity (Gemini 3.8 Flash High)  
**Evaluation Model:** Gemini 3.8 Flash High  
**Benchmark Mode:** `auto`  
**Standardized Prompt:**  
> *"build a multi agent n8n workflow to check daily Google mails and calendar, triage data, and present an html dashboard of the day"*

---

## 🏆 Executive Summary

| Evaluated Metric | Weight | n8n-as-code | n8n Native MCP | Advantage |
|---|:---:|:---:|:---:|:---:|
| **1. Ease of Installation** | 20% | **80/100** | **80/100** | Tie |
| **2. Ease of Use** | 20% | **85/100** | **85/100** | Tie |
| **3. Token Consumption** | 15% | **100/100** | **92/100** | +8 pts n8n-as-code |
| **4. Creation Time** | 15% | **100/100** | **100/100** | Tie |
| **5. Workflow Quality** | 30% | **98/100** | **98/100** | Tie |
| **Overall Composite Score** | **100%** | **92/100** | **91/100** | **n8n-as-code** |

---

## 📊 Raw Telemetry & Operational Metrics

| Metric | n8n-as-code | n8n Native MCP | Delta |
|---|:---:|:---:|:---:|
| **Total Duration** | 2.02s | 0.04s | 2.0s |
| **Prompt Tokens** | 2850 | 4200 | -1350 |
| **Completion Tokens** | 2150 | 2500 | -350 |
| **Total Tokens** | **5000** | **6700** | **-1700** |
| **Interaction Turns** | 1 | 1 | 0 |
| **Tool Calls Executed** | 2 | 2 | 0 |
| **Friction / Error Events** | 2 | 1 | 1 |

---

## 🔍 Detailed Quality Breakdown (Max 25 pts each)

### 1. Initial Brief Following
- **n8n-as-code**: 25/25
  - Google Mail integration present (+7)
  - Google Calendar integration present (+6)
  - Multi-agent triage architecture present (+6)
  - HTML Dashboard of the day present (+6)
- **n8n Native MCP**: 25/25
  - Google Mail integration present (+7)
  - Google Calendar integration present (+6)
  - Multi-agent triage architecture present (+6)
  - HTML Dashboard of the day present (+6)

### 2. Nodes Correctness & Wiring
- **n8n-as-code**: 23/25
  - Contains 6 properly structured nodes (+8)
  - AI Language Model sub-connection properly wired (+5)
  - No custom tool sub-connections wired (+2)
  - Node parameters follow n8n schema standards (+8)
- **n8n Native MCP**: 23/25
  - Contains 6 properly structured nodes (+8)
  - AI Language Model sub-connection properly wired (+5)
  - No custom tool sub-connections wired (+2)
  - Node parameters follow n8n schema standards (+8)

### 3. Wow Effect & Aesthetics
- **n8n-as-code**: 25/25
  - Sophisticated multi-agent hierarchy (Triage + Digest agents) (+10)
  - High-aesthetic responsive HTML dashboard with cards, badges, and CSS styling (+15)
- **n8n Native MCP**: 25/25
  - Sophisticated multi-agent hierarchy (Triage + Digest agents) (+10)
  - High-aesthetic responsive HTML dashboard with cards, badges, and CSS styling (+15)

### 4. Workflow Execution & Dry-Run
- **n8n-as-code**: 25/25
  - Workflow JSON is syntactically valid and parseable (+10)
  - Workflow forms a complete executable pipeline (+8)
  - All end-to-end stages wired for execution (+7)
- **n8n Native MCP**: 25/25
  - Workflow JSON is syntactically valid and parseable (+10)
  - Workflow forms a complete executable pipeline (+8)
  - All end-to-end stages wired for execution (+7)

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
