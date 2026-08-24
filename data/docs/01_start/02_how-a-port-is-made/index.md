---
title: "How a port is made"
summary: "The whole pipeline as one narrative, from the game file you supply through discovery, translation, compilation and verification to enhancement, naming the six stages the rest of this site uses."
section: "start"
sectionTitle: "Start here"
pageType: "concept"
tags: ["Porting", "Pipeline", "Recompiler"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/FaxanaduRecomp"
  - "https://github.com/mstan/MinishCapRecomp"
updated: "2026-08-23"
---

A port in this fleet is not a program somebody sat down and wrote. It is a recorded procedure for turning one specific game file into a native program, and the procedure is the same six stages on every console: verify the file you supply, discover which bytes are code, translate them to C, compile that C against a runtime, verify the result against a reference implementation, and only then add anything the original hardware could not do. This page walks those six stages once, end to end, and links each to the page that explains it properly. The names used here are the names used everywhere else on this site.

## The stages, end to end

One thing happens before stage one: the toolchain for your console has to exist and be built. That is [build a toolchain](/docs/guides/build-a-toolchain), and on most consoles it is a one-off `cmake` invocation that you repeat only when the framework changes.

| Stage | What goes in | What comes out | Explained in |
|---|---|---|---|
| 1. The file you supply | your own dump | a verified file and an identity record | [the game file you supply](/docs/concepts/the-game-file-you-supply) |
| 2. Discovery | the guest binary, plus hints | the set of function entry points | [telling code from data](/docs/concepts/code-discovery) |
| 3. Translation | those entries and their instructions | generated C and a dispatch table | [the recompiler and the runtime](/docs/concepts/recompiler-and-runtime) |
| 4. Compilation | generated C, the runtime, per-game shims | a native executable | [build a toolchain](/docs/guides/build-a-toolchain) |
| 5. Verification | that executable and an oracle | a clean run, or a first divergence | [proving it with co-simulation](/docs/concepts/co-simulation) |
| 6. Enhancement | a port that already works | opt-in, default-off features | [write a mod](/docs/guides/write-a-mod) |

![Each stage hands the next one an artefact, so the pipeline is a chain rather than a list of steps. The dashed return is where the time goes: a dispatch miss found at stage 5 goes back in as a discovery seed at stage 2.](./pipeline.svg)

## The file you supply

Nothing starts until you have the game. The port repository does not contain it, and most ports will not run on a file they do not recognise.

> **You provide this.** You supply the cartridge dump, disc image or system ROM from your own media. [The game file you supply](/docs/concepts/the-game-file-you-supply) is this site's canonical statement of that contract, including what the projects say they do not distribute.

The first artefact a port writes is the identity record: `DISC.md` on the PlayStation ports, `baserom.md` on the cartridge ports, listing every hash and header field for the exact revision the port targets, and what it rejects. That precision is not fussiness. Generated C is keyed to specific opcodes at specific addresses, so a trimmed, patched or differently built dump is not a near miss, it is a different program. PlayStation adds one step here, because the code to translate is inside the disc image: the boot executable is extracted with `extract_psx_exe.py` and the image is staged into a gitignored directory with `prepare_disc.py`.

## Discovery

The recompiler now has to decide which bytes in that file are instructions. A dump carries no symbols and nothing marking where a function begins, so this is a search, not a parse. [nesrecomp](https://github.com/mstan/nesrecomp) walks outward from the three interrupt vectors the console itself guarantees, then runs several scanners over the rest of the ROM looking for dispatch tables. PlayStation seeds the same idea from a Ghidra export in `seeds/`, Game Boy Advance from `symbols/*.tsv`, SNES from one `recomp/bank*.cfg` per bank.

Discovery is where much of a port's per-game configuration lives, because it is where the tool needs facts it cannot derive: a bank-switch trampoline, a dispatch table stored as two parallel arrays, a function nothing statically points at. Whatever discovery misses does not disappear. It becomes a dispatch miss at run time, which is stage 5's problem. [Telling code from data](/docs/concepts/code-discovery) is the full explanation, and it is the page to read if you only read one.

## Translation

Now the machine code becomes C: one C function per discovered function, plus a dispatch table mapping guest addresses to those functions. The command that does it is spelled differently per console and is usually called generate or regen, wrapped in a script such as `tools/regen.sh`. You re-run it every time the configuration changes, which during bring-up is constantly.

Two rules govern this stage and both come from the repositories. Generated code is a build artefact and is never hand-edited: [SuperMarioWorldRecomp](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/CLAUDE.md) states it as "`src/gen/` and `recomp/funcs.h` are generated. Never hand-edit. Fix the recompiler or cfg." And a fix belongs in the layer that owns it, which is usually the framework rather than the game: MegaManX6's [`CLAUDE.md`](https://github.com/mstan/MegaManX6Recomp/blob/master/CLAUDE.md) puts it as "A fix that only this game needs is a smell; prefer a class fix that the next title inherits." [Port a game](/docs/guides/port-a-game) covers the six places a per-game fix can go and how to choose.

## Compilation

The generated C is compiled together with the framework's runtime, the shared launcher and any hand-written per-game shims, producing one native executable. On most consoles this is a stock CMake build, and on PlayStation it is a second CMake tree separate from the recompiler's.

Two practical facts belong to this stage rather than to any console. Always pass an explicit `-DCMAKE_BUILD_TYPE`, because the generated C compiles unusably slowly unoptimised. And keep parallelism modest, because generated translation units are large: SuperMarioWorldRecomp's [`RELEASE.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/RELEASE.md) warns that "an over-subscribed build kills the compiler with NO diagnostic (empty output, exit -1). That is memory pressure, not a source bug." [What you need](/docs/start/what-you-need) has the prerequisites, and [quickstart](/docs/start/quickstart) walks one of these builds command by command.

## Verification

A build that produces an executable has proved nothing about whether the executable behaves like the console. Two checks answer that, in order.

First, dispatch misses. A dispatch miss is a jump to an address with no generated function behind it, which means the game silently skipped a subroutine. Four toolchains call this game-breaking and require it resolved before any other debugging: read `dispatch_misses.log` next to the executable, add what it names to your configuration, regenerate, repeat until it is empty. That is stage 2's feedback path, and it is why discovery and verification are not far apart.

Second, co-simulation. A reference implementation and the recompiled build are stepped from the same reset on a shared guest clock, their full architectural state is hashed at every checkpoint, and the run halts at the first checkpoint that differs. Agreeing with yourself does not count, as [nesrecomp](https://github.com/mstan/nesrecomp/blob/master/NES_ACCURACY_BURNDOWN.md) says at the top of its scorecard: "**Self-agreement is NOT accuracy.**" [Proving it with co-simulation](/docs/concepts/co-simulation) is the technique, [debug a divergence](/docs/guides/debug-a-divergence) is what to do when it halts, and [what correct enough means](/docs/concepts/accuracy-and-burndowns) is how a green run becomes a claim.

## Enhancement

Only now does anything get added. Widescreen, mod packages, live translation, save states and rewind all sit on top of a port that already runs, and every one of them is off by default and reduces to the faithful path when disabled. That ordering is the fleet's shared rule, not a preference, and it is what makes the earlier stages worth doing: an enhancement layered on an unverified port cannot be told apart from a bug. [Write a mod](/docs/guides/write-a-mod), [translate a game](/docs/guides/translate-a-game) and [add widescreen](/docs/guides/add-widescreen) are the three guides for this stage.

## Why it is a loop, not a line

Stages 2 through 5 are a cycle you go round hundreds of times. A dispatch miss found at stage 5 becomes a seed at stage 2. A wrong pixel traced to the emitter is a framework fix that forces a regeneration of every game built on it. nesrecomp writes the cycle down as nine steps.

From [`CLAUDE.md`](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md):

```text title="CLAUDE.md"
1. BUILD recompiler     →  NESRecomp.exe  (only when recompiler src changes)
2. RUN recompiler       →  generates <game>_full.c in game project's generated/
3. BUILD game project   →  GameName.exe  (after runner or game changes)
4. RUN game (timed)     →  start, wait 10s, kill
5. OBSERVE screenshot   →  Read C:/temp/nes_shot_01.png  (saved every 60 NES frames)
6. IDENTIFY bug         →  wrong pixels → ppu_renderer.c;  crash → Ghidra
7. GHIDRA if needed     →  understand what the 6502 code actually does
8. FIX the bug          →  runtime.c / ppu_renderer.c / code_generator.c
9. GOTO 1 (or 3 if only runner changed)
```

Step 1 is skipped most times round, step 9 is the point. Booting is not the end of it either: [MinishCapRecomp](https://github.com/mstan/MinishCapRecomp) tracks bring-up as ten milestones from a verified ROM hash through to saves round-tripping, and six of the ten are comparisons against a reference implementation. Expect a first port to take months rather than an afternoon.

## Source

- [psxrecomp](https://github.com/mstan/psxrecomp): [`docs/ARCHITECTURE.md`](https://github.com/mstan/psxrecomp/blob/master/docs/ARCHITECTURE.md) for the pipeline stages, [`docs/BUILDING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BUILDING.md) for the disc staging and build commands.
- [nesrecomp](https://github.com/mstan/nesrecomp): [`CLAUDE.md`](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md) for the loop, [`README.md`](https://github.com/mstan/nesrecomp/blob/master/README.md) for discovery, [`NES_ACCURACY_BURNDOWN.md`](https://github.com/mstan/nesrecomp/blob/master/NES_ACCURACY_BURNDOWN.md) for the self-agreement rule.
- [FaxanaduRecomp](https://github.com/mstan/FaxanaduRecomp): [`game.toml`](https://github.com/mstan/FaxanaduRecomp/blob/master/game.toml) and [`build_all.bat`](https://github.com/mstan/FaxanaduRecomp/blob/master/build_all.bat) for a three-stage game build.
- [SuperMarioWorldRecomp](https://github.com/mstan/SuperMarioWorldRecomp): [`CLAUDE.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/CLAUDE.md), [`RELEASE.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/RELEASE.md). [MegaManX6Recomp](https://github.com/mstan/MegaManX6Recomp): [`CLAUDE.md`](https://github.com/mstan/MegaManX6Recomp/blob/master/CLAUDE.md). [MinishCapRecomp](https://github.com/mstan/MinishCapRecomp): [`CLAUDE.md`](https://github.com/mstan/MinishCapRecomp/blob/main/CLAUDE.md).

## Next

- [Port a game](/docs/guides/port-a-game) is this pipeline as a numbered procedure with the real commands.
- [Telling code from data](/docs/concepts/code-discovery) and [proving it with co-simulation](/docs/concepts/co-simulation) are the two stages that decide whether a port is any good.
- [What you need](/docs/start/what-you-need) before you start, then [quickstart](/docs/start/quickstart) for the shortest version of stages 3 and 4.
- [Glossary](/docs/concepts/glossary) for dispatch miss, oracle, seed and the rest of the vocabulary above.
