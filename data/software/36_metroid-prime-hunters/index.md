---
title: "Metroid Prime Hunters"
kicker: "Nintendo DS"
tags: ["Adaptive 21:9", "Wiimmfi"]
featured: true
desc: "The Nintendo DS framework's public alpha: campaign entry, adaptive 21:9 widescreen, Prime-style mouse controls, and experimental Wiimmfi online."
year: "2026"
status: "Public alpha"
provenance: "core"
platform: "nintendo-ds"
repo: "https://github.com/mstan/MetroidPrimeHuntersRecomp"
group: "Nintendo DS"
links:
  - { label: "MetroidPrimeHuntersRecomp on GitHub", href: "https://github.com/mstan/MetroidPrimeHuntersRecomp" }
  - { label: "Metroid Prime Hunters recomp brings the Nintendo DS classic to PC (GenerationAmiga)", href: "https://www.generationamiga.com/2026/08/16/metroid-prime-hunters-recomp-brings-the-nintendo-ds-classic-to-pc/" }
  - { label: "Metroid Prime Hunters Recomp Out NOW! (Video Game Esoterica)", href: "https://www.youtube.com/watch?v=FFUglxqa_eI" }
  - { label: "21:9 first look (Gamemaster1379)", href: "https://www.youtube.com/watch?v=tvqnW6J6KU0" }
---

Metroid Prime Hunters is the one public game consumer of [ndsrecomp](/hardware/nintendo-ds), the very early Nintendo DS static recompiler maintained by the core team. Unlike the framework itself, which is pre-alpha research, this title is a public alpha, currently at v0.3.0-alpha (2026-08-15).

## What works today

Campaign entry works, with the game's dual-CPU ARM code running natively and a bounded interpreter tier handling code the guest copies into RAM. Gamepads are remappable, and an experimental Wiimmfi integration provides online play.

## Enhancements

Adaptive 21:9 widescreen on the upper screen, and a Prime-style WASD plus mouse control scheme in place of the original stylus aiming.

## Known limitations

The adaptive widescreen has known visual bugs at this stage.

No game data is distributed; the project builds from your own legally dumped ROM, with user-supplied BIOS and firmware hash-verified by the framework.
