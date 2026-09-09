# Install probe

A narrow harness for the setup phase alone.

The full benchmark measures install and build together and takes many minutes per run, which is too slow to iterate on install ergonomics. This probe does one thing: prepare a pristine sandbox, then score the command log an installer agent leaves behind.

It does **not** spawn the agent. The orchestrator does that and times it from the outside, so the stopwatch never lives inside the thing being measured — an installer asked to time itself reported "~2 minutes" for a step that measures 33 s.

## Use

```bash
# 1. Pack the build under test, then seed a sandbox
N8NAC_TARBALL_DIR=/path/to/tarballs node benchmark/install-probe/probe.mjs prepare iter4-help-grouping

# 2. Dispatch an installer agent against that directory with the standard prompt below,
#    timing it externally. It must leave installer_log.json in the sandbox.

# 3. Score it
node benchmark/install-probe/probe.mjs score iter4-help-grouping --seconds 240 --tokens 61000 --tool-calls 14

# 4. Compare every iteration
node benchmark/install-probe/probe.mjs compare
```

`prepare` seeds `.env` (host and API key from the repo `.env`), an empty `workflows/`, and every `.tgz` in `N8NAC_TARBALL_DIR`.

## The prompt

Keep it byte-identical between iterations, or the comparison measures the prompt.

> You are an isolated worker in a hermetic sandbox. Operate exclusively inside the working directory named below; do not read, list, or write anything outside it, and do not inspect parent or sibling directories.
>
> CRITICAL: on the target n8n instance, you must NEVER list, search for, or inspect any existing workflows.
>
> Your working directory is: `<sandbox path>`
>
> `cd` there first. It contains a `.env` with the n8n host and API key, and three local npm tarballs. n8n-as-code is an unreleased build not on the public registry, so install it from those tarballs — install all three in a single npm command, they depend on each other by exact version and installing them separately makes npm fetch a published copy instead.
>
> Install to a prefix inside your working directory (for example `./.toolchain`) rather than the machine-wide global prefix, and note the resulting bin directory.
>
> Your task: **install n8n-as-code and get it ready to build workflows** against the n8n instance described in `.env`. Stop when the toolchain is installed and the workspace reports itself ready. Do NOT create, design or push any workflow — that is someone else's job.
>
> When done, write `installer_log.json` in your working directory with `commands`, `commandCount`, `readyCheck`, `frictionEvents` and `notes`. Use forward slashes in any path so the JSON stays valid. Report the same in your final response, including the total command count.

## Buckets

Commands are classified mechanically, first match wins, so two iterations compare without a human re-judging each line:

| bucket | rule |
|---|---|
| `acquisition` | `npm install` |
| `discovery` | `--help`, `grep` into `dist/`, reading a config file |
| `configuration` | any `n8nac` invocation |
| `reconnaissance` | everything else |

## Reading the results

**One run per variant does not resolve small differences.** Across four iterations the step from 20 commands to 8–10 was consistent on five independent metrics and is signal; the difference between 8 and 10 on consecutive runs is not. Repeat a variant three times before crediting a change of a command or two.

`binDir` used to be a required field and was removed: agents write it as a Windows path,
the backslashes break the JSON, and three runs spent two, three and four commands
respectively repairing the log. That variance landed in `reconnaissance` and swamped the
signal it was meant to carry. Anything the log asks for is a command the agent spends.

Some friction is the sandbox, not the product: installing from local tarballs, the `--prefix` instruction that puts shims somewhere unusual on Windows, and commands the harness permission classifier refuses. Read `frictionEvents` before attributing anything.
