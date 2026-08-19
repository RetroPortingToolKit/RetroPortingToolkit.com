---
title: "The Legend of Zelda"
kicker: "NES"
tags: ["Voxel 3D", "HD"]
featured: true
desc: "Hyrule in voxels: a released NES recomp with a 3D overworld renderer, a first-person mode, and an experimental HD build."
year: "2026"
status: "Released"
availability: "Public build"
provenance: "core"
platform: "nes"
repo: "https://github.com/mstan/LegendOfZeldaNESRecomp"
group: "NES"
links:
  - { label: "Build from your copy (GitHub)", href: "https://github.com/mstan/LegendOfZeldaNESRecomp" }
  - { label: "nesrecomp Achieves 10 Commercial Titles (1379.tech)", href: "https://1379.tech/nesrecomp-achieves-10-commercial-titles/" }
verified: "2026-08-18"
cover: "./voxel-3d.webp"
---

The Legend of Zelda is one of the ten commercial titles supported by [NESRecomp](/hardware/nes), maintained by the core team, and the showcase for the framework's opt-in Voxel 3D renderer.

## Can I play it?

Released at v1.7.0 (2026-06-19), alongside a separate v1.7.0-hd build labeled "Zelda Remastered HD (EXPERIMENTAL)". Windows x64 is the primary host platform; macOS support is experimental. You build from your own ROM dump.

## What works

The game runs through the shared NESRecomp runner with the framework's save-state slots.

## Enhancements

The Voxel 3D renderer offers both an overworld mode and a first-person mode, toggled with Numpad 0. The experimental HD build extends that direction further.

## Technical notes

An MMC1 cartridge that exercises one of the framework's harder cases: code executed out of SRAM.

## Sources

- [nesrecomp Achieves 10 Commercial Titles (1379.tech)](https://1379.tech/nesrecomp-achieves-10-commercial-titles/)
