---
title: "Platforms"
summary: "One technical page per console toolchain, all twelve written to the same spine so you can compare them: status in the project's own words, the hardware, the commands, and the known limits."
sectionTitle: "Platforms"
pageType: "reference"
tags: ["Platforms"]
updated: "2026-08-23"
---

Twelve consoles, twelve toolchains, one page each. Every page follows the same spine so the projects are comparable: what the toolchain is, its status quoted from its own README rather than summarised, the guest CPU, what this particular machine makes hard, the commands, what runs today, the known limits, and where to go next in the repository. Maturity varies enormously across this list, from a project whose breadth-first work is largely done to one that says gameplay is not yet reachable, so read the status line before you read anything else.

- [PlayStation](/docs/platforms/playstation). The largest toolchain, and the one that solved disc-streamed code.
- [NES](/docs/platforms/nes). The clearest place to see code discovery working, and the mapper problem.
- [SNES](/docs/platforms/snes). Where the CPU's mode flags make one function into several.
- [Game Boy Advance](/docs/platforms/game-boy-advance). ARM and Thumb interworking, treated as one CPU rather than two.
- [Game Boy and Game Boy Color](/docs/platforms/game-boy). The fleet's most rigorous correctness programme.
- [Sega Genesis](/docs/platforms/sega-genesis). Two processors, and how the sound Z80 keeps running beside the 68000.
- [Master System and Game Gear](/docs/platforms/master-system-game-gear). One Z80 engine for both machines, and the flat step mode.
- [Nintendo DS](/docs/platforms/nintendo-ds). Two CPUs interleaved on one scheduler, and an HLE design mostly still on paper.
- [Virtual Boy](/docs/platforms/virtual-boy). The strictest project in the fleet: no interpreter, no replacement layer.
- [CD-i](/docs/platforms/cd-i). Recompiling a console's entire operating system rather than stubbing it.
- [GameCube](/docs/platforms/gamecube). Firmware first, games later, and where the repository naming is explained.
- [Xbox](/docs/platforms/xbox). Not a recompiler at all: a measurement instrument pointed at real hardware.
