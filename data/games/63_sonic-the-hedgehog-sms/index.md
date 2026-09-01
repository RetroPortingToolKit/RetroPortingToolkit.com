---
title: "Sonic the Hedgehog (Master System)"
kicker: "Master System"
tags: []
featured: false
desc: "A very early Master System recomp tech demo for the 8-bit Sonic the Hedgehog."
year: "2026"
status: "Tech demo"
availability: "Public build"
provenance: "core"
platform: "master-system-game-gear"
repo: "https://github.com/mstan/SonicTheHedgehogSMSRecomp"
group: "Master System"
verified: "2026-08-20"
updated: "2026-07-23"
added: "2026-06-23"
cover: "./green-hill-zone.png"
---

This is the 8-bit Sonic the Hedgehog for Master System, not the Genesis game with the same name.

It is a very early [Master System / Game Gear](/hardware/master-system-game-gear) tech demo. It proves the framework can boot a real commercial game, but it is not a full port.

## Playable status

Tech demo. An early Windows build is on the releases page. There is no launcher: you run it from a command line and hand it the path to a ROM dump you provide.

The checked path is narrow. The game boots and plays Green Hill Zone, but it has not been played end to end. Coverage past that is unverified, and more code paths will surface during real play.

![The Green Hill title card, from the recompiled build](./green-hill-title-card.png)

## Sources

- [Project README and releases (GitHub)](https://github.com/mstan/SonicTheHedgehogSMSRecomp)
- [smsggrecomp framework (GitHub)](https://github.com/mstan/smsggrecomp)
