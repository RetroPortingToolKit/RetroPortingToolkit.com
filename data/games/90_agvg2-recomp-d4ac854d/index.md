---
title: "Advanced V.G. 2"
desc: "Native static recompilation of Advanced V.G. 2 (PlayStation) for Windows."
kicker: "PlayStation"
tags: ["Community"]
provenance: "community"
repo: "https://github.com/elprogramadorloco-arch/agvg2-recomp"
status: "Playable v0.1 "
links: [{"label":"Project on GitHub","href":"https://github.com/elprogramadorloco-arch/agvg2-recomp"}]
added: "2026-10-03"
updated: "2026-10-03"
submissionId: "d4ac854d54678f90"
draft: false
creator: {"github":"elprogramadorloco-arch","discord":"elprogramadorloco_87045"}
cover: "https://cdn.mobygames.com/covers/8557459-advanced-vg-2-psp-front-cover.jpg"
platform: "playstation"
updates:
  - date: "2026-10-03"
    text: "v0.1 released: boot, intro FMV, menus, character select and Normal-mode battles"
---

Advanced V.G. 2 Recompiled is a native static recompilation of **Advanced V.G. 2** for the original PlayStation (Japan, SLPM-87226).

It is **not an emulator**. The game's original MIPS code is translated to C with [PSXRecomp](https://github.com/mstan/psxrecomp) and compiled into a native x64 Windows executable.

The recompilation includes the boot loader, `SL_MAIN.EXE`, and the game's character, battle and event overlays. The runtime only emulates the PlayStation hardware required by the game, such as the GPU, SPU and CD-ROM.

## Current status

The following have been verified against DuckStation:

- Boot
- Intro FMV
- Menus
- Character select
- Normal-mode battles

Other game modes have not yet been fully verified.

## Windows build

The project currently targets **64-bit Windows 10/11**.

Users provide their own copy of **Advanced V.G. 2 (Japan)** and place the CUE and track files in the `data` folder.

The build system accepts several disc formats, including:

- BIN
- ECM
- 7z archives containing supported tracks
- APE for the optional CD-audio track

Running `run.bat` automatically downloads the pinned PSXRecomp toolchain, verifies it with SHA-256, recompiles the game and produces the private native build.

Visual Studio, a system installation of CMake and a system Python installation are not required.

## Controls and settings

The built-in launcher provides controller, video and audio configuration.

The original digital controls are preserved:

- Circle: confirm
- Cross: cancel
- Start: pause
