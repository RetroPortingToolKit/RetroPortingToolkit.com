---
title: "WarioWare: Twisted!"
kicker: "Game Boy Advance"
tags: ["Android", "Gyro"]
featured: true
desc: "The cartridge had a tilt sensor. Now your phone does the tilting: gyro play on Android, controller motion on Windows."
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

WarioWare: Twisted! shipped with a gyro sensor built into the cartridge: you played it by physically twisting the console. That is exactly the kind of hardware a straight port cannot ignore, so this core [GBARecomp](/hardware/game-boy-advance) project stands in for it with whatever motion source your device has. On a phone, that means twisting the phone itself, just like the original cartridge.

## Playable status

Yes, on Windows and Android, as experimental previews. Windows and Android builds are available from the project releases.

Both run from dumps you provide, your own USA ROM and a retail GBA BIOS, selected through the launcher on first run and remembered afterward. Menus, microgames, cartridge saves, and the gyro-controlled stages all work. Back up saves you care about, and report repeatable crashes.

## What the recomp adds

On Android, the phone's own gyroscope drives the game. Hold the phone in landscape and twist it like the original cartridge. It has been tested on a Galaxy S22 Ultra, and gyro sensitivity is adjustable from the launcher.

On Windows, a motion-equipped controller supplies the tilt; the ecosystem write-up demonstrates it with a PS5 controller. When no motion hardware is available, holding the left mouse button and dragging horizontally works as a fallback.

Beyond motion input: a touch-friendly Android launcher and in-game menu, keyboard, controller, and touchscreen controls, cartridge saves and save states, and windowed or fullscreen play on the desktop.


## Sources

- [WarioWareTwistedRecomp README (GitHub)](https://github.com/mstan/WarioWareTwistedRecomp)
- [Building & Enhancing Recomps: Ecosystem Updates (1379.tech)](https://1379.tech/building-enhancing-recomps-ecosystem-updates/)
