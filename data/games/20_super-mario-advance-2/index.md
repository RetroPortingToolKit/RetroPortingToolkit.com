---
title: "Super Mario Advance 2"
kicker: "Game Boy Advance"
tags: []
featured: false
desc: "Super Mario World from its GBA cartridge, now a native Windows game with a widescreen mode that shows more level instead of stretching."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "game-boy-advance"
repo: "https://github.com/mstan/SuperMarioAdvance2Recomp"
group: "Game Boy Advance"
verified: "2026-08-18"
updated: "2026-08-03"
added: "2026-07-30"
---

Super Mario Advance 2: Super Mario World is the Game Boy Advance release of Super Mario World, recompiled as a core project in the [Game Boy Advance lineup](/hardware/game-boy-advance). Its standout feature is Adaptive Widescreen, an optional mode that fills a wide monitor with more of the level instead of stretching the picture. It also pairs neatly with the [SNES Super Mario World recomp](/games/super-mario-world): the same game, recompiled from two different consoles.

## Can I play it?

Yes, as an experimental preview on Windows. The current v0.0.2 release (2026-08-03, a hotfix for a pause crash) is a Windows x64 zip on the GitHub releases page. Run SuperMarioWorldRecomp.exe and the launcher asks for a dump you provide, the USA/Australia ROM plus a retail GBA BIOS, then remembers both for later launches. The game boots and runs through its opening and attract sequence, but it is early: back up saves you care about, and report repeatable problems.

## What the recomp adds

- Adaptive Widescreen, off by default and switched on from the launcher's Mods page. It renders additional game content at the sides of the original 240x160 image rather than stretching it, expanding supported scenes up to 9:5 while menus and HUD elements stay in the original safe area. Scenes where the game does not prepare enough off-screen data intentionally keep the original view, and the work is still being refined scene by scene.
- A launcher for ROM and BIOS setup, display, audio, controls, and mods, with a skip-launcher option once everything is configured.
- Keyboard and modern game-controller support, windowed and fullscreen play, and an in-game settings menu.
- Cartridge saves plus save states: Shift+F1 to F9 saves a slot, F1 to F9 loads it.

## Technical details

The game builds on the gbarecomp framework, which statically recompiles the GBA game code to run as a native Windows x64 application; the launcher is the shared recomp-ui used across the lineup. The supported ROM revision and BIOS identities are documented in the repo's baserom.md and game.toml, and generation happens locally: ROM-derived generated code, copyrighted inputs, saves, and build output stay on your machine and are never included in releases.

## Sources

- [SuperMarioAdvance2Recomp README](https://github.com/mstan/SuperMarioAdvance2Recomp)
- [SuperMarioAdvance2Recomp releases](https://github.com/mstan/SuperMarioAdvance2Recomp/releases)
- [gbarecomp framework](https://github.com/mstan/gbarecomp)
- [Recomp + AI: 5 Months Later (1379.tech)](https://1379.tech/recomp-ai-5-months-later/)
