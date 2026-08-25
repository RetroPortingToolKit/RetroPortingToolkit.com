---
title: "Is this emulation?"
summary: "No. The game's own code is translated into a normal program before you play. But these ports do embed a small emulator: software has to stand in for the console's hardware, and an interpreter catches the code the translation missed."
pageType: "concept"
tags: ["Emulation", "Execution model", "Honesty"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/vbrecomp"
updated: "2026-08-25"
---

No. Static recompilation is not emulation. The game's own code is translated into a normal program before you play, and your computer runs that program directly. But these ports do embed a small emulator, for two reasons. The game still expects a console underneath it, and there is no console inside your computer, so software has to stand in for the hardware. And translating ahead of time never reaches every last instruction, so an interpreter is kept as a fallback for the rest. Neither part is the main way the game runs. Both are real, and no project here claims that emulation plays no part.

## The three pieces

**The game's code is translated first.** A tool reads the game's binary on a developer's computer and writes it out as source code. A normal compiler turns that source into a program for your computer. This happens once, long before you download anything. By the time you play, your computer is running the game's own logic directly. The projects here write C, but the technique does not require C.

**The console is imitated while you play.** A game does not only do arithmetic. It also asks the console to draw a picture, play a sound, read a controller and save a file. The port carries software that answers those requests as the console would have. This part runs the whole time you play, and it is the same job an emulator does.

**A small emulator catches the rest.** Translating ahead of time is not perfect. Some game code is hard to find before the game runs, and some of it only appears during play. So most projects here keep an interpreter that runs that leftover code one instruction at a time, the slow way. A missed instruction becomes a slow moment instead of a crash.

## What it means for you

It behaves like a normal app. You open it and it starts. There is nothing to configure first, no console to pick, and no game to load into it. The game is the program.

It plays one game. A port is built around one game in one version, and it checks your file before it starts. It is not a general machine for playing that console's library. [The game file you supply](/docs/concepts/the-game-file-you-supply) is what it wants from you and why.

## What it does not mean

The interpreter is a fallback. Almost everything you play is native code, and the interpreter only runs what the translation missed. Many projects count how often it runs, and work to bring that count down. Several also run a full emulator beside the port while they are building it, so they can compare the two and catch mistakes. That emulator is not in the version you download.

No project here says that no emulation is involved.

## Where your console's exact answer lives

The line between translated and imitated moves from project to project. [vbrecomp](https://github.com/mstan/vbrecomp) keeps no fallback at all. Others use theirs only for code that arrives while the game is running. Pick your console on the [platform pages](/docs/platforms) and its page says where that project draws the line.

## Source

- [psxrecomp](https://github.com/mstan/psxrecomp): [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md), [`CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md).
- [nesrecomp](https://github.com/mstan/nesrecomp): [`README.md`](https://github.com/mstan/nesrecomp/blob/master/README.md).
- [snesrecomp](https://github.com/mstan/snesrecomp): [`README.md`](https://github.com/mstan/snesrecomp/blob/main/README.md), [`SNES_COSIM.md`](https://github.com/mstan/snesrecomp/blob/main/SNES_COSIM.md) for the rule that the comparison emulator ships in no release.
- [vbrecomp](https://github.com/mstan/vbrecomp): [`CLAUDE.md`](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md), the project that keeps no fallback at all.

## Next

- [What static recompilation is](/docs/start/what-is-static-recompilation) explains the translation step properly, if you arrived here first.
- [The platform pages](/docs/platforms) give your console's exact position, project by project.
- [High level and low level](/docs/concepts/hle-and-lle) is the one place these projects openly disagree with each other, over the console's built-in software.
- [Glossary](/docs/concepts/glossary) defines the words used here.
