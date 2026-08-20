---
title: "Tetris"
kicker: "Game Boy"
tags: ["Zero fallbacks"]
featured: false
desc: "Small enough to finish: every game mode tested, and a 900 frame run that logs no interpreter dispatches at all."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "game-boy"
repo: "https://github.com/mstan/TetrisGBRecomp"
group: "Game Boy"
verified: "2026-08-20"
updated: "2026-08-17"
added: "2026-04-01"
cover: "./boxart.png"
---

Tetris is a 32,768 byte game, which makes it the clearest demonstration in the [Game Boy lineup](/hardware/game-boy) of what a recompiler is aiming at. The project believes it is 100% playable, with all game modes tested, and with its harvested seed manifest applied a 900 frame run logs no interpreter dispatches at all: the game runs as recompiled native code the whole way through.

## Can I play it?

Yes. v0.0.3 (2026-08-17) ships a Windows x64 package on the releases page, using the shared recomp-ui launcher. Extract the whole archive rather than picking the executable out of it: `Tetris.exe` needs its `assets/` folder and the bundled DLLs beside it.

If you tried v0.0.2 and every ROM you fed it was rejected, the build was wrong, not your dump. v0.0.2 shipped with a CRC32 baked in that no real Tetris dump has, so its launcher turned away even the correct file. v0.0.3 is the fix.

The build is picky about which dump it takes, for a concrete reason: the recompiled code came from one specific program image. It wants Tetris (World) V1.0, CRC32 `0x63F9407D`, SHA-1 `3f2a6407c9900ad5817ee1cfb3609c5ee17400fc`, 32,768 bytes, header title `TETRIS` at mask ROM version `0x00`. The V1.1 revision, CRC32 `0x46DF91AD`, is a different program and is not supported. No ROM data is embedded; the game is built from a dump you provide, and the launcher caches the accepted path in `rom.cfg` next to the executable, which you can delete to pick again.

## What the recomp adds

The recomp-ui launcher is the visible part: a box art card, a ROM picker with a live verification check, keyboard and controller setup, and an option to skip straight to the game on later boots. F1 opens an overlay in game for settings, video, input and mods. Holding TAB fast-forwards, and keys rebind either in that overlay or by editing `keybinds.ini` beside the executable.

What runs: both game modes, A-Type and B-Type, the title screen and menus, the demo and attract mode, and music and sound effects.

## Technical details

A static recompiler rather than an interpreter loop. The Game Boy's SM83 machine code is translated to C at build time and compiled to native x64, while the runtime library simulates the PPU, APU and memory mapper.

The interesting part is how the last gaps get closed. The project's hard rule is zero false positives in code discovery, because decoding data as though it were code is a failure rather than a near miss. So instead of guessing at entry points, it runs the game, harvests the addresses where execution actually fell through to the interpreter, and feeds those back as a Tier-0 manifest of seeds that provably executed. 64 of them are compiled into v0.0.3, which is what takes the fallback count to zero. The loop is spelled out in the build instructions: generate C from the ROM, build, run, harvest `interp_fallbacks.log` into `dispatch_misses.toml`, regenerate.

The engine is gb-recompiled and the launcher is recomp-ui, both kept as sibling checkouts rather than vendored in. [Pokémon Red & Blue](/games/pokemon-red-blue) is built on the same engine.

## Sources

- [Project README and releases (GitHub)](https://github.com/mstan/TetrisGBRecomp)
