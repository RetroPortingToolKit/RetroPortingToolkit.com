---
title: "Star Wars: Masters of Teras Kasi"
kicker: "PlayStation"
tags: []
featured: false
desc: "A partial native build with a profile-guided optimization step devoted to the intro video."
year: "2026"
status: "Partial"
availability: "Public build"
provenance: "community"
platform: "playstation"
repo: "https://github.com/TechnicallyComputers/MastersOfTerasKasiRecomp"
group: "PlayStation"
verified: "2026-08-20"
updated: "2026-08-31"
added: "2026-07-21"
cover: "./boxart.png"
---

MastersOfTerasKasiRecomp is a community project by TechnicallyComputers that rebuilds Star Wars: Masters of Teras Kasi, the 1997 PlayStation fighting game, as a native program on [PSXRecomp](/hardware/playstation). What stands out is a profile-guided optimization pass whose entire job is the game's intro video.

## Playable status

Some of it, with a build step in between. Release zips cover Windows, macOS on both Intel and Apple silicon, and Linux. They are not finished binaries: each zip is a Generate and rebuild host, carrying the executable, the sources, and the recompiler, so the game is built on your machine from a dump you provide.

The project's own status line is careful. It boots far enough to present video and audio, and the known cost of that bring-up is heavy dirty-RAM interpretation, which leaves audio stuttery until more seeds and overlays land. An issue log in the repository tracks the rest.

The disc it wants is the USA Redump dump, SLUS-00562, a 17-track cue with the audio tracks intact. The build instructions ask for a PS1 BIOS image placed under the framework's bios folder, and the launcher has its own Browse BIOS step.

## What the recomp adds

Profile-guided optimization is usually a build-system detail; here it is a menu item. Settings, then SYSTEM, then Optimize FMV Playback trains the compiler on a real run of the game's intro and rebuilds with those profiles, because faithful load-delay timing makes that video the most expensive thing the runtime does. The issue log puts numbers on it: roughly 39 FPS without, roughly 48 to 50 with. The training stays on your machine and is deliberately kept out of CI builds.

The title is also carried in the RetComM Launcher catalogue, which installs, updates, and rebuilds it alongside other recomps instead of making you repeat each game's wizard by hand.


## Sources

- [Project README, issue log and releases (GitHub)](https://github.com/TechnicallyComputers/MastersOfTerasKasiRecomp)
- [RetComM Launcher catalogue entry (GitHub)](https://github.com/TechnicallyComputers/retcomm-catalog/blob/main/titles/masters-of-teras-kasi-psx.json)
