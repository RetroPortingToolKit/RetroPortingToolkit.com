---
title: "Metroid Prime Hunters"
kicker: "Nintendo DS"
tags: ["Adaptive 21:9", "Wiimmfi"]
featured: true
desc: "The DS goes native: campaign entry, adaptive 21:9 widescreen, Prime-style mouse controls, and experimental Wiimmfi online, all in public alpha."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "nintendo-ds"
repo: "https://github.com/mstan/MetroidPrimeHuntersRecomp"
group: "Nintendo DS"
links:
  - { label: "Build from your copy (GitHub)", href: "https://github.com/mstan/MetroidPrimeHuntersRecomp" }
  - { label: "Metroid Prime Hunters recomp brings the Nintendo DS classic to PC (GenerationAmiga)", href: "https://www.generationamiga.com/2026/08/16/metroid-prime-hunters-recomp-brings-the-nintendo-ds-classic-to-pc/" }
  - { label: "Watch: Metroid Prime Hunters Recomp is out now", href: "/blog/video-metroid-prime-hunters-out-now" }
  - { label: "Watch: Metroid Prime Hunters in 21:9", href: "/blog/video-mph-219-first-look" }
cover: "https://i.ytimg.com/vi/FFUglxqa_eI/hqdefault.jpg"
videoUrl: "https://www.youtube.com/watch?v=FFUglxqa_eI"
verified: "2026-08-18"
gallery:
  - { src: "/covers/mph-online.jpg", caption: "Online multiplayer through Wiimmfi" }
  - { src: "/covers/mph-2119.jpg", caption: "21:9 widescreen" }
---

Metroid Prime Hunters is the one public game consumer of [ndsrecomp](/hardware/nintendo-ds), the very early Nintendo DS static recompiler maintained by the core team. The framework itself is pre-alpha research; this title runs ahead of it as a public alpha.

## Can I play it?

Public alpha with campaign entry working. The current release is v0.3.0-alpha (2026-08-15); you build from your own ROM dump.

## What works

Campaign entry, remappable gamepads, and an experimental Wiimmfi integration for online play.

## Enhancements

Adaptive 21:9 widescreen on the upper screen, and a Prime-style WASD plus mouse control scheme in place of the original stylus aiming.

## Requirements

Your own legally dumped ROM, plus user-supplied BIOS and firmware that the framework hash-verifies.

## Known issues

The adaptive widescreen has known visual bugs at this stage.

## Technical notes

The game's dual-CPU ARM code runs natively, with a bounded interpreter tier handling code the guest copies into RAM.

## Sources

- [Metroid Prime Hunters recomp brings the Nintendo DS classic to PC (GenerationAmiga)](https://www.generationamiga.com/2026/08/16/metroid-prime-hunters-recomp-brings-the-nintendo-ds-classic-to-pc/)
- [Metroid Prime Hunters Recomp Out NOW! (Video Game Esoterica)](https://www.youtube.com/watch?v=FFUglxqa_eI)
- [21:9 first look (Gamemaster1379)](https://www.youtube.com/watch?v=tvqnW6J6KU0)
