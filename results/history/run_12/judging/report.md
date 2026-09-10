# run_12 — adversarial judging report

Both workflows scored **100/100 correctness**. Every deterministic structural check came
back clean on both: no unreachable node, no broken reference, no invalid node, no orphan.
The panel was the only thing left that could separate them.

## Result

**Zero confirmed findings on either branch.** Two candidates were raised, one per branch,
and both were refuted.

| Branch | Candidate | Verdict | Where it went |
|---|---|---|---|
| alpha (n8n-as-code) | dashboard is built but delivered nowhere | REFUTED | reasoned, not scored |
| beta (native MCP) | workflow is inactive so it never runs | REFUTED | discarded |

## The alpha candidate, and why it is worth reading anyway

Both alpha finders independently reported that the HTML dashboard is built in a terminal
Code node with no outgoing edge, under a schedule trigger that has no response channel, so
the document reaches nobody.

The attacker refuted it on the catalogue's own family 6 rule: the brief says *presents* and
names no delivery mechanism, and a brief that states no X cannot be contradicted by X. That
is the same rule that rules out "the limit should have been higher". The refutation stands.

The observable difference survives the refutation and belongs in the record:

| Branch | Terminal node | Delivers |
|---|---|---|
| alpha | `code`, no outgoing edge | nothing leaves the execution |
| beta | `gmail` send, recipient left as a placeholder | an email, once a recipient is filled in |

Both branches scored the full `html_dashboard` capability, because `emitsHtml()` asks
whether some node produces HTML and never whether it reaches anyone. That is a real gap in
correctness, and it is now on the record rather than in a score.

## The beta candidate was the kit's fault

A finder reported `active: false` as a failure to run daily. Both builder prompts contain
the identical harness instruction "Leave it inactive.", and both workflows are inactive. The
finder had been handed the user request alone, with no way to tell a harness constraint from
a requirement. An attacker spent 62k tokens establishing something the prompt should have
made impossible to claim.

## What this run cost to judge

| | tokens |
|---|---:|
| four finders | 312,520 |
| two attackers | 126,280 |
| judging total | 438,800 |
| both builders | 308,689 |

Judging cost 1.42x the build it measured, against a cap of 3x.

## Defects this run found in the judge kit

1. The finder prompt carried only the user request. Harness constraints must travel with it,
   labelled as constraints.
2. `blindWorkflow()` strips every node `credentials` block, so family 7 is structurally
   unjudgeable from the blinded artefact. All four finders said so.
3. No finder had `validate_node_config` access, so families 3 and 7 went unevaluated. The
   validator output already existed in `quality_*.json` and was never handed over.

All three are fixed in the kit. None of them changes this run's result: zero confirmed
findings, and the Latent Defects axis stays at weight 0 for both branches.
