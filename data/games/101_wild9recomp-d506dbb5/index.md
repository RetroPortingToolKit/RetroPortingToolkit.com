---
title: "Wild 9 Recompilation"
desc: "Native PC port of the classic PlayStation 1 title `Wild 9`, powered by static recompilation. Features true widescreen, high-resolution rendering, PGXP correction, intro skipping, higher framerate support, multiple languages, controls and gameplay changes and an extensible mod system"
kicker: "Community submission"
tags: ["Community"]
provenance: "community"
repo: "https://github.com/plinkr/Wild9Recomp"
status: "Community submission"
platform: "playstation"
links: [{"label":"Project on GitHub","href":"https://github.com/plinkr/Wild9Recomp"}]
added: "2026-10-18"
updated: "2026-10-18"
submissionId: "d506dbb58d4077a5"
draft: false
creator: {"github":"plinkr","discord":"plinkr"}
cover: "./submission-1.png"
---

Native PC port of the classic PlayStation 1 title \`Wild 9\`, powered by static recompilation. Features true widescreen, high-resolution rendering, PGXP correction, intro skipping, higher framerate support, multiple languages, controls and gameplay changes and an extensible mod system

## Project

Static recompilation and native PC port of Wild 9 \(PlayStation 1, NTSC-U SLUS-00425\).

Screenshots \(click a thumbnail to view full size\):

Wild 9 is a 2.5D platform action game developed by Shiny Entertainment and published by Interplay in 1998 for the Sony PlayStation. This project provides a native PC port of the original NTSC-U release \(SLUS-00425\) by statically translating the MIPS R3000A machine code from the game executable into native C source files.

The recompiled C code links directly against a hardware-accurate runtime environment provided by [PSXRecomp](/hardware/playstation) and recomp-ui. The runtime provides native display output, widescreen viewport expansion, PGXP geometric precision correction, an integrated OpenBIOS implementation, and modding plugins while preserving the original game logic, physics, and timing.

- Static binary recompilation: Translates the original SLUS004.25 executable directly into native C code.
- Native PC execution: Runs natively on 64-bit Linux, Windows, and macOS without an emulator.
- Integrated OpenBIOS: Ships with the open-source PCSX-Redux OpenBIOS implementation; proprietary Sony BIOS dumps are optional.
- Geometry and texturing fixes: Employs PGXP precision geometry and perspective-correct texturing to eliminate PlayStation affine texture warping and polygon jitter.
- Widescreen rendering: Native widescreen expansion with automated 2D backdrop stretching and SXY screen culling adjustments.
- Frame rate presentation mod: Optional temporal frame blending mod supporting 60, 120, 144, 165 FPS, and display refresh targets on OpenGL while maintaining original 59.94 Hz simulation cadence.
- Video skip mod: Configurable controller button shortcut to skip introductory FMV sequences and logos.
- Language selection mod: Configurable launcher option to select among built-in Multi-5 languages (English, French, German, Italian, Spanish).
- Debug overlay: Mod plugin exposing the native engine diagnostic overlay for memory, GPU, and rendering performance metrics.
- Enhanced environment brightness: Optional OpenGL post-process gamma adjustment that lifts shadows and mid-tones without modifying guest rendering state, textures, or recompiled game code.
- Rig overhead hover mod: Gameplay enhancement allowing players to lock held objects or enemies overhead by holding both trigger buttons (R2 + L2 / RT + LT), eliminating awkward carry physics during platforming sections.
