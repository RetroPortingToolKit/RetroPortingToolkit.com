---
title: "Virtual Boy"
kicker: "V810"
tags: ["Cross-platform"]
featured: false
desc: "One commercial title, Mario's Tennis, running as a native tech demo on Windows, macOS, and Linux, built from the user's own cartridge dump."
year: "2026"
status: "Tech demo"
availability: "Source only"
provenance: "core"
arch: "NEC V810"
repo: "https://github.com/mstan/vbrecomp"
group: "Early platform work"
links:
  - { label: "View source (GitHub)", href: "https://github.com/mstan/vbrecomp" }
  - { label: "VirtualBoy Recomp Gets Its First Title: Mario Tennis (1379.tech)", href: "https://1379.tech/virtualboy-recomp-gets-its-first-title-mario-tennis/" }
verified: "2026-08-18"
---

Tech demo. One commercial title, [Mario's Tennis](/games/mario-tennis), runs as a native app on Windows, macOS, and Linux, built from a cartridge dump supplied by the user. vbrecomp uses static recompilation to turn Virtual Boy games into code compiled for modern systems.

## What can be used today

Mario's Tennis runs via a per-game repo on Windows, macOS, and Linux. It is a tech demo rather than a polished release.

## Supported games

- [Mario's Tennis](/games/mario-tennis)

## Requirements

The game builds from the user's own cartridge dump. The repo is explicit about content: "It does NOT contain any game ROM or game-specific generated C".

## Known limitations

The single title is a tech demo, and there is no enhancement layer yet. The author's stated ambition is to "visually enrich" titles beyond the console's red-and-black display; that is a goal, not a shipped feature.

## Technical details

vbrecomp turns Virtual Boy games from NEC V810 machine code into C, MIT licensed. The console was chosen despite having no public disassemblies because it is simpler than most. The runtime uses a step-budget cooperative yield model, and the Beetle VB libretro core serves as the validation oracle.

## Get started

- [View source (GitHub)](https://github.com/mstan/vbrecomp)

## Sources and coverage

- [VirtualBoy Recomp Gets Its First Title: Mario Tennis (1379.tech)](https://1379.tech/virtualboy-recomp-gets-its-first-title-mario-tennis/)
