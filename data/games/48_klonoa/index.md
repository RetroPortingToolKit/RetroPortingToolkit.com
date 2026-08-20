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

## Can I play it?

In alpha. Two releases exist, v0.1.1 and v0.1.2 (2026-08-18), each with zips for Windows, macOS Intel, macOS Apple silicon, and Linux. The project makes no claim about how far the game plays; it is a week old, and the numbers below are the better guide to where it stands.

It builds from a dump you provide, the USA disc SLUS-00585, verified by size, MD5, SHA-1, and CRC32 first. OpenBIOS boots it unless you point it at your own retail BIOS.

## What the recomp adds

Not much on the surface, and that is deliberate at this stage. Output is 4:3 on the OpenGL renderer. One quirk is game-specific: the controller is pinned to digital, with mode switching and hybrid mode both disabled, which matches how the original game expects to be driven.

A widescreen scan under `analysis/` found just three candidate sites, the fewest of any of these projects, and none are wired in.

## Technical details

The whole engineering story here is the overlay cache. Ahead-of-time translation only reaches code the recompiler can see, and Klonoa's boot executable is 0xB000 bytes, yielding 110 seed functions. Everything else, including the STR video player that drives the intro movie, loads from the disc while the game runs.

The project measured what happens without a cache, and wrote the numbers into `game.toml`: all of that code falls through to the runtime's dirty-RAM interpreter, running at 11 to 17 million interpreted instructions per second, with 72 percent of the process CPU sitting in the interpreter's dispatch loop during the intro FMV.

The fix is to catch the code as it arrives. The build turns on the overlay cache and an autocompile command, and that command is also what arms automatic capture when interpreter pressure gets high. Captured overlays are compiled to native code in the background and reused next time. The result of one such pass is committed in the open: 38 overlay blocks recorded on 2026-08-17, each a load address plus a checksum of the bytes plus the call targets proven to be real function boundaries at addresses that actually executed. Between them they carry 603 entry points, with 136 in the largest single block. That is over five times what the boot executable offered on its own.

## Sources

- [Klonoa-Door-to-Phantomile README, project files and releases (GitHub)](https://github.com/TechnicallyComputers/Klonoa-Door-to-Phantomile)
