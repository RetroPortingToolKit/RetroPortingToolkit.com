---
title: "WarioWare: Twisted!"
kicker: "Game Boy Advance"
tags: ["Android", "Gyro"]
featured: true
desc: "The gyro-driven GBA game, playable without the original tilt cartridge: phone gyro on Android, controller motion on PC."
year: "2026"
status: "Alpha"
provenance: "core"
platform: "game-boy-advance"
repo: "https://github.com/mstan/WarioWareTwistedRecomp"
group: "Game Boy Advance"
links:
  - { label: "WarioWareTwistedRecomp on GitHub", href: "https://github.com/mstan/WarioWareTwistedRecomp" }
---

WarioWare: Twisted! shipped on a cartridge with a built-in tilt sensor, which is exactly the kind of hardware a straight port cannot ignore. This [GBARecomp](/hardware/game-boy-advance) project substitutes for the cartridge hardware so the game is playable on modern devices: Windows v0.0.1 arrived 2026-07-29, followed by the Android android-v0.0.1 build on 2026-08-02.

## What works today

The game runs on Windows and Android, with the tilt input mapped to whatever motion source your device has.

## Enhancements

On Android, the phone's own gyroscope drives the game, which is arguably the most natural way to play it today. On PC, DualSense and compatible SDL controllers supply motion sensing, and Windows has a mouse-drag fallback for setups with no motion hardware at all.

No game data is distributed; the project builds from your own legally dumped ROM and GBA BIOS.
