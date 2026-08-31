---
title: "WarioWare: Twisted!"
kicker: "Game Boy Advance"
tags: ["Android", "Gyro"]
featured: true
desc: "A GBARecomp build that maps the original cartridge tilt sensor to modern motion input."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "game-boy-advance"
repo: "https://github.com/mstan/WarioWareTwistedRecomp"
group: "Game Boy Advance"
verified: "2026-08-18"
updated: "2026-08-03"
added: "2026-07-29"
cover: "/covers/warioware-sensors.jpg"
---

WarioWare: Twisted! shipped with a gyro sensor built into the cartridge. You played it by physically twisting the console.

This [GBARecomp](/hardware/game-boy-advance) project keeps that idea intact. On Android, you twist the phone. On Windows, motion can come from a supported controller, with mouse drag as a fallback.

## Playable status

Yes, on Windows and Android, as experimental previews. Windows and Android builds are available from the project releases.

Both run from dumps you provide: your own USA ROM and a legally obtained GBA BIOS. Menus, microgames, cartridge saves, and gyro-controlled stages all work.

## What the recomp adds

On Android, the phone's own gyroscope drives the game. Hold the phone in landscape and twist it like the original cartridge. Gyro sensitivity is adjustable from the launcher.

On Windows, a motion-equipped controller supplies the tilt; the ecosystem write-up demonstrates it with a PS5 controller. When no motion hardware is available, holding the left mouse button and dragging horizontally works as a fallback.

Beyond motion input, the build adds a touch-friendly Android launcher, an in-game menu, cartridge saves, save states, and desktop windowed or fullscreen play.


## Sources

- [WarioWareTwistedRecomp README (GitHub)](https://github.com/mstan/WarioWareTwistedRecomp)
- [Building & Enhancing Recomps: Ecosystem Updates (1379.tech)](https://1379.tech/building-enhancing-recomps-ecosystem-updates/)
