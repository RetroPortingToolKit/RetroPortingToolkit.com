---
title: "Super Nintendo"
kicker: "65816"
tags: ["Widescreen", "MSU-1", "Mods", "Save states"]
featured: true
desc: "Three released games, from a fully playable Mega Man X to a Link to the Past build playable through the early dungeon, with widescreen and CD-quality audio."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
arch: "65816"
repo: "https://github.com/mstan/snesrecomp"
group: "Active platform ecosystems"
links:
  - { label: "View source (GitHub)", href: "https://github.com/mstan/snesrecomp" }
  - { label: "snesrecomp's First Title: Super Mario World (1379.tech)", href: "https://1379.tech/snesrecomps-first-title-super-mario-world/" }
  - { label: "Megaman X: Recompiled Release (1379.tech)", href: "https://1379.tech/megaman-x-recompiled-v1-0-0-release/" }
  - { label: "Mega Man X Recomp is Out Now! A SNES Recomp (video)", href: "https://www.youtube.com/watch?v=XRwKZ0_8u-c" }
verified: "2026-08-18"
---

Three games are released: in the README's own language, Mega Man X is "Fully playable", Super Mario World is "Believed playable end to end", and A Link to the Past is "Playable through the early dungeon". SNESRecomp uses static recompilation to turn Super Nintendo games into native apps; the README states that "SNESRecomp is alpha software".

## What can be used today

The three released games above, all ROM-free releases built against a user-supplied cartridge dump. Mega Man X2, X3, Star Fox, and Super Metroid exist as development showcases. Games using the Cx4, Super FX, DSP-1, and SA-1 enhancement chips are supported.

## Supported games

- [Super Mario World](/games/super-mario-world)
- [Mega Man X](/games/mega-man-x)
- [A Link to the Past](/games/a-link-to-the-past)
- [Donkey Kong Country 2](/games/dkc2)
- Super Metroid has a public repo but is an early development showcase without a page yet.

## Enhancements

True widescreen and Adaptive View, MSU-1 CD-quality audio, a mod system, save states, and per-game launchers.

## Requirements

All releases are ROM-free and contain no game data; every game builds from the user's own cartridge dump.

## Known limitations

The project is alpha software. A Link to the Past is playable only through the early dungeon, and the X2, X3, Star Fox, and Super Metroid repos are development showcases rather than releases.

## Technical details

SNESRecomp turns Super Nintendo games from 65816 machine code into C. The 65816 is a harder target than most: its registers switch between 8-bit and 16-bit widths, which makes static analysis much more difficult than on other systems. Code that cannot yet be resolved statically runs in "a safe interpreter tier".

## Get started

- [View source (GitHub)](https://github.com/mstan/snesrecomp)

## Sources and coverage

- [snesrecomp's First Title: Super Mario World (1379.tech)](https://1379.tech/snesrecomps-first-title-super-mario-world/)
- [Megaman X: Recompiled Release (1379.tech)](https://1379.tech/megaman-x-recompiled-v1-0-0-release/)
- [Mega Man X Recomp is Out Now! A SNES Recomp (Video Game Esoterica)](https://www.youtube.com/watch?v=XRwKZ0_8u-c)
