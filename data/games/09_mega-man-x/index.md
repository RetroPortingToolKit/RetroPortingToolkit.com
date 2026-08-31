---
title: "Mega Man X"
kicker: "Super Nintendo"
tags: ["Widescreen", "MSU-1"]
featured: true
desc: "Released and playable start to finish today, with true widescreen and CD-quality music mods."
year: "2026"
status: "Released"
availability: "Public build"
provenance: "core"
platform: "super-nintendo"
repo: "https://github.com/mstan/MegaManXSNESRecomp"
group: "Super Nintendo"
links:
  - { label: "Megaman X: Recompiled Release (1379.tech)", href: "https://1379.tech/megaman-x-recompiled-v1-0-0-release/" }
  - { label: "Watch: Mega Man X Recomp is out now", href: "/blog/video-mega-man-x-out-now" }
cover: "./mmx-wide.png"
videoUrl: "https://www.youtube.com/watch?v=XRwKZ0_8u-c"
verified: "2026-08-18"
updated: "2026-08-16"
added: "2026-05-22"
---

Mega Man X is [SNESRecomp](/hardware/super-nintendo)'s most mature title, a core project maintained alongside the framework itself. It is the one you can simply download and finish: from the opening highway through all eight Mavericks and Sigma, running as a native program on your PC.

![Mega Man X running as a native program.](/previews/mega-man-x.mp4)

## Playable status

Yes. The game is released and playable end to end. Windows gets packaged releases, macOS and Linux build from source, and a tester has completed the full game on a Steam Deck.

It is built from a dump you provide: on first launch the game asks for your Mega Man X (USA, Rev 1) ROM and verifies it by checksum. An experimental Rockman X (Japan) variant also exists.

![Independent coverage of the release, from Video Game Esoterica.](https://www.youtube.com/watch?v=XRwKZ0_8u-c)

## What the recomp adds

The headline is experimental true widescreen. The renderer draws real additional gameplay at the sides instead of stretching the picture, so the extra space is level, not a smear.

![Widescreen in play: more rooftop and more sky, at the game's own pixel scale.](./widescreen-highway.png)

It works out to about one third more horizontal area, roughly 16:9 from the 4:3 presentation, or 32:21 from square pixels. It is enabled from the launcher's Mods page.

![The same setting on an ocean stage.](./widescreen-ocean.png)

The rest of what the build adds:

- A mod loader, including an MSU-1 mod that streams CD-quality music in place of the original soundtrack.
- Password saves through SRAM.
- Three display presentations: 4:3 (CRT), 8:7 (square pixels), and 1:1.
- Save states, turbo, fullscreen, and auto-detected Xbox, PlayStation, and Switch Pro controllers.
- Built-in crash reporting that writes diagnostics you can attach to an issue.


## Sources

- [MegaManXSNESRecomp README (GitHub)](https://github.com/mstan/MegaManXSNESRecomp)
- [Megaman X: Recompiled Release (1379.tech)](https://1379.tech/megaman-x-recompiled-v1-0-0-release/)
- [Mega Man X Recomp is Out Now! A SNES Recomp (Video Game Esoterica)](/blog/video-mega-man-x-out-now)
