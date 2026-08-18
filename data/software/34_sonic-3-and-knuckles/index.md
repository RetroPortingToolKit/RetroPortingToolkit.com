---
title: "Sonic 3 & Knuckles"
kicker: "Sega Genesis"
tags: ["Widescreen"]
featured: false
desc: "The combined Sonic 3 & Knuckles experience on SegaGenesisRecomp, with a widescreen setting and a pre-boot launcher."
year: "2026"
status: "Alpha"
provenance: "core"
platform: "sega-genesis"
repo: "https://github.com/mstan/Sonic3AndKnucklesRecomp"
group: "Sega Genesis"
links:
  - { label: "Sonic3AndKnucklesRecomp on GitHub", href: "https://github.com/mstan/Sonic3AndKnucklesRecomp" }
  - { label: "SegaGenesisRecomp Gets Game #2: Sonic the Hedgehog 2 (1379.tech)", href: "https://1379.tech/segagenesisrecomp-gets-game-2-sonic-the-hedgehog-2/" }
---

Sonic 3 & Knuckles is one of the released titles on [SegaGenesisRecomp](/hardware/sega-genesis), maintained by the core team. The current release is v0.3.0 (2026-06-17), which introduced a pre-boot launcher UI.

## What works today

The game runs as statically recompiled 68000 code through the shared runner, with the framework's clean-room interpreter tier as a fallback for static-dispatch misses.

## Enhancements

A widescreen setting via the framework's opt-in 16:9 injection. Framework-level 2-player split-screen exists for the Sonic family.

No game data is distributed; the project builds from your own legally dumped ROM.
