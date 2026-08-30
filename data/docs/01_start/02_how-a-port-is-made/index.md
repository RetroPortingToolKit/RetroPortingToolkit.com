---
title: "How is a port made?"
summary: "The path from a game file to a native port: check the game, find its code, translate it, build it, test it, then add optional features."
pageType: "concept"
tags: ["Porting", "Pipeline", "Recompiler"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/snesrecomp"
updated: "2026-08-30"
---

A port starts with one exact game file. It ends as a normal program for a modern computer.

It is not a rewrite from scratch. It is not a ROM loaded into a general emulator. It is a project that knows how to turn one game, usually one exact version of that game, into a native application.

The details change by console. PlayStation has the most mature path today. SNES is next. Other projects are useful, but many are still research, examples, or early toolchains. This page explains the common shape without pretending every project is equally ready.

## What happens first?

Before a game can be ported, the console needs a framework.

That framework is the shared work for one console. It contains the recompiler, the runtime, build scripts, and the rules for that machine. Building it is the long system-level job. Adding a game gets faster as the framework matures.

The game project starts by checking the file you give it. A port is tied to exact bytes at exact addresses. A different region, version, patch, bad dump, or trimmed file is not almost right. It is a different input, and the port should reject it.

## How does the tool find the game code?

A game binary is just bytes.

Some bytes are instructions. Some are images, sound, tables, text, or padding. The file does not come with labels that say which is which.

Discovery is the stage that finds the code. The tool starts from places the console guarantees, follows calls and jumps, and uses project settings for facts it cannot safely guess.

On older systems, some games were written by hand in assembly. Strictly, that code was never compiled the first time. The pipeline still treats it the same way: find the instructions, then translate them.

When discovery misses code, the port usually finds out later. The game jumps to an address with no translated function behind it, or a test run stops at a mismatch. That result feeds back into discovery.

> **A good decompilation can help.** Some games have public decompilations or
> disassemblies made by the community. Those can act like a map: this address is
> a function, this name is useful, this range is data and should not be treated
> as code. Super Mario World is a strong example. Its SNES recompilation uses
> that kind of map to make discovery clearer, while still building the port from
> your own game file.

## What does translation produce?

Translation turns the discovered machine code into source code.

The current projects here usually emit C. That is an implementation choice. Static recompilation means translating before the game runs, not specifically producing C.

The generated code is build output. If it is wrong, the fix belongs in the recompiler, the runtime, or the game's settings. Editing generated code by hand only hides the problem until the next generation pass overwrites it.

Being strict, the decoder is the part that reads the binary and writes code. Recompiler is the practical name for the whole tool around it: decoder, compiler, runtime, and the project pieces that make the result run.

## Where does the runtime fit?

The translated game code still expects a console around it. It reads controllers, draws graphics, plays sound, waits on timing, and talks to hardware addresses. A modern computer does not have that console hardware.

The runtime is the library that stands in for the console. The native game code calls into it when it needs the machine around the game.

That is why a port is not just generated C. It is translated game code plus a runtime that understands the original platform well enough to make the game behave.

## How is the result checked?

A successful build only proves that the code compiled. It does not prove the game behaves correctly.

There are two common checks.

First, the project looks for missing code paths. That means a jump or call reached an address with no translated function. This is usually a discovery problem. Fix the settings or the tool, regenerate, and build again.

Second, mature projects compare behavior against something known to be correct. That is co-simulation. A known good emulator runs the same moment of the game beside the port, with enough state exposed to compare the two. When they disagree, the first difference becomes the next debugging target.

The comparison target matters. A port agreeing with its own fallback interpreter is useful as a self-check. The stronger claim comes from matching an outside reference.

## When do enhancements happen?

Enhancements come after the base game behaves correctly.

Widescreen, mods, translation hooks, save states, rewind, and netplay are easier to trust when the unmodified port already has a solid baseline.

The default should stay faithful to the original game. Extra features belong behind switches. With those switches off, the port should behave like the game it was built from.

## Why is it a loop?

Porting is not a straight line.

A missing jump sends you back to discovery. A wrong pixel may point to the runtime. A crash may expose bad generated code. A toolchain fix means regenerating and rebuilding the games that depend on it.

That loop is where maturity comes from. The first game on a console teaches the framework what the console needs. Later games benefit from that work.

The goal is not months of custom work for every game. The goal is a framework that makes each next game easier.

## Next

- [What is static recompilation?](/docs/start/what-is-static-recompilation): the core idea behind the translation step.
- [What do I need to get started?](/docs/start/what-you-need): the tools you need before building anything.
- [Quickstart](/docs/start/quickstart): the psxrecomp path, using the most mature framework.
- [Telling code from data](/docs/concepts/code-discovery) and [proving it with co-simulation](/docs/concepts/co-simulation): the two stages that decide whether a port is correct.
