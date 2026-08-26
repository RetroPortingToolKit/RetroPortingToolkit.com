---
title: "How a port is made"
summary: "The whole process as one story: the game file you supply, then discovery, translation, compilation and checking, and only then enhancement. These are the six stage names the rest of this site uses."
pageType: "concept"
tags: ["Porting", "Pipeline", "Recompiler"]
repos:
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/SuperMarioWorldRecomp"
updated: "2026-08-25"
---

A port here is not a program somebody wrote from nothing. It is a recorded procedure for turning one game file into a normal program, and it is the same six stages on every console. Check the file you supply. Work out which bytes in it are code. Translate those into source code. Compile that together with a runtime. Check the result against something already known to be right. Only then add anything the original hardware could not do. These six names are used everywhere else on this site.

## The stages, end to end

One thing happens before stage one: the toolchain for your console has to exist and be built. That is [build a toolchain](/docs/guides/build-a-toolchain), and you do it again only when the toolchain changes.

| Stage | What goes in | What comes out | Explained in |
|---|---|---|---|
| 1. The file you supply | your own dump | a checked file and an identity record | [the game file you supply](/docs/concepts/the-game-file-you-supply) |
| 2. Discovery | the game's binary, plus hints | the list of places a function starts | [telling code from data](/docs/concepts/code-discovery) |
| 3. Translation | those places and their instructions | generated C and a lookup table | [the recompiler and the runtime](/docs/concepts/recompiler-and-runtime) |
| 4. Compilation | generated C, the runtime, per game pieces | one program you can run | [build a toolchain](/docs/guides/build-a-toolchain) |
| 5. Verification | that program and something to compare it against | a clean run, or the first disagreement | [proving it with co-simulation](/docs/concepts/co-simulation) |
| 6. Enhancement | a port that already works | features you can switch on | [write a mod](/docs/guides/write-a-mod) |

![Each stage hands the next one something to work with. The dashed line going backwards is where the time goes: something missed at stage 5 comes back as a starting point at stage 2.](./pipeline.svg)

## The file you supply

Nothing starts until you have the game. The port does not contain it, and most ports will not run on a file they do not recognise.

> **You provide this.** You supply the game file from your own media. [The game file you supply](/docs/concepts/the-game-file-you-supply) is this site's full statement of that contract, including what the projects say they do not distribute.

The first thing a port writes down is its identity record: a small file naming the exact version of the game it was built for. The generated code is tied to specific instructions at specific addresses, so a trimmed or patched dump is not a near miss. It is a different program.

## Discovery

The recompiler now has to decide which bytes in that file are instructions and which are something else. A binary carries no labels, and nothing in it marks where a function begins. So this stage is a search, not a reading.

Every project starts from the few places the console itself guarantees code will be, follows the game outward, then hunts for the rest. Most of a port's per game configuration ends up here, because this is where the tool needs facts it cannot work out alone. What the search misses does not go away. It turns up later as a jump to an address with no code behind it, which is stage 5's problem.

## Translation

Now the binary becomes source code: one function for each function found, plus the table that lets the program look up an address and get the right function back. The projects here write C. You re-run this every time the configuration changes, which during early work is constantly.

Two rules govern this stage, and both come from the repositories. Generated code is build output and is never edited by hand: if it is wrong, the fix belongs in the recompiler or in the configuration that drove it, and [SuperMarioWorldRecomp](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/CLAUDE.md) says exactly that. And a fix belongs in the layer that owns it, usually the shared toolchain rather than the one game, so the next game inherits it. [Port a game](/docs/guides/port-a-game) covers where a fix can go.

## Compilation

The generated code is compiled together with the runtime, the shared launcher and any pieces written by hand for this game. Out comes one program. On most consoles this is an ordinary CMake build.

Two build settings come up again and again: the build type, and the parallel job count. Each project has its own words on both, and [build a toolchain](/docs/guides/build-a-toolchain) quotes them project by project.

## Verification

A build that produced a program has proved nothing about how it behaves. Two checks answer that, in order.

**First, missed jumps.** A dispatch miss is a jump to an address with no generated function behind it, which means the game quietly skipped part of itself. Several toolchains call this game breaking and want it cleared before any other debugging. Read the log the port writes beside the program, add what it names to your configuration, regenerate, and repeat until the log is empty. That is the path back to stage 2.

**Second, co-simulation.** The name sounds fancy, but it is just comparing: an emulator or real hardware that already runs this console correctly runs beside the port, kept in step. Both are stopped at the same moments and compared, and the run halts the first time they disagree. The comparison target has to be something outside the port, because a port agreeing with itself proves nothing.

[Proving it with co-simulation](/docs/concepts/co-simulation) is the technique, [debug a divergence](/docs/guides/debug-a-divergence) is what to do when it halts, and [what correct enough means](/docs/concepts/accuracy-and-burndowns) is how a clean run turns into a claim.

## Enhancement

Only now does anything get added. Widescreen, mods, live translation, save states and rewind all sit on top of a port that already runs, and every one of them is off by default. That order is a rule here, not a preference: a feature layered on a port nobody checked cannot be told apart from a bug. [Write a mod](/docs/guides/write-a-mod), [translate a game](/docs/guides/translate-a-game) and [add widescreen](/docs/guides/add-widescreen) are the guides.

## Why it is a loop, not a line

Stages 2 to 5 are a cycle you go round hundreds of times. A missed jump found at stage 5 becomes a starting point for the search at stage 2. A wrong pixel traced back to the recompiler is a toolchain fix, and a toolchain fix means regenerating every game built on it.

Different consoles put the loop together differently, and the steps vary to an extent from system to system. What does not vary: a bug is traced to the layer that owns it, the fix lands there, and the loop starts again from the top.

How long the loop takes depends on the framework, not on the game. As a console's framework matures, adding a new game to it takes less and less work, and this loop is where the remaining time goes, taking that game from booting to feeling finished.

## Source

- [nesrecomp](https://github.com/mstan/nesrecomp): [`CLAUDE.md`](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md), [`README.md`](https://github.com/mstan/nesrecomp/blob/master/README.md).
- [psxrecomp](https://github.com/mstan/psxrecomp): [`docs/ARCHITECTURE.md`](https://github.com/mstan/psxrecomp/blob/master/docs/ARCHITECTURE.md), [`docs/BUILDING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BUILDING.md).
- [SuperMarioWorldRecomp](https://github.com/mstan/SuperMarioWorldRecomp): [`CLAUDE.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/CLAUDE.md), [`RELEASE.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/RELEASE.md).

## Next

- [Port a game](/docs/guides/port-a-game): this process again as a numbered procedure, with the real commands.
- [Telling code from data](/docs/concepts/code-discovery) and [proving it with co-simulation](/docs/concepts/co-simulation): the two stages that decide whether a port is any good.
- [Getting started](/docs/start/what-you-need), then [quickstart](/docs/start/quickstart) for stages 3 and 4 on your own machine.
- [Glossary](/docs/concepts/glossary) for the words this page introduced.
