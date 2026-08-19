---
title: "Tomba! 2"
kicker: "PlayStation"
tags: ["Adaptive widescreen", "Debug menu"]
featured: false
desc: "The sequel to Tomba!, with widescreen that follows your window from 4:3 to 21:9 and a hidden developer menu."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "playstation"
repo: "https://github.com/mstan/Tomba2Recomp"
group: "PlayStation"
verified: "2026-08-18"
cover: "./tomba-2.png"
gallery:
  - { src: "./tomba-2-adaptive.png", caption: "Adaptive widescreen" }
---

Tomba! 2 follows [Tomba!](/games/tomba) into [PSXRecomp](/hardware/playstation) territory as a core project, and it carries the framework's most flexible screen trick: adaptive widescreen. Resize the window to any shape from 4:3 up to 21:9 and the game draws more of the world to fill it, instead of stretching a fixed picture.

## Can I play it?

Yes, as a playable alpha. The current release is v0.0.8 (2026-08-08), which fixed a memory-card hang from the previous build; Windows and Linux packages are on the GitHub releases page. The game is built from a dump you provide: your Tomba! 2 (USA) disc image. A bundled open-source BIOS boots it out of the box. These are in-development previews, so expect rough edges.

## What the recomp adds

- Widescreen in 16:9, 21:9, and Adaptive modes. Adaptive follows the live window or fullscreen shape anywhere from 4:3 to 21:9, while true 2D screens like the BIOS, movies, and menus stay at their original 4:3.
- Frame blending at a fixed target or your display's measured refresh rate, with a motion-adaptive clarity blend that suppresses double-image trails. Game logic, input, and audio keep their original cadence.
- FMV skipping that still runs the game's normal movie completion path.
- An experimental debug menu, opened with L3 during gameplay: warp between areas, grant items, and edit event flags. The project recommends a separate memory card while poking at it.
- DualShock rumble, added with the v0.0.8 framework update.

All mods are off by default, leaving the authentic 4:3 presentation as the baseline.

## Technical details

The game's MIPS code is translated ahead of time into C and compiled into a native program that runs on a faithful simulation of the PS1 hardware plus a recompiled BIOS. Tomba! 2's boot executable is just a small loader; the bulk of the game streams from disc as code overlays at runtime, the same architecture as the first game, so the release ships 374 prebuilt native overlays and converts the rest as you play. The v0.0.8 memory-card fix was a recompiler correction to MIPS load-delay semantics, contributed through the shared framework.

## Sources

- [Project README and release notes (GitHub)](https://github.com/mstan/Tomba2Recomp)
