---
title: "Tomba! 2"
kicker: "PlayStation"
tags: ["Adaptive widescreen", "Debug menu"]
featured: false
desc: "The 3D sequel recompiled, with adaptive widescreen up to 21:9, FMV skip, and an experimental debug menu."
year: "2026"
status: "Alpha"
provenance: "core"
platform: "playstation"
repo: "https://github.com/mstan/Tomba2Recomp"
group: "PlayStation"
links:
  - { label: "Tomba2Recomp on GitHub", href: "https://github.com/mstan/Tomba2Recomp" }
---

Tomba! 2 follows its predecessor into [PSXRecomp](/hardware/playstation) territory, currently at v0.0.8 (released 2026-08-08). Where [Tomba!](/software/tomba) is a 2.5D game, the sequel is fully 3D, which brings its own set of presentation challenges.

## What works today

The game boots and plays through the recompiled runtime. Enhancements are already layered on top, though the 3D presentation still has rough edges.

## Enhancements

Widescreen in 16:9, 21:9, and Adaptive modes, where Adaptive follows the window shape anywhere from 4:3 up to 21:9. FMV skipping, an experimental debug menu on L3, and temporal frame blending round out the current set.

## Known limitations

HUD anchoring and object culling in widescreen still need work; the 3D world exposes more of both than a 2D game would.

No game data is distributed; the project builds from your own legally dumped disc image.
