---
title: "Duck Hunt"
kicker: "NES"
tags: ["Mouse Zapper"]
featured: false
desc: "Duck Hunt as a native PC build, with the mouse standing in for the Zapper."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "nes"
repo: "https://github.com/mstan/DuckHuntNESRecomp"
group: "NES"
links:
  - { label: "NESRecomp progress article (1379.tech)", href: "https://1379.tech/nesrecomp-achieves-10-commercial-titles/" }
verified: "2026-08-18"
updated: "2026-07-23"
added: "2026-04-10"
cover: "/data/blog/20_nesrecomp-10-titles/DuckHuntRecomp_ALvjc1KEbx.png"
---

Duck Hunt needs hardware most modern setups do not have: the Zapper light gun and a CRT television.

This [NESRecomp](/hardware/nes) build hands that job to your mouse. Move to aim, click to shoot.

## Playable status

Yes. A Windows build is on [GitHub Releases](https://github.com/mstan/DuckHuntNESRecomp/releases). It is built from a dump you provide, the World version.

The title screen and all three game modes work, along with duck flight, hit detection, scoring, the dog's animations, and round progression.

## What the recomp adds

The mouse stands in for the Zapper. Moving aims, left click pulls the trigger, and a crosshair marks your aim point.

The light-gun behavior is modeled closely enough that the game still responds through its original checks.


## Sources

- [DuckHuntNESRecomp README and releases (GitHub)](https://github.com/mstan/DuckHuntNESRecomp)
- [NESRecomp framework README (GitHub)](https://github.com/mstan/nesrecomp)
- [NESRecomp progress article (1379.tech)](https://1379.tech/nesrecomp-achieves-10-commercial-titles/)
