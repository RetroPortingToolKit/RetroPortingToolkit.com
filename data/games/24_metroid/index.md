---
title: "Metroid"
kicker: "NES"
tags: []
featured: false
desc: "An early native PC build of Metroid: the starting area plays, passwords work, and a first-person experiment is bundled."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "nes"
repo: "https://github.com/mstan/MetroidNESRecomp"
group: "NES"
links:
  - { label: "nesrecomp Achieves 10 Commercial Titles (1379.tech)", href: "https://1379.tech/nesrecomp-achieves-10-commercial-titles/" }
verified: "2026-08-18"
updated: "2026-08-04"
added: "2026-04-03"
cover: "/data/blog/20_nesrecomp-10-titles/MetroidNESRecomp_Csz3Tj0DhO.png"
---

A core project: Metroid is one of the [ten commercial titles](/blog/nesrecomp-10-titles) supported by [NESRecomp](/hardware/nes), and the most openly work-in-progress of the family. The starting area plays, the password loop works, and the rest of Zebes is still being wired up.

## Can I play it?

The starting area, yes. A v0.1.0 Windows x64 build is on [GitHub Releases](https://github.com/mstan/MetroidNESRecomp/releases) (2026-06-18, adding password save support), with an experimental Linux AppImage alongside; it is built from a dump you provide (US version).

Within the starting region you can walk, jump, shoot, pick up the Morph Ball, and fight enemies. The death, Game Over, password, and restart cycle is stable: the build has run more than 115,000 frames without crashing.

Beyond that region, enemies, doors, or items may silently fail where code paths have not yet been mapped, and behavior has not yet been validated against an emulator reference.

## What the recomp adds

An experimental first-person Voxel 3D mode, off by default in the launcher's Mods screen. The camera follows Samus, Left and Right steer her heading, and holding Up smoothly raises the view along the near-vertical shot path while the lens widens so overhead enemies and her shots stay visible.

The energy readout is kept as a clean overlay rather than part of the 3D scene. Numpad keys adjust pitch, yaw, roll, field of view, and sprite scale; Numpad 0 toggles the view. The mode does not patch the ROM or alter password data.

## Technical details

An MMC1 cartridge with eight program banks: bank 7 is fixed and holds the main loop and interrupt handlers, banks 0 through 6 swap in area-specific code, and bank switching is handled through runtime dispatch.

Metroid was chosen partly because it has a comprehensive public disassembly, which the framework leans on: symbols help separate code from data and make the recompiled output easier to verify. Even with that help, the game has hundreds of dispatch targets to chase down, which is why it remains an early foundation.

## Sources

- [MetroidNESRecomp README and releases (GitHub)](https://github.com/mstan/MetroidNESRecomp)
- [NESRecomp framework README (GitHub)](https://github.com/mstan/nesrecomp)
- [nesrecomp Achieves 10 Commercial Titles (1379.tech)](https://1379.tech/nesrecomp-achieves-10-commercial-titles/)
