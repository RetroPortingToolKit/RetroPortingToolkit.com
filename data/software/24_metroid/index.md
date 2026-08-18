---
title: "Metroid"
kicker: "NES"
tags: []
featured: false
desc: "One of NESRecomp's ten supported commercial titles, chosen partly for its strong public disassembly."
year: "2026"
status: "Alpha"
provenance: "core"
platform: "nes"
repo: "https://github.com/mstan/MetroidNESRecomp"
group: "NES"
links:
  - { label: "MetroidNESRecomp on GitHub", href: "https://github.com/mstan/MetroidNESRecomp" }
  - { label: "nesrecomp Achieves 10 Commercial Titles (1379.tech)", href: "https://1379.tech/nesrecomp-achieves-10-commercial-titles/" }
---

Metroid is one of the ten commercial titles supported by [NESRecomp](/hardware/nes), maintained by the core team. It was chosen partly because it has a good public disassembly, which the framework prioritizes when selecting titles: real symbol names make the recompiled output easier to verify and work on.

## What works today

The game runs as statically recompiled native code through the shared NESRecomp runner, with the framework's save-state slots available. Windows x64 is the primary platform; macOS support is experimental.

No game data is distributed; the project builds from your own legally dumped ROM.
