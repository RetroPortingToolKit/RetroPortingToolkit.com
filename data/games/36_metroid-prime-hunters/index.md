---
title: "Metroid Prime Hunters"
kicker: "Nintendo DS"
tags: ["Adaptive 21:9", "Wiimmfi"]
featured: true
desc: "The DS goes native: campaign play, adaptive 21:9 widescreen, mouse aiming, and experimental Wiimmfi online, in public alpha for Windows and Linux."
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

Metroid Prime Hunters is the one public game built on [ndsrecomp](/hardware/nintendo-ds), the core team's very early Nintendo DS recompiler. The framework itself is pre-alpha research, but this title runs ahead of it as a public alpha: a DS shooter with mouse aiming, a genuinely wider field of view, and experimental online play.

![The recompiled game running as a native program](/previews/metroid-prime-hunters.mp4)

## Can I play it?

Public alpha, and the project is blunt that bugs, crashes, and rough edges are expected. Windows and Linux (AppImage) builds are on the Releases page. The newest published release is v0.3.0-alpha (2026-08-15), and the README already documents a v0.4.0 line.

![Video Game Esoterica on the public alpha](https://www.youtube.com/watch?v=FFUglxqa_eI)

The game is built from a ROM dump you provide, and only the USA revision 0 ROM is supported: the launcher hash-checks it and rejects anything else. DS BIOS and firmware dumps are no longer required for the default startup path, which uses a built-in free BIOS replacement and generated firmware. Your own dumps remain optional, and are hash-verified if you use them.

## What the recomp adds

Adaptive 21:9 widescreen on the upper screen: a wider view rendered by the 3D engine, not a stretched image.

![The upper screen widened, with the touch screen running in a second window](/data/blog/10_building-enhancing-recomps/mph-wide.webp)

Prime-style controls are on by default, WASD movement and mouse aiming in place of the original stylus scheme, with mouse-driven touchscreen input and fully remappable keyboard, mouse, and gamepad bindings in the launcher.

![Scan visor up, in the recompiled build](/covers/mph-online.jpg)

The v0.4.0 line adds an opt-in HD Rendering mod that raises the 3D engine's internal resolution up to 4x and filters decoded textures, while the 2D layers stay exactly as the hardware draws them.

Online play through Wiimmfi is experimental. The game can authenticate and reach a Friends and Rivals lobby in validated flows, but in-game online play is untested and may fail to connect or desync.

Known issues: the widescreen is still being audited, so some scenes, HUD placement, and fades can be wrong; the campaign is not validated start to finish; and save behavior is still in early testing, so keep backups.

## Technical details

The DS is a two-CPU machine, and the recomp treats it that way: the game's ARM9 and ARM7 code is lifted to C ahead of time and runs natively, with a bounded interpreter tier handling code the game copies into RAM.

The Wi-Fi path is built on melonDS's Wi-Fi work, which the project credits in full: its DS Wi-Fi controller model, emulated access point, and network backend are what let the recompiled game reach Wiimmfi as a real client. The launcher persists a console firmware profile per install, so Wi-Fi settings and console pairing survive restarts.

## Sources

- [Metroid Prime Hunters recomp brings the Nintendo DS classic to PC (GenerationAmiga)](https://www.generationamiga.com/2026/08/16/metroid-prime-hunters-recomp-brings-the-nintendo-ds-classic-to-pc/)
- [Metroid Prime Hunters Recomp is out now (Video Game Esoterica)](/blog/video-metroid-prime-hunters-out-now)
- [Metroid Prime Hunters in 21:9 (Gamemaster1379)](/blog/video-mph-219-first-look)
- [Project README and release notes (GitHub)](https://github.com/mstan/MetroidPrimeHuntersRecomp)
