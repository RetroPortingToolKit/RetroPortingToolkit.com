---
title: "Is this emulation"
summary: "The short honest answer. The game's own code is turned into a normal program before you play. The console around the game is imitated by software while you play. No project here promises that emulation plays no part."
section: "start"
sectionTitle: "Start here"
pageType: "concept"
tags: ["Emulation", "Execution model", "Honesty"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/vbrecomp"
updated: "2026-08-24"
---

Partly, and the parts are worth knowing. Before you ever press play, the game's own code is turned into an ordinary computer program. That part is not emulation. But the game still expects a console underneath it, and there is no console inside your computer, so software imitates one while you play. That part is emulation. Most projects also keep a small backup for any leftover game code the translation could not handle. So the answer is not a clean yes or a clean no. The game is translated, the machine around it is imitated, and nobody here claims that emulation plays no part.

## The three pieces

**The game's code is translated first.** A tool reads the game's code on a developer's computer and writes it out as C, which is an ordinary programming language. A normal compiler then turns that C into a program for your computer. This happens once, months before you download anything. By the time you play, your computer is running the game's own logic directly.

**The console is imitated while you play.** A game does not only do arithmetic. It also asks the console to draw a picture, play a sound, read a controller and save a file. The port carries software that answers those requests as the console would have. This part runs the whole time you play, and it is the same job an emulator does.

**A small backup catches the rest.** Translation ahead of time is not perfect. Some game code is hard to find before the game runs, and some of it only shows up during play. So most projects keep a small piece of software that can read that leftover code one step at a time, the slow way. psxrecomp says what that buys, in its [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md):

> **The worst case is always performance, never correctness** — anything not yet native simply runs interpreted, correctly.

In other words, a gap turns into a slow moment rather than a crash.

## What it means for you

It behaves like a normal app. You open it and it starts. There is nothing to configure first, no console to pick, and no game to load into it, because the game is already inside the program.

It plays one game. A port is built around one game in one version, and it checks your file before it starts. It is not a general machine for playing that console's library. [The game file you supply](/docs/concepts/the-game-file-you-supply) is what it wants from you and why.

## What it does not mean

It does not mean emulation is absent. Every project here ships software that imitates console hardware. Most keep the backup described above, and many report how often it was used. Several also run a real emulator beside the port while they build it, so they can compare the two and catch mistakes; that emulator is not in the version you download.

So if you read anywhere that no emulation is involved at all, that claim did not come from this site, and it is not true of these projects. This page would rather be exact than flattering.

## Saying it accurately

If you are describing one of these ports to someone else, these five statements hold everywhere in this fleet:

- The game's own code is translated ahead of time, so your computer runs it directly.
- The hardware around the game is imitated by software while you play.
- Most projects keep a small backup for code the translation could not reach, and report how often it runs.
- A port accepts one game, in one version, checked against the file you supply.
- Never say that no emulation is involved. That claim is false for every project here.

## Where your console's exact answer lives

The line between translated and imitated moves from project to project. One project keeps no backup at all. Another one uses it only for code that arrives while the game is running. Pick your console on the [platform pages](/docs/platforms) and its page says where that project draws the line.

## Source

- [psxrecomp](https://github.com/mstan/psxrecomp): [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md), [`CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md).
- [nesrecomp](https://github.com/mstan/nesrecomp): [`README.md`](https://github.com/mstan/nesrecomp/blob/master/README.md).
- [snesrecomp](https://github.com/mstan/snesrecomp): [`README.md`](https://github.com/mstan/snesrecomp/blob/main/README.md), [`SNES_COSIM.md`](https://github.com/mstan/snesrecomp/blob/main/SNES_COSIM.md) for the rule that the comparison emulator ships in no release.
- [vbrecomp](https://github.com/mstan/vbrecomp): [`CLAUDE.md`](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md), the project that keeps no backup at all.

## Next

- [What static recompilation is](/docs/start/what-is-static-recompilation) explains the translation step properly, if you arrived here first.
- [The platform pages](/docs/platforms) give your console's exact position, project by project.
- [High level and low level](/docs/concepts/hle-and-lle) is the one place these projects openly disagree with each other, over the console's built-in software.
- [Glossary](/docs/concepts/glossary) defines the words this page kept out of its way.
