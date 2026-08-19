---
title: "Pokémon Ruby & Sapphire"
kicker: "Game Boy Advance"
tags: ["RTC"]
featured: false
desc: "Ruby and Sapphire as native PC games, with the cartridge's built-in clock still ticking."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "game-boy-advance"
repo: "https://github.com/mstan/RubySapphireRecomp"
group: "Game Boy Advance"
verified: "2026-08-18"
cover: "./pokemon-ruby.webp"
gallery:
  - { src: "./pokemon-sapphire.webp", caption: "Pokémon Sapphire" }
---

Pokémon Ruby and Sapphire opened Gen 3, and this core project in the [Game Boy Advance lineup](/hardware/game-boy-advance) turns both into native PC games. One repository covers the pair, building a separate program for each version, and the cartridge's built-in real-time clock is part of the port rather than left out. Their Gen 3 siblings live in [FireRed & LeafGreen](/games/pokemon-firered-leafgreen) and [Emerald](/games/pokemon-emerald).

## Can I play it?

Yes, as an early preview on Windows. The latest release, v0.0.3 (2026-07-17), ships separate RubyRecomp and SapphireRecomp packages for Windows x64 and adds a pre-boot launcher. Download from the GitHub releases page, run the game you want, and point it at a dump you provide: the runtime checks the file's fingerprint and only accepts the USA rev1 ROM of each version. Both games boot through the BIOS intro to the title screen and into gameplay, but this is a bring-up, not a finished port. The README is candid that Ruby and Sapphire run the oldest Gen 3 engine and show more early-boot, flash save, and clock quirks than FireRed or Emerald.

## What the recomp adds

- Save states in nine slots: Shift+F1 to F9 saves, F1 to F9 loads.
- The game gets better the more you play. Any code path the static recompiler has not covered yet runs correctly through a built-in interpreter the first time it is hit, is then compiled to native code on the spot, and is remembered on disk, so the next launch runs it natively from the start.
- The cartridge's real-time clock is modeled by the runtime, along with the flash chip the games save to.
- Keyboard controls out of the box: arrow keys for the D-Pad, Z and X for A and B, Enter for Start.

## Technical details

The ROM's ARM7TDMI machine code is statically translated to C, so every function the game runs becomes a generated C function. Unusually for a recomp project, the GBA BIOS is recompiled and executed too rather than stubbed out, which means the boot sequence and interrupt handlers run as recompiled code. The rest of the console, the PPU, the APU with the M4A sound engine, DMA, timers, the cartridge flash save chip and RTC, is modeled by the shared gbarecomp runtime.

One repo hosts both games as separate native targets sharing one source tree, using the multi-variant CMake pattern first built for Sonic3AndKnucklesRecomp: an add_gba_variant() function emits one executable per game. The self-improvement loop uses an in-process JIT backend (sljit) that needs no compiler on the player's machine and writes healed code to a per-ROM cache. Only symbol metadata, function names, addresses, and sizes, from the pret/pokeruby decompilation enters the repo; none of its C source or build output does, and the ROM is never redistributed.

## Sources

- [RubySapphireRecomp README](https://github.com/mstan/RubySapphireRecomp)
- [RubySapphireRecomp releases](https://github.com/mstan/RubySapphireRecomp/releases)
- [gbarecomp framework](https://github.com/mstan/gbarecomp)
- [Recomp + AI: 5 Months Later (1379.tech)](https://1379.tech/recomp-ai-5-months-later/)
