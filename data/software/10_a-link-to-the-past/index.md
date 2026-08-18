---
title: "The Legend of Zelda: A Link to the Past"
kicker: "Super Nintendo"
tags: ["Adaptive widescreen", "MSU-1"]
featured: false
desc: "Playable through the early dungeon, with adaptive widescreen, MSU-1 audio, and a first Linux build."
year: "2026"
status: "Alpha"
provenance: "core"
platform: "super-nintendo"
repo: "https://github.com/mstan/ZeldaAlttPSNESRecomp"
group: "Super Nintendo"
links:
  - { label: "ZeldaAlttPSNESRecomp on GitHub", href: "https://github.com/mstan/ZeldaAlttPSNESRecomp" }
---

A Link to the Past is one of the three released [SNESRecomp](/hardware/super-nintendo) titles, currently at v0.6.1 (2026-08-06). The framework README describes it as playable through the early dungeon, and the honest label is alpha.

## What works today

The game is playable through the early dungeon. The v0.6.0 release was a step up in platform reach, moving to SDL3 and shipping the project's first Linux build.

## Enhancements

Adaptive widescreen arrived as a mod in v0.6.0. It caps at a 446px logical width, roughly a 2:1 aspect, because sprites cannot safely render wider than that. MSU-1 support adds CD-quality audio.

## Known limitations

Progress beyond the early dungeon is not yet claimed, and the widescreen cap is a hard limit of the current sprite handling.

No game data is distributed; the project builds from your own legally dumped ROM.
