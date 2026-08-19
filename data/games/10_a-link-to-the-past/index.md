---
title: "The Legend of Zelda: A Link to the Past"
kicker: "Super Nintendo"
tags: ["Adaptive widescreen", "MSU-1"]
featured: false
desc: "Hyrule, playable through the early dungeon, with adaptive widescreen, MSU-1 audio, and a first Linux build."
year: "2026"
status: "Partial"
availability: "Public build"
provenance: "core"
platform: "super-nintendo"
repo: "https://github.com/mstan/ZeldaAlttPSNESRecomp"
group: "Super Nintendo"
links:
  - { label: "Build from your copy (GitHub)", href: "https://github.com/mstan/ZeldaAlttPSNESRecomp" }
verified: "2026-08-18"
---

A Link to the Past is one of the three released [SNESRecomp](/hardware/super-nintendo) titles, maintained as a core project.

## Can I play it?

Playable through the early dungeon, per the framework README. The current release is v0.6.1 (2026-08-06); the v0.6.0 release moved to SDL3 and shipped the project's first Linux build. You build from your own ROM dump.

## Enhancements

Adaptive widescreen arrived as a mod in v0.6.0. It caps at a 446px logical width, roughly a 2:1 aspect, because sprites cannot safely render wider than that. MSU-1 support adds CD-quality audio.

## Requirements

Your own legally dumped ROM.

## Known issues

Progress beyond the early dungeon is not yet claimed, and the widescreen cap is a hard limit of the current sprite handling.
