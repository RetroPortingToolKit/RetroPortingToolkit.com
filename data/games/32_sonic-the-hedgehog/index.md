---
title: "Sonic the Hedgehog"
kicker: "Sega Genesis"
tags: ["Widescreen"]
featured: false
desc: "Green Hill Zone was the proving ground: Sonic was SegaGenesisRecomp's first title, now with a widescreen setting and intro skip."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "sega-genesis"
repo: "https://github.com/mstan/SonicTheHedgehogRecomp"
group: "Sega Genesis"
links:
  - { label: "Build from your copy (GitHub)", href: "https://github.com/mstan/SonicTheHedgehogRecomp" }
  - { label: "segagenesisrecomp + Sonic the Hedgehog tech demo (1379.tech)", href: "https://1379.tech/segagenesisrecomp-sonic-the-hedgehog-tech-demo/" }
verified: "2026-08-18"
---

Sonic the Hedgehog was the first title brought up on [SegaGenesisRecomp](/hardware/sega-genesis), the Sega Genesis static recompilation project maintained by the core team.

## Can I play it?

Playable alpha. The current release is v0.6.0 (2026-06-17), which added a Linux AppImage. You build from your own ROM dump.

## What works

The game runs as statically recompiled 68000 code through the shared runner. The 2026-03-24 tech demo write-up records the bring-up booting to Green Hill Zone, with known issues at the time.

## Enhancements

A widescreen setting and an intro skip option. At the framework level, 2-player split-screen exists for the Sonic family of titles.

## Technical notes

The bring-up moved fast: 133 functions verified in a single day through dual execution against a reference. The framework's clean-room interpreter tier catches static-dispatch misses.

## Sources

- [segagenesisrecomp + Sonic the Hedgehog tech demo (1379.tech)](https://1379.tech/segagenesisrecomp-sonic-the-hedgehog-tech-demo/)
