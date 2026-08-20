---
title: "Mega Man X5"
kicker: "PlayStation"
tags: ["Widescreen"]
featured: false
desc: "X5 running as a native app: intro movies, stages, and saving all work, with widescreen and smoother frames as opt-in mods."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "playstation"
repo: "https://github.com/mstan/MegaManX5Recomp"
group: "PlayStation"
verified: "2026-08-18"
updated: "2026-08-11"
added: "2026-07-05"
cover: "./mega-man-x5.png"
---

Mega Man X5 holds the middle of [PSXRecomp](/hardware/playstation)'s PlayStation X run, between [Mega Man X4](/games/mega-man-x4) and [Mega Man X6](/games/mega-man-x6). It is further along than its number suggests: the intro movies decode and play, stages work, and saving works, with no known crashes on the covered path.

## Can I play it?

Yes, as a playable alpha. The current release is v0.0.2-alpha (2026-08-01), with a Windows package and a Linux AppImage on the GitHub releases page. The game is built from a dump you provide: your Mega Man X5 (USA) disc image, and a bundled open-source BIOS boots it out of the box.

It plays from boot through the opening and into stages, but a full playthrough has not been verified on this build.

## What the recomp adds

Widescreen and frame interpolation are both default-off mods, so authentic 4:3 is what you get until you go looking for more.

- Experimental 16:9 widescreen widens the 2D background window along with enemy activation and culling, so you genuinely see more, not a stretched picture.
- Frame interpolation runs at your display's refresh rate or a fixed rate from 90 through 240. It is presentation only: game logic, timers, and audio keep their stock cadence.
- FMV auto-skip, off by default so you see the intro, toggleable in the launcher.
- Fast loading that fast-forwards the whole machine during disc loads and drops back to normal the instant they finish, keeping the game's internal timing correct. Toggleable in the launcher.
- Supersampling at up to 4x internal resolution with optional smoothing.

## Technical details

The game's MIPS code is translated ahead of time into C and compiled into a native program that runs on a faithful simulation of the PS1 hardware (GPU, SPU, GTE, memory cards) plus a recompiled BIOS. Three renderers are available: software, OpenGL (the validated default), and Vulkan. X5 will not poll buttons until it detects an analog-capable pad, so the runtime presents a DualShock by default. Saves are standard .mcd memory-card files that emulators can also read. Use a .cue plus .bin dump rather than a cooked .iso, which would discard the disc sectors the game streams video and audio from.

## Sources

- [Project README and release notes (GitHub)](https://github.com/mstan/MegaManX5Recomp)
