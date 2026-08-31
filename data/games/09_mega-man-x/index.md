---
title: "Mega Man X"
kicker: "Super Nintendo"
tags: ["Widescreen", "MSU-1"]
featured: true
desc: "A mature SNESRecomp release you can play start to finish, with widescreen and MSU-1 music support."
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

Mega Man X was one of the early [SNESRecomp](/hardware/super-nintendo) titles, and it has been kept up alongside the framework.

It is the one you can download and finish: from the opening highway through all eight Mavericks and Sigma, running as a native program on your PC.

![Mega Man X running as a native program.](/previews/mega-man-x.mp4)

## Playable status

Yes. The game is released and playable end to end. Windows gets packaged releases, macOS and Linux build from source, and a tester has completed the full game on a Steam Deck.

It is built from a dump you provide: on first launch the game asks for your Mega Man X (USA, Rev 1) ROM and verifies it by checksum. An experimental Rockman X (Japan) variant also exists.

![Independent coverage of the release, from Video Game Esoterica.](https://www.youtube.com/watch?v=XRwKZ0_8u-c)

## What the recomp adds

The headline is experimental true widescreen. The renderer draws real additional gameplay at the sides instead of stretching the picture.

![Widescreen in play: more rooftop and more sky, at the game's own pixel scale.](./widescreen-highway.png)

It shows about one third more horizontal area than the original 4:3 presentation.

![The same setting on an ocean stage.](./widescreen-ocean.png)

The rest of what the build adds:

- A mod loader, including an MSU-1 mod that streams CD-quality music in place of the original soundtrack.
- Three display presentations: 4:3, 8:7, and 1:1.
- Save states, turbo, and fullscreen.


## Sources

- [MegaManXSNESRecomp README (GitHub)](https://github.com/mstan/MegaManXSNESRecomp)
- [Megaman X: Recompiled Release (1379.tech)](https://1379.tech/megaman-x-recompiled-v1-0-0-release/)
- [Mega Man X Recomp is Out Now! A SNES Recomp (Video Game Esoterica)](/blog/video-mega-man-x-out-now)
