---
title: "How a port is made"
summary: "The whole process as one story, from the game file you supply through discovery, translation, compilation and checking to enhancement, naming the six stages the rest of this site uses."
section: "start"
sectionTitle: "Start here"
pageType: "concept"
tags: ["Porting", "Pipeline", "Recompiler"]
repos:
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/SuperMarioWorldRecomp"
  - "https://github.com/mstan/MinishCapRecomp"
updated: "2026-08-24"
---

A port here is not a program somebody sat down and wrote from nothing. It is a recorded procedure for turning one game file into a normal program, and the procedure is the same six stages on every console. Check the file you supply. Work out which bytes in it are code. Rewrite those into C. Compile that C together with a runtime. Check the result against something already known to be right. Only then add anything the original hardware could not do. This page walks those six stages once, end to end, and links each one to the page that explains it properly. The names used here are the names used everywhere else on this site.

## The stages, end to end

One thing happens before stage one: the toolchain for your console has to exist and be built. That is [build a toolchain](/docs/guides/build-a-toolchain), and it is usually a one off that you repeat only when the toolchain changes.

| Stage | What goes in | What comes out | Explained in |
|---|---|---|---|
| 1. The file you supply | your own dump | a checked file and an identity record | [the game file you supply](/docs/concepts/the-game-file-you-supply) |
| 2. Discovery | the game's code, plus hints | the list of places a function starts | [telling code from data](/docs/concepts/code-discovery) |
| 3. Translation | those places and their instructions | generated C and a lookup table | [the recompiler and the runtime](/docs/concepts/recompiler-and-runtime) |
| 4. Compilation | generated C, the runtime, per game pieces | one program you can run | [build a toolchain](/docs/guides/build-a-toolchain) |
| 5. Verification | that program and something to compare it against | a clean run, or the first disagreement | [proving it with co-simulation](/docs/concepts/co-simulation) |
| 6. Enhancement | a port that already works | features you can switch on | [write a mod](/docs/guides/write-a-mod) |

![Each stage hands the next one something to work with, so this is a chain rather than a list of steps. The dashed line going backwards is where the time goes: something missed at stage 5 goes back in as a starting point at stage 2.](./pipeline.svg)

## The file you supply

Nothing starts until you have the game. The port does not contain it, and most ports will not run on a file they do not recognise.

> **You provide this.** You supply the game file from your own media. [The game file you supply](/docs/concepts/the-game-file-you-supply) is this site's full statement of that contract, including what the projects say they do not distribute.

The first thing a port writes down is its identity record: a small file naming the exact version of the game this port was built for, and saying what it will refuse. The generated C is tied to specific instructions at specific addresses, so a trimmed or patched dump is not a near miss. It is a different program.

## Discovery

The recompiler now has to decide which bytes in that file are instructions and which are something else. A dump carries no labels, and nothing in it marks where a function begins. So this stage is a search, not a reading.

Every project starts from the few places the console itself guarantees code will be, follows the game outward from there, and then hunts for the rest. This is where most of a port's per game configuration ends up, because it is where the tool needs facts it cannot work out alone. Whatever the search misses does not go away. It turns up later as a jump to an address with no code behind it, which is stage 5's problem. [Telling code from data](/docs/concepts/code-discovery) is the page to read if you only read one.

## Translation

Now the code becomes C: one C function for each function found, plus the table that lets the program look up an address and get the right function back. You re-run this every time the configuration changes, which during early work is constantly.

Two rules govern this stage, and both come from the repositories. Generated code is build output and is never edited by hand; if it is wrong, the fix belongs in the recompiler or in the configuration that drove it, and [SuperMarioWorldRecomp](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/CLAUDE.md) says exactly that. And a fix belongs in the layer that owns it, which is usually the shared toolchain rather than the one game, so that the next game inherits it. [Port a game](/docs/guides/port-a-game) covers the places a fix can go and how to choose between them.

## Compilation

The generated C is compiled together with the runtime, the shared launcher and any pieces written by hand for this game. Out comes one program. On most consoles this is an ordinary CMake build.

Two practical facts belong here rather than to any one console. Always tell CMake which kind of build you want, because generated C compiles unreasonably slowly without optimisation. And do not ask for too many jobs at once, because the generated files are large and a machine that runs out of memory does not fail politely. [What you need](/docs/start/what-you-need) has both, and [quickstart](/docs/start/quickstart) walks one of these builds command by command.

