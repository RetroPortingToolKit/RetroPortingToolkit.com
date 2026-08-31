---
title: "PokÃ©mon FireRed & LeafGreen"
kicker: "Game Boy Advance"
tags: ["Dual targets"]
featured: false
desc: "One project, two games: FireRed and LeafGreen each get their own native PC build."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "game-boy-advance"
repo: "https://github.com/mstan/FireRedLeafGreenRecomp"
group: "Game Boy Advance"
verified: "2026-08-18"
updated: "2026-07-30"
added: "2026-06-22"
cover: "./pokemon-firered.webp"
---

PokÃ©mon FireRed and LeafGreen, the Kanto remakes, run as native PC games in this core project from the [Game Boy Advance lineup](/hardware/game-boy-advance). One repository holds both versions and builds a separate program for each, the same way [Ruby & Sapphire](/games/pokemon-ruby-sapphire) handles its pair. [Emerald](/games/pokemon-emerald) rounds out the Gen 3 set.

![LeafGreen at its title screen, a separate program from the same source tree](./pokemon-leafgreen.webp)

## Playable status

Yes, as an early preview on Windows. FireRedRecomp and LeafGreenRecomp packages are on the GitHub releases page. Run the game you want and point it at a dump you provide: the runtime checks the file's fingerprint and only accepts the USA v1.0 ROM of each version.

Both games boot through the BIOS intro to the title screen and into gameplay. It is early: not every code path is statically recompiled yet, and content has not been exhaustively tested.

## What the recomp adds

- Save states in nine slots: Shift+F1 to F9 saves, F1 to F9 loads.
- The game gets better the more you play. Any code path the static recompiler has not covered yet runs correctly through a built-in interpreter the first time it is hit, is compiled to native code on the spot, and is remembered on disk, so the next launch runs it natively from the start.
- Keyboard controls out of the box: arrow keys for the D-Pad, Z and X for A and B, Enter for Start.


## Sources

- [FireRedLeafGreenRecomp README](https://github.com/mstan/FireRedLeafGreenRecomp)
- [FireRedLeafGreenRecomp releases](https://github.com/mstan/FireRedLeafGreenRecomp/releases)
- [gbarecomp framework](https://github.com/mstan/gbarecomp)
- [Recomp + AI: 5 Months Later (1379.tech)](https://1379.tech/recomp-ai-5-months-later/)
