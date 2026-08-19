---
title: "Super Mario Bros."
kicker: "NES"
tags: ["Voxel 3D", "Character mods", "Widescreen"]
featured: true
desc: "A released NES recomp where Mario is optional: experimental character mods, a widescreen mod, and a first-person Voxel 3D mode."
year: "2026"
status: "Released"
availability: "Public build"
provenance: "core"
platform: "nes"
repo: "https://github.com/mstan/SuperMarioBrosNESRecomp"
group: "NES"
links:
  - { label: "Build from your copy (GitHub)", href: "https://github.com/mstan/SuperMarioBrosNESRecomp" }
  - { label: "nesrecomp Achieves 10 Commercial Titles (1379.tech)", href: "https://1379.tech/nesrecomp-achieves-10-commercial-titles/" }
verified: "2026-08-18"
cover: "/covers/smb-voxel.jpg"
gallery:
  - { src: "./char-pikachu.png", caption: "Pikachu takes the lead role" }
  - { src: "./char-captain-falcon.png", caption: "Captain Falcon steps in" }
  - { src: "./char-link.png", caption: "Link visits the Mushroom Kingdom" }
  - { src: "./char-samus.png", caption: "Samus runs the course" }
  - { src: "./char-sonic.png", caption: "Sonic joins the roster" }
---

Super Mario Bros. is one of the ten commercial titles supported by [NESRecomp](/hardware/nes), maintained by the core team, and the first to cross the line to a full release.

## Can I play it?

Released at v1.8.0 (2026-08-14). Windows x64 is the primary and most mature host platform; macOS support is experimental and newly added. You build from your own ROM dump.

## What works

The game runs as statically recompiled native code through the shared NESRecomp runner, with save-state slots on Shift+F1 through F12.

## Enhancements

Experimental character replacements let you play as Captain Falcon, Pikachu, Samus, Link from Zelda II, or Sonic; these are off by default. The release also bundles a Smash 64 mod, an experimental widescreen mod, and an experimental first-person Voxel 3D mode built on the framework's opt-in voxel renderer.

## Requirements

Your own legally dumped ROM. The character replacements additionally require donor ROMs you supply yourself.

## Technical notes

A Mapper 0 cartridge, the simplest of the mapper families the framework covers.

## Sources

- [nesrecomp Achieves 10 Commercial Titles (1379.tech)](https://1379.tech/nesrecomp-achieves-10-commercial-titles/)