## Verification

A build that produced a program has proved nothing about whether the program behaves like the console. Two checks answer that, in order.

**First, missed jumps.** A dispatch miss is a jump to an address with no generated function behind it, which means the game quietly skipped part of itself. Several toolchains call this game breaking and want it cleared before any other debugging: read the log the port writes beside the program, add what it names to your configuration, regenerate, and repeat until the log is empty. That is the path back to stage 2, and it is why discovery and verification are never far apart.

**Second, co-simulation.** A second program that already runs this console correctly, written by somebody else, is started beside the port and kept in step with it. Both are stopped at the same moments and compared, and the run halts the first time they disagree. Agreeing with yourself does not count, as [nesrecomp](https://github.com/mstan/nesrecomp/blob/master/NES_ACCURACY_BURNDOWN.md) says at the top of its scorecard:

> **Self-agreement is NOT accuracy.**

[Proving it with co-simulation](/docs/concepts/co-simulation) is the technique, [debug a divergence](/docs/guides/debug-a-divergence) is what to do when it halts, and [what correct enough means](/docs/concepts/accuracy-and-burndowns) is how a clean run turns into a claim.

## Enhancement

Only now does anything get added. Widescreen, mods, live translation, save states and rewind all sit on top of a port that already runs, and every one of them is off by default and behaves like the original when it is off. That order is a shared rule here, not a preference. A new feature layered on a port nobody checked cannot be told apart from a bug. [Write a mod](/docs/guides/write-a-mod), [translate a game](/docs/guides/translate-a-game) and [add widescreen](/docs/guides/add-widescreen) are the guides for this stage.

## Why it is a loop, not a line

Stages 2 to 5 are a cycle you go round hundreds of times. A missed jump found at stage 5 becomes a starting point for the search at stage 2. A wrong pixel traced back to the recompiler is a toolchain fix, and a toolchain fix means regenerating every game built on it.

nesrecomp writes its own version of that cycle down as nine steps, and the shape is the same everywhere: run the recompiler, build the game, play it for a few seconds, look at a screenshot, work out which layer the bug is in, fix that layer, and go back to the top. Getting the game to boot is not the end of it. [MinishCapRecomp](https://github.com/mstan/MinishCapRecomp) tracks its bring up as ten milestones, from a checked game file through to saves working properly, and six of the ten are comparisons against something known to be right. Expect a first port to take months rather than an afternoon.

## Source

- [nesrecomp](https://github.com/mstan/nesrecomp): [`CLAUDE.md`](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md), [`README.md`](https://github.com/mstan/nesrecomp/blob/master/README.md), [`NES_ACCURACY_BURNDOWN.md`](https://github.com/mstan/nesrecomp/blob/master/NES_ACCURACY_BURNDOWN.md).
- [psxrecomp](https://github.com/mstan/psxrecomp): [`docs/ARCHITECTURE.md`](https://github.com/mstan/psxrecomp/blob/master/docs/ARCHITECTURE.md), [`docs/BUILDING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BUILDING.md).
- [SuperMarioWorldRecomp](https://github.com/mstan/SuperMarioWorldRecomp): [`CLAUDE.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/CLAUDE.md), [`RELEASE.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/RELEASE.md). [MegaManX6Recomp](https://github.com/mstan/MegaManX6Recomp): [`CLAUDE.md`](https://github.com/mstan/MegaManX6Recomp/blob/master/CLAUDE.md).
- [MinishCapRecomp](https://github.com/mstan/MinishCapRecomp): [`CLAUDE.md`](https://github.com/mstan/MinishCapRecomp/blob/main/CLAUDE.md).

## Next

- [Port a game](/docs/guides/port-a-game) is this process again as a numbered procedure with the real commands.
- [Telling code from data](/docs/concepts/code-discovery) and [proving it with co-simulation](/docs/concepts/co-simulation) are the two stages that decide whether a port is any good.
- [What you need](/docs/start/what-you-need) before you start, then [quickstart](/docs/start/quickstart) for the shortest version of stages 3 and 4.
- [Glossary](/docs/concepts/glossary) for the words this page introduced and the ones it left out.
