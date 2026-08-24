---
title: "What static recompilation is"
summary: "The idea the rest of this site rests on: a game's own code is rewritten as C before it ever runs, compiled into a normal program, and joined to a library that stands in for the console, and what that buys and costs."
section: "start"
sectionTitle: "Start here"
pageType: "concept"
tags: ["Static recompilation", "Recompiler", "Runtime"]
repos:
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/cdirecomp"
updated: "2026-08-24"
---

A console game is a block of code written for a machine nobody makes any more. Static recompilation reads that code before the game ever runs and rewrites it in C, which is an ordinary programming language. The C is then compiled for the computer you actually own. What comes out is a normal program, and your computer runs the game's own logic directly, instead of running a second program that reads the game's instructions and acts them out one at a time. Static means the rewriting happens ahead of time, once, on a developer's machine. None of it is automatic. The rewritten code has to be joined to a runtime, which is a library that stands in for the console's hardware, and taking one game from a dump to a working program is months of work on that one game.

## What the recompiler writes

The tool that does the rewriting is called the recompiler, and what it produces is text. It reads the game's code, works out where each of the game's own functions begins, and writes one C function for each one it finds. It also writes a table, so the program can find the right C function later when the game asks for an address. Wherever the game reads or writes memory, the recompiler writes a call into the runtime instead. Nothing about the result is exotic. An ordinary C compiler builds it, and a person can open the output and read it.

[The recompiler and the runtime](/docs/concepts/recompiler-and-runtime) shows what that generated code looks like on the page, and each [platform page](/docs/platforms) shows one console's version of it.

## Why not just interpret it

The familiar way to run an old game on a new machine is to interpret it. A program keeps track of where the game is in its own code, reads the instruction sitting there, works out what it means, does it, and moves on. Then it does all of that again, for the next instruction, and again after that. A loop the game runs a million times pays the reading and the working out a million times.

Static recompilation moves that work to build time. Each instruction is read once, ever, and what it does is written down as C. While you are playing there is nothing left to read and nothing left to work out. There is only compiled code.

## Why not translate while the game runs

The other familiar answer is to translate during play: take a piece of the game's code the first time the game reaches it, translate it right then, keep the result in memory, and reuse it. The difference is when the work happens and what survives it. Translating during play happens on your machine, and normally the result is thrown away when you quit. Translating ahead of time happens once on a build machine, and what it leaves behind is C source a person can read, review and keep in a repository.

The line is less tidy than that, and this site would rather say so. Some games keep code where the recompiler cannot see it until the game asks for it, so a project has to catch those pieces while the game runs and translate them then. [Code you cannot see ahead of time](/docs/concepts/code-you-cannot-see-ahead-of-time) is that whole problem. Pointing the other way, [N64Recomp](https://github.com/N64Recomp/N64Recomp), the upstream project this technique comes from, can translate during play as well as ahead of time. So working ahead of time is a choice these projects make. It is not a limit of the idea.

## What it buys

**Speed to spare.** The game runs as a normal program, on a computer far faster than the console ever was, and everything the runtime does around it is code that can be improved. No project here publishes a frame rate claim, and this page does not invent one.

**Room to add things.** Because the result is compiled and linked like any other program, features can be added at the joins rather than by patching the game itself. Widescreen, [mods](/docs/guides/write-a-mod), [translations](/docs/guides/translate-a-game), replacement graphics and controller remapping all live there. One rule keeps that honest across the fleet: every added feature is off by default, and with it off the port behaves exactly as the original did. cdirecomp's [`ENHANCEMENTS.md`](https://github.com/mstan/cdirecomp/blob/master/ENHANCEMENTS.md) states it most plainly.

**Things that need the game to repeat itself exactly.** Save states, rewind, and online play that can quietly redo the last moment are one requirement three times over: take a snapshot of the machine, put it back, and have the game do exactly the same thing again from there. [Determinism](/docs/concepts/determinism) is that idea on its own page.

## What it costs

**Months of work, per game.** Every framework here is used by separate per game repositories, and those repositories exist to supply facts the tool could not work out on its own. The banner on those game pages says it directly, here from [SuperMarioWorldRecomp](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/README.md):

> **These are in-development previews, not finished ports — expect rough edges**, and depth will keep landing over months, not days.

**Telling code from data.** A dump is one flat block of bytes. Nothing inside it marks where a function begins, and nothing marks which bytes are instructions at all rather than a picture or a piece of music. Getting that wrong is the central difficulty of the whole technique, and it has its own page: [telling code from data](/docs/concepts/code-discovery).

**No promise about any one game.** psxrecomp's own README calls what its tool generates "a practical starting point, not a promise that every game works without game-specific fixes". Whether a particular game works is a question about that game. The careful words the projects use to answer it are unpacked in the [status vocabulary](/docs/reference/status-vocabulary).

> **You provide this.** Nothing here ships a game. Every port needs a game file that you supply from your own media, and the port checks it before it starts. [The game file you supply](/docs/concepts/the-game-file-you-supply) is the full contract.

## Where the word emulation comes in

Two things are true at the same time. The game's own code is translated ahead of time and runs as compiled code. The console around that code, its picture, its sound, its controllers and its timing, is imitated by the runtime while you play, and most of these projects also keep a small backup for game code the translation could not reach. That is a real question with a real answer, and the answer differs per project. [Is this emulation](/docs/start/is-this-emulation) answers it properly, which is why this page does not.

## Source

- [nesrecomp](https://github.com/mstan/nesrecomp): [`README.md`](https://github.com/mstan/nesrecomp/blob/master/README.md), [`CLAUDE.md`](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md), and [`recompiler/src/code_generator.c`](https://github.com/mstan/nesrecomp/blob/master/recompiler/src/code_generator.c), which is the smallest emitter in the fleet to read.
- [psxrecomp](https://github.com/mstan/psxrecomp): [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md), [`docs/ARCHITECTURE.md`](https://github.com/mstan/psxrecomp/blob/master/docs/ARCHITECTURE.md), [`docs/EXECUTION_MODEL.md`](https://github.com/mstan/psxrecomp/blob/master/docs/EXECUTION_MODEL.md).
- [cdirecomp](https://github.com/mstan/cdirecomp): [`ENHANCEMENTS.md`](https://github.com/mstan/cdirecomp/blob/master/ENHANCEMENTS.md). [SuperMarioWorldRecomp](https://github.com/mstan/SuperMarioWorldRecomp): [`README.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/README.md).
- [N64Recomp](https://github.com/N64Recomp/N64Recomp): [`README.md`](https://github.com/N64Recomp/N64Recomp/blob/main/README.md) for the backend that translates during play.

## Next

- [How a port is made](/docs/start/how-a-port-is-made) is the same idea told as a sequence, stage by stage.
- [Is this emulation](/docs/start/is-this-emulation) is the honest answer to the question this page deliberately left open.
- [Telling code from data](/docs/concepts/code-discovery) is the hard part, explained on one console.
- [Quickstart](/docs/start/quickstart) has you run a recompiler yourself, and [the glossary](/docs/concepts/glossary) defines every word above.
