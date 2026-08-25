---
title: "Is this emulation?"
summary: "No. The game's code is translated into a normal program before you play, and a runtime library stands in for the console. While a port is being finished, a small fallback interpreter catches what the translation has not reached yet; a completed port has full static coverage and does not use it."
pageType: "concept"
tags: ["Emulation", "Execution model", "Honesty"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/snesrecomp"
updated: "2026-08-25"
---

No. Static recompilation is not emulation. The game's own code is translated into a normal program before you play, and your computer runs that program directly. Two other pieces of software are involved, and neither changes that answer. The port links against a runtime, an ordinary library that answers the game's requests to draw, play sound and read a controller, the way any program uses the system it runs on. And while a port is still being finished, a small fallback interpreter catches any code the translation has not reached yet. That fallback is a safety net, not how the game runs. As coverage fills in it goes inert, and a completed project does not have, or will not use, a fallback interpreter: it has 100% static coverage.

## The three pieces

**The game's code is translated first.** A tool reads the game's binary on a developer's computer and writes it out as source code. A normal compiler turns that source into a program for your computer. This happens once, long before you download anything. By the time you play, your computer is running the game's own logic directly. The projects here write C, but the technique does not require C.

**A runtime stands in for the console.** A game does not only do arithmetic. It also asks the console to draw a picture, play a sound, read a controller and save a file. The port links against a runtime, a library that answers those requests on your computer, the way any program calls the system it runs on.

**A fallback interpreter catches the rest, for now.** Translating ahead of time takes time to reach everything. Where coverage gaps have not been filled yet, an interpreter runs the leftover code one instruction at a time, the slow way, so a missed instruction becomes a slow moment instead of a crash. It is a safety net, a release hatch while a port matures. As coverage reaches everything it goes inert and can be factored out.

## What it means for you

It behaves like a normal app. You open it and it starts. There is nothing to configure first, no console to pick, and no game to load into it. The game is the program.

It plays one game. A port is built around one game in one version, and it checks your file before it starts. It is not a general machine for playing that console's library. [The game file you supply](/docs/concepts/the-game-file-you-supply) is what it wants from you and why.

## What it does not mean

The interpreter is a fallback, and a temporary one. Almost everything you play is native code, and the fallback only runs what the translation has not reached yet. Projects count how often it runs and work that count down to zero, because the goal is a port that never needs it. Several projects also run a full emulator beside the port while they are building it, to compare the two and catch mistakes. That emulator is not in the version you download.

No project here says that no emulation is ever involved along the way.

## Where your console's exact answer lives

How much a port still leans on its fallback changes from project to project while ports are being finished. A completed project does not have, or will not use, a fallback interpreter: it has 100% static coverage. Pick your console on the [platform pages](/docs/platforms) and its page says where that project stands today.

## Source

- [psxrecomp](https://github.com/mstan/psxrecomp): [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md), [`CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md).
- [nesrecomp](https://github.com/mstan/nesrecomp): [`README.md`](https://github.com/mstan/nesrecomp/blob/master/README.md).
- [snesrecomp](https://github.com/mstan/snesrecomp): [`README.md`](https://github.com/mstan/snesrecomp/blob/main/README.md), [`SNES_COSIM.md`](https://github.com/mstan/snesrecomp/blob/main/SNES_COSIM.md) for the rule that the comparison emulator ships in no release.

## Next

- [What static recompilation is](/docs/start/what-is-static-recompilation) explains the translation step properly, if you arrived here first.
- [The platform pages](/docs/platforms) give your console's exact position, project by project.
- [High level and low level](/docs/concepts/hle-and-lle) is the one place these projects openly disagree with each other, over the console's built-in software.
- [Glossary](/docs/concepts/glossary) defines the words used here.
