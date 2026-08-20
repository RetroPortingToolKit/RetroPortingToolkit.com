---
title: "Pokémon Red & Blue"
kicker: "Game Boy"
tags: ["Dual ROMs", "Extended edition"]
featured: false
desc: "One build plays either cartridge: the launcher reads the ROM's fingerprint and runs Red or Blue from the same recompiled program."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "game-boy"
repo: "https://github.com/mstan/PokemonRedAndBlueRecomp"
group: "Game Boy"
videoUrl: "https://www.youtube.com/watch?v=pEgJCTf7kgY"
verified: "2026-08-20"
updated: "2026-07-23"
added: "2026-04-01"
cover: "./boxart.png"
---

Pokémon Red and Blue are a core project in the [Game Boy lineup](/hardware/game-boy), built on the toolkit's fork of the gb-recompiled framework. The two games share an identical code layout and differ only in their data tables, which the port turns into a feature: one recompiled program covers both, reading the ROM's CRC32 at startup and running whichever of the pair you point it at.

![The Red and Blue recompiler test, running as a native build](https://www.youtube.com/watch?v=pEgJCTf7kgY)

## Can I play it?

Yes, as an early prototype. The project calls it exactly that: playable from the title screen through the Elite Four, and not a finished product. The current release is v0.1.1 (2026-05-07), a Windows x64 package on the GitHub releases page.

The ROM is not embedded in the binary. On first run the launcher opens a file picker, caches the path in `rom.cfg`, and checks the file against the two CRC32 values the build accepts: `0x9F7FDD53` for Red and `0xD6DA8A1A` for Blue. Anything else is turned away with a wrong ROM dialog, so the game is built from a dump you provide. Only US and Europe revisions have been tested.

The rough edges are listed by the project rather than glossed over. Animation heavy scenes such as certain battle intro effects can chug, audio may stutter briefly during them, minor visual glitches turn up in edge cases, and there is no link cable or printer support. One interpreter fallback still fires in bank 28.

## What the recomp adds

Alongside the faithful stock build there is an Extended edition that grafts the full Johto Pokédex into the Gen 1 engine: 100 new Pokémon, numbers 152 to 251, back-ported from the pret/pokecrystal disassembly, taking Red and Blue to the complete National Dex of 1 to 251. It brings a batch of Gen 2 moves and the real Dark and Steel types with it, and the grafted Pokémon get native 48x48 back sprites instead of a blocky 2x upscale.

The graft happens in source, not in the binary. A script injects pokecrystal's data into the pret/pokered disassembly and reassembles a genuine ROM, rather than binary-patching a `.gbc`. That produces four packages, Red and Blue times stock and extended, served by two executables, since each one still accepts both games of its variant by CRC. The extended packages bundle a ROM, so the project keeps them local; the public download is the stock build. [Pokémon Yellow](/games/pokemon-yellow) got the same treatment in its own repository.

In game, holding TAB fast-forwards.

## Technical details

This is a static recompiler rather than an interpreter loop. The Game Boy's SM83 machine code is translated to C at build time and compiled to native x64. At runtime the executable loads your ROM for its data, the graphics, maps, text and Pokémon stats, while executing the translated native code. The Game Boy's PPU, APU and memory mapper are handled by the gb-recompiled runtime library.

When execution reaches a code path that static analysis did not discover, it falls back to an interpreter. That works, but it is slower, and the address is logged to the console so it can be added to `pokemon_red_blue.toml` and compiled natively in the next build. v0.0.3 fed 47 entry points back in that way. v0.1.1 moved ROM identity out of the TOML and into an `extras.c` hook, so a single build can declare a list of valid CRCs instead of one.

The framework is [mstan/gbrecompiled](https://github.com/mstan/gbrecompiled), a fork of arcanite24/gb-recompiled, and pret/pokered is used as a reference for entry points and symbol information. [Tetris](/games/tetris) runs on the same engine.

## Sources

- [Project README and releases (GitHub)](https://github.com/mstan/PokemonRedAndBlueRecomp)
- [Pokemon Red/Blue recompiler test (YouTube)](https://www.youtube.com/watch?v=pEgJCTf7kgY)
