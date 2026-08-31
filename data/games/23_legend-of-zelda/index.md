---
title: "The Legend of Zelda"
kicker: "NES"
tags: ["Voxel 3D"]
featured: true
desc: "Hyrule as a native PC game, with experimental 3D renderer work."
year: "2026"
status: "Released"
availability: "Public build"
provenance: "core"
platform: "nes"
repo: "https://github.com/mstan/LegendOfZeldaNESRecomp"
group: "NES"
links:
  - { label: "NESRecomp progress article (1379.tech)", href: "https://1379.tech/nesrecomp-achieves-10-commercial-titles/" }
verified: "2026-08-18"
updated: "2026-08-04"
added: "2026-03-15"
cover: "./voxel-3d.webp"
---

The Legend of Zelda runs as a native PC game through [NESRecomp](/hardware/nes).

It is the NES showcase for alternate renderers. Flat Hyrule can become a raised 3D room, or a first-person view from Link's position.

![The Legend of Zelda running as a native PC game](/previews/legend-of-zelda.mp4)

## Playable status

Yes. Windows and experimental Linux builds are on [GitHub Releases](https://github.com/mstan/LegendOfZeldaNESRecomp/releases). It is built from a dump you provide, selected on first launch.

The game is believed 100 percent playable: tested through the overworld and dungeon 7 with no known missing code paths. Your quest saves normally, persisted to a file next to the executable.

## What the recomp adds

The Voxel 3D renderer has two modes:

- Overworld mode, where each room becomes a raised tabletop you can orbit.
- First-person mode, where the camera moves from Link's position while the original HUD stays flat.


## Sources

- [LegendOfZeldaNESRecomp README and releases (GitHub)](https://github.com/mstan/LegendOfZeldaNESRecomp)
- [NESRecomp framework README (GitHub)](https://github.com/mstan/nesrecomp)
- [NESRecomp progress article (1379.tech)](https://1379.tech/nesrecomp-achieves-10-commercial-titles/)
