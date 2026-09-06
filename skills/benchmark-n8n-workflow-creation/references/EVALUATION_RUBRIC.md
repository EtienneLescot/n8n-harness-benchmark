# Standardized Evaluation Rubric (0–100)

| Metric | Max Score | Weight | Measurement Method |
|---|:---:|:---:|---|
| **1. Ease of Installation** | 100 | 20% | Documentation clarity, command count, setup time, user guidance, friction events. |
| **2. Ease of Use** | 100 | 20% | Interaction turns, schema validation loops, error diagnostics, code readability. |
| **3. Token Consumption** | 100 | 15% | Prompt tokens + completion tokens + tool call payload overhead. |
| **4. Time to Create Workflow** | 100 | 15% | Wall-clock time from initial prompt submission to verified live deployment. |
| **5. Quality of the Workflow** | 100 | 30% | Objective structural analysis across 4 sub-criteria (25 pts each). |

---

## Metric 1: Ease of Installation (100 pts)
- **Step Count & Commands (40 pts)**:
  - <= 3 simple CLI commands: 40 pts
  - 4-6 commands: 30 pts
  - Complex multi-step configuration (custom headers, manual proxies): 20 pts
  - Breaking issues / missing prerequisites: 10 pts
- **Setup Time (30 pts)**:
  - < 30s: 30 pts
  - 30s - 60s: 25 pts
  - 1m - 3m: 15 pts
  - > 3m: 5 pts
- **Guidance & Headless Simplicity (30 pts)**:
  - Agent can guide the user in < 2 prompts: 30 pts
  - Requires navigating multiple complex UI screens: 15 pts

---

## Metric 2: Ease of Use (100 pts)
- **Interaction Turns (35 pts)**:
  - 1-2 turns: 35 pts
  - 3-4 turns: 25 pts
  - 5+ turns: 10 pts
- **Schema Safety & Pre-flight Validation (35 pts)**:
  - Local validation / instant linting before remote deployment: 35 pts
  - Remote API diagnostics with clean error messages: 25 pts
  - Generic 400/500 errors without actionable guidance: 10 pts
- **Workflow Versioning & Readability (30 pts)**:
  - GitOps-compatible files (.ts / .json), clean diffs: 30 pts
  - Opaque remote state only: 15 pts

---

## Metric 3: Token Consumption (100 pts)
$$\text{Score} = \max\left(0, \min\left(100, 100 - \frac{\text{Total Tokens} - 5000}{200}\right)\right)$$
- Tracks prompt tokens, completion tokens, and SDK reference overhead.

---

## Metric 4: Creation Time (100 pts)
$$\text{Score} = \max\left(0, \min\left(100, 100 - \frac{\text{Duration (seconds)} - 15}{1.65}\right)\right)$$
- Tracks wall-clock time from prompt receipt to verified deployment.

---

## Metric 5: Quality of the Workflow (100 pts)

### 5.1 Initial Brief Following (25 pts)
- Google Mail search/retrieval node: +7 pts
- Google Calendar event retrieval node: +6 pts
- Multi-Agent Triage architecture: +6 pts
- HTML Dashboard of the day: +6 pts

### 5.2 Nodes Correctness & Wiring (25 pts)
- Official node types according to n8n schema: +8 pts
- AI Language model sub-connection properly wired (`ai_languageModel`): +5 pts
- AI Tool / Memory sub-connections wired: +4 pts
- Node parameter syntax & expression correctness (`{{ $json... }}`): +8 pts

### 5.3 Wow Effect & Aesthetics (25 pts)
- Multi-agent hierarchy (Triage + Executive Synthesis): +10 pts
- Responsive, modern HTML dashboard (dark theme, badges, cards, timeline): +15 pts

### 5.4 Workflow Execution & Dry-Run (25 pts)
- Valid, parseable workflow JSON: +10 pts
- Complete end-to-end executable pipeline without disconnected nodes: +8 pts
- Live push & deployment confirmation on target instance: +7 pts
