---
title: "How changes go wrong here"
summary: "A field guide to the failures specific to static recompilation, sorted by symptom: a skipped subroutine, a hand edit that vanishes at the next regeneration, a per-game fix hiding a recompiler bug, and a measurement produced by how you ran it."
pageType: "reference"
tags: ["Agents", "Correctness", "Verification"]
repos:
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/vbrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/SuperMetroidRecomp"
updated: "2026-08-25"
---

A change to a recompiler does not fail the way ordinary software fails. It rarely crashes, it rarely throws, and the test suite is usually still green. Instead a subroutine quietly never runs. Or your fix is deleted by the next build. Or the number you measured came from how you ran the program, not from the program.

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

**You see.** The game boots and looks broadly right. One thing never happens: an enemy does not spawn, a door does not open, a sound does not play. No error.

**Why it is silent.** The runtime looked up an address in the dispatch table, found no generated function, and carried on. [`TCP.md`](https://github.com/mstan/vbrecomp/blob/master/TCP.md) in vbrecomp: "The game skips that entire subroutine. This is a SILENT GAME-BREAKING BUG." [`CLAUDE.md`](https://github.com/mstan/cdirecomp/blob/master/CLAUDE.md) in cdirecomp calls it "a skipped subroutine = a silent game-breaking bug. Resolve before any other debugging."

**How it is detected.** By a file next to the executable, read after every run. `dispatch_misses.log` on Nintendo DS (one per CPU), Virtual Boy and Master System. `dispatch_misses.toml` on Genesis. On Game Boy Advance, a coverage report in the exit banner plus `recomp_master_misses.toml.frag`. Empty means clean. Several debug servers also answer `dispatch_miss_info` over the [TCP debug protocol](/docs/reference/tcp-protocol). [`CLAUDE.md`](https://github.com/mstan/ndsrecomp/blob/main/CLAUDE.md) in ndsrecomp puts the check in the build loop:

> "5. **Check `dispatch_misses.log`** (per CPU). Non-empty = silent
> game-breaking bug: add discovered functions to config, regen,
> rebuild, re-run, until empty."

**What to do.** Resolve every miss before you debug anything else, the way your repository wants it done. gbarecomp emits `[[extra_func]]` proposals for a human to merge and vbrecomp says to add entries to the game's TOML and regenerate, while segagenesisrecomp and smsggrecomp forbid that and require the disassembly driven pipeline. YoshiNESRecomp says not to touch `extra_func` "unless a divergence is PROVEN to originate from a missing function".

## Your fix disappears at the next regeneration

**You see.** You changed a line in a generated `.c` file and the bug went away. A session later, after a regeneration nobody thought about, it is back, with no diff to show for it.

**Why it is silent.** Generated code is build output. It is usually gitignored, so the edit is invisible to `git status`, and the next recompiler run rewrites the file. [`CLAUDE.md`](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md) in nesrecomp calls those files BUILD ARTIFACTS and states the consequence: "Grep-and-sed on generated files is NEVER acceptable — it will be overwritten on the next regeneration and the fix will be silently lost." The rule is quoted in full on [rules of the codebase](/docs/agents/house-invariants).

**How it is detected.** Usually by the bug coming back. The one mechanical guard is a double regeneration that requires identical output both times. From [`CLAUDE.md`](https://github.com/mstan/SuperMetroidRecomp/blob/main/CLAUDE.md) in SuperMetroidRecomp:

```sh
# Regenerate src/gen/ (deterministic; needs the ROM at repo root).
# --strict-idempotent regenerates twice and requires byte-identical output.
# --no-tests skips the framework test suite. Native analyzer needs rustup;
# SNESRECOMP_ANALYSIS_BACKEND=python selects the slower reference path.
./tools/regen.sh --strict-idempotent
```

**What to do.** Fix the recompiler, the runtime or the per-game config, then regenerate. If you cannot tell which of the three owns the bug, that question is the finding, and it belongs in your handoff.

## The fix works for this game and hides a recompiler bug

**You see.** One game misbehaves. A per-function entry in its config fixes it. Six months later the next title hits the same pattern and nobody connects them.

**Why it is silent.** The per-game config is a legitimate place to put things, so the fix passes review on its own terms. What it hides is a general pattern the recompiler failed to recognise. [`CLAUDE.md`](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md) in Megaman3NESRecomp names the smell:

> "**Per-function overrides in game.toml are discouraged.** They are not outright banned, but always favor a universal fix in the recompiler over adding per-function entries (like `cond_bail_func`, `stack_bail_func`, `push_jmp`) to game.toml. Per-function entries are a sign that the recompiler doesn't handle a 6502 pattern generically — fix the pattern recognition instead."

[`CLAUDE.md`](https://github.com/mstan/ApeEscapeRecomp/blob/master/CLAUDE.md) in ApeEscapeRecomp says it from the other side: "A fix that only this game needs is a smell; prefer a class fix that the next title inherits."

**How it is detected.** By the shape of your own diff. A list of addresses or function names is a pattern the tool should recognise, and a config section that grows with every game is a recompiler backlog kept in the wrong file.

**What to do.** Fix the pattern in the recompiler. What happens next is not agreed: psxrecomp says the faithfulness fix wins even if it breaks other titles, because those titles will be regenerated, and the Game Boy Advance repositories require a general, cited fix that protects other titles. Say which you are doing.

## Everything passes and the port is still wrong

**You see.** Clean build, green tests, the game runs. It is still not correct.

**Why it is silent.** Two mechanisms produce this and they look identical from outside. The first is coverage falling back. Some projects keep a small interpreter, which runs missed instructions one at a time, the way an emulator does. It is a fallback and it works, so a function that failed to recompile still runs, and a discovery regression shows up as a quiet loss of static coverage rather than a crash. gbarecomp requires the coverage report to read FULLY STATIC, and allows the interpreter to bridge a miss "ONLY if it is loudly logged, recompiled on the fly, and fed back to the TOML". The second is a test that did not run: [`CLAUDE.md`](https://github.com/mstan/SuperMetroidRecomp/blob/main/CLAUDE.md) in SuperMetroidRecomp documents `sm_widescreen_visual_smoke` as a test that "skips with code 77 when artifacts are missing", and a skip is not a failure.

**How it is detected.** Read the coverage report, not the exit status. Read what each test reported, not the summary line. [Errors and exit codes](/docs/reference/errors-and-exit-codes) lists the conventions.

**What to do.** Green is the absence of evidence, not evidence. The fleet's own definitions of done are stricter: pixels on the screen for psxrecomp, FULLY STATIC for gbarecomp, five zeroes for MegaManZeroRecomp, user confirmation end to end for segagenesisrecomp and smsggrecomp. They are quoted on [checking your own work](/docs/agents/verification-rituals).

## The divergence you measured came from how you ran it

**You see.** A divergence at a specific frame that moves or disappears when someone else runs the same route.

**Why it is silent.** Your measuring apparatus has state of its own. Fast forward changes trajectories, and frame indices do not mean the same thing in two engines. From a real session handoff in [`SESSION_HANDOFF.md`](https://github.com/mstan/GumshoeNESRecomp/blob/master/SESSION_HANDOFF.md) in GumshoeNESRecomp:

> "**Turbo mode can produce different `$26` trajectories** than non-turbo.
> Use non-turbo (`verify_slow.txt`) for consistent traces. The "frame 1289
> `$26 03→04` divergence" I initially reported was a turbo-mode artifact"

[`TCP.md`](https://github.com/mstan/ndsrecomp/blob/main/TCP.md) in ndsrecomp states the index problem: "The DS has two CPUs at different clocks. Comparing native vs oracle by "frame N" is meaningless across engines."

**How it is detected.** Re-run the route without turbo and see whether the finding survives. Then check it against the sync rule: hardware events, not frame numbers. Documented markers are VBlank IRQ count, DMA completion count, timer overflow count, software interrupt count, and a specific program counter at a specific function entry on Game Boy Advance. On NES it is the first write to PPUADDR targeting the palette region.

**What to do.** Fix the harness first, then find the first divergence. The workflow is on [debug a divergence](/docs/guides/debug-a-divergence).

## Two implementations agree, and both are wrong

**You see.** Your build and a second implementation return the same value, so the value looks confirmed.

**Why it is silent.** Agreement feels like corroboration. It is corroboration only when the two implementations are independent and both are known good. [`CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md) in psxrecomp:

> ""The screenshot command returns black" is not a reason to skip visual
> verification. It is a reason to fix the screenshot command.
> "Both the native runtime and interpreter show the same wrong value"
> does not make the value correct. It means both have the same bug."

**What to do.** Distrust a tool whose output is implausible, check that your oracle is independent of the thing it judges, and fix the tool. Do not carry the breakage forward in a handoff as a known limitation. If the query you need does not exist, build it into the debug server.

## A repository you did not touch stops being correct

**You see.** You changed a framework default, its own checks pass, and a game repository that depends on it is now wrong or documents something untrue.

**Why it is silent.** Game repositories record their assumptions in prose, and prose does not fail a build. [`CLAUDE.md`](https://github.com/mstan/TsumuLightRecomp/blob/master/CLAUDE.md) in TsumuLightRecomp explains that its NTSC-J title runs on the NTSC-U BIOS because high level emulation boot is currently the default in psxrecomp. Flip that default back and the region note is wrong, with no test to catch it. psxrecomp's own `CLAUDE.md` carries four dated amendments that progressively invert its opening position on high level emulation, so the current default has to be reconstructed from the stack.

The other version is ordering. [`CLAUDE.md`](https://github.com/mstan/SonicTheHedgehogRecomp/blob/master/CLAUDE.md) in SonicTheHedgehogRecomp:

> "## Submodule commit order (PRINCIPLES.md #20)
>
> 1. Commit `segagenesisrecomp/` (the submodule) first.
> 2. Bump the submodule pointer in this repo second.
> 3. Sonic 2's release repo bumps independently."

Do it in the other order and the release repository points at a tree without your fix.

**What to do.** Nothing detects this for you: four repositories in the `mstan` fleet carry a workflow file, and none of the 36 agent instruction files mentions continuous integration. So name the downstream repositories that state an assumption about the default you changed, and say which ones you checked. Commit the submodule before the pointer.

## Something you added for debugging is still there

**You see.** A clean fix, plus instrumentation, plus a stub that made the build link.

**Why it is silent.** Each piece was reasonable when you added it, and removal is a separate act that has to be remembered. A summary document in GumshoeNESRecomp lists two files modified with temporary instrumentation and notes "These should be removed after the investigation". The stub is worse, because it looks like working code. psxrecomp allows none at all and counts a placeholder return and a `// TODO` as stubs, quoted on [rules of the codebase](/docs/agents/house-invariants).

**What to do.** Read your own diff before you hand off. Remove the instrumentation, or say in the handoff that it is still there and where. The fleet contradicts itself on print debugging: forbidden in psxrecomp, YoshiNESRecomp and Megaman3NESRecomp, allowed for a crash banner in vbrecomp, a step in the debugging loop in nesrecomp, restricted to hot paths in segagenesisrecomp. Follow the repository you are in.

## What the fleet does not write down

Two failures an agent might expect are missing from the 36 agent instruction files. Nothing there names a mod-facing or netplay-facing regression, and no case is recorded of a timing change that passes the tests and breaks a mod. What is documented is next door: timing claims must cite the independent oracle and the exact checkpoints.

Nondeterminism is documented for the build, not for the run. `--strict-idempotent` requires two regenerations to be byte identical, and a scripted play session is repeatable because the input script language supports `SAVE_STATE`, `LOAD_STATE`, `WAIT_RAM8`, `ASSERT_RAM8` and an `EXIT [code]`. What save states, rewind and rollback netplay need from recompiled code is on [determinism](/docs/concepts/determinism).

## Source

- The agent files quoted above: [`nesrecomp/CLAUDE.md`](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md), [`psxrecomp/CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md), [`SuperMetroidRecomp/CLAUDE.md`](https://github.com/mstan/SuperMetroidRecomp/blob/main/CLAUDE.md), [`Megaman3NESRecomp/CLAUDE.md`](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md), [`TsumuLightRecomp/CLAUDE.md`](https://github.com/mstan/TsumuLightRecomp/blob/master/CLAUDE.md), [`ApeEscapeRecomp/CLAUDE.md`](https://github.com/mstan/ApeEscapeRecomp/blob/master/CLAUDE.md), [`SonicTheHedgehogRecomp/CLAUDE.md`](https://github.com/mstan/SonicTheHedgehogRecomp/blob/master/CLAUDE.md).
- The protocol files: [`vbrecomp/TCP.md`](https://github.com/mstan/vbrecomp/blob/master/TCP.md), [`ndsrecomp/TCP.md`](https://github.com/mstan/ndsrecomp/blob/main/TCP.md), [`ndsrecomp/CLAUDE.md`](https://github.com/mstan/ndsrecomp/blob/main/CLAUDE.md), [`cdirecomp/CLAUDE.md`](https://github.com/mstan/cdirecomp/blob/master/CLAUDE.md).
- The handoffs: [`SESSION_HANDOFF.md`](https://github.com/mstan/GumshoeNESRecomp/blob/master/SESSION_HANDOFF.md) and [`SUMMARY_2026-04-12.md`](https://github.com/mstan/GumshoeNESRecomp/blob/master/SUMMARY_2026-04-12.md) in GumshoeNESRecomp.

## Next

- [Checking your own work](/docs/agents/verification-rituals), the build and test command per repository.
- [Machine-readable surfaces](/docs/agents/machine-surfaces), the miss logs, coverage reports and exit codes above.
- [When you cannot run the game](/docs/agents/when-you-cannot-run-the-game), what stays detectable when you cannot launch anything.
- [Contributing as an agent](/docs/agents/contributing-as-an-agent), how to record a failure you found but did not fix.
