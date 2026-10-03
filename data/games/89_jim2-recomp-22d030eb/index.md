---
title: "Earthworm Jim 2"
desc: "Native static recompilation of the PlayStation version of Earthworm Jim 2 for Windows."
kicker: "PlayStation"
tags: ["Community"]
provenance: "community"
repo: "https://github.com/elprogramadorloco-arch/jim2-recomp"
status: "Playable v0.2 · Partial widescreen"
links: [{"label":"Project on GitHub","href":"https://github.com/elprogramadorloco-arch/jim2-recomp"}]
added: "2026-10-03"
updated: "2026-10-03"
submissionId: "22d030eb91b02541"
draft: false
creator: {"github":"elprogramadorloco-arch","discord":"elprogramadorloco_87045"}
cover: "https://static.wikia.nocookie.net/ewj/images/5/53/Earthworm_Jim_2.jpg/revision/latest?cb=20100614223208"
platform: "playstation"
release: "v0.2"
download: "https://github.com/elprogramadorloco-arch/jim2-recomp/releases/tag/v0.2"
---

Earthworm Jim 2 Recompiled is a native static recompilation of the **PlayStation version of Earthworm Jim 2** (Europe, SLES-00343).

It is **not an emulator**. The original MIPS game code is translated to C with [psxrecomp](https://github.com/mstan/psxrecomp) and compiled into a native Windows executable.

## Current status

The boot loader and all 19 game executables — the main menu, all 17 levels and the ending — are statically recompiled ahead of time.

All **17 levels load and are playable**, and each level has been checked against DuckStation during development.

Still to be fully verified end to end:

- Level-to-level transitions
- FMV sequences between levels
- The ending
- Some audio effects, since SPU support in psxrecomp is still partial

## Widescreen 16:9

Version **v0.2** adds real 16:9 gameplay to **13 of the 17 levels**.

The image is not stretched. The game renders additional scenery on both sides, and the HUD is moved to the screen corners while keeping its original distance from the edges.

The following levels still use their original 4:3 presentation:

- Puppy Love 1
- Puppy Love 2
- Puppy Love 3
- Flyin' King
- Lorenzo's Soil

Menus, transition screens, videos and the ending also remain in 4:3.

Widescreen is enabled by default and can be disabled from the launcher's **Mods** page.

## Windows build

Users provide their own copy of **Earthworm Jim 2 (Europe)** for PlayStation.

The repository contains no game data and no code generated from the game.

After placing the required CUE and BIN files in `data`, running `run.bat` automatically downloads a verified portable toolchain and builds the native executable.

No Visual Studio, CMake or Python installation is required.

## Updates

The project includes `update.bat`, which can update the public source package from the latest GitHub Release, verify it with SHA-256 and rebuild only what changed.

## Android

An Android version is currently in development.

[Source code and releases](https://github.com/elprogramadorloco-arch/jim2-recomp)
