# Reference: The Quality Rubric

The defect judge answers *does it hold up*. This one answers a different question:

> **Is this a good answer to what was asked?**

It is the only score in the benchmark that is **absolute**, not relative, and the reason is
the yardstick. Tokens and seconds have none: 143k tokens is neither good nor bad on its own,
only cheaper or dearer than the other branch, so the only meaningful figure is the A/B ratio.
Quality has one — **the prompt**. A workflow can be measured against what was asked with no
second workflow in the room. Both branches may score 90. Both may score 40.

Weight in the composite: **35**, the largest share. `benchmark/harness/scoring.mjs` is where
that number lives; this document does not restate it.

---

## What is in scope

Four dimensions, 25 points each.

### 1. The idea (25)
Did the workflow find a sensible shape for the problem, or the first shape that compiles?
Does the decomposition match the task — separate concerns separated, one concern not split
across three nodes for no reason?

### 2. Node structure (25)
Are the node types the right ones for the job? Is anything doing work a purpose-built node
already does, or a purpose-built node doing work it was not meant for? Is the count
proportionate — neither a monolith nor ceremony?

### 3. Connections (25)
Does the wiring express the real dependencies? Independent work fanned out, dependent work
chained, merges where two streams genuinely rejoin. A chain that serialises two unrelated
fetches is worse than a fan-out even though both execute one node at a time.

### 4. Answer to the prompt (25)
Did it deliver what was asked, end to end, in a form the person who asked could use? Not
whether the required node types are present — correctness already counted those — but whether
a reader of the brief would recognise their request in the result.

> `run_12` is why this dimension exists and why it is not correctness. Both branches scored
> 100/100 correctness. One of them built an HTML briefing every morning and left it in the
> execution data, because its terminal node has no outgoing edge and nothing delivers it. The
> defect judge could not score that either: the brief said *presents* and named no mechanism,
> so the finding was refuted on family 6's own rule. It is a quality question, and here it has
> somewhere to go.

---

## What is out of scope

**Do not score the construction process.** How many commands the builder ran, how long it
took, how many tokens it spent, how it recovered from an error — build time and token
efficiency already measure all of that, and scoring it here would count the same thing twice.
The builder log is not an input to this judge.

**Do not score correctness.** Node schema validity, requirement coverage and graph integrity
are settled deterministically by `validator.mjs` before this panel runs. Do not re-litigate
them, do not reward a workflow for having valid nodes, and do not penalise one for a defect
the validator already counted.

**Do not score what the harness imposed.** The operating rules given to every builder travel
with the brief, labelled. An inactive workflow, an empty credential slot, an opaque name: all
mandated, none a quality signal.

**Do not reward size.** More nodes is not better. Neither is fewer.

---

## How a grade is defended

An absolute grade from a language model is an opinion unless it is constrained. Five rules,
and a grade that breaks any of them is void:

1. **One workflow per judge. Never two in one context.** A judge that sees both stops grading
   and starts comparing, and the grade becomes relative to the other workflow — which is
   precisely the logic this axis exists to escape. If the prompt is the yardstick, no judge
   needs to see anything but the workflow and the prompt.

   > `run_12`'s first quality panel broke this rule and the grades show it. Each judge was
   > handed both workflows, with the presentation order swapped for one of them as a
   > mitigation. The judge who saw the eventual winner first returned a 4-point gap; the two
   > who saw it second returned 23 and 10. The grades moved with presentation order, so they
   > were measuring position as well as quality. Swapping the order **detects** that
   > contamination; it does not remove it. Only isolation removes it. That panel was voided
   > and re-run with six judges, one workflow each.

2. **Every dimension score cites a JSON pointer that resolves.** A score with no citation is
   discarded and the dimension is regraded by another judge.
3. **Three judges per workflow, independent contexts, no shared state.** The published grade is
   the median, never the mean, so one outlier cannot drag it.

   **Across builds, pool the grades; do not take a median of medians.** A tool is graded over
   several builds, and collapsing each build to a median before collapsing again throws away
   most of the sample and lands on whichever build sits in the middle. In `exp_01` that
   produced a spurious dead heat: median-of-medians gave 88 to both tools, while the pooled
   median over all fifteen grades gave 88 and 89, and both means gave a two-point edge to the
   other tool. The ranking survived every choice; the tie did not. Take the median of every
   grade the panel produced for that tool, and publish the per-build medians beside it so the
   shape of the distribution stays visible.
4. **Disagreement is published, not smoothed.** If the three judges spread more than 15 points
   on the total, the report says so and prints all three. A wide spread is information about
   the rubric, not noise to average away.
5. **A blind pairwise check runs alongside, by different agents.** Two further agents, who
   produce no grade of their own, are each asked one question: which of the two workflows
   better answers the brief. They see both, deliberately — comparison is what they are for —
   with the presentation order swapped between them. If the pairwise winner contradicts the
   ordering the isolated grades produced, the report says so. Absolute grades that cannot
   reproduce their own ranking are not trustworthy, and the run says as much rather than
   hiding it.

   **The pairwise result never enters the grade.** It is a check on the grades, not an input
   to them. An agent that graded may not also vote, and a vote may not adjust a grade.

Each judge sees **one** workflow, blinded through `blindWorkflow()`, the brief verbatim, the
harness operating rules, and the structural facts computed from that workflow. No judge sees:
the other workflow, correctness scores, token counts, build times, branch names, or the defect
panel's findings.

---

## Bands

Not a curve. A description of what a number means, so two runs graded months apart mean the
same thing.

| Band | What it describes |
|---|---:|
| 90-100 | Answers the brief fully and would not be redesigned by someone who knows n8n. |
| 75-89 | Answers the brief. One dimension is visibly weaker than the rest. |
| 60-74 | Answers the literal brief; a reader would find something important missing or awkward. |
| 40-59 | Partially answers it, or answers it in a shape that will not survive contact with real data. |
| 0-39 | Does not answer what was asked, whatever it does otherwise. |

<!-- JUDGE-KIT: this file must never appear inside a builder sandbox. The marker is what lets `npm run guard` catch it after a rename. -->
