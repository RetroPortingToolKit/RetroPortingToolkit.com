---
title: "Duck Hunt"
kicker: "NES"
tags: ["Mouse Zapper"]
featured: false
desc: "Duck Hunt without the light gun: your mouse aims and fires in a native PC build."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "nes"
repo: "https://github.com/mstan/DuckHuntNESRecomp"
group: "NES"
links:
  - { label: "nesrecomp Achieves 10 Commercial Titles (1379.tech)", href: "https://1379.tech/nesrecomp-achieves-10-commercial-titles/" }
verified: "2026-08-18"
updated: "2026-07-23"
added: "2026-04-10"
cover: "/data/blog/20_nesrecomp-10-titles/DuckHuntRecomp_ALvjc1KEbx.png"
---

Duck Hunt needs a piece of hardware no modern setup has: the Zapper light gun, pointed at a CRT television. This [NESRecomp](/hardware/nes) build, maintained by the core team, hands that job to your mouse. Move to aim, click to shoot.

## Can I play it?

Yes. A v1.1.0 Windows x64 build (2026-07-01) is on [GitHub Releases](https://github.com/mstan/DuckHuntNESRecomp/releases). It is built from a dump you provide, the World version.

The title screen and all three game modes work, along with duck flight, hit detection, scoring, the dog's laughing and retrieving animations, and round progression. Audio is still basic while full sound mixing lands in the framework.

## What the recomp adds

The mouse stands in for the Zapper. Moving aims, left click pulls the trigger, and a crosshair marks your aim point, white normally and red when firing, with the system cursor hidden over the game window.

Under the hood the light-gun detection is fully simulated, including the original two-phase sequence with its anti-cheat black-screen check, so the game responds the way it did on real hardware.

## Technical details

A Mapper 0 (NROM) cartridge, the same simple family as Super Mario Bros. The 6502 code is translated to C at build time and compiled to native x64; the console's video and audio hardware are simulated by the shared runner, and the Zapper hooks live in the game's small integration layer.

## Sources

- [DuckHuntNESRecomp README and releases (GitHub)](https://github.com/mstan/DuckHuntNESRecomp)
- [NESRecomp framework README (GitHub)](https://github.com/mstan/nesrecomp)
- [nesrecomp Achieves 10 Commercial Titles (1379.tech)](https://1379.tech/nesrecomp-achieves-10-commercial-titles/)
