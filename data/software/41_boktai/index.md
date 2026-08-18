---
title: "Boktai: The Sun Is in Your Hand"
kicker: "Game Boy Advance"
tags: ["Solar sensor"]
featured: false
desc: "Community GBA recomp that drives the game's solar sensor from real local weather instead of the original cartridge hardware."
year: "2026"
status: "Alpha"
provenance: "community"
platform: "game-boy-advance"
repo: "https://github.com/Shy/BoktaiRecomp"
group: "Community"
links:
  - { label: "BoktaiRecomp on GitHub", href: "https://github.com/Shy/BoktaiRecomp" }
---

BoktaiRecomp is a community project by Shy that brings Boktai: The Sun Is in Your Hand to [gbarecomp](/hardware/game-boy-advance). The original cartridge had a real solar sensor that gameplay depends on; this project substitutes it by driving the sensor from real local weather.

## What works today

The v0.1.0 "Boktai builder" release (2026-08-03) ships BoktaiBuilder, which compiles the game locally on your machine. The release includes a Steam Deck flatpak plus Linux and macOS builds.

## Enhancements

The weather-driven solar sensor is the headline: sunlight in your area becomes sunlight in the game, no cartridge hardware required.

The release explicitly contains no game data; BoktaiBuilder builds from your own legally dumped ROM and GBA BIOS.
