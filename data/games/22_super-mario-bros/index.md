---
title: "Super Mario Bros."
kicker: "NES"
tags: ["Voxel 3D", "Character mods", "Widescreen"]
featured: true
desc: "A released NES recomp where Mario is optional: experimental character mods, a widescreen mod, and a first-person Voxel 3D mode."
year: "2026"
status: "Released"
provenance: "core"
platform: "nes"
repo: "https://github.com/mstan/SuperMarioBrosNESRecomp"
group: "NES"
links:
  - { label: "SuperMarioBrosNESRecomp on GitHub", href: "https://github.com/mstan/SuperMarioBrosNESRecomp" }
  - { label: "nesrecomp Achieves 10 Commercial Titles (1379.tech)", href: "https://1379.tech/nesrecomp-achieves-10-commercial-titles/" }
---

Super Mario Bros. is one of the ten commercial titles supported by [NESRecomp](/hardware/nes), maintained by the core team, and it has crossed the line to a full release at v1.8.0 (2026-08-14). Under the hood it is a Mapper 0 cartridge, the simplest of the mapper families the framework covers.

## What works today

The game runs as statically recompiled native code through the shared NESRecomp runner, with save-state slots on Shift+F1 through F12. Windows x64 is the primary and most mature platform; macOS support is experimental and newly added.

## Enhancements

Experimental character replacements let you play as Captain Falcon, Pikachu, Samus, Link from Zelda II, or Sonic. These are off by default and require donor ROMs you supply yourself. The release also bundles a Smash 64 mod, an experimental widescreen mod, and an experimental first-person Voxel 3D mode built on the framework's opt-in voxel renderer.

No game data is distributed; the project builds from your own legally dumped ROM.
