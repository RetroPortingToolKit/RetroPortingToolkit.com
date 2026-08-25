---
title: "What static recompilation is"
summary: "A game's binary is translated into ordinary source code before it ever runs, compiled for the computer you own, and joined to a library that stands in for the console. What that buys, and what it costs."
pageType: "concept"
tags: ["Static recompilation", "Recompiler", "Runtime"]
repos:
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/cdirecomp"
updated: "2026-08-25"
---

A console game is a binary: compiled machine code, built for a machine nobody makes any more. It is not source code, and your computer cannot run it. Static recompilation reads that binary before the game ever runs and translates it into source code in an ordinary programming language. That source is compiled for the computer you actually own. What comes out is a normal program. Your computer runs the game's own logic directly, instead of running an emulator that reads the game's instructions and acts them out one at a time while you play. Static means the translation happens ahead of time, once, on a developer's machine. The translated code is joined to a runtime, a library that stands in for the console's hardware. It can be done in any language; the projects here write C.

## What the recompiler writes

The tool that does the translation is called the recompiler. It reads a binary and writes code.

It works out where each of the game's own functions begins and writes one function of source code for each. It writes a lookup table too, so the program can find the right function when the game asks for an address. Wherever the game reads or writes memory, it writes a call into the runtime instead.

Nothing about the result is exotic. The projects here emit C, so an ordinary C compiler builds it and you can read the output. [The recompiler and the runtime](/docs/concepts/recompiler-and-runtime) shows what that generated code looks like, and each [platform page](/docs/platforms) shows one console's version of it.

## Why not just emulate it?

An emulator is a second program. While you play, it reads the game's binary one instruction at a time and acts each one out. That is called interpreting, and it is what emulation means here. It pays for the same work over and over: read an instruction, work out what it means, do it, start again. A loop the game runs a million times pays that cost a million times.

Static recompilation moves that work to build time. Each instruction is read once, ever, and what it does is written down as code. While you play there is nothing left to read and nothing left to work out. There is only compiled code.

Some games keep code where the recompiler cannot see it ahead of time. [Code you cannot see ahead of time](/docs/concepts/code-you-cannot-see-ahead-of-time) covers those cases.

## What it buys

**The port is not tied to the console any more.** It does not have to pretend to be as slow as the original hardware. The console's limits on speed and storage are gone too, so a feature is no longer boxed in by what that machine could hold or keep up with.

**It is ordinary code.** Source code can be compiled and modified, like any program. That is much easier than modifying an already compiled binary. Widescreen, [mods](/docs/guides/write-a-mod), [translations](/docs/guides/translate-a-game), replacement graphics and controller remapping are added that way. One rule keeps it honest: every added feature is off by default, and with it off the port behaves exactly as the original did. cdirecomp's [`ENHANCEMENTS.md`](https://github.com/mstan/cdirecomp/blob/master/ENHANCEMENTS.md) says so plainly.

**Save states, rewind and netplay.** These all need one thing: the game must repeat itself exactly. Emulators have had these features for years. The new part is that a native port can have them too. That only works if the port is deterministic, and these projects build for that on purpose. See [determinism](/docs/concepts/determinism).

## What it costs

**Building the framework, not adding the game.** The months of work go into a console's framework, not into each game. Once a framework is mature, adding a game to it is quick, and as these ecosystems mature the time from a disc to a running build keeps shrinking. Not every framework is there yet: some are in more active development and less stable than others. More months go into taking one game from booting to feeling finished. [Recomp your own game](/docs/start/recomp-your-own-game) says where each console stands.

**Telling code from data.** A binary is one flat block of bytes. Nothing in it marks where a function begins, or which bytes are instructions at all rather than a picture or a piece of music. Getting that wrong is the central difficulty of the whole technique, and it has its own page: [telling code from data](/docs/concepts/code-discovery).

**No promise about any one game.** No ecosystem here guarantees that a game can be done in one shot. That is the end goal: the frameworks are a foundation that does most of the work, and the aspiration is all of it. Until a particular game is done, there can be gaps specific to that game. The [status vocabulary](/docs/reference/status-vocabulary) unpacks the careful words the projects use to say where a game stands.

> **You provide this.** No project here ships a game. You supply your own game file, and the port checks it before it starts. [The game file you supply](/docs/concepts/the-game-file-you-supply) explains what is checked and why.

## Where emulation comes in

The game's own code is translated ahead of time and runs as compiled code. The console around it, its picture, sound, controllers and timing, is imitated by software while you play, and most projects keep a small emulator as a fallback for code the translation could not reach. [Is this emulation?](/docs/start/is-this-emulation) is the full answer.

## Source

- [nesrecomp](https://github.com/mstan/nesrecomp): [`README.md`](https://github.com/mstan/nesrecomp/blob/master/README.md), [`CLAUDE.md`](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md), and [`recompiler/src/code_generator.c`](https://github.com/mstan/nesrecomp/blob/master/recompiler/src/code_generator.c), which is the smallest emitter in the fleet to read.
- [psxrecomp](https://github.com/mstan/psxrecomp): [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md), [`docs/ARCHITECTURE.md`](https://github.com/mstan/psxrecomp/blob/master/docs/ARCHITECTURE.md), [`docs/EXECUTION_MODEL.md`](https://github.com/mstan/psxrecomp/blob/master/docs/EXECUTION_MODEL.md).
- [cdirecomp](https://github.com/mstan/cdirecomp): [`ENHANCEMENTS.md`](https://github.com/mstan/cdirecomp/blob/master/ENHANCEMENTS.md).

## Next

- [How a port is made](/docs/start/how-a-port-is-made): the same idea as a sequence, stage by stage.
- [Is this emulation?](/docs/start/is-this-emulation): where emulation does and does not come in.
- [Telling code from data](/docs/concepts/code-discovery): the hard part, on one console.
- [Quickstart](/docs/start/quickstart) has you run a recompiler yourself. [The glossary](/docs/concepts/glossary) defines every word above.
