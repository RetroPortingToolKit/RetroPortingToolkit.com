---
title: "Boktai: The Sun Is in Your Hand"
kicker: "Game Boy Advance"
tags: ["Solar sensor"]
featured: false
desc: "A community GBARecomp project that replaces Boktai's cartridge light sensor with local weather."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "community"
platform: "game-boy-advance"
repo: "https://github.com/Shy/BoktaiRecomp"
group: "Game Boy Advance"
verified: "2026-08-18"
updated: "2026-08-03"
added: "2026-07-30"
cover: "/data/blog/10_building-enhancing-recomps/boktai.webp"
---

Boktai's original cartridge had a real light sensor. Sun outside mattered inside the game.

This community project by Shy keeps that idea alive without the special cartridge hardware. It uses local weather data to drive the in-game light sensor.

## Playable status

Yes, by building your own copy. Prebuilt game binaries are not distributed, so everyone builds locally from a dump they provide plus a GBA BIOS.

BoktaiBuilder makes that practical: it compiles the game locally from files you provide. Linux and macOS Apple silicon packages are available, along with a Flatpak for Steam Deck. The result is playable, saves work, and the solar sensor path works, though coverage is still early.

Use a clean dump. Sensor-patched ROMs remove the hardware reads this project is trying to model.

## What the recomp adds

- Weather-driven sunlight: set your postal code and the game maps local conditions to the solar gauge.
- Manual override: hotkeys can raise or lower the light level for testing or convenience.
- Adjustable full-sun point, so the gauge can still make sense in different seasons and regions.
- No network request unless you configure a location.


## Sources

- [BoktaiRecomp README](https://github.com/Shy/BoktaiRecomp)
- [BoktaiRecomp releases](https://github.com/Shy/BoktaiRecomp/releases)
- [Solar sensor documentation](https://github.com/Shy/BoktaiRecomp/blob/main/docs/SOLAR-SENSOR.md)
- [gbarecomp framework](https://github.com/mstan/gbarecomp)
