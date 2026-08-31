---
title: "Dragon Ball Z: Buu's Fury"
kicker: "Game Boy Advance"
tags: ["Adaptive widescreen"]
featured: false
desc: "Buu's Fury goes wide: an optional adaptive widescreen mod with an edge-anchored HUD, in an early GBA recomp."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "game-boy-advance"
repo: "https://github.com/mstan/DragonBallZBuusFuryRecomp"
group: "Game Boy Advance"
verified: "2026-08-18"
updated: "2026-08-09"
added: "2026-08-02"
cover: "./buus-fury-adaptive.webp"
---

Dragon Ball Z: Buu's Fury is one of the Dragon Ball Z titles in the [GBARecomp](/hardware/game-boy-advance) lineup, maintained as a core project. Its widescreen mode does the honest version of the trick: instead of stretching the picture, it streams in more of the authored world at the sides as you widen the window.

## Playable status

Yes, as an experimental preview. Windows builds are on the GitHub releases page. The game runs from dumps you provide: select your own USA ROM and a retail GBA BIOS in the launcher on first run, and it remembers them afterward.

It boots through its attract sequence into gameplay, but the full game has not been exhaustively tested, so back up saves you care about.

## What the recomp adds

The Adaptive Widescreen mod expands the HUD and overworld as the window is resized, up to a 480x160 logical view, streaming authored field chunks and widening actor visibility rather than stretching the image. Camera and world coordinates are untouched, and the HUD stays anchored to the screen edges so the interface sits where you expect it.

The faithful 240x160 image remains available unchanged. The mod is enabled from the launcher's Mods page.

Around that: keyboard and modern controller support, cartridge saves and save states (Shift+F1 through F9 to save, F1 through F9 to load), windowed and fullscreen play with sharp scaling and optional affine filtering, and an in-game settings menu.


## Sources

- [DragonBallZBuusFuryRecomp README (GitHub)](https://github.com/mstan/DragonBallZBuusFuryRecomp)
