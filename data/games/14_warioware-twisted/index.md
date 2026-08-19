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
links:
  - { label: "Build from your copy (GitHub)", href: "https://github.com/mstan/WarioWareTwistedRecomp" }
verified: "2026-08-18"
---

WarioWare: Twisted! shipped with a tilt sensor built into the cartridge, exactly the kind of hardware a straight port cannot ignore. This core [GBARecomp](/hardware/game-boy-advance) project stands in for that hardware so the game plays on modern devices.

## Can I play it?

Playable on Windows and Android, with the tilt input mapped to whatever motion source your device has. Windows v0.0.1 arrived 2026-07-29, and the Android android-v0.0.1 build followed on 2026-08-02.

## Enhancements

On Android, the phone's own gyroscope drives the game, which is arguably the most natural way to play it today. On Windows, DualSense and compatible SDL controllers supply motion sensing, with a mouse-drag fallback for setups with no motion hardware at all.

## Requirements

Your own legally dumped ROM and GBA BIOS.
