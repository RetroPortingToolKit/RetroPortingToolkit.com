---
title: "Ape Escape"
kicker: "PlayStation"
tags: ["Widescreen"]
featured: false
desc: "The game that made you use both sticks, now a native PC app with widescreen up to 21:9 and an experimental Linux build."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "playstation"
repo: "https://github.com/mstan/ApeEscapeRecomp"
group: "PlayStation"
verified: "2026-08-18"
cover: "./ape-escape.png"
---

Ape Escape was built around the DualShock: you run with the left stick and swing the monkey-catching net with the right. This core [PSXRecomp](/hardware/playstation) project keeps that dual-stick feel on modern hardware. Any plugged-in pad is picked up automatically and presented to the game as a DualShock, stick clicks included, and a keyboard folds onto the analog stick if that is all you have.

## Can I play it?

Yes, as an early playable alpha. The current release is v0.1.2 (2026-08-05), which added an experimental Linux AppImage alongside the Windows package on the GitHub releases page. The game is built from a dump you provide: your Ape Escape (USA) disc image, and a bundled open-source BIOS boots it out of the box.

It plays from the intro through the title and into gameplay with no known crashes, but a full playthrough has not been verified end to end. An analog controller is strongly recommended.

## What the recomp adds

Widescreen is the headline, in 16:9, 21:9, and Adaptive modes. Adaptive follows the live window shape from 4:3 through 21:9, opening up the 3D field of view rather than stretching the picture.

![Running at 21:9](./ape-escape-21x9.png)

The rest of the additions:

- Frame blending at your display's refresh rate or a fixed 60, 120, 144, or 165, with a Clarity mode that reduces double-image trails. This is temporal blending, not motion-vector frame generation.
- FMV skipping that ends movies through the game's normal completion path.
- Supersampling at up to 4x internal resolution, antialiasing, and a choice of nearest or bilinear texture filtering.

Widescreen, frame blending, and FMV skipping are all off by default; with them disabled, the 4:3 presentation is unchanged.

## Technical details

The game's MIPS code is translated ahead of time into C and compiled into a native program that runs the game's own logic on a faithful simulation of the PS1 hardware (GPU, SPU, GTE, memory cards) plus a recompiled BIOS. Rendering uses an OpenGL backend by default with a software rasterizer as fallback; on OpenGL, supersampling is true ordered-grid SSAA resolved down to your window. The widescreen mod widens the GTE projection along the game's stable projection path, with HUD proportion correction for the front interface layer. Saves are standard .mcd memory-card files. Use a .cue plus .bin dump rather than a cooked .iso, which would discard the disc sectors the game streams video and audio from.

## Sources

- [Project README and releases (GitHub)](https://github.com/mstan/ApeEscapeRecomp)
