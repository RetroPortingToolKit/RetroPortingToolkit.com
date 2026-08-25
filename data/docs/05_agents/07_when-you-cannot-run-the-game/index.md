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
updated: "2026-08-23"
---

Every debugging protocol in this fleet assumes an interactive session with a window on screen, a game file on disk, a Ghidra instance and often a second process running an emulator core. A headless container, a sandboxed reviewer or a contributor without the game file has none of that, and the repositories say almost nothing about what to do then. This page collects what can still be checked, what the artefacts already in the tree do and do not prove, what to record so a person can finish the check, and when to stop rather than guess. It is partly a statement of an open problem, and says so wherever that is the honest answer. If you have not read [If you are an agent, start here](/docs/agents/start-here), read it first; unfamiliar terms are defined in the [glossary](/docs/concepts/glossary).

## Work out what you actually have

Five resources decide what is available to you. Establish which you have before you plan anything, because each one you lack removes a class of claim, not just a command.

- **The repository and a compiler.** Enough to build the framework and run its own test suites. This is the floor and it is usually present.
- **Ghidra over MCP.** In three repositories its absence is a full stop: [nesrecomp](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md), [gbrecompiled](https://github.com/mstan/gbrecompiled/blob/master/CLAUDE.md) and [Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md) all state that no Ghidra means no action. Three repositories that gate on it ship no `.mcp.json`, so there may be no server to reach even in principle.
- **The game file.** Without it there is no regeneration, no run, and no way past the identity gate, which is designed to refuse.
- **A display.** Without one there is no screenshot, and [gcnlle](https://github.com/mstan/gcnlle/blob/master/CLAUDE.md) requires a screenshot before asserting anything about visible state.
- **A second process for the oracle.** Comparison is how this fleet establishes correctness. No oracle means no correctness claim, only a consistency claim.

> **You provide this.** You supply your own game file. The repositories do not contain one and do not distribute one, so an agent working from a clean clone will not have one. That is expected, not a misconfiguration. See [the game file you supply](/docs/concepts/the-game-file-you-supply).

## What you can still check

### 1. Build the framework

The build is the one gate that never needs a game file. Every toolchain documents its own invocation, and [Checking your own work](/docs/agents/verification-rituals) lists them all.

You should now see a recompiler binary and a compile that reports no errors. That is all it proves. It does not prove the recompiler produces correct output, and it never has.

### 2. Run the framework's own test suites

These are the checks most likely to be hermetic, and several are plain Python. [vbrecomp](https://github.com/mstan/vbrecomp) documents `python -m unittest discover recompiler/tests` as a milestone condition. [SuperMetroidRecomp](https://github.com/mstan/SuperMetroidRecomp) runs its framework suite with `python3 snesrecomp/tests/v2/run_tests.py`. [smsggrecomp](https://github.com/mstan/smsggrecomp) has decoder, ops and frontend self-tests under `tests/`. [DKC2Recomp](https://github.com/mstan/DKC2Recomp) runs `ctest --test-dir build -C Release --output-on-failure`.

You should now see a pass or fail count. Watch for skips: [SuperMetroidRecomp](https://github.com/mstan/SuperMetroidRecomp/blob/main/CLAUDE.md)'s `sm_widescreen_visual_smoke` "skips with code 77 when artifacts are missing", which is exactly the condition you are in, so a suite can report success while the test you cared about never ran. No repository states which of its tests need a game file, so read the failures rather than assuming, and record which tests skipped.

### 3. Compile-check the host tooling

[xboxlle-probe](https://github.com/mstan/xboxlle-probe) is the only repository that states what verification remains when the privileged resource is unavailable, and it is worth copying because it is explicit about the boundary.

From [`AGENTS.md`](https://github.com/mstan/xboxlle-probe/blob/main/AGENTS.md) in xboxlle-probe, lines 52 to 60:

> Without a human-authorized hardware session, verification is limited to:
>
> ```sh
> python -m unittest discover -s tests -v
> python -m py_compile host/xbox_probe.py
> ```
>
> Building the XBE is safe if it does not deploy or launch it.

The last line is the transferable idea: producing an artefact is safe, and using it is the part that needs the resource you lack.

### 4. Check the structural rules that do not need a run

Several house rules are properties of the source tree and can be settled by reading it.

- **Generated code is untouched**, and **nothing from the game file is in git**. Both are properties of the tree, settled by inspection.
- **Per-game data is not in shared code.** [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp) ships `tools/audit_runner_purity.py` for the rule that per-game values reach the runner through `g_game_spec` and `g_game_layout` rather than as literal hex. The repository does not state whether that script needs a built or running game, so check before relying on it.
- **A new debug command is wired up completely.** Adding one is a documented ritual, identical in [nesrecomp](https://github.com/mstan/nesrecomp/blob/master/TCP.md), [vbrecomp](https://github.com/mstan/vbrecomp/blob/master/TCP.md) and [cdirecomp](https://github.com/mstan/cdirecomp/blob/master/TCP.md): add the handler, register it in the dispatch table, mirror it on the oracle side, document it in the protocol file, rebuild, and never add a side-channel log instead. The first four steps are visible in a diff. See [the TCP debug protocol](/docs/reference/tcp-protocol).

### 5. Read the artefacts already in the tree

The sidecar `.log` files are the fleet's audit trail and are meant to be read without running anything. Every `.c` file implementing hardware behaviour has a sibling `.log` recording, per function or per address, what the disassembler showed and why the code was written that way. [gbrecompiled](https://github.com/mstan/gbrecompiled/blob/master/CLAUDE.md) is blunt about their status: "This is the audit trail. Lives next to the code."

Read the committed handoffs and audits too. They carry negative knowledge you cannot reconstruct: what was already ruled out, what burned time before, and which decisions must not be undone. [`YoshiNESRecomp/HANDOFF.md`](https://github.com/mstan/YoshiNESRecomp/blob/master/HANDOFF.md) states the rule for using them:

> Do not re-debug any of the above without producing measured evidence that
> contradicts it.

## What the artefacts tell you, and what they do not

The always-on ring buffers do not help you here. They live inside the running process and are queried over the debug socket while it runs, so with no running game there is no ring to query. What persists on disk is a smaller set, and each item answers a narrower question than it looks like.

| Artefact | Where | What it tells you |
|---|---|---|
| `dispatch_misses.toml`, `dispatch_misses.log`, `recomp_master_misses.toml.frag` | next to the executable | which addresses had no generated function during a past run |
| `recomp_seed_proposals.toml` | [gbarecomp](https://github.com/mstan/gbarecomp) | machine-written candidate functions awaiting a human merge, never merged automatically |
| `build/last_run_report.json` | [SuperMetroidRecomp](https://github.com/mstan/SuperMetroidRecomp) | the always-on post-mortem written on crash or exit: CPU state, recomp stack, abandons, tier2 coverage, dispatch-log ring, DB and PB rings. The one artefact in the fleet designed to be read after the process is gone |
| `*.jsonl` state traces | recompiled side and oracle side, per toolchain | a per-frame or per-write timeline from one run, diffable against another run |
| `*.csv` traces | `ppu_trace.csv`, `mapper_trace.csv`, `mode_trace.csv` | writes and bank switches with program counter and frame, from one run |
| `*_metadata.json` sidecars | next to generated projects | the structure of what was generated, and preferred over scraping the generated C |
| screenshots and frame dumps | per toolchain | what one past run rendered |

Two limits apply to all of them.

> **Warning.** An artefact in the tree is a record of some earlier run on some earlier build. It is evidence about that run, not about your change. Reporting "no dispatch misses" from a file you did not produce is a false pass, and it is worse than reporting nothing.

The second is mundane: several of these paths are absolute Windows locations on one workstation, such as the `C:/temp/` traces and screenshots in [nesrecomp](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md). Off that machine the file is simply not there, and its absence means nothing.

## Claims you are not allowed to make

The rule against guessing does not relax because you are under-resourced. It binds harder, because an under-resourced session produces exactly the plausible-sounding conclusion the rule exists to stop. See [Rules of the codebase](/docs/agents/house-invariants). Without a run, do not say:

- that a bug is **fixed**. In [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp) and [smsggrecomp](https://github.com/mstan/smsggrecomp) the user verifies end to end.
- that a **phase or milestone is done**. In [psxrecomp](https://github.com/mstan/psxrecomp) the pixels appear on screen or the phase is not done.
- that coverage is **FULLY STATIC**, or that a **strict pass** was achieved. Both are read from a run, in [gbarecomp](https://github.com/mstan/gbarecomp) and [MegaManZeroRecomp](https://github.com/mstan/MegaManZeroRecomp).
- that a **divergence is resolved**. That needs two implementations running to the same hardware event.
- that there are **no dispatch misses**, unless you produced the artefact yourself this session.

What you can say is what you measured. [`gcnlle/docs/HANDOFF_2026-08-09.md`](https://github.com/mstan/gcnlle/blob/master/docs/HANDOFF_2026-08-09.md) is the model: it fixes the permitted claim in advance and names what remains unestablished.

> The allowed current claim is: **the measured route clears the 66/s
> unthrottled emulation-capacity gate without removing the retained
> software/interpreter/DSP-LLE paths. A complete exercised force-floor gate,
> actual 60-Hz presentation, and release-quality audio are not yet established.**

Write your own version of that sentence. It is the single most useful thing you can leave behind.

## What to write down instead

The handoff is the deliverable when the check cannot be completed. [Contributing as an agent](/docs/agents/contributing-as-an-agent) carries the full template; these fields matter most here.

1. **What you could not run, and the exact reason.** Name the missing resource, not just the outcome.
2. **What you did check, with the command that produced each result**, including which tests skipped.
3. **The exact command a person should run to finish the check**, plus what output would confirm your change and what would refute it. A handoff that commissions a specific measurement beats one that reports a feeling.
4. **The claim you are allowed to make**, written as one sentence in the form above.
5. **Ranked, mutually exclusive next moves**, so the next session does not re-derive the options.
6. **Your caveats**, including anything you inferred by reading rather than by measuring.

## When to stop and hand off

Some of these are hard stops written into the repositories.

- **Ghidra is down and you are in a repository that gates on it.** [nesrecomp](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md), [gbrecompiled](https://github.com/mstan/gbrecompiled/blob/master/CLAUDE.md) and [Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md) say no reading files, no writing code, no suggestions, with no exceptions in their own text.
- **You are in [xboxlle-probe](https://github.com/mstan/xboxlle-probe) and the work needs hardware.** A human must identify the exact target and confirm authorisation first, and you must not scan a network or infer a host address. Stop and ask.
- **Your change touches indirect jumps, relocation or hardware interaction.** Those require a proof artefact, and code without proof is invalid in [psxrecomp](https://github.com/mstan/psxrecomp) and [vbrecomp](https://github.com/mstan/vbrecomp). No artefact, no finished change.
- **The framework the repository defers to is not present.** Do not reimplement the missing framework rules from context.

## If something goes wrong

Four failure modes are recorded in the repositories themselves.

- **Ghidra MCP looks configured but is unusable.** [`GumshoeNESRecomp/CODEX_SUMMARY.md`](https://github.com/mstan/GumshoeNESRecomp/blob/master/CODEX_SUMMARY.md) records it happening: the bridge "was not usable from this environment", and direct probes "returned generic HTML rather than consumable protocol data". Report it as a blocked precondition rather than working around it.
- **Concluding the debug tooling does not exist.** [`SuperMarioBrosNESRecomp/TCP.md`](https://github.com/mstan/SuperMarioBrosNESRecomp/blob/master/TCP.md) names this a "Common failure mode in prior sessions": the game repository was searched, no TCP tooling was found, and the wrong conclusion was drawn. The server lives in the framework repository.
- **Shell escaping on Windows.** [`nesrecomp/TCP.md`](https://github.com/mstan/nesrecomp/blob/master/TCP.md) says inline Python in bash often fails there, and to write a `.py` file rather than using `python -c "..."`.
- **Instrumentation left behind.** If you added temporary debug changes while investigating, list those files in your handoff and say they should be removed.

## What the fleet has not documented

This page is assembled from the one repository that addresses the problem directly and from inference across the rest. Naming the gaps is more useful than filling them.

No repository documents a headless build or verification path. None states which of its tests require a game file, so the hermetic subset can only be found by running them and reading the failures. None says whether an oracle can be built and exercised without a game file. There is no machine-readable list of what is safe to run in a sandbox, and no exit-code convention distinguishing "failed" from "could not be attempted", beyond CTest's skip code appearing once. [xboxlle-probe](https://github.com/mstan/xboxlle-probe/blob/main/AGENTS.md) is the only repository that states what verification is possible without its privileged resource, and it is the one repository where that resource is physically dangerous.

If you work through this and learn something the repositories do not say, that belongs in your handoff too.

## Source

- [`xboxlle-probe/AGENTS.md`](https://github.com/mstan/xboxlle-probe/blob/main/AGENTS.md), the fleet's only stated safe-verification boundary.
- [`gcnlle/docs/HANDOFF_2026-08-09.md`](https://github.com/mstan/gcnlle/blob/master/docs/HANDOFF_2026-08-09.md), for the required handback and the permitted-claim sentence.
- [`SuperMetroidRecomp/CLAUDE.md`](https://github.com/mstan/SuperMetroidRecomp/blob/main/CLAUDE.md), for `build/last_run_report.json` and the code 77 skip; [`nesrecomp/CLAUDE.md`](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md) and [`nesrecomp/TCP.md`](https://github.com/mstan/nesrecomp/blob/master/TCP.md), for the trace paths, the sidecar log format and the shell note.
- [`GumshoeNESRecomp/CODEX_SUMMARY.md`](https://github.com/mstan/GumshoeNESRecomp/blob/master/CODEX_SUMMARY.md) and [`SuperMarioBrosNESRecomp/TCP.md`](https://github.com/mstan/SuperMarioBrosNESRecomp/blob/master/TCP.md), for the two recorded environment failures.

## Next

- [Checking your own work](/docs/agents/verification-rituals), the full command table and what each gate catches.
- [Contributing as an agent](/docs/agents/contributing-as-an-agent), the handoff template this page keeps sending you to.
- [Machine-readable surfaces](/docs/agents/machine-surfaces), the artefact formats, JSON modes and exit codes in detail.
- [How changes go wrong here](/docs/agents/failure-modes), what you risk when a change ships unverified.
