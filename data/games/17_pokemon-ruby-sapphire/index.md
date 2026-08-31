---
title: "PokÃ©mon Ruby & Sapphire"
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
updated: "2026-07-29"
added: "2026-06-22"
cover: "./pokemon-ruby.webp"
---

PokÃ©mon Ruby and Sapphire opened Gen 3, and this core project in the [Game Boy Advance lineup](/hardware/game-boy-advance) turns both into native PC games. One repository covers the pair and builds a separate program for each version. The cartridge's built-in real-time clock is part of the port rather than left out. Their Gen 3 siblings live in [FireRed & LeafGreen](/games/pokemon-firered-leafgreen) and [Emerald](/games/pokemon-emerald).

![Sapphire, the other half of the pair, built as its own program](./pokemon-sapphire.webp)

## Playable status

Yes, as an early preview on Windows. RubyRecomp and SapphireRecomp packages are on the GitHub releases page. Run the game you want and point it at a dump you provide: the runtime checks the file's fingerprint and only accepts the USA rev1 ROM of each version.

Both games boot through the BIOS intro to the title screen and into gameplay, but this is a bring-up, not a finished port. The README is candid about why: Ruby and Sapphire run the oldest Gen 3 engine, and they show more early-boot, flash save, and clock quirks than FireRed or Emerald.

## What the recomp adds

- Save states in nine slots: Shift+F1 to F9 saves, F1 to F9 loads.
- The game gets better the more you play. Any code path the static recompiler has not covered yet runs correctly through a built-in interpreter the first time it is hit, is compiled to native code on the spot, and is remembered on disk, so the next launch runs it natively from the start.
- The cartridge's real-time clock is modeled by the runtime, along with the flash chip the games save to.
- Keyboard controls out of the box: arrow keys for the D-Pad, Z and X for A and B, Enter for Start.


## Sources

- [RubySapphireRecomp README](https://github.com/mstan/RubySapphireRecomp)
- [RubySapphireRecomp releases](https://github.com/mstan/RubySapphireRecomp/releases)
- [gbarecomp framework](https://github.com/mstan/gbarecomp)
- [Recomp + AI: 5 Months Later (1379.tech)](https://1379.tech/recomp-ai-5-months-later/)
