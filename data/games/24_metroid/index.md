---
title: "Metroid"
kicker: "NES"
tags: []
featured: false
desc: "An early NESRecomp build of Metroid with the starting area playable and a first-person experiment."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "nes"
repo: "https://github.com/mstan/MetroidNESRecomp"
group: "NES"
links:
  - { label: "NESRecomp progress article (1379.tech)", href: "https://1379.tech/nesrecomp-achieves-10-commercial-titles/" }
verified: "2026-08-18"
updated: "2026-08-04"
added: "2026-04-03"
cover: "/data/blog/20_nesrecomp-10-titles/MetroidNESRecomp_Csz3Tj0DhO.png"
---

Metroid is an early [NESRecomp](/hardware/nes) proof for a larger action game.

The starting area plays, the password loop works, and the rest of Zebes still needs more coverage.

## Playable status

The starting area, yes. Windows and experimental Linux builds are on [GitHub Releases](https://github.com/mstan/MetroidNESRecomp/releases). It is built from a dump you provide (US version).

Within the starting region you can walk, jump, shoot, pick up the Morph Ball, and fight enemies. The death, Game Over, password, and restart cycle works.

Beyond that region, expect missing behavior until more of the game is mapped.

## What the recomp adds

An experimental first-person Voxel 3D mode is available from the launcher. The camera follows Samus and turns the side view into a first-person view.

The energy readout stays as a clean overlay rather than becoming part of the 3D scene. The mode does not patch the ROM or alter password data.


## Sources

- [MetroidNESRecomp README and releases (GitHub)](https://github.com/mstan/MetroidNESRecomp)
- [NESRecomp framework README (GitHub)](https://github.com/mstan/nesrecomp)
- [NESRecomp progress article (1379.tech)](https://1379.tech/nesrecomp-achieves-10-commercial-titles/)
