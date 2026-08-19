---
title: "Super Mario Advance 4"
kicker: "Game Boy Advance"
tags: []
featured: false
desc: "Super Mario Bros. 3 in its GBA form, running as a native Windows game with a modern launcher and save states."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "game-boy-advance"
repo: "https://github.com/mstan/SuperMarioAdvance4Recomp"
group: "Game Boy Advance"
verified: "2026-08-18"
---

Super Mario Advance 4: Super Mario Bros. 3 is the Game Boy Advance release of Super Mario Bros. 3, recompiled as a core project in the [Game Boy Advance lineup](/hardware/game-boy-advance). The original GBA code runs as a native Windows application wrapped in a modern launcher, with controller support, fullscreen display, audio settings, and save states.

## Can I play it?

Yes, as an experimental preview on Windows. The current v0.0.2 release (2026-08-03) is a Windows x64 zip on the GitHub releases page. Run SuperMarioAdvance4Recomp.exe and the launcher asks for a dump you provide, the USA/Australia Rev 1 ROM plus a retail GBA BIOS, then remembers both for later launches. The game boots, reaches the title screen, and runs Super Mario Bros. 3 gameplay, but it is early: back up saves you care about and expect game-specific issues that have not been found yet.

## What the recomp adds

- A launcher for ROM and BIOS setup, display, audio, and controls, with a skip-launcher option once everything is configured.
- Keyboard and modern game-controller support, windowed and fullscreen play with configurable presentation, and an in-game settings menu.
- Cartridge saves plus save states: Shift+F1 to F9 saves a slot, F1 to F9 loads it.

## Technical details

The game builds on the gbarecomp framework, which statically recompiles the GBA game code to run as a native Windows x64 application; the launcher is the shared recomp-ui used across the lineup. The supported ROM revision and BIOS identities are documented in the repo's baserom.md and game.toml, and generation happens locally: ROM-derived generated code, copyrighted inputs, saves, and build output stay on your machine and are never included in releases.

## Sources

- [SuperMarioAdvance4Recomp README](https://github.com/mstan/SuperMarioAdvance4Recomp)
- [SuperMarioAdvance4Recomp releases](https://github.com/mstan/SuperMarioAdvance4Recomp/releases)
- [gbarecomp framework](https://github.com/mstan/gbarecomp)
- [Recomp + AI: 5 Months Later (1379.tech)](https://1379.tech/recomp-ai-5-months-later/)
