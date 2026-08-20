---
title: "Pokémon Yellow"
kicker: "Game Boy"
tags: ["Full Johto dex", "Gen 2 moves"]
featured: false
desc: "Yellow with 100 more Pokémon, added by editing decompilation source and reassembling a genuine ROM rather than patching one."
year: "2026"
status: "Playable alpha"
availability: "Source only"
provenance: "core"
platform: "game-boy"
repo: "https://github.com/mstan/PokemonYellowRecomp"
group: "Game Boy"
verified: "2026-08-20"
updated: "2026-07-23"
added: "2026-06-25"
cover: "./boxart.png"
---

This core project in the [Game Boy lineup](/hardware/game-boy) does two things at once. It builds Pokémon Yellow from the pret/pokeyellow decompilation and runs it natively through the toolkit's gbrecomp static recompiler, and on the way it adds the full Johto Pokédex: 100 new Pokémon, numbers 152 to 251, back-ported from pret/pokecrystal, taking Yellow to the complete National Dex of 1 to 251.

The important part is where that work happens. Everything is done by editing decompilation source, the assembly, the data tables and the PNG sprites, and then reassembling a genuine Game Boy ROM. Nothing is binary-patched, and the ROM that comes out is a legitimate one that also runs in an ordinary Game Boy Color emulator.

## Can I play it?

Yes, but you build it. The repository ships source only: the scripts plus pinned pret commits, with no ROM, no binary and deliberately no patch file. You clone it, let the build fetch pret's pokeyellow and pokecrystal, assemble the ROM locally with RGBDS, then recompile that to a native executable with gbrecomp and build it with CMake and Ninja. The Gen 2 content is extracted from pokecrystal's own source at build time, so no Crystal ROM is needed either. A stock dump is optional and used only if you want to verify the base build byte for byte.

A patch file was considered and rejected on principle. A patch is clean when its diff is your own work, and this one would encode the Crystal-derived sprites, data and dex text the project adds, so it was dropped rather than shipped. A packaged zip does appear on the latest tag, but the project marks it a private, ROM-derivative build and not for distribution, so the source is the deliverable.

## What the recomp adds

The dex is the headline. All 100 Johto Pokémon arrive with their own sprites, native 48x48 backs, a full two page Pokédex entry each, and stats, learnsets and evolutions translated into Gen 1 shape from pokecrystal source. Filling the dex took two passes: numbers 161 to 215 went into the contiguous internal index space, and 216 to 251 reuse the 36 MissingNo index gaps left in the original engine.

v0.0.4 added the moves and types to match: 61 Gen 2 only moves with their real type, power, accuracy and PP, plus the Dark and Steel types and the full Gen 2 type effectiveness chart. Gen 1's engine only knows Gen 1 effects, so every Gen 2 effect maps to the closest thing the engine can do, and the project counts the result honestly rather than claiming parity: 17 faithful, 16 approximated, 13 damage only, and 15 inert where Gen 1 simply has no such mechanic, weather and hazards and Protect among them.

The Gen 1 battle engine itself is untouched, and so is the rest of Yellow. The story runs as it did, and the Pikachu still follows you.

Stock and extended are separate build targets from the same pret base, with distinct output names so their executables and saves never collide. The injector only ever runs on a freshly reset tree, so stock is always recoverable. A small `yellow.exe` picks a variant and forwards your arguments to it, resolving from an environment variable first, then a config file, defaulting to extended.

Adding Pokémon changes the save format, because the Pokédex flag arrays grow. Rather than leave that as a surprise, the technical notes document the offsets, the checksum and a stock to extended migration recipe.

## Technical details

The pipeline runs decompilation to ROM to recompiled C to native runner. `gen2_data.py` translates pokecrystal's data into Gen 1 form for any dex range, `inject_gen2.py` applies it idempotently along with the assembly edits and the sprite crop, resize and recolor, and the reassembled ROM is fed to gbrecomp, which emits a native project built with CMake and Ninja and run on an SDL and ANGLE runner.

gbrecomp bakes one ROM's code into each binary, so stock and extended are genuinely separate executables rather than one program with a switch. That gives the runner a useful trick: a differential mode can run the two side by side and compare them.

The engine changes the new Pokémon forced are documented rather than hidden: a 254 entry pic bank resolver, count driven Pokédex WRAM sizing, and base stats moved into a bank of their own. The same Gen 2 graft was carried across to [Pokémon Red & Blue](/games/pokemon-red-blue).

## Sources

- [Project README, technical notes and releases (GitHub)](https://github.com/mstan/PokemonYellowRecomp)
