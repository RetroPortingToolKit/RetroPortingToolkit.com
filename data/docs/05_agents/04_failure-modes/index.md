---
title: "How changes go wrong here"
summary: "A field guide to the failure modes specific to static recompilation, organised by symptom, most of which are silent: a skipped subroutine, a hand edit that vanishes at the next regeneration, a per-game fix hiding a recompiler bug, and a measurement that was an artefact of how you ran it."
pageType: "reference"
tags: ["Agents", "Correctness", "Verification"]
repos:
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/vbrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/SuperMetroidRecomp"
updated: "2026-08-23"
---

A change to a recompiler does not fail the way ordinary software fails. It rarely crashes, it rarely throws, and the test suite is usually still green. Instead a subroutine quietly never runs, or your fix is deleted by the next build, or the number you measured was produced by the way you ran the program rather than by the program. This page is a field guide to those failures, organised by the symptom you actually see. Each entry says what it looks like, why it is silent, how the fleet detects it, and what to do about it. It assumes you have read [if you are an agent, start here](/docs/agents/start-here), and it is the practical companion to [rules of the codebase](/docs/agents/house-invariants): most of these failures are what the rules on that page exist to prevent.

## Symptoms and what they usually mean

| Symptom you see | What it usually is | Where to look first |
|---|---|---|
| The game runs, but one behaviour never happens | A dispatch miss | `dispatch_misses.log` or `dispatch_misses.toml` next to the executable |
| Your fix works, then stops working after a rebuild | An edit to generated code | The recompiler source, or the per-game config |
| The fix works for this game and no other | A recompiler pattern the tool does not handle generically | The config entry you were about to add |
| Everything passes and the port is still wrong | Coverage fell back to an interpreter, or a test skipped | The coverage report, and the test's exit code |
| A divergence appears, moves, or vanishes between runs | An artefact of how you ran it | Turbo mode, and anything keyed on frame index |
| Two implementations agree on a value that is wrong | Both have the same bug, or the tool is broken | The tool, before the code |
| A repository you did not touch breaks | A framework default or a submodule pointer | The downstream repository's stated assumptions |

## The game runs, but a subroutine never executes

**What it looks like.** The game boots, plays, and looks broadly right. One thing does not happen: an enemy never spawns, a door never opens, a sound never plays. Nothing reports an error.

