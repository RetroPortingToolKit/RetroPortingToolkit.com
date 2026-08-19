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
group: "Community"
verified: "2026-08-18"
cover: "/data/blog/10_building-enhancing-recomps/boktai.webp"
---

Boktai's cartridge carried a real light sensor: the Gun del Sol charged from actual sunlight, and the undead could only be sealed while you had light. This community project by Shy, built on the same framework as the [Game Boy Advance lineup](/hardware/game-boy-advance), keeps that idea alive without the hardware. The sensor is driven by the actual weather where you are: a clear afternoon fills the gauge, a rainy night leaves you fighting in the dark.

## Can I play it?

Yes, by building your own copy. Prebuilt game binaries are not distributed, because a compiled game embeds translated ROM code, so everyone builds their own from a dump you provide plus a GBA BIOS. The v0.1.0 release (2026-08-03) makes that practical: it ships BoktaiBuilder, a tool that compiles the game locally, as Linux and macOS (Apple silicon) tarballs and a flatpak for Steam Deck. One warning from the README: many Boktai ROMs in circulation are intro-patched or sensor-patched, and a sensor patch removes the very hardware reads this project models, so use a clean dump. The result is playable, saves work, and the solar sensor works end to end, though coverage is still early.

## What the recomp adds

- The weather-driven solar sensor is the headline. Set your postal code in the launcher or the in-game menu and current sunlight conditions in your area feed the gauge: night reads empty, heavy overcast gives a bar or three, clear midday fills it.
- Manual control when you want it: optional hotkeys step the light level up and down and release it back to live weather. With nothing configured, the sensor simply reads dark and no network request is ever made.
- The full-sun point is adjustable, because clear midday sun is much weaker in winter or at high latitude, and a fixed threshold would mean the gauge could never fill on a genuinely sunny day there.
- Privacy by default: nothing leaves the machine unless you set a postal code, and then only the code (to resolve coordinates) and those coordinates (for the current reading) are sent, with no account or API key, polled every 10 minutes.
- Save states in nine slots, fullscreen, turbo, and fully rebindable controls and hotkeys through the launcher.

## Technical details

The ROM's ARM7TDMI machine code is statically translated to C on the gbarecomp framework, and as across that ecosystem the GBA BIOS is recompiled and executed rather than stubbed, so boot and interrupt handling run as recompiled code. The runtime models the PPU, APU, DMA, timers, the 8 KB EEPROM save chip, the S-3511A real-time clock, and the solar sensor, the last two sharing four GPIO pins just as they did on the cartridge. The runner verifies the USA ROM by SHA-1 and refuses anything else.

Live weather uses global horizontal irradiance, the power in watts per square meter that a flat upward-facing surface receives, mapped onto the gauge's measured response. Coordinates come from api.zippopotam.us and readings from api.open-meteo.com. Code paths not yet statically recompiled run through an interpreter on first hit, then JIT to native and cache to disk, so the game gets faster the more it is played.

## Sources

- [BoktaiRecomp README](https://github.com/Shy/BoktaiRecomp)
- [BoktaiRecomp releases](https://github.com/Shy/BoktaiRecomp/releases)
- [Solar sensor documentation](https://github.com/Shy/BoktaiRecomp/blob/main/docs/SOLAR-SENSOR.md)
- [gbarecomp framework](https://github.com/mstan/gbarecomp)
