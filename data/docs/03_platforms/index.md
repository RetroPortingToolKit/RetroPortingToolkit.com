---
title: "Platforms"
summary: "One page per console toolchain, each written to the same shape so you can compare them. PlayStation is the gold standard, SNES the second, and the rest are earlier on the same road."
sectionTitle: "Platforms"
pageType: "reference"
tags: ["Platforms"]
updated: "2026-08-25"
---

One page per console toolchain, each written to the same shape: what the toolchain is, its status quoted from its own README, the guest CPU, what this machine makes hard, the commands, what runs today, the known limits, and where to go next in the repository.

Be clear about maturity before you pick one. These projects are not at the same stage, and the honest ordering matters more than the list being long.

## The standard

- [PlayStation](/docs/platforms/playstation). The gold standard. The fleet's largest and most mature toolchain, the one that can scaffold a new game, and the one that solved code arriving from the disc while the game runs.
- [SNES](/docs/platforms/snes). The second standard. Where the CPU's mode flags turn one function into several, and the correctness machinery is deepest after PlayStation's.

## Earlier on the same road

The rest are real, and each page quotes its own status plainly, but they are in more active development and less stable. All of them aspire to the shape PlayStation has reached. Read a page's status section before you spend an evening on it.

- [NES](/docs/platforms/nes). The clearest place to watch code discovery work, and the mapper problem.
- [Game Boy Advance](/docs/platforms/game-boy-advance). ARM and Thumb in one CPU, not two.
- [Game Boy and Game Boy Color](/docs/platforms/game-boy). Thorough correctness work.
- [Sega Genesis](/docs/platforms/sega-genesis). Two processors, and how the sound Z80 keeps running beside the 68000.
- [Master System and Game Gear](/docs/platforms/master-system-game-gear). One Z80 engine for both machines, and the flat step mode.
- [Nintendo DS](/docs/platforms/nintendo-ds). Two CPUs on one scheduler, and an HLE design that is mostly still on paper.
- [Virtual Boy](/docs/platforms/virtual-boy). The strictest project here: no interpreter, no replacement layer.
- [CD-i](/docs/platforms/cd-i). Recompiling a console's whole operating system instead of stubbing it.
- [Xbox](/docs/platforms/xbox). Not a static recompiler: a dynamic recompiler that stays faithful to the machine's own firmware, with a hardware probe keeping it honest.
