---
title: "Super Metroid"
kicker: "Super Nintendo"
tags: ["LLE-first"]
featured: false
desc: "The strictest game in the SNES lineup: the original ROM stays the ground truth, and a function becomes native C only once it is proven."
year: "2026"
status: "Partial"
availability: "Public build"
provenance: "core"
platform: "super-nintendo"
repo: "https://github.com/mstan/SuperMetroidRecomp"
group: "Super Nintendo"
verified: "2026-08-20"
updated: "2026-08-06"
added: "2026-06-08"
cover: "./boxart.webp"
---

Super Metroid was the fourth game on [SNESRecomp](/hardware/super-nintendo), after Mega Man X, Super Mario World, and A Link to the Past, and it is the one that states its rule most plainly: the ROM and the interpreter are the architectural ground truth. A 65816 function is translated into native C once it has been proven, and anything not proven keeps running the original code.

## Can I play it?

The opening, so far. The project's own list of what the default build does: it boots, renders, plays audio, completes the attract demo, starts a new game, traverses doors, pauses, and saves at Samus's ship. Past that it is a work in progress that needs broader end-to-end regression testing.

The current release is v0.2.1 (2026-08-06), which fixed audio crackle, packaged for Windows with a Linux AppImage alongside it. v0.2.0 moved the build to SDL3 and brought the Linux package with it. It is built from a dump you provide: you hand your own Super Metroid ROM to the executable.

## What the recomp adds

Two ways of running the same game, rather than a feature list. The default scheduler executes the game's real wait-for-NMI loop and resumes at its architectural continuation, which is the slow and correct path. An optional high-level mode replaces that wait with a host fiber yield, which is faster, and the project is careful about the ordering: the high-level tier is an optimization layered over the authoritative model, never a substitute for it.

Enhancement layers of the kind other SNESRecomp titles carry, widescreen or MSU-1 music packs, are not part of what this project documents. The per-game side is the single-fiber runtime, the per-bank configuration, the build glue, and the optional high-level function bodies.

## Technical details

Only the CPU is recompiled. Proven hot 65816 functions become generated C, and every absent or rejected register-width variant, the 65816's habit of switching its registers between 8 and 16 bits mid-program, falls back to executing the original ROM. The rest of the console is emulated: the PPU, the SPC700 audio coprocessor, DMA and HDMA channels, hardware register I/O, and bank mapping all run through the shared runtime's SNES core. Recompile the CPU, emulate the silicon.

The generated C runs to roughly 93 MB and is never committed; it is produced on your machine from your own ROM. Function names come from the snesrev Super Metroid decompilation, pinned to a commit and ingested into the per-bank configuration files, and regeneration can be run in a strict mode that independently regenerates the output and requires it to come out byte-identical.

## Sources

- [SuperMetroidRecomp README and releases (GitHub)](https://github.com/mstan/SuperMetroidRecomp)
