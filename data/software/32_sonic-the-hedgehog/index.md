---
title: "Sonic the Hedgehog"
kicker: "Sega Genesis"
tags: ["Widescreen"]
featured: false
desc: "The first Genesis title recompiled by SegaGenesisRecomp, with a widescreen setting and intro skip."
year: "2026"
status: "Alpha"
provenance: "core"
platform: "sega-genesis"
repo: "https://github.com/mstan/SonicTheHedgehogRecomp"
group: "Sega Genesis"
links:
  - { label: "SonicTheHedgehogRecomp on GitHub", href: "https://github.com/mstan/SonicTheHedgehogRecomp" }
  - { label: "segagenesisrecomp + Sonic the Hedgehog tech demo (1379.tech)", href: "https://1379.tech/segagenesisrecomp-sonic-the-hedgehog-tech-demo/" }
---

Sonic the Hedgehog was the first title brought up on [SegaGenesisRecomp](/hardware/sega-genesis), maintained by the core team. The 2026-03-24 tech demo write-up documents the bring-up: 133 functions verified in a single day through dual execution against a reference, booting to Green Hill Zone with known issues at the time. The current release is v0.6.0 (2026-06-17), which added a Linux AppImage.

## What works today

The game runs as statically recompiled 68000 code through the shared runner, with the framework's clean-room interpreter tier catching static-dispatch misses.

## Enhancements

A widescreen setting and an intro skip option. At the framework level, 2-player split-screen exists for the Sonic family of titles.

No game data is distributed; the project builds from your own legally dumped ROM.
