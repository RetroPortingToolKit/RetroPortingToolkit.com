---
title: "Dragon Ball Z: The Legacy of Goku"
kicker: "Game Boy Advance"
tags: ["Adaptive widescreen"]
featured: false
desc: "Kame House, wider: the first Legacy of Goku game with a widescreen mod that draws more of the overworld instead of stretching the picture."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "game-boy-advance"
repo: "https://github.com/mstan/DragonBallZLegacyOfGokuRecomp"
group: "Game Boy Advance"
verified: "2026-08-20"
updated: "2026-08-03"
added: "2026-08-02"
cover: "./legacy-of-goku-adaptive.webp"
---

The Legacy of Goku is the earliest of the three Dragon Ball Z games in the [GBARecomp](/hardware/game-boy-advance) lineup, ahead of its own sequel and [Buu's Fury](/games/dbz-buus-fury). It exists for the reason they do: the games are the proving ground for the framework, and the recompilation is a byproduct of building gbarecomp. What it shows off is the honest version of widescreen, where a wider window means more of the island, not a wider Goku.

## Can I play it?

Yes, as an experimental preview. The USA release boots through its attract sequence and into gameplay. It has not been tested exhaustively through the whole game, so back up saves you care about.

The current release is v0.0.2 (2026-08-03), a Windows package on the GitHub releases page with a SHA-256 checksum beside it. It runs from dumps you provide: pick your Dragon Ball Z: The Legacy of Goku (USA) ROM and a retail GBA BIOS in the launcher the first time, and it remembers them afterwards.

## What the recomp adds

Legacy of Goku Adaptive Widescreen is optional and disabled by default. Resize the window and the HUD and overworld expand with it, up to a 480x160 logical view, drawing authored overworld continuation and widening actor and prop clipping. The original image is never stretched and gameplay coordinates never move. Adaptive view has been validated at the native 240-pixel width and at representative 320, 390, and 480-pixel widths.

![The same stretch of beach at the original 240x160.](./legacy-of-goku-native.webp)

The faithful 240x160 presentation stays available unchanged, and the mod is switched on from the launcher's Mods page.

Around that sit the framework's standard comforts: keyboard and modern controller support, cartridge saves and save states (Shift+F1 through F9 to save, F1 through F9 to load), windowed and fullscreen play with sharp scaling and optional affine filtering, and an in-game settings menu.

## Technical details

The game is statically recompiled into a native Windows x64 application on the gbarecomp framework, with ROM and BIOS selection handled by the shared recomp-ui launcher. Regeneration needs the supported ROM revision and a retail BIOS, whose identities are recorded in the repository rather than shipped with it. ROM-derived generated code, copyrighted inputs, saves, and build output all stay on your machine and are never committed. Launcher box art is included for identification, and nothing else from the game is.

## Sources

- [DragonBallZLegacyOfGokuRecomp README and releases (GitHub)](https://github.com/mstan/DragonBallZLegacyOfGokuRecomp)
- [Recomp + AI: 5 Months Later (1379.tech)](https://1379.tech/recomp-ai-5-months-later/)
