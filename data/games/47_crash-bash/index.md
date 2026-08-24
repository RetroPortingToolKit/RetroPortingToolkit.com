---
title: "Crash Bash"
kicker: "PlayStation"
tags: []
featured: false
desc: "A soft-locking pause menu, and the whole GPU-level bug hunt behind it left in the open where anyone can read it."
year: "2026"
status: "Partial"
availability: "Public build"
provenance: "community"
platform: "playstation"
group: "PlayStation"
verified: "2026-08-20"
updated: "2026-08-18"
added: "2026-08-08"
cover: "./boxart.png"
---

A static recompilation of the 2000 Crash Bandicoot party game, built on [PSXRecomp](/hardware/playstation) by TechnicallyComputers. The 28 minigames run. The pause menu does not, and the interesting part is that the developer committed the entire investigation into the repository rather than just the fix.

## Can I play it?

Not comfortably. The README's disclaimer is specific: the in-game pause menu loads no menu items at all, so you cannot exit or change levels from it, and the game soft locks you into a loop. The stated plan is to return it to the catalog and the RetComM Launcher once it is stable.

Release v0.1.7 (2026-08-10) is on GitHub with zips for Windows, macOS Intel, macOS Apple silicon, and Linux. It builds from a dump you provide, the USA disc SCUS-94570, verified against a recorded size and checksums first. OpenBIOS boots it unless you supply a retail BIOS.

![A frame from the recompiled build, captured by the project's own pause-menu probe](./pause-probe-frame.png)

## What the recomp adds

Nothing yet beyond running natively. Output is 4:3 on the OpenGL renderer, with the controller in digital mode. A widescreen scan under `analysis/` turned up 15 candidate sites, and the scan file flags that its own height guess does not match any real console display mode, so it should be treated as a guess. None of it is wired into the build.

The original game's four-player Multitap support is a property of the disc, not something this project claims to have brought over.

## Technical details

The bug hunt is the story here. A `tmp_pause_probe/` directory in the repository holds 41 captured GPU frames, VRAM buffer dumps, cropped comparisons against DuckStation, and a written conclusion.

That conclusion is precise. While paused, each frame of roughly 2,170 GPU commands still draws the 3D scene and the HUD, the portraits, timer, and bottom strip, all from one submit function at ordering-table ranks 4091 to 4095. Not a single primitive targets the center band where the menu belongs, and neither the front nor the back VRAM buffer contains the menu's orange glyphs. So the text path never submits GPU work at all: it is not a rendering or presentation fault. The menu strings are sitting in RAM where they should be, and the probe's stated root cause is that read-only data, a compiler banner and a string pointer table, was wrongly emitted as executable blocks in the generated C.

The symbol map records the same findings in place, with the GPU submit function marked confirmed and a note that the pause text never appears from it or any other program counter while paused. 627 seed functions came out of the boot executable; 267 are mapped so far.

## Sources

- The Crash-Bash-Recomp repository is no longer publicly available on GitHub, checked 2026-08-24. This page describes the project as it stood when the repository was public.
