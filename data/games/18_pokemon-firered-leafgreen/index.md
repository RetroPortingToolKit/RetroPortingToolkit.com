---
title: "Pokémon FireRed & LeafGreen"
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

Pokémon FireRed and LeafGreen, the Kanto remakes, run as native PC games in this core project from the [Game Boy Advance lineup](/hardware/game-boy-advance). One repository holds both versions and builds a separate program for each, the same way [Ruby & Sapphire](/games/pokemon-ruby-sapphire) handles its pair. [Emerald](/games/pokemon-emerald) rounds out the Gen 3 set.

![LeafGreen at its title screen, a separate program from the same source tree](./pokemon-leafgreen.webp)

## Can I play it?

Yes, as an early preview on Windows. The latest release, v0.0.3 (2026-07-17), ships separate FireRedRecomp and LeafGreenRecomp packages for Windows x64 and adds a pre-boot launcher. Download from the GitHub releases page, run the game you want, and point it at a dump you provide: the runtime checks the file's fingerprint and only accepts the USA v1.0 ROM of each version.

Both games boot through the BIOS intro to the title screen and into gameplay. It is early: not every code path is statically recompiled yet, and content has not been exhaustively tested.

## What the recomp adds

- Save states in nine slots: Shift+F1 to F9 saves, F1 to F9 loads.
- The game gets better the more you play. Any code path the static recompiler has not covered yet runs correctly through a built-in interpreter the first time it is hit, is compiled to native code on the spot, and is remembered on disk, so the next launch runs it natively from the start.
- Keyboard controls out of the box: arrow keys for the D-Pad, Z and X for A and B, Enter for Start.

## Technical details

The ROM's ARM7TDMI machine code is statically translated to C, so every function the game runs becomes a generated C function. The GBA BIOS is recompiled and executed too rather than stubbed out, so the boot sequence and interrupt handlers run as recompiled code, while the PPU, the APU with the M4A sound engine, DMA, timers, and hardware I/O are modeled by the shared gbarecomp runtime.

One repo hosts both games as separate native targets sharing one source tree and one engine, using the multi-variant CMake pattern from Sonic3AndKnucklesRecomp: an add_gba_variant() function emits one executable per game. The self-improvement loop uses an in-process JIT backend (sljit) that needs no compiler on the player's machine and writes healed code to a per-ROM cache.

Only symbol metadata, function names, addresses, and sizes, from the pret/pokefirered decompilation enters the repo. None of its C source or build output does, and the ROM is never redistributed.

## Sources

- [FireRedLeafGreenRecomp README](https://github.com/mstan/FireRedLeafGreenRecomp)
- [FireRedLeafGreenRecomp releases](https://github.com/mstan/FireRedLeafGreenRecomp/releases)
- [gbarecomp framework](https://github.com/mstan/gbarecomp)
- [Recomp + AI: 5 Months Later (1379.tech)](https://1379.tech/recomp-ai-5-months-later/)
