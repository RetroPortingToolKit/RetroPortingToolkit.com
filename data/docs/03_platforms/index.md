---
title: "Platforms"
summary: "Where each console toolchain stands, which ones are practical today, and which ones are still research."
sectionTitle: "Platforms"
pageType: "reference"
tags: ["Platforms"]
updated: "2026-08-30"
---

These pages explain the console toolchains.

They are not all at the same maturity level. Some are practical starting points. Some are useful examples. Some are research projects that teach us about the next version of the tooling.

If you are trying your first port, start with the strongest path.

## The strongest paths

- [PlayStation](/docs/platforms/playstation). The gold-standard framework today. It has the clearest end-to-end path, a strong runtime, and the best example of how this ecosystem should feel.
- [SNES](/docs/platforms/snes). The silver-standard framework. It has strong results and very useful lessons, especially around assembly-heavy games and community disassemblies.

## Useful but earlier

- [NES](/docs/platforms/nes). A compact cartridge system where code discovery and mapper handling are the main lessons.
- [Game Boy Advance](/docs/platforms/game-boy-advance). Experimental. Able to run games with enhancements, but still needs refinement.
- [Sega Genesis](/docs/platforms/sega-genesis). Experimental two-CPU target. Useful for native 68000 work plus Z80 sound work.
- [Master System and Game Gear](/docs/platforms/master-system-game-gear). Experimental Z80 target. Useful for timing work, but not the first place to start.
- [Nintendo DS](/docs/platforms/nintendo-ds). Early and experimental. Able to run commercial titles, but still needs optimization and refinement.

## Research and probes

- [CD-i](/docs/platforms/cd-i). Research path around full system ROM behavior, not a normal game-port route.
- [Virtual Boy](/docs/platforms/virtual-boy). Focused experimental target for one narrow runtime.
- [Xbox](/docs/platforms/xbox). A probe and research path, not a normal porting route.

## How should I read these pages?

Read each page as a maturity snapshot, not a guarantee.

A console page can tell you what the framework is trying to do, what makes that console hard, and what kind of files a project may ask for. It cannot promise that every game on that console is ready.

For the general workflow, start with [How do I recomp my own game?](/docs/start/recomp-your-own-game). For exact status words, use [Status vocabulary](/docs/reference/status-vocabulary).
