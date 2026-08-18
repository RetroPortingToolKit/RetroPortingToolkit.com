---
title: "Virtual Boy"
kicker: "V810"
tags: ["Cross-platform"]
featured: false
desc: "vbrecomp, a V810-to-C static recompiler with one commercial title, Mario's Tennis, as a tech demo."
year: "2026"
status: "Tech demo"
provenance: "core"
arch: "NEC V810"
repo: "https://github.com/mstan/vbrecomp"
group: "Early and experimental"
links:
  - { label: "vbrecomp on GitHub", href: "https://github.com/mstan/vbrecomp" }
  - { label: "VirtualBoy Recomp Gets Its First Title: Mario Tennis (1379.tech)", href: "https://1379.tech/virtualboy-recomp-gets-its-first-title-mario-tennis/" }
---

vbrecomp statically recompiles Virtual Boy games from NEC V810 machine code into C. It is MIT licensed and targets Windows, macOS, and Linux. The system was chosen despite having no public disassemblies because it is simpler than most, and the author's stated ambition is to "visually enrich" titles beyond the console's red-and-black display.

## What works today

One commercial title runs via a per-game repo: [Mario's Tennis](/software/mario-tennis). The runtime uses a step-budget cooperative yield model, and the Beetle VB libretro core serves as the validation oracle. The repo is explicit about content: "It does NOT contain any game ROM or game-specific generated C".

## Enhancements

None yet. Visual enrichment beyond red-and-black is the stated goal, not a shipped feature.

## Known limitations

The single title is a tech demo, and there is no enhancement layer yet.

## Software

- [Mario's Tennis](/software/mario-tennis)

## Reading

- [VirtualBoy Recomp Gets Its First Title: Mario Tennis (1379.tech)](https://1379.tech/virtualboy-recomp-gets-its-first-title-mario-tennis/)

vbrecomp ships no ROMs and no game-specific generated code; the game builds from your own legally dumped cartridge.
