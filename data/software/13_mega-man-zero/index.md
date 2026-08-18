---
title: "Mega Man Zero"
kicker: "Game Boy Advance"
tags: ["Adaptive widescreen"]
featured: true
desc: "The famously cramped Mega Man Zero games, given room to breathe with opt-in fixed-width or adaptive widescreen."
year: "2026"
status: "Alpha"
provenance: "core"
platform: "game-boy-advance"
repo: "https://github.com/mstan/MegaManZeroRecomp"
group: "Game Boy Advance"
links:
  - { label: "MegaManZeroRecomp on GitHub", href: "https://github.com/mstan/MegaManZeroRecomp" }
---

The Mega Man Zero games are notoriously cramped by the GBA's 3:2 screen, and the collection re-releases never addressed it. This [GBARecomp](/hardware/game-boy-advance) project takes that problem on directly. It is the consumer repository for the Zero series, with support arriving across the games, currently at v0.0.3 (2026-07-17).

## What works today

The game runs through the recompiled runtime as an experimental preview, the honest label the framework applies to its whole lineup.

## Enhancements

Native 3:2 presentation plus opt-in widescreen with a choice of policies via --resize-view: fixed-width, or adaptive, which follows the window shape. For a series where screen real estate is the classic complaint, a wider logical view is the headline feature.

## Known limitations

Save states and widescreen have a known interaction issue.

No game data is distributed; the project builds from your own legally dumped ROM and GBA BIOS.
