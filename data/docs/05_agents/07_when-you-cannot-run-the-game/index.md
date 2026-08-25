---
title: "When you cannot run the game"
summary: "What an agent can still verify with no display, no game file, no Ghidra or no oracle process, what the persistent artefacts do and do not prove, and what to write down so a human can finish the check."
pageType: "guide"
tags: ["Agents", "Verification", "Testing"]
repos:
  - "https://github.com/mstan/xboxlle-probe"
  - "https://github.com/mstan/gcnlle"
  - "https://github.com/mstan/SuperMetroidRecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/vbrecomp"
updated: "2026-08-25"
---

Every debugging protocol in this fleet assumes an interactive session: a window on screen, a game file on disk, a Ghidra instance, and often a second process running an emulator core. A headless container, a sandboxed reviewer or a contributor without the game file has none of that, and the repositories say almost nothing about what to do then. Here is what you can still check, what the artefacts in the tree prove, what to record so a person can finish the check, and when to stop. Unfamiliar words are in the [glossary](/docs/concepts/glossary).

## Work out what you actually have

Five resources decide what is open to you. Each one you lack removes a class of claim, not just a command.

- **The repository and a compiler.** Enough to build the framework and run its own test suites. This is the floor and it is usually there.
- **Ghidra over MCP.** In [nesrecomp](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md), [gbrecompiled](https://github.com/mstan/gbrecompiled/blob/master/CLAUDE.md) and [Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md), no Ghidra means no action. Three repositories that gate on it ship no `.mcp.json`, so there may be no server to reach at all.
- **The game file.** Without it there is no regeneration, no run, and no way past the identity gate, which is built to refuse.
- **A display.** Without one there is no screenshot, and [gcnlle](https://github.com/mstan/gcnlle/blob/master/CLAUDE.md) requires a screenshot before you assert anything about visible state.
- **A second process for the oracle.** Comparison is how this fleet establishes correctness. No oracle means no correctness claim, only a consistency claim.

> **You provide this.** You supply your own game file. The repositories do not contain one and do not distribute one, so an agent working from a clean clone will not have one. That is expected, not a misconfiguration. See [the game file you supply](/docs/concepts/the-game-file-you-supply).

## What you can still check

### 1. Build the framework

The build is the one gate that never needs a game file. [Checking your own work](/docs/agents/verification-rituals) lists the invocation per toolchain.

You should now see a recompiler binary and a compile with no errors. That is all it proves. It says nothing about whether the recompiler produces correct output.

### 2. Run the framework's own test suites

These are the checks most likely to be hermetic, and several are plain Python. [vbrecomp](https://github.com/mstan/vbrecomp) documents `python -m unittest discover recompiler/tests`. [SuperMetroidRecomp](https://github.com/mstan/SuperMetroidRecomp) runs its framework suite with `python3 snesrecomp/tests/v2/run_tests.py`. [smsggrecomp](https://github.com/mstan/smsggrecomp) has decoder, ops and frontend self-tests under `tests/`. [DKC2Recomp](https://github.com/mstan/DKC2Recomp) runs `ctest --test-dir build -C Release --output-on-failure`.

You should now see a pass or fail count. Watch for skips: [SuperMetroidRecomp](https://github.com/mstan/SuperMetroidRecomp/blob/main/CLAUDE.md)'s `sm_widescreen_visual_smoke` "skips with code 77 when artifacts are missing", which is exactly your condition, so a suite can report success while the test you cared about never ran. No repository states which of its tests need a game file, so read the failures and record which tests skipped.

### 3. Compile-check the host tooling

[xboxlle-probe](https://github.com/mstan/xboxlle-probe) is the only repository that states what verification remains when the resource it depends on is unavailable.

From [`AGENTS.md`](https://github.com/mstan/xboxlle-probe/blob/main/AGENTS.md) in xboxlle-probe, lines 52 to 60:

> Without a human-authorized hardware session, verification is limited to:
>
> ```sh
> python -m unittest discover -s tests -v
> python -m py_compile host/xbox_probe.py
> ```
>
> Building the XBE is safe if it does not deploy or launch it.

The last line carries the transferable idea. Producing an artefact is safe. Using it is the part that needs the resource you lack.

### 4. Check the structural rules that need no run

Some house rules are properties of the source tree, and reading the tree settles them.

- **Generated code is untouched**, and **nothing from the game file is in git**. Both are visible by inspection.
- **Per-game data is not in shared code.** [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp) ships `tools/audit_runner_purity.py` for the rule that per-game values reach the runner through `g_game_spec` and `g_game_layout` rather than as literal hex. The repository does not say whether that script needs a built or running game, so check before you rely on it.
- **A new debug command is wired up completely.** Adding one is a documented ritual, identical in [nesrecomp](https://github.com/mstan/nesrecomp/blob/master/TCP.md), [vbrecomp](https://github.com/mstan/vbrecomp/blob/master/TCP.md) and [cdirecomp](https://github.com/mstan/cdirecomp/blob/master/TCP.md): add the handler, register it in the dispatch table, mirror it on the oracle side, document it in the protocol file, rebuild, and never add a side-channel log instead. The first four steps are visible in a diff.

### 5. Read the artefacts already in the tree

The sidecar `.log` files are meant to be read without running anything. Every `.c` file that implements hardware behaviour has a sibling `.log` recording, per function or per address, what the disassembler showed and why the code was written that way. [gbrecompiled](https://github.com/mstan/gbrecompiled/blob/master/CLAUDE.md) is blunt about their status: "This is the audit trail. Lives next to the code."

Read the committed handoffs and audits too. They carry what was already ruled out and which decisions must not be undone. [`YoshiNESRecomp/HANDOFF.md`](https://github.com/mstan/YoshiNESRecomp/blob/master/HANDOFF.md) states the rule for using them:

> Do not re-debug any of the above without producing measured evidence that
> contradicts it.

## What the artefacts tell you, and what they do not

The always-on ring buffers do not help here. They live inside the running process, so with no running game there is no ring to query. What persists on disk is smaller, and each item answers a narrower question than it looks like.

| Artefact | Where | What it tells you |
|---|---|---|
| `dispatch_misses.toml`, `dispatch_misses.log`, `recomp_master_misses.toml.frag` | next to the executable | which addresses had no generated function during a past run |
| `recomp_seed_proposals.toml` | [gbarecomp](https://github.com/mstan/gbarecomp) | machine-written candidate functions awaiting a human merge, never merged automatically |
| `build/last_run_report.json` | [SuperMetroidRecomp](https://github.com/mstan/SuperMetroidRecomp) | the always-on post-mortem written on crash or exit: CPU state, recomp stack, abandons, tier2 coverage, dispatch-log ring, DB and PB rings. The one artefact in the fleet designed to be read after the process is gone |
| `*.jsonl` state traces | recompiled side and oracle side, per toolchain | a per-frame or per-write timeline from one run, diffable against another run |
| `*.csv` traces | `ppu_trace.csv`, `mapper_trace.csv`, `mode_trace.csv` | writes and bank switches with program counter and frame, from one run |
| `*_metadata.json` sidecars | next to generated projects | the structure of what was generated, and preferred over scraping the generated C |
| screenshots and frame dumps | per toolchain | what one past run rendered |

> **Warning.** An artefact in the tree is a record of some earlier run on some earlier build. It is evidence about that run, not about your change. Reporting "no dispatch misses" from a file you did not produce is a false pass, and that is worse than reporting nothing.

The second limit is mundane. Several of these paths are absolute Windows locations on one workstation, such as the `C:/temp/` traces in [nesrecomp](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md). Off that machine the file is not there, and its absence means nothing.

## Claims you are not allowed to make

The rule against guessing does not relax because you have fewer resources. It binds harder, because a session with few resources produces exactly the plausible conclusion the rule exists to stop. Without a run, do not say:

- that a bug is **fixed**. In [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp) and [smsggrecomp](https://github.com/mstan/smsggrecomp) the user verifies end to end.
- that a **phase or milestone is done**. In [psxrecomp](https://github.com/mstan/psxrecomp) the pixels appear on screen or the phase is not done.
- that coverage is **FULLY STATIC**, or that a **strict pass** was achieved. Both are read from a run, in [gbarecomp](https://github.com/mstan/gbarecomp) and [MegaManZeroRecomp](https://github.com/mstan/MegaManZeroRecomp).
- that a **divergence is resolved**. That needs two implementations running to the same hardware event.
- that there are **no dispatch misses**, unless you produced the artefact yourself this session.

What you can say is what you measured. [`gcnlle/docs/HANDOFF_2026-08-09.md`](https://github.com/mstan/gcnlle/blob/master/docs/HANDOFF_2026-08-09.md) is the model. It fixes the permitted claim in advance and names what is still unestablished.

> The allowed current claim is: **the measured route clears the 66/s
> unthrottled emulation-capacity gate without removing the retained
> software/interpreter/DSP-LLE paths. A complete exercised force-floor gate,
> actual 60-Hz presentation, and release-quality audio are not yet established.**

Write your own version of that sentence. It is the most useful thing you can leave behind.

## What to write down instead

When the check cannot be finished, the handoff is the deliverable. [Contributing as an agent](/docs/agents/contributing-as-an-agent) has the full template. These fields matter most here.

1. **What you could not run, and the exact reason.** Name the missing resource, not just the outcome.
2. **What you did check, with the command behind each result**, including which tests skipped.
3. **The exact command a person should run to finish the check**, plus what output would confirm your change and what would refute it.
4. **The claim you are allowed to make**, as one sentence in the form above.
5. **Ranked, mutually exclusive next moves.**
6. **Your caveats**, including anything you worked out by reading rather than by measuring.

## When to stop and hand off

Some of these are hard stops written into the repositories.

- **Ghidra is down and you are in a repository that gates on it.** [nesrecomp](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md), [gbrecompiled](https://github.com/mstan/gbrecompiled/blob/master/CLAUDE.md) and [Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md) say no reading files, no writing code, no suggestions.
- **You are in [xboxlle-probe](https://github.com/mstan/xboxlle-probe) and the work needs hardware.** A human must identify the exact target and confirm authorisation first, and you must not scan a network or infer a host address. Stop and ask.
- **Your change touches indirect jumps, relocation or hardware interaction.** Those need a proof artefact, and code without proof is invalid in [psxrecomp](https://github.com/mstan/psxrecomp) and [vbrecomp](https://github.com/mstan/vbrecomp).
- **The framework the repository defers to is not present.** Do not reimplement the missing framework rules from context.

## If something goes wrong

Four failures are recorded in the repositories themselves.

- **Ghidra MCP looks configured but is unusable.** [`GumshoeNESRecomp/CODEX_SUMMARY.md`](https://github.com/mstan/GumshoeNESRecomp/blob/master/CODEX_SUMMARY.md) records the bridge as "was not usable from this environment", with direct probes that "returned generic HTML rather than consumable protocol data". Report it as a blocked precondition.
- **Concluding that the debug tooling does not exist.** [`SuperMarioBrosNESRecomp/TCP.md`](https://github.com/mstan/SuperMarioBrosNESRecomp/blob/master/TCP.md) calls this a "Common failure mode in prior sessions". The server lives in the framework repository, not the game repository.
- **Shell escaping on Windows.** [`nesrecomp/TCP.md`](https://github.com/mstan/nesrecomp/blob/master/TCP.md) says inline Python in bash often fails there, so write a `.py` file instead of using `python -c "..."`.
- **Instrumentation left behind.** List any temporary debug changes in your handoff and say they should be removed.

## What the fleet has not documented

No repository documents a headless build or verification path. None states which of its tests need a game file, so the hermetic subset can only be found by running them and reading the failures. None says whether an oracle can be built without a game file. There is no machine-readable list of what is safe to run in a sandbox, and no exit-code convention that separates "failed" from "could not be attempted", beyond CTest's skip code appearing once.

If you learn something the repositories do not say, that belongs in your handoff too.

## Source

- [`xboxlle-probe/AGENTS.md`](https://github.com/mstan/xboxlle-probe/blob/main/AGENTS.md), the fleet's only stated safe-verification boundary.
- [`gcnlle/docs/HANDOFF_2026-08-09.md`](https://github.com/mstan/gcnlle/blob/master/docs/HANDOFF_2026-08-09.md), for the required handback and the permitted-claim sentence.
- [`SuperMetroidRecomp/CLAUDE.md`](https://github.com/mstan/SuperMetroidRecomp/blob/main/CLAUDE.md), for `build/last_run_report.json` and the code 77 skip; [`nesrecomp/CLAUDE.md`](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md) and [`nesrecomp/TCP.md`](https://github.com/mstan/nesrecomp/blob/master/TCP.md), for the trace paths, the sidecar log format and the shell note.
- [`GumshoeNESRecomp/CODEX_SUMMARY.md`](https://github.com/mstan/GumshoeNESRecomp/blob/master/CODEX_SUMMARY.md) and [`SuperMarioBrosNESRecomp/TCP.md`](https://github.com/mstan/SuperMarioBrosNESRecomp/blob/master/TCP.md), for the two recorded environment failures.

## Next

- [Checking your own work](/docs/agents/verification-rituals), the full command table.
- [Contributing as an agent](/docs/agents/contributing-as-an-agent), the handoff template.
- [Machine-readable surfaces](/docs/agents/machine-surfaces), the artefact formats and exit codes.
- [How changes go wrong here](/docs/agents/failure-modes), what you risk when a change ships unverified.