**Why it is silent.** The runtime looked up an address in the dispatch table, found no generated function for it, and continued. The fleet is blunt about what that means. [`TCP.md`](https://github.com/mstan/vbrecomp/blob/master/TCP.md) in vbrecomp:

> "A dispatch miss means `vb_dispatch(addr)` found no generated function. The game skips that entire subroutine. This is a SILENT GAME-BREAKING BUG."

The same rule is stated in [`CLAUDE.md`](https://github.com/mstan/cdirecomp/blob/master/CLAUDE.md) in cdirecomp, where a miss is "a skipped subroutine = a silent game-breaking bug. Resolve before any other debugging."

**How it is detected.** By a file written next to the executable, checked after every single run. The artefact differs by project: `dispatch_misses.log` on Nintendo DS (one per CPU), Virtual Boy and Master System, `dispatch_misses.toml` on Genesis, and on Game Boy Advance a coverage report in the exit banner plus a miss list at `recomp_master_misses.toml.frag`. Empty means clean. [`CLAUDE.md`](https://github.com/mstan/ndsrecomp/blob/main/CLAUDE.md) in ndsrecomp puts it in the build loop itself:

> "5. **Check `dispatch_misses.log`** (per CPU). Non-empty = silent
> game-breaking bug: add discovered functions to config, regen,
> rebuild, re-run, until empty."

Several debug servers also answer a `dispatch_miss_info` command over the [TCP debug protocol](/docs/reference/tcp-protocol).

**What to do.** Resolve every miss before debugging anything else, then check how your project wants them resolved, because the fleet disagrees. gbarecomp emits `[[extra_func]]` proposals from the miss log for a human to merge, and vbrecomp says to add entries to the game's TOML and regenerate. segagenesisrecomp and smsggrecomp forbid exactly that: resolve through the disassembly driven pipeline, "**NOT** by hand-adding extra_func entries from the log alone". YoshiNESRecomp tells you not to touch `extra_func` at all "unless a divergence is PROVEN to originate from a missing function". Read the repository you are in.

## Your fix disappears at the next regeneration

**What it looks like.** You changed a line in a generated `.c` file, rebuilt, and the bug was fixed. A session later, after a regeneration nobody thought about, the bug is back and there is no diff to show for it.

**Why it is silent.** Generated code is build output. It is regularly gitignored, so a hand edit is invisible to `git status`, and it is rewritten wholesale by the next recompiler run. This is the most repeated rule in the fleet's agent instruction files, present in at least 20 of 34 repositories. [`CLAUDE.md`](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md) in nesrecomp:

> "`generated/*_full.c` and `generated/*_dispatch.c` are BUILD ARTIFACTS.
>
> **NEVER read them whole. NEVER modify them. NEVER patch them.**
>
> If generated code is wrong → fix `recompiler/src/code_generator.c` and regenerate."

The same file states the consequence directly: "Grep-and-sed on generated files is NEVER acceptable — it will be overwritten on the next regeneration and the fix will be silently lost." gcnlle compresses the whole principle into one line in its [`CLAUDE.md`](https://github.com/mstan/gcnlle/blob/master/CLAUDE.md): "Generated code is evidence, not authority."

**How it is detected.** Usually by the bug returning. The one mechanical guard in the fleet is a double regeneration that requires the output to be identical both times, which catches a generator that is not deterministic as well as a tree that has been touched by hand.

From [`CLAUDE.md`](https://github.com/mstan/SuperMetroidRecomp/blob/main/CLAUDE.md) in SuperMetroidRecomp:

```sh
# Regenerate src/gen/ (deterministic; needs the ROM at repo root).
# --strict-idempotent regenerates twice and requires byte-identical output.
# --no-tests skips the framework test suite. Native analyzer needs rustup;
# SNESRECOMP_ANALYSIS_BACKEND=python selects the slower reference path.
./tools/regen.sh --strict-idempotent
```

**What to do.** Fix the recompiler, the runtime, or the per-game config, then regenerate and rebuild. If you cannot work out which of those three owns the bug, that question is itself the finding, and it belongs in your handoff.

## The fix works for this game and hides a recompiler bug

**What it looks like.** A single game misbehaves. You add a per-function entry to its config, the game is correct, and the change is small and well scoped. Six months later the next title hits the same pattern and nobody connects them.

**Why it is silent.** The per-game config is a legitimate place to put things, so a fix there passes review on its own terms. What it conceals is that the recompiler failed to recognise a general pattern. [`CLAUDE.md`](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md) in Megaman3NESRecomp names the smell precisely:

> "**Per-function overrides in game.toml are discouraged.** They are not outright banned, but always favor a universal fix in the recompiler over adding per-function entries (like `cond_bail_func`, `stack_bail_func`, `push_jmp`) to game.toml. Per-function entries are a sign that the recompiler doesn't handle a 6502 pattern generically — fix the pattern recognition instead."

The PlayStation game template says the same thing from the other side, in [`CLAUDE.md`](https://github.com/mstan/ApeEscapeRecomp/blob/master/CLAUDE.md) in ApeEscapeRecomp: "A fix that only this game needs is a smell; prefer a class fix that the next title inherits."

**How it is detected.** By the shape of your own change. If the diff is a list of addresses or function names, you are describing a pattern the tool should recognise. Counting entries over time is the other signal: a config section that grows every game is a recompiler backlog written in a different file.

**What to do.** Fix the pattern in the recompiler and let every title inherit it. The fleet does not agree on what happens next if that changes behaviour in already shipped titles: psxrecomp says the faithfulness fix wins even if it breaks other titles, because those titles will be regenerated, while the Game Boy Advance repositories require a general and cited fix rather than one hidden behind a per-game condition, which is a constraint that protects other titles. Both reject the per-game hack, and they point in different directions on breakage, so say which you are doing.

## Everything passes and the port is still wrong

**What it looks like.** The build is clean, the tests are green, the game runs. It is still not correct.

**Why it is silent.** Two different mechanisms produce this, and they look identical from the outside.

The first is coverage falling back. Where a project keeps an interpreter or a self healing path, a function that failed to recompile can be executed anyway, so the symptom of a discovery regression is not a crash but a quiet loss of static coverage. gbarecomp requires the coverage report to read FULLY STATIC with zero interpreted and zero healed code, and permits the interpreter to bridge a miss "ONLY if it is loudly logged, recompiled on the fly, and fed back to the TOML". [`CLAUDE.md`](https://github.com/mstan/MegaManZeroRecomp/blob/main/CLAUDE.md) in MegaManZeroRecomp gives the machine checkable version:

> "Run `tools/verify-strict.ps1` for the smoke route and the named campaign being
> changed. A strict pass must report zero dispatch misses, interpreted
> instructions, healed/cache code, unmapped accesses, and unhandled I/O. Visual
> or timing claims should cite the independent oracle and the exact checkpoints."

The second is a test that did not run. [`CLAUDE.md`](https://github.com/mstan/SuperMetroidRecomp/blob/main/CLAUDE.md) in SuperMetroidRecomp documents `sm_widescreen_visual_smoke` as a test that "skips with code 77 when artifacts are missing", which is the CTest skip convention. A skip is not a failure, so a suite in which the interesting test skipped reports success.

**How it is detected.** Read the coverage report rather than the exit status, and read what each test reported rather than the summary line. Exit code 77 means skipped, and the exit code table on [errors and exit codes](/docs/reference/errors-and-exit-codes) lists the conventions in use.

**What to do.** Treat green as the absence of evidence, not as evidence. The fleet's own definitions of done are stricter than a passing suite: pixels on the screen for psxrecomp, a coverage report reading FULLY STATIC for gbarecomp, the five zeros above for MegaManZeroRecomp, and user confirmation end to end for segagenesisrecomp and smsggrecomp.

## The divergence you measured was an artefact of how you ran it

**What it looks like.** You find a divergence at a specific frame, report it, and it moves or disappears when someone else runs the same route.

**Why it is silent.** The measurement apparatus has state of its own. Fast forward changes trajectories, and frame indices do not mean the same thing in two engines. From a real session handoff in [`SESSION_HANDOFF.md`](https://github.com/mstan/GumshoeNESRecomp/blob/master/SESSION_HANDOFF.md) in GumshoeNESRecomp:

> "**Turbo mode can produce different `$26` trajectories** than non-turbo.
> Use non-turbo (`verify_slow.txt`) for consistent traces. The "frame 1289
> `$26 03→04` divergence" I initially reported was a turbo-mode artifact"

The frame index problem is stated in [`TCP.md`](https://github.com/mstan/ndsrecomp/blob/main/TCP.md) in ndsrecomp: "The DS has two CPUs at different clocks. Comparing native vs oracle by "frame N" is meaningless across engines."

**How it is detected.** Re-run the same route without turbo and see whether the finding survives. Compare against the sync rule the fleet applies everywhere: synchronise on hardware events, not frame numbers. The documented markers include VBlank IRQ count, DMA completion count, timer overflow count, software interrupt count and a specific program counter at a specific function entry on Game Boy Advance, and on NES the first write to PPUADDR targeting the palette region.

**What to do.** Fix the harness before you fix the game, then find the first divergence, because everything after it is consequence rather than cause. The workflow for that is on [debug a divergence](/docs/guides/debug-a-divergence).

## Two implementations agree, and both are wrong

**What it looks like.** Your recompiled build and a second implementation return the same value, so the value looks confirmed.

**Why it is silent.** Agreement feels like corroboration. It is only corroboration when the two implementations are independent and both are known good. [`CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md) in psxrecomp:

> ""The screenshot command returns black" is not a reason to skip visual
> verification. It is a reason to fix the screenshot command.
> "Both the native runtime and interpreter show the same wrong value"
> does not make the value correct. It means both have the same bug."

**How it is detected.** By distrusting a tool whose output is implausible, and by checking that your oracle is genuinely independent of the thing it judges.

**What to do.** Fix the tool. The same file forbids the two comfortable alternatives: do not infer correctness from two broken implementations agreeing, and do not carry the breakage forward in a handoff as a known limitation, because a known-broken tool is a debt that compounds. If the query you need does not exist, several repositories tell you to build it into the debug server rather than work around it.

## A repository you did not touch stops being correct

**What it looks like.** You changed a default in a framework, all its own checks pass, and a game repository that depends on it is now wrong or documents something untrue.

**Why it is silent.** Game repositories record assumptions about framework behaviour in prose, and prose does not fail a build. There is a live example. [`CLAUDE.md`](https://github.com/mstan/TsumuLightRecomp/blob/master/CLAUDE.md) in TsumuLightRecomp explains that its NTSC-J title runs on the NTSC-U BIOS because high level emulation boot is currently the default in psxrecomp. Flip that default back and the region note is wrong, with no test to catch it. psxrecomp's own `CLAUDE.md` carries four dated amendments that progressively invert its opening position on high level emulation, so the current default has to be reconstructed from a stack of amendments rather than read once.

The second version of this is ordering. [`CLAUDE.md`](https://github.com/mstan/SonicTheHedgehogRecomp/blob/master/CLAUDE.md) in SonicTheHedgehogRecomp:

> "## Submodule commit order (PRINCIPLES.md #20)
>
> 1. Commit `segagenesisrecomp/` (the submodule) first.
> 2. Bump the submodule pointer in this repo second.
> 3. Sonic 2's release repo bumps independently."

Do it in the other order and the release repository points at a tree that does not contain your fix.

**How it is detected.** Not automatically. Only three repositories in the `mstan` fleet carry any continuous integration workflow, and none of the 36 agent instruction files mentions continuous integration at all, so nothing is watching the downstream repositories on your behalf.

**What to do.** When you change a framework default, name the downstream repositories that state an assumption about it, and say in your handoff which ones you checked and which you did not. Commit the submodule before the pointer.

## Something you added for debugging is still there

**What it looks like.** A clean fix, plus instrumentation, plus a stub that made the build link.

**Why it is silent.** Each piece was reasonable when you added it. A summary document in GumshoeNESRecomp lists two files modified with temporary instrumentation and notes "These should be removed after the investigation", which is the point: the removal is a separate act that has to be remembered. The stub version is worse because it looks like working code. [`CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md) in psxrecomp:

> "There are **no stubs**. A function is either fully implemented or it
> aborts with a fatal error. `return 0;`, `return 1;`, `cpu->v0 = 1;
> return;` are all stubs. `// TODO`, `// FIXME`, `// for now` are all
> stubs. Hand-delivering an event because the chain handler isn't
> installed is a stub wearing a costume and is the worst kind because it
> hides the missing integration."

**How it is detected.** By reading your own diff before you hand off, and by the abort path firing loudly where a stub would have returned quietly.

**What to do.** Remove instrumentation, or say in the handoff that it is still there and where. Note that the fleet contradicts itself on print debugging: it is absolutely forbidden in psxrecomp, YoshiNESRecomp and Megaman3NESRecomp, permitted for a crash banner in vbrecomp, a numbered step in the debugging loop in nesrecomp and gbrecompiled, and restricted only in hot paths in segagenesisrecomp. Follow the repository you are in, and do not carry the rule to another one.

## What the fleet does not write down

Two failure modes an agent might expect are not documented in the 36 agent instruction files, so this page will not describe them as if they were.

No mod-facing or netplay-facing regression is named anywhere in that corpus, and there is no recorded case of a timing change that passes the tests and breaks a mod. What is documented is adjacent: timing claims must cite the independent oracle and exact checkpoints, and a fast forward run can produce a trajectory that a normal speed run does not.

Nondeterminism is documented for the build, not for the run. `--strict-idempotent` requires two regenerations to be byte identical, and a scripted play session is repeatable because the input script language supports `SAVE_STATE`, `LOAD_STATE`, `WAIT_RAM8`, `ASSERT_RAM8` and an `EXIT [code]` that makes the session a gate. What save states, rewind and rollback netplay demand of recompiled code is covered from other sources on [determinism](/docs/concepts/determinism) rather than invented here.

## Source

- [mstan/nesrecomp](https://github.com/mstan/nesrecomp): [`CLAUDE.md`](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md), [`TCP.md`](https://github.com/mstan/nesrecomp/blob/master/TCP.md), [`COSIM.md`](https://github.com/mstan/nesrecomp/blob/master/COSIM.md)
- [mstan/psxrecomp](https://github.com/mstan/psxrecomp): [`CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md), [`PRINCIPLES.md`](https://github.com/mstan/psxrecomp/blob/master/PRINCIPLES.md)
- [mstan/vbrecomp](https://github.com/mstan/vbrecomp): [`TCP.md`](https://github.com/mstan/vbrecomp/blob/master/TCP.md)
- [mstan/gbarecomp](https://github.com/mstan/gbarecomp): [`CLAUDE.md`](https://github.com/mstan/gbarecomp/blob/main/CLAUDE.md)
- [mstan/ndsrecomp](https://github.com/mstan/ndsrecomp): [`CLAUDE.md`](https://github.com/mstan/ndsrecomp/blob/main/CLAUDE.md), [`TCP.md`](https://github.com/mstan/ndsrecomp/blob/main/TCP.md)
- [mstan/segagenesisrecomp](https://github.com/mstan/segagenesisrecomp): [`CLAUDE.md`](https://github.com/mstan/segagenesisrecomp/blob/master/CLAUDE.md), and [mstan/smsggrecomp](https://github.com/mstan/smsggrecomp): [`CLAUDE.md`](https://github.com/mstan/smsggrecomp/blob/main/CLAUDE.md)
- [mstan/SuperMetroidRecomp](https://github.com/mstan/SuperMetroidRecomp): [`CLAUDE.md`](https://github.com/mstan/SuperMetroidRecomp/blob/main/CLAUDE.md)
- [mstan/Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp): [`CLAUDE.md`](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md), and [mstan/MegaManZeroRecomp](https://github.com/mstan/MegaManZeroRecomp): [`CLAUDE.md`](https://github.com/mstan/MegaManZeroRecomp/blob/main/CLAUDE.md)
- [mstan/GumshoeNESRecomp](https://github.com/mstan/GumshoeNESRecomp): [`SESSION_HANDOFF.md`](https://github.com/mstan/GumshoeNESRecomp/blob/master/SESSION_HANDOFF.md), [`SUMMARY_2026-04-12.md`](https://github.com/mstan/GumshoeNESRecomp/blob/master/SUMMARY_2026-04-12.md)

## Next

- [Checking your own work](/docs/agents/verification-rituals) for the build and test command that catches each of these per repository.
- [Machine-readable surfaces](/docs/agents/machine-surfaces) for the miss logs, coverage reports and exit codes named above, and how to read them programmatically.
- [When you cannot run the game](/docs/agents/when-you-cannot-run-the-game) for what remains detectable when you cannot launch anything.
- [Contributing as an agent](/docs/agents/contributing-as-an-agent) for how to record a failure you found but did not fix.
