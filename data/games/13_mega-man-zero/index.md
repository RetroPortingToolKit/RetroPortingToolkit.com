---
title: "Mega Man Zero"
kicker: "Game Boy Advance"
tags: ["Adaptive widescreen"]
featured: true
desc: "The GBA screen always felt too small for Zero. Opt-in fixed-width or adaptive widescreen finally gives the series room to move."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "game-boy-advance"
repo: "https://github.com/mstan/MegaManZeroRecomp"
group: "Game Boy Advance"
links:
  - { label: "Build from your copy (GitHub)", href: "https://github.com/mstan/MegaManZeroRecomp" }
verified: "2026-08-18"
cover: "./mmz-gameplay.png"
gallery:
  - { src: "./mmz-opening.png", caption: "Opening stage" }
---

The Mega Man Zero games are notoriously cramped by the GBA's 3:2 screen, and the collection re-releases never addressed it. This core [GBARecomp](/hardware/game-boy-advance) project takes the problem on directly. It is the consumer repository for the Zero series, with support arriving across the games.

## Can I play it?

Runs as an experimental preview, currently at v0.0.3 (2026-07-17). You build from your own dumps.

## Enhancements

Native 3:2 presentation plus opt-in widescreen with a choice of policies via --resize-view: fixed-width, or adaptive, which follows the window shape. For a series where screen real estate is the classic complaint, a wider logical view is the headline feature.

## Requirements

Your own legally dumped ROM and GBA BIOS.

## Known issues

Save states and widescreen have a known interaction issue.
