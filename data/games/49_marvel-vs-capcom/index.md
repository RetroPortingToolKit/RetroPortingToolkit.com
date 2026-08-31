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

## Playable status

In alpha, and it moves fast. Builds are published for Windows, macOS Intel, macOS Apple silicon, and Linux. The project makes no claim about how far the game plays.

It builds from a dump you provide, the USA disc SLUS-01059, checked against a recorded size, MD5, SHA-1, and CRC32 before generation runs. OpenBIOS boots it unless you supply a retail BIOS.

## What the recomp adds

Nothing beyond a native build at this stage. Output is 4:3 on the OpenGL renderer, controller in digital mode. A widescreen scan under `analysis/` found 25 candidate sites and 4 functions carrying the screen-extent signature, more than any of the sibling projects here, but none of it has been wired into the build.

The README also spells out what the PlayStation version does instead of arcade tag teams: a Cross Over mode where each player picks one fighter and the second slot mirrors the opponent's pick, so both teams are always identical and the memory cost stays halved.


## Sources

- [Marvel vs. Capcom Recomp README, analysis files and releases (GitHub)](https://github.com/TechnicallyComputers/Marvel-vs.-Capcom-Clash-of-Super-Heroes-Recomp)
