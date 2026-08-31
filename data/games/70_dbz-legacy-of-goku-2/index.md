---
title: "Dragon Ball Z: The Legacy of Goku II"
kicker: "Game Boy Advance"
tags: ["Adaptive widescreen"]
featured: false
desc: "A 6,000 frame traversal route runs with nothing interpreted and nothing missed, and the original picture stays pixel identical with widescreen off."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "game-boy-advance"
showOnPlatform: false
repo: "https://github.com/mstan/DragonBallZLegacyofGokuIIRecomp"
group: "Game Boy Advance"
verified: "2026-08-20"
updated: "2026-08-03"
added: "2026-08-02"
cover: "./boxart.webp"
---

The Legacy of Goku II is the sequel to [The Legacy of Goku](/games/dbz-legacy-of-goku) and the middle of the three Dragon Ball Z games in the [GBARecomp](/hardware/game-boy-advance) lineup, with [Buu's Fury](/games/dbz-buus-fury) after it. Its distinguishing detail is how hard the recompilation is checked: strict-static validation covers attract mode, gameplay, and a 6,000 frame traversal fuzz route with no interpreted instructions and no missing dispatches.

## Playable status

Yes, as an experimental preview. The USA release boots through its attract sequence and into gameplay. It has not been tested exhaustively through the entire game, so back up saves you care about.

A Windows package is on the GitHub releases page with a SHA-256 checksum beside it. It runs from dumps you provide: your Dragon Ball Z: The Legacy of Goku II (USA) ROM and a retail GBA BIOS, both selected in the launcher on first run and remembered afterwards.

## What the recomp adds

Legacy of Goku II Adaptive Widescreen is optional and disabled by default. It expands the HUD and overworld as the window is resized, up to a 480x160 logical view, using authored 64x64 tile field planes and widened actor visibility. It does not stretch the original image, and camera and world coordinates are left alone. With the mod off, the 240x160 output is pixel identical to the original.

Beyond that: keyboard and modern controller support, cartridge saves and save states (Shift+F1 through F9 to save, F1 through F9 to load), windowed and fullscreen play with sharp scaling and optional affine filtering, and an in-game settings menu.


## Sources

- [DragonBallZLegacyofGokuIIRecomp README and releases (GitHub)](https://github.com/mstan/DragonBallZLegacyofGokuIIRecomp)
- [Recomp + AI: 5 Months Later (1379.tech)](https://1379.tech/recomp-ai-5-months-later/)
