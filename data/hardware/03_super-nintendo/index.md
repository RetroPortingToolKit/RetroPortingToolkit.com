---
title: "Super Nintendo"
kicker: "65816"
tags: ["Widescreen", "MSU-1", "Mods", "Save states"]
featured: true
desc: "Three released games, true widescreen, and MSU-1 CD-quality audio, coaxed out of the 65816, a chip that fights static analysis."
year: "2026"
status: "Alpha"
provenance: "core"
arch: "65816"
repo: "https://github.com/mstan/snesrecomp"
group: "Active development"
links:
  - { label: "snesrecomp on GitHub", href: "https://github.com/mstan/snesrecomp" }
  - { label: "snesrecomp's First Title: Super Mario World (1379.tech)", href: "https://1379.tech/snesrecomps-first-title-super-mario-world/" }
  - { label: "Megaman X: Recompiled Release (1379.tech)", href: "https://1379.tech/megaman-x-recompiled-v1-0-0-release/" }
  - { label: "Mega Man X Recomp is Out Now! A SNES Recomp (video)", href: "https://www.youtube.com/watch?v=XRwKZ0_8u-c" }
---

SNESRecomp turns Super Nintendo games from 65816 machine code into C. The 65816 is a harder target than most: its registers switch between 8-bit and 16-bit widths, which makes static analysis much more difficult than on other systems. The README calls it plainly: "SNESRecomp is alpha software".

## What works today

Three games are released. Super Mario World is "Believed playable end to end", Mega Man X is "Fully playable", and A Link to the Past is "Playable through the early dungeon", all per the project's own README language. Mega Man X2, X3, Star Fox, and Super Metroid exist as development showcases. Enhancement chips are supported: Cx4, Super FX, DSP-1, and SA-1. Code that cannot yet be resolved statically runs in "a safe interpreter tier", and all releases are ROM-free.

## Enhancements

True widescreen and Adaptive View, MSU-1 CD-quality audio, a mod system, save states, and per-game launchers.

## Games

- [Super Mario World](/games/super-mario-world)
- [Mega Man X](/games/mega-man-x)
- [A Link to the Past](/games/a-link-to-the-past)
- [Donkey Kong Country 2](/games/dkc2)
- Super Metroid has a public repo but is an early development showcase without a page yet.

## Reading

- [snesrecomp's First Title: Super Mario World (1379.tech)](https://1379.tech/snesrecomps-first-title-super-mario-world/)
- [Megaman X: Recompiled Release (1379.tech)](https://1379.tech/megaman-x-recompiled-v1-0-0-release/)
- [Mega Man X Recomp is Out Now! A SNES Recomp (Video Game Esoterica)](https://www.youtube.com/watch?v=XRwKZ0_8u-c)

SNESRecomp releases contain no ROMs or game data; every game builds from your own legally dumped cartridge.
