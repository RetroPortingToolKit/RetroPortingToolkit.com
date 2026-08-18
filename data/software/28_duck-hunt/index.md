---
title: "Duck Hunt"
kicker: "NES"
tags: ["Mouse Zapper"]
featured: false
desc: "Light-gun classic made playable on PC through NESRecomp's mouse-as-Zapper substitution."
year: "2026"
status: "Alpha"
provenance: "core"
platform: "nes"
repo: "https://github.com/mstan/DuckHuntNESRecomp"
group: "NES"
links:
  - { label: "DuckHuntNESRecomp on GitHub", href: "https://github.com/mstan/DuckHuntNESRecomp" }
  - { label: "nesrecomp Achieves 10 Commercial Titles (1379.tech)", href: "https://1379.tech/nesrecomp-achieves-10-commercial-titles/" }
---

Duck Hunt is one of the ten commercial titles supported by [NESRecomp](/hardware/nes), maintained by the core team. As a light-gun game it needed input hardware that no modern PC has, so the framework substitutes the mouse for the Zapper.

## What works today

The game runs as statically recompiled native code through the shared NESRecomp runner, playable with mouse-as-Zapper aiming. Save-state slots are available. Windows x64 is the primary platform; macOS support is experimental.

No game data is distributed; the project builds from your own legally dumped ROM.
