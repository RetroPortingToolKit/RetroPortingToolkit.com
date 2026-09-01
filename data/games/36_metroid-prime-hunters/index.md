---
title: "Metroid Prime Hunters"
kicker: "Nintendo DS"
tags: ["Adaptive 21:9", "Wiimmfi"]
featured: true
desc: "The first public ndsrecomp game: mouse aiming, adaptive widescreen, and working Wiimmfi online play."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "nintendo-ds"
repo: "https://github.com/mstan/MetroidPrimeHuntersRecomp"
group: "Nintendo DS"
links:
  - { label: "Metroid Prime Hunters recomp brings the Nintendo DS classic to PC (GenerationAmiga)", href: "https://www.generationamiga.com/2026/08/16/metroid-prime-hunters-recomp-brings-the-nintendo-ds-classic-to-pc/" }
  - { label: "Watch: Metroid Prime Hunters Recomp is out now", href: "/blog/video-metroid-prime-hunters-out-now" }
  - { label: "Watch: Metroid Prime Hunters in 21:9", href: "/blog/video-mph-219-first-look" }
cover: "/covers/mph-2119.jpg"
videoUrl: "https://www.youtube.com/watch?v=FFUglxqa_eI"
verified: "2026-08-18"
updated: "2026-08-20"
added: "2026-08-01"
---

Metroid Prime Hunters is the first public game built on [ndsrecomp](/hardware/nintendo-ds).

The framework is still early, but this project is further along than a tech demo. It is a public alpha for a DS shooter with mouse aiming, adaptive widescreen, and working online play through Wiimmfi.

![The recompiled game running as a native program](/previews/metroid-prime-hunters.mp4)

## Playable status

Public alpha. Bugs, crashes, and rough edges are still expected. Windows and Linux AppImage builds are on the releases page.

![Video Game Esoterica on the public alpha](https://www.youtube.com/watch?v=FFUglxqa_eI)

The game is built from a ROM dump you provide. Only the USA revision 0 ROM is supported. DS BIOS and firmware dumps are no longer required for the default startup path; your own dumps remain optional.

## What the recomp adds

Adaptive widescreen on the upper screen: a wider view rendered by the 3D engine, not a stretched image.

![The upper screen widened, with the touch screen running in a second window](/data/blog/10_building-enhancing-recomps/mph-wide.webp)

Prime-style controls are the main usability feature: WASD movement and mouse aiming in place of the original stylus scheme.

![Scan visor up, in the recompiled build](/covers/mph-online.jpg)

Higher-resolution 3D rendering is available. The 2D layers still follow the DS hardware path.

Online play through Wiimmfi works. The game can authenticate, reach Friends and Rivals, and play online matches.

Known issues: widescreen is still being audited, so some scenes, HUD placement, and fades can be wrong. Campaign coverage and save behavior are still being verified.

Optimization work is also ongoing. The game can run well on high-end hardware, but medium and lower-end machines may struggle for now.


## Sources

- [Metroid Prime Hunters recomp brings the Nintendo DS classic to PC (GenerationAmiga)](https://www.generationamiga.com/2026/08/16/metroid-prime-hunters-recomp-brings-the-nintendo-ds-classic-to-pc/)
- [Metroid Prime Hunters Recomp is out now (Video Game Esoterica)](/blog/video-metroid-prime-hunters-out-now)
- [Metroid Prime Hunters in 21:9 (Gamemaster1379)](/blog/video-mph-219-first-look)
- [Project README and release notes (GitHub)](https://github.com/mstan/MetroidPrimeHuntersRecomp)
