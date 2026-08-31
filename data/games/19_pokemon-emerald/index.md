---
title: "Pokémon Emerald"
kicker: "Game Boy Advance"
tags: []
featured: false
desc: "The missing piece: Emerald completes the Gen 3 set as its own native PC build."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "game-boy-advance"
showOnPlatform: false
repo: "https://github.com/mstan/EmeraldRecomp"
group: "Game Boy Advance"
verified: "2026-08-18"
updated: "2026-07-30"
added: "2026-06-22"
cover: "./pokemon-emerald-gameplay.webp"
---

Pokémon Emerald completes Gen 3 coverage in the [Game Boy Advance lineup](/hardware/game-boy-advance) as a core project, joining [Ruby & Sapphire](/games/pokemon-ruby-sapphire) and [FireRed & LeafGreen](/games/pokemon-firered-leafgreen). It is the biggest of the three Gen 3 engines, and it runs here as a native PC game.

## Can I play it?

Yes, as an early preview on Windows. The latest release, v0.0.3 (2026-07-17), ships an EmeraldRecomp package for Windows x64 and adds a pre-boot launcher. Download from the GitHub releases page, run it, and point it at a dump you provide: the runtime checks the file's fingerprint and only accepts the USA ROM.

The game boots through the BIOS intro to the title screen and into gameplay, but this is a bring-up, not a finished port.

![The title screen, reached through the recompiled BIOS intro](./pokemon-emerald-title.webp)

The README names Emerald's real-time clock and its larger battle and contest engine as the parts that set it apart from the other Gen 3 games.

## What the recomp adds

- Save states in nine slots: Shift+F1 to F9 saves, F1 to F9 loads.
- The game gets better the more you play. Any code path the static recompiler has not covered yet runs correctly through a built-in interpreter the first time it is hit, is compiled to native code on the spot, and is remembered on disk, so the next launch runs it natively from the start.
- The cartridge's real-time clock is modeled by the runtime, along with the flash chip the game saves to.
- Keyboard controls out of the box: arrow keys for the D-Pad, Z and X for A and B, Enter for Start.

## Technical details

The ROM's ARM7TDMI machine code is statically translated to C, so every function the game runs becomes a generated C function. The GBA BIOS is recompiled and executed too rather than stubbed out, so the boot sequence and interrupt handlers run as recompiled code, while the PPU, the APU with the M4A sound engine, DMA, timers, the cartridge flash save chip and RTC are modeled by the shared gbarecomp runtime.

The self-improvement loop uses an in-process JIT backend (sljit) that needs no compiler on the player's machine and writes healed code to a per-ROM cache, so coverage grows toward fully native as the game is played and stays improved across launches.

Only symbol metadata, function names, addresses, and sizes, from the pret/pokeemerald decompilation enters the repo. None of its C source or build output does, and the ROM is never redistributed.

## Sources

- [EmeraldRecomp README](https://github.com/mstan/EmeraldRecomp)
- [EmeraldRecomp releases](https://github.com/mstan/EmeraldRecomp/releases)
- [gbarecomp framework](https://github.com/mstan/gbarecomp)
- [Recomp + AI: 5 Months Later (1379.tech)](https://1379.tech/recomp-ai-5-months-later/)
