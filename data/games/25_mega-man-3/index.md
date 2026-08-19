---
title: "Mega Man 3"
kicker: "NES"
tags: []
featured: false
desc: "An early native PC build of Mega Man 3: menus, stage select, and basic stage play work, boss fights are still untested."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "nes"
repo: "https://github.com/mstan/Megaman3NESRecomp"
group: "NES"
links:
  - { label: "nesrecomp Achieves 10 Commercial Titles (1379.tech)", href: "https://1379.tech/nesrecomp-achieves-10-commercial-titles/" }
verified: "2026-08-18"
cover: "/data/blog/20_nesrecomp-10-titles/MegaMan3Recomp_aYrwCUu1Ju.png"
---

A core project: Mega Man 3 is one of the [ten commercial titles](/blog/nesrecomp-10-titles) supported by [NESRecomp](/hardware/nes), and one of the most demanding, on the most complex cartridge hardware the framework currently handles. It is a work in progress: the front of the game runs, the deep end is untested.

## Can I play it?

The early stretch. A v0.0.1 Windows x64 build (2026-04-27) is on [GitHub Releases](https://github.com/mstan/Megaman3NESRecomp/releases), with an experimental Linux AppImage alongside; it is built from a dump you provide (USA version). The title screen, main menu, and Robot Master stage select all work, stages load with scrolling backgrounds and basic enemies, and movement, jumping, and the Mega Buster are functional. Boss fights, special weapons, and passwords are untested and may stall the game; some areas show visual glitches or missing sprites, and audio is still basic.

## What the recomp adds

At this stage, the shared runner's conveniences: save states, a fast-forward toggle, and gamepad support. The enhancement work that released titles carry comes later; this build is about getting the game solid first.

## Technical details

An MMC3 (Mapper 4) cartridge with program and graphics bank switching and a scanline interrupt, the most involved of the four mapper families the framework supports. Those four families (NROM, MMC1, MMC3, GxROM) cover roughly 78 percent of the licensed NES library, per the framework README. Mega Man 3 was chosen partly for its comprehensive public disassembly, which seeds function discovery and defines data regions the recompiler should not treat as code.

## Sources

- [Megaman3NESRecomp README and releases (GitHub)](https://github.com/mstan/Megaman3NESRecomp)
- [NESRecomp framework README (GitHub)](https://github.com/mstan/nesrecomp)
- [nesrecomp Achieves 10 Commercial Titles (1379.tech)](https://1379.tech/nesrecomp-achieves-10-commercial-titles/)
