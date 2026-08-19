---
title: "Sonic 3 & Knuckles"
kicker: "Sega Genesis"
tags: ["Widescreen"]
featured: false
desc: "Sonic 3 & Knuckles on SegaGenesisRecomp, with a widescreen setting and a pre-boot launcher to greet you."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "sega-genesis"
repo: "https://github.com/mstan/Sonic3AndKnucklesRecomp"
group: "Sega Genesis"
links:
  - { label: "Build from your copy (GitHub)", href: "https://github.com/mstan/Sonic3AndKnucklesRecomp" }
  - { label: "SegaGenesisRecomp Gets Game #2: Sonic the Hedgehog 2 (1379.tech)", href: "https://1379.tech/segagenesisrecomp-gets-game-2-sonic-the-hedgehog-2/" }
verified: "2026-08-18"
---

Sonic 3 & Knuckles is one of the titles with public releases on [SegaGenesisRecomp](/hardware/sega-genesis), maintained by the core team.

## Can I play it?

Playable alpha. The current release is v0.3.0 (2026-06-17), the one that introduced a pre-boot launcher UI. You build from your own ROM dump.

## What works

The game runs as statically recompiled 68000 code through the shared runner.

## Enhancements

A widescreen setting via the framework's opt-in 16:9 injection. Framework-level 2-player split-screen exists for the Sonic family.

## Technical notes

The framework's clean-room interpreter tier serves as a fallback for static-dispatch misses.

## Sources

- [SegaGenesisRecomp Gets Game #2: Sonic the Hedgehog 2 (1379.tech)](https://1379.tech/segagenesisrecomp-gets-game-2-sonic-the-hedgehog-2/)
