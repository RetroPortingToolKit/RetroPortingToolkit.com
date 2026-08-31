---
title: "Boktai: The Sun Is in Your Hand"
kicker: "Game Boy Advance"
tags: ["Solar sensor"]
featured: false
desc: "The cartridge charged from real sunlight; this community build reads your local weather instead, so sun outside means sun in the game."
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

Boktai's cartridge carried a real light sensor: the Gun del Sol charged from actual sunlight, and the undead could only be sealed while you had light. This community project by Shy, built on the same framework as the [Game Boy Advance lineup](/hardware/game-boy-advance), keeps that idea alive without the hardware. The sensor is driven by the actual weather where you are: a clear afternoon fills the gauge, a rainy night leaves you fighting in the dark.

## Playable status

Yes, by building your own copy. Prebuilt game binaries are not distributed, because a compiled game embeds translated ROM code, so everyone builds their own from a dump you provide plus a GBA BIOS.

BoktaiBuilder makes that practical: it compiles the game locally from files you provide. Linux and macOS Apple silicon packages are available, along with a flatpak for Steam Deck. The result is playable, saves work, and the solar sensor works end to end, though coverage is still early.

One warning from the README: many Boktai ROMs in circulation are intro-patched or sensor-patched, and a sensor patch removes the very hardware reads this project models, so use a clean dump.

## What the recomp adds

- The weather-driven solar sensor is the headline. Set your postal code in the launcher or the in-game menu and current sunlight conditions in your area feed the gauge: night reads empty, heavy overcast gives a bar or three, clear midday fills it.
- Manual control when you want it: optional hotkeys step the light level up and down and release it back to live weather. With nothing configured, the sensor simply reads dark and no network request is ever made.
- The full-sun point is adjustable, because clear midday sun is much weaker in winter or at high latitude, and a fixed threshold would mean the gauge could never fill on a genuinely sunny day there.
- Privacy by default: nothing leaves the machine unless you set a postal code, and then only the code (to resolve coordinates) and those coordinates (for the current reading) are sent, with no account or API key, polled every 10 minutes.
- Save states in nine slots, fullscreen, turbo, and fully rebindable controls and hotkeys through the launcher.


## Sources

- [BoktaiRecomp README](https://github.com/Shy/BoktaiRecomp)
- [BoktaiRecomp releases](https://github.com/Shy/BoktaiRecomp/releases)
- [Solar sensor documentation](https://github.com/Shy/BoktaiRecomp/blob/main/docs/SOLAR-SENSOR.md)
- [gbarecomp framework](https://github.com/mstan/gbarecomp)
