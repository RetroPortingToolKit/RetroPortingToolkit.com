---
title: "Yoshi"
kicker: "NES"
tags: []
featured: false
desc: "The NES puzzle game as a native PC build, believed fully playable, two-player versus included."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "nes"
repo: "https://github.com/mstan/YoshiNESRecomp"
group: "NES"
links:
  - { label: "nesrecomp Achieves 10 Commercial Titles (1379.tech)", href: "https://1379.tech/nesrecomp-achieves-10-commercial-titles/" }
verified: "2026-08-18"
updated: "2026-08-03"
added: "2026-03-29"
cover: "/data/blog/20_nesrecomp-10-titles/YoshiRecomp_IiG8QxDtHO.png"
---

A core project: Yoshi is one of the [ten commercial titles](/blog/nesrecomp-10-titles) supported by [NESRecomp](/hardware/nes). Its simple game loop is exactly why it is here. It was one of the games the framework used to prove it could support titles with no public disassembly to lean on.

## Can I play it?

Yes, and it is believed fully playable. A v1.1.0 Windows x64 build (2026-04-07) is on [GitHub Releases](https://github.com/mstan/YoshiNESRecomp/releases), with an experimental Linux AppImage alongside. It is built from a dump you provide, the USA version.

![A-TYPE at level 01, low speed, one of the two single-player puzzle modes.](/data/blog/20_nesrecomp-10-titles/YoshiRecomp_Vis0ZsyM2I.png)

Both single-player puzzle modes, two-player versus, and the attract demo all run end to end, with both controller ports working. Audio is still basic while full sound mixing lands in the framework.

## What the recomp adds

The original cartridge has no battery save, so the runner's save states become the way to bookmark a session: F6 saves, F7 restores, and F5 toggles fast-forward. Gamepads work alongside the keyboard.

## Technical details

An MMC1 cartridge. With no disassembly to seed from, the recompiler's own static analysis had to find the game's functions. Yoshi's missed dispatch targets numbered in the dozens rather than the hundreds seen on bigger games, which made it a practical target. The repository also carries an optional verify mode that runs the recompiled game in lockstep against a Nestopia emulator core.

## Sources

- [YoshiNESRecomp README and releases (GitHub)](https://github.com/mstan/YoshiNESRecomp)
- [nesrecomp Achieves 10 Commercial Titles (1379.tech)](https://1379.tech/nesrecomp-achieves-10-commercial-titles/)
