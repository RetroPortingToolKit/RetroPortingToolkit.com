---
title: "Rampage Through Time"
kicker: "PlayStation"
tags: []
featured: false
desc: "A native PlayStation recompilation with a public build, progressive symbol mapping, and frequent releases."
year: "2026"
status: "Tech demo"
availability: "Public build"
provenance: "community"
platform: "playstation"
repo: "https://github.com/TechnicallyComputers/Rampage---Through-Time-Recomp"
group: "PlayStation"
verified: "2026-08-20"
updated: "2026-08-31"
added: "2026-08-10"
cover: "./boxart.png"
---

Rampage Through Time Recompiled is a community project by TechnicallyComputers that rebuilds Midway's 2000 city-smashing sequel as a native program on [PSXRecomp](/hardware/playstation).

## Can I play it?

Builds are published, but nobody has said yet how far the game gets. Zips for Windows, macOS on Intel and Apple silicon, and Linux land most weeks, the latest being v0.1.21 on 2026-08-18, and the repository carries no status section and no issue log to read alongside them.

Each zip is a setup host rather than a finished binary: it builds the game locally from a dump you provide, through the same Generate and Build flow the other TechnicallyComputers titles use. The disc it wants is the USA release, SLUS-01065, as a cue plus bin.

## What the recomp adds

The repository also carries a widescreen site analysis, a list of the places in the game's code that a wider view would have to touch. That is groundwork rather than a feature: the shipped configuration still renders 4:3.

Like the rest of the TechnicallyComputers catalogue, the title can be installed, updated, and rebuilt through the RetComM Launcher instead of running its wizard by hand.

## Technical details

PSXRecomp translates the game's MIPS R3000A machine code to C, which compiles into a native binary against the PS1 hardware runtime. The generated C is produced on your machine and never committed to the repository.

The starting map is 1222 function seeds, taken in a first pass from the boot executable's call targets, and the project notes plainly that it expects them to grow as overlays and runtime paths are discovered. Names arrive progressively: a symbols table is synced into a generated header, so a function that starts life as an address can become a name without anyone hand-editing generated code.

Framework versions are pinned by submodule gitlink rather than floating on a branch, and CI builds the four platform targets from those pins.

## Sources

- [Project README and releases (GitHub)](https://github.com/TechnicallyComputers/Rampage---Through-Time-Recomp)
- [RetComM Launcher catalogue entry (GitHub)](https://github.com/TechnicallyComputers/retcomm-catalog/blob/main/titles/rampage-through-time-psx.json)
