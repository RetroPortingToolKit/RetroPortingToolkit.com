---
title: "Mario Kart: Super Circuit"
kicker: "Game Boy Advance"
tags: ["60 FPS", "Adaptive widescreen"]
featured: false
desc: "A GBARecomp build with 60 FPS track rendering and adaptive widescreen."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "game-boy-advance"
repo: "https://github.com/mstan/MarioKartSuperCircuitRecomp"
group: "Game Boy Advance"
verified: "2026-08-18"
updated: "2026-08-03"
added: "2026-07-30"
cover: "./super-circuit-widescreen.jpg"
---

Mario Kart: Super Circuit has unused 60 FPS track-rendering behavior in its own code. That discovery came from antimattur's decompilation work on the game.

This [GBARecomp](/hardware/game-boy-advance) project runs the game natively on Windows and lets you use that behavior, along with an experimental wider view of the track. antimattur is not a direct contributor to this recomp, but his work on the game is useful context for it.

![Super Circuit running as a native Windows program.](/previews/mario-kart-super-circuit.mp4)

## Playable status

Yes, as a public preview. Windows builds are on the GitHub releases page. The game runs from dumps you provide: select your own USA ROM and legally obtained GBA BIOS in the launcher.

Menus, cup selection, races, and results all work. Undiscovered edge cases are still expected at this stage.

## What the recomp adds

The two headline options are:

- 60 FPS track rendering. Race presentation updates at 60 FPS while the game's underlying logic and timing stay intact.
- Adaptive widescreen. The track view renders more content at the sides instead of stretching the original 240x160 image.

The build also includes cartridge saves, save states, windowed and fullscreen play, and an in-game settings menu.


## Sources

- [MarioKartSuperCircuitRecomp README (GitHub)](https://github.com/mstan/MarioKartSuperCircuitRecomp)
- [Building & Enhancing Recomps: Ecosystem Updates (1379.tech)](https://1379.tech/building-enhancing-recomps-ecosystem-updates/)
