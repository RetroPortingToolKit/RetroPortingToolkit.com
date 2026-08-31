---
title: "Klonoa: Door to Phantomile"
kicker: "PlayStation"
tags: []
featured: false
desc: "Almost none of this game is on its boot executable, so the project had to teach the recompiler to catch the rest as it streams off the disc."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "community"
platform: "playstation"
repo: "https://github.com/TechnicallyComputers/Klonoa-Door-to-Phantomile"
group: "PlayStation"
verified: "2026-08-20"
updated: "2026-08-18"
added: "2026-08-17"
cover: "./boxart.png"
---

A static recompilation of Namco's 1997 platformer, built on [PSXRecomp](/hardware/playstation) by TechnicallyComputers. Klonoa is the awkward case for a static recompiler: its boot executable is only 44 KB, so there is almost nothing to translate ahead of time and nearly the whole game arrives later, off the disc.

## Playable status

In alpha. Builds are published for Windows, macOS Intel, macOS Apple silicon, and Linux. The project makes no claim about how far the game plays, and the notes below are the better guide to where it stands.

It builds from a dump you provide, the USA disc SLUS-00585, verified by size, MD5, SHA-1, and CRC32 first. OpenBIOS boots it unless you point it at your own retail BIOS.

## What the recomp adds

Not much on the surface, and that is deliberate at this stage. Output is 4:3 on the OpenGL renderer. One quirk is game-specific: the controller is pinned to digital, with mode switching and hybrid mode both disabled, which matches how the original game expects to be driven.

A widescreen scan under `analysis/` found just three candidate sites, the fewest of any of these projects, and none are wired in.


## Sources

- [Klonoa-Door-to-Phantomile README, project files and releases (GitHub)](https://github.com/TechnicallyComputers/Klonoa-Door-to-Phantomile)
