---
title: "The Legend of Zelda"
kicker: "NES"
tags: ["Voxel 3D", "HD"]
featured: true
desc: "Released NESRecomp title with a Voxel 3D renderer for the overworld, a first-person mode, and an experimental HD build."
year: "2026"
status: "Released"
provenance: "core"
platform: "nes"
repo: "https://github.com/mstan/LegendOfZeldaNESRecomp"
group: "NES"
links:
  - { label: "LegendOfZeldaNESRecomp on GitHub", href: "https://github.com/mstan/LegendOfZeldaNESRecomp" }
  - { label: "nesrecomp Achieves 10 Commercial Titles (1379.tech)", href: "https://1379.tech/nesrecomp-achieves-10-commercial-titles/" }
---

The Legend of Zelda is one of the ten commercial titles supported by [NESRecomp](/hardware/nes), maintained by the core team. It shipped v1.7.0 on 2026-06-19 alongside a separate v1.7.0-hd build labeled "Zelda Remastered HD (EXPERIMENTAL)".

## What works today

The game is an MMC1 cartridge and exercises one of the framework's harder cases: code executed out of SRAM. It runs through the shared NESRecomp runner with the framework's save-state slots, with Windows x64 as the primary platform and macOS support experimental.

## Enhancements

This title is the showcase for NESRecomp's opt-in Voxel 3D renderer, with both an overworld mode and a first-person mode, toggled with Numpad 0. The experimental HD build extends that direction further.

The project distributes no game data and builds from your own legally dumped ROM.
