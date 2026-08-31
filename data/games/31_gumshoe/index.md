---
title: "Gumshoe"
kicker: "NES"
tags: []
featured: false
desc: "A light-gun rarity playable end to end, with your mouse standing in for the Zapper."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "nes"
repo: "https://github.com/mstan/GumshoeNESRecomp"
group: "NES"
links:
  - { label: "nesrecomp Achieves 10 Commercial Titles (1379.tech)", href: "https://1379.tech/nesrecomp-achieves-10-commercial-titles/" }
verified: "2026-08-18"
updated: "2026-07-23"
added: "2026-04-13"
cover: "/data/blog/20_nesrecomp-10-titles/GumshoeRecomp_AjIBeqmNFw.png"
---

A core project: Gumshoe is one of the [ten commercial titles](/blog/nesrecomp-10-titles) supported by [NESRecomp](/hardware/nes). It is a side-scrolling light-gun game: detective Mr. Stevenson walks on his own while you shoot obstacles and enemies out of his path and collect diamonds. Beyond the novelty, its unusual cartridge brought the framework its fourth supported mapper family.

## Playable status

Yes, end to end. Windows and experimental Linux builds are on [GitHub Releases](https://github.com/mstan/GumshoeNESRecomp/releases). It is built from a dump you provide, the USA/Europe version.

Jumping, obstacle shooting, enemy hit detection, bottle targets, round progression, and scoring all work. Audio is still basic while full sound mixing lands in the framework.

## What the recomp adds

The mouse stands in for the Zapper light gun. Moving aims, left click fires, and a crosshair marks the aim point, white normally and red when firing, with the system cursor hidden over the game window.

![Mr. Stevenson keeps walking on his own. The white crosshair at right is the mouse.](/data/blog/20_nesrecomp-10-titles/GumshoeRecomp_DVKZb2r0SM.png)

The runner adds save states (F6 saves, F7 restores) and an F5 fast-forward toggle.


## Sources

- [GumshoeNESRecomp README and releases (GitHub)](https://github.com/mstan/GumshoeNESRecomp)
- [NESRecomp framework README (GitHub)](https://github.com/mstan/nesrecomp)
- [nesrecomp Achieves 10 Commercial Titles (1379.tech)](https://1379.tech/nesrecomp-achieves-10-commercial-titles/)
