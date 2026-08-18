---
title: "Pokemon FireRed & LeafGreen"
kicker: "Game Boy Advance"
tags: ["Dual targets"]
featured: false
desc: "One repository, two games: FireRed and LeafGreen each build as their own native target."
year: "2026"
status: "Alpha"
provenance: "core"
platform: "game-boy-advance"
repo: "https://github.com/mstan/FireRedLeafGreenRecomp"
group: "Game Boy Advance"
links:
  - { label: "FireRedLeafGreenRecomp on GitHub", href: "https://github.com/mstan/FireRedLeafGreenRecomp" }
---

Pokemon FireRed and LeafGreen share one [GBARecomp](/hardware/game-boy-advance) repository, and each builds as its own separate native target. Currently at v0.0.3 (2026-07-17).

## What works today

Both games build and run through the recompiled runtime as experimental previews, the framework's honest label for its whole GBA lineup.

## Enhancements

The dual-target setup itself is the notable engineering detail here: one repository, two native executables, one per game version.

No game data is distributed; the project builds from your own legally dumped ROMs and GBA BIOS.
