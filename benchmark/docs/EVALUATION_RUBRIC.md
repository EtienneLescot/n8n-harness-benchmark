# Benchmark Evaluation Rubric

This document defines the standardized evaluation framework and scoring methodology for comparing `n8n-as-code` and `n8n Native MCP`.

---

## Evaluation Overview

| Criterion | Max Score | Weight | Evaluation Method |
|---|---|---|---|
| **1. Ease of Installation** | 100 | 20% | Quantitative (Steps + Time) & Rubric |
| **2. Ease of Use** | 100 | 20% | Quantitative (Turns + Friction) & Ergonomics Rubric |
| **3. Token Consumption** | 100 | 15% | Quantitative (Tokens used normalized vs baseline) |
| **4. Creation Time** | 100 | 15% | Quantitative (Elapsed seconds normalized vs baseline) |
| **5. Quality of Workflow** | 100 | 30% | Multi-factor Automated Inspection & AI Judge |

---

## 1. Ease of Installation (100 pts)

Measures the developer effort and friction required to go from a fresh machine/workspace to an environment ready for AI workflow creation.

- **Step Count & Complexity (40 pts)**:
  - <= 3 simple CLI commands / zero config: 40 pts
  - 4-6 commands or 1 UI setting: 30 pts
  - Complex multi-step configuration (tokens, headers, gateway wrappers): 15-20 pts
  - Failure/breaking changes during install: 0 pts
- **Setup Time (30 pts)**:
  - < 30 seconds: 30 pts
  - 30-60 seconds: 25 pts
  - 1-3 minutes: 15 pts
  - > 3 minutes: 5 pts
- **Automation / Headless Capability (30 pts)**:
  - Can be fully automated without human UI intervention (zero-touch): 30 pts
  - Requires 1 manual token copy from UI: 20 pts
  - Requires multiple manual UI toggles: 10 pts

---

## 2. Ease of Use (100 pts)

Measures developer ergonomics, agent interaction smoothness, and feedback loops during authoring.

- **Interaction Efficiency / Turns to Success (35 pts)**:
  - Completed in 1-2 turns without retries: 35 pts
  - 3-4 turns with quick self-correction: 25 pts
  - 5+ turns or endless retry loops: 10 pts
- **Schema Safety & Early Error Detection (35 pts)**:
  - Local validation / immediate feedback before applying changes: 35 pts
  - Remote API error feedback with actionable diagnostics: 25 pts
  - Silent failure or uninformative 400/500 errors: 10 pts
- **Code & Workflow Readability (30 pts)**:
  - Version-controlled, human-readable diffs, GitOps-ready: 30 pts
  - Monolithic raw JSON blobs: 15 pts

---

## 3. Token Consumption (100 pts)

Measures the efficiency of context and tokens consumed during workflow creation:
$$\text{Score} = \max\left(0, 100 - \frac{\text{Total Tokens} - 5000}{200}\right)$$
- Tracks:
  - Prompt tokens (system prompt, schemas, user input)
  - Completion tokens (agent responses, code/tool payloads)
  - Tool payload overhead (number of large schema dumps or round-trips)

---

## 4. Time to Create Workflow (100 pts)

Measures wall-clock generation time from prompt submission to working workflow:
$$\text{Score} = \max\left(0, 100 - \frac{\text{Duration (seconds)} - 15}{2}\right)$$
- Tracks:
  - Generation latency
  - Validation latency
  - Sync / deployment latency

---

## 5. Quality of Workflow (100 pts)

Evaluated across four sub-criteria (25 pts each):

### 5.1 Initial Brief Following (25 pts)
- **Google Mail Integration (7 pts)**: Ingests/filters daily emails.
- **Google Calendar Integration (6 pts)**: Ingests today's schedule/events.
- **Multi-Agent Triage (6 pts)**: Employs an agentic architecture (classification, prioritization, synthesis).
- **HTML Dashboard (6 pts)**: Outputs daily executive briefing dashboard.

### 5.2 Nodes Correctness & Wiring (25 pts)
- **Valid Node Types (8 pts)**: Official node names (e.g. `n8n-nodes-base.gmail`, `@n8n/n8n-nodes-langchain.agent`).
- **Connection Wiring (9 pts)**: Correct main stream pins and correct AI sub-node pins (language model, tools, memory).
- **Parameter Syntax & Expressions (8 pts)**: Correct expression syntax (`{{ $json... }}`), valid parameters.

### 5.3 Wow Effect & Aesthetics (25 pts)
- **Architecture Sophistication (10 pts)**: Multi-agent coordination, sub-agent tools, clean fallback handling.
- **Dashboard UI Design (15 pts)**: High-quality HTML/CSS, modern typography, metric cards, priority badges, responsive layout.

### 5.4 Workflow Execution / Dry-Run (25 pts)
- **Schema Validation Pass (10 pts)**: Passes n8n schema validator with 0 errors.
- **Dry-Run / Live Execution (15 pts)**: Successfully executes or passes dry-run node evaluation.
