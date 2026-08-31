---
title: "Yoshi"
kicker: "NES"
tags: []
featured: false
desc: "The NES puzzle game as a native PC build, believed fully playable, with save states and fast-forward."
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
updated: "2026-08-31"
added: "2026-03-29"
cover: "/data/blog/20_nesrecomp-10-titles/YoshiRecomp_IiG8QxDtHO.png"
---

A core project: Yoshi is one of the [ten commercial titles](/blog/nesrecomp-10-titles) supported by [NESRecomp](/hardware/nes). Its simple game loop is exactly why it is here. It was one of the games the framework used to prove it could support titles with no public disassembly to lean on.

## Playable status

Yes, and it is believed fully playable. Windows and experimental Linux builds are on [GitHub Releases](https://github.com/mstan/YoshiNESRecomp/releases). It is built from a dump you provide, the USA version.

![A-TYPE at level 01, low speed, one of the two single-player puzzle modes.](/data/blog/20_nesrecomp-10-titles/YoshiRecomp_Vis0ZsyM2I.png)

Both single-player puzzle modes and the attract demo run end to end. Audio is still basic while full sound mixing lands in the framework.

## What the recomp adds

The original cartridge has no battery save, so the runner's save states become the way to bookmark a session: F6 saves, F7 restores, and F5 toggles fast-forward. Gamepads work alongside the keyboard.


## Sources

- [YoshiNESRecomp README and releases (GitHub)](https://github.com/mstan/YoshiNESRecomp)
- [nesrecomp Achieves 10 Commercial Titles (1379.tech)](https://1379.tech/nesrecomp-achieves-10-commercial-titles/)
