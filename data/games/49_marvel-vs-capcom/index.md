---
title: "Marvel vs. Capcom: Clash of Super Heroes"
kicker: "PlayStation"
tags: []
featured: false
desc: "The console port that traded away tag teams for memory, now the largest and least mapped boot image of these PlayStation community projects."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "community"
platform: "playstation"
repo: "https://github.com/TechnicallyComputers/Marvel-vs.-Capcom-Clash-of-Super-Heroes-Recomp"
group: "PlayStation"
verified: "2026-08-20"
updated: "2026-08-18"
added: "2026-08-07"
cover: "./boxart.png"
---

A static recompilation of Capcom's 1999 crossover fighter, built on [PSXRecomp](/hardware/playstation) by TechnicallyComputers. The disc it works from is already a compromise: the PlayStation port could not hold two full characters per side in memory, so it demoted the second fighter to an assist and dropped on-the-fly switching altogether.

## Can I play it?

In alpha, and it moves fast. Six releases landed between 2026-08-14 and 2026-08-18, ending at v0.3.17, each with zips for Windows, macOS Intel, macOS Apple silicon, and Linux. The project makes no claim about how far the game plays.

It builds from a dump you provide, the USA disc SLUS-01059, checked against a recorded size, MD5, SHA-1, and CRC32 before generation runs. OpenBIOS boots it unless you supply a retail BIOS.

## What the recomp adds

Nothing beyond a native build at this stage. Output is 4:3 on the OpenGL renderer, controller in digital mode. A widescreen scan under `analysis/` found 25 candidate sites and 4 functions carrying the screen-extent signature, more than any of the sibling projects here, but none of it has been wired into the build.

The README also spells out what the PlayStation version does instead of arcade tag teams: a Cross Over mode where each player picks one fighter and the second slot mirrors the opponent's pick, so both teams are always identical and the memory cost stays halved.

## Technical details

This is the heaviest image of the five community PlayStation projects covered here: 1.25 MB of boot executable against Metal Slug X's 606 KB, holding 2,867 functions and 284,256 instructions. 1,279 of those functions were taken as seeds directly from the boot executable's call targets.

It is also the least understood. Static analysis reaches only 804 of the 2,867 functions from the entry point; the other 2,063 have no direct caller anyone has found yet, which is what you would expect from a fighting game that dispatches through character and move tables rather than plain calls. The analysis resolved 136 jump tables into 915 targets and still lists 274 unresolved indirect calls, 657 words it could not decode, and 3 functions it could only partially recover. Confidence tells the same story: 326 functions verified against 1,541 rated low.

The symbol map has 281 entries, 33 of them named by hand. The project's own note is that seed counts should be expected to grow as overlays and runtime paths turn up, and on this image there is a lot left to turn up.

## Sources

- [Marvel vs. Capcom Recomp README, analysis files and releases (GitHub)](https://github.com/TechnicallyComputers/Marvel-vs.-Capcom-Clash-of-Super-Heroes-Recomp)
