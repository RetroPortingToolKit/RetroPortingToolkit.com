---
title: "The Legend of Zelda"
kicker: "NES"
tags: ["Voxel 3D", "HD"]
featured: true
desc: "Hyrule as a native PC game, with a 3D diorama view of every room, a first-person mode, and an experimental HD build."
year: "2026"
status: "Released"
availability: "Public build"
provenance: "core"
platform: "nes"
repo: "https://github.com/mstan/LegendOfZeldaNESRecomp"
group: "NES"
links:
  - { label: "nesrecomp Achieves 10 Commercial Titles (1379.tech)", href: "https://1379.tech/nesrecomp-achieves-10-commercial-titles/" }
verified: "2026-08-18"
cover: "./voxel-3d.webp"
---

The Legend of Zelda runs as a native PC game through [NESRecomp](/hardware/nes), maintained by the core team, and it is the showcase for the framework's Voxel 3D renderer: flip a switch and flat Hyrule becomes a raised diorama you can orbit, or a first-person view from Link's own eyes.

## Can I play it?

Yes. v1.7.0 shipped on 2026-06-19 as a Windows x64 download on [GitHub Releases](https://github.com/mstan/LegendOfZeldaNESRecomp/releases), alongside a separate experimental build labeled "Zelda Remastered HD" and an experimental Linux AppImage; the framework's newly added macOS support is experimental but runs this game well, by building from source. It is built from a dump you provide (USA version), selected on first launch. The game is believed 100 percent playable: tested through the overworld and dungeon 7 with no known missing code paths. Your quest saves normally, persisted to a file next to the executable.

## What the recomp adds

Two Voxel 3D modes, both off by default and mutually exclusive. The overworld mode presents each room as a raised tabletop: pitch looks down into the room, yaw orbits it, zoom reframes it, and every tree, enemy, and pickup stands up as a card with its own contact shadow. The first-person mode puts the camera at Link's position with two-stick controls, the right stick looking and the left stick moving relative to the view, while the original HUD stays flat and pixel-perfect. Numpad 0 toggles the view live and the numpad adjusts pitch, yaw, roll, zoom, and sprite scale; title and inventory screens stay flat. Beyond the renderer, the shared runner provides save states, a fast-forward toggle, and gamepad support.

## Technical details

An MMC1 cartridge, and one of the framework's hardest early cases: the game copies code into cartridge SRAM and executes it from there, which breaks the assumption that executable code only lives in ROM. The final dispatch gaps were closed using debug symbols from the zelda1-disassembly project by Aldo Nunez. Voxel geometry is rebuilt each frame from the game's live 32x22 tile grid and its collision data, with current sprites assembled into camera-facing cards. The renderer is a presentation-only plugin: the stock ROM, saves, and launches with the feature disabled are unchanged.

## Sources

- [LegendOfZeldaNESRecomp README and releases (GitHub)](https://github.com/mstan/LegendOfZeldaNESRecomp)
- [NESRecomp framework README (GitHub)](https://github.com/mstan/nesrecomp)
- [nesrecomp Achieves 10 Commercial Titles (1379.tech)](https://1379.tech/nesrecomp-achieves-10-commercial-titles/)
- [NESRecomp: From Faxanadu to 4 Supported Commercial Titles (1379.tech)](https://1379.tech/nesrecomp-from-faxanadu-to-4-supported-commercial-titles/)
