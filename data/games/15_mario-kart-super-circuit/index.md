---
title: "Mario Kart: Super Circuit"
kicker: "Game Boy Advance"
tags: ["60 FPS", "Adaptive widescreen"]
featured: false
desc: "Super Circuit, smoothed out: 60 FPS rendering the original developers left switched off, plus adaptive widescreen."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "game-boy-advance"
repo: "https://github.com/mstan/MarioKartSuperCircuitRecomp"
group: "Game Boy Advance"
verified: "2026-08-18"
cover: "./super-circuit-widescreen.jpg"
---

Mario Kart: Super Circuit hides a surprise in its own code: a 60 FPS rendering behavior that the original developers never enabled. This core [GBARecomp](/hardware/game-boy-advance) project runs the game natively on Windows and lets you switch that behavior on, along with a widescreen view of the track.

## Can I play it?

Yes, as a public preview. Windows builds are on the GitHub Releases page, currently v0.0.2 (August 2026). The game runs from dumps you provide: select your own USA ROM and a retail GBA BIOS in the launcher on first run, and it remembers them afterward. Menus, cup selection, races, and results all work; back up saves you care about, since undiscovered edge cases are expected at this stage.

## What the recomp adds

Two mods, both optional and off by default, enabled from the launcher's Mods page:

- 60 FPS Track Rendering updates race presentation at 60 FPS while preserving the game's underlying logic and timing. The behavior was found within the game's own code; it was simply never enabled in the original release.
- Adaptive Widescreen renders additional race content at the sides of the track view instead of stretching the original 240x160 image.

Around the mods: keyboard and modern controller support, cartridge saves and save states (Shift+F1 through F9 to save, F1 through F9 to load), windowed and fullscreen play with sharp scaling and optional affine filtering, and an in-game settings menu.

## Technical details

The game is statically recompiled to a native Windows x64 application on the gbarecomp framework, with ROM and BIOS setup through the shared recomp-ui launcher. The supported ROM revision is documented in the repo, and ROM-derived generated code, saves, and build output stay local; nothing copyrighted ships in releases.

## Sources

- [MarioKartSuperCircuitRecomp README (GitHub)](https://github.com/mstan/MarioKartSuperCircuitRecomp)
- [Building & Enhancing Recomps: Ecosystem Updates (1379.tech)](https://1379.tech/building-enhancing-recomps-ecosystem-updates/)
