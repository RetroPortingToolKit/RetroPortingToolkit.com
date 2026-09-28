---
title: "PokemonRedAndBlueRecomp"
desc: "Pokémon Red & Blue recompiled for the Game Boy using a fork of gb-recompiled · Part of the R.A.I.D. community"
kicker: "Community submission"
tags: ["Community"]
provenance: "community"
repo: "https://github.com/mstan/PokemonRedAndBlueRecomp"
status: "Community submission"
links: [{"label":"Project on GitHub","href":"https://github.com/mstan/PokemonRedAndBlueRecomp"}]
added: "2026-09-28"
updated: "2026-09-28"
submissionId: "f21ce565d82554d4"
draft: false
creator: {"github":"mstan"}
---

Pokémon Red & Blue recompiled for the Game Boy using a fork of gb-recompiled · Part of the R.A.I.D. community

## Project

A static recompilation of Pokemon Red and Pokemon Blue \(Game Boy\) for native PC.

This project uses gb-recompiled \(forked from arcanite24/gb-recompiled\) to translate the original Game Boy machine code into C, which is then compiled to a native x64 executable. The Game Boy's PPU, APU, and memory mapper are handled by the gb-recompiled runtime library.

Early working prototype. The game is playable from the title screen through the Elite Four, but this is not a finished product.

- The game runs and is playable with both Red and Blue ROMs
- Some animations may lag or chug slightly \(e.g., certain battle intro spirals\)
- Minor visual glitches may occur in edge cases
- Code paths not yet discovered by the static analyzer will fall back to an interpreter — this works but is slower than recompiled code
- Audio works but may stutter briefly during animation-heavy scenes
- Some animation-heavy scenes \(e.g., certain battle intro effects\) may experience frame drops
- Audio may stutter briefly during heavy rendering
- Undiscovered code paths fall back to interpreter \(logged to console\)
- No link cable or printer support
- Only tested with US/Europe ROM versions
