# run_12 — quality panel

Absolute grade out of 100 against the brief, the only axis in this benchmark that is not
relative. Three judges, independent contexts, presentation order swapped for one of them.

| Judge | alpha | beta |
|---|---:|---:|
| judge 1 (alpha first) | 65 | 88 |
| judge 2 (beta first (swapped)) | 72 | 76 |
| judge 3 (alpha first) | 77 | 87 |
| **median** | **72** | **87** |

Spread: alpha 12 points, beta 12 points.
Neither exceeds the 15-point threshold, so no disagreement flag is raised.

## Pairwise consistency check

| Presentation order | Winner |
|---|---|
| alpha as Workflow 1 | beta |
| beta as Workflow 1 | beta |

Absolute ordering says **beta**, pairwise says **beta**. They agree, and the pairwise result is stable under position swap, so the grades reproduce their own ranking.

## What decided it

All three judges and both pairwise checks landed on the same thing, independently: alpha
builds a complete HTML briefing and never delivers it. Its terminal node is a Code node with
no outgoing edge, under a schedule trigger with no response channel, so the document dies in
execution data. Beta ends in a Gmail send with `emailType: html`.

The defect panel could not score this. The brief says *presents* and names no delivery
mechanism, so the finding was refuted on family 6's own rule against importing an unstated
requirement. Correctness could not score it either: `emitsHtml()` asks whether a node produces
HTML, never whether it reaches anyone, so both branches took the capability in full.

The quality axis has the prompt as its yardstick, so it can weigh the operative verb. That is
the whole reason the axis exists, and this run is its first exercise.

## Two observations the judges added

- **alpha's merge is decorative.** `Join Agent Outputs` is wired as a real two-input merge,
  but the composer pulls its inputs through `$(...)` node references rather than from the
  merge's output. The wiring implies a data join that does not happen.
- **beta's guarantee is a prompt, not a graph.** Its main path is two edges deep. "Check both
  sources" lives in the orchestrator's instructions and in two `ai_tool` attachments, so it
  depends on the model choosing to call both tools rather than on the graph enforcing it. One
  judge marked beta down 15/25 on connections for exactly this.

These two cut in opposite directions and neither is a defect. They are what a graded axis can
say and a penalty-only axis cannot.
