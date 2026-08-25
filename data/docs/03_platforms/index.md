---
title: "Platforms"
summary: "One page per console toolchain, twelve in all, each written to the same shape so you can compare them."
sectionTitle: "Platforms"
pageType: "reference"
tags: ["Platforms"]
updated: "2026-08-25"
---

Twelve consoles, twelve toolchains, one page each. Every page follows the same shape: what the toolchain is, its status quoted from its own README, the guest CPU, what this machine makes hard, the commands, what runs today, the known limits, and where to go next in the repository.

These projects are at very different stages. One says its breadth-first work is essentially done. Another says gameplay is not reachable yet. Read the status section before anything else.

- [PlayStation](/docs/platforms/playstation). The largest toolchain, and the one that solved code arriving from the disc while the game runs.
- [NES](/docs/platforms/nes). The clearest place to watch code discovery work, and the mapper problem.
- [SNES](/docs/platforms/snes). Where the CPU's mode flags turn one function into several.
- [Game Boy Advance](/docs/platforms/game-boy-advance). ARM and Thumb in one CPU, not two.
- [Game Boy and Game Boy Color](/docs/platforms/game-boy). The fleet's most thorough correctness work.
- [Sega Genesis](/docs/platforms/sega-genesis). Two processors, and how the sound Z80 keeps running beside the 68000.
- [Master System and Game Gear](/docs/platforms/master-system-game-gear). One Z80 engine for both machines, and the flat step mode.
- [Nintendo DS](/docs/platforms/nintendo-ds). Two CPUs on one scheduler, and an HLE design that is mostly still on paper.
- [Virtual Boy](/docs/platforms/virtual-boy). The strictest project here: no interpreter, no replacement layer.
- [CD-i](/docs/platforms/cd-i). Recompiling a console's whole operating system instead of stubbing it.
- [GameCube](/docs/platforms/gamecube). Firmware first, games later.
- [Xbox](/docs/platforms/xbox). Not a recompiler at all: a measuring instrument pointed at real hardware.
