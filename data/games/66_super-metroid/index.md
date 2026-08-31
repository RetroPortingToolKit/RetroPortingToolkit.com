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

## Playable status

The opening, so far. The project's own list of what the default build does: it boots, renders, plays audio, completes the attract demo, starts a new game, traverses doors, pauses, and saves at Samus's ship. Past that it is a work in progress that needs broader end-to-end regression testing.

Windows and Linux packages are on the GitHub releases page. It is built from a dump you provide: you hand your own Super Metroid ROM to the executable.

## What the recomp adds

Two ways of running the same game, rather than a feature list. The default scheduler executes the game's real wait-for-NMI loop and resumes at its architectural continuation, which is the slow and correct path. An optional high-level mode replaces that wait with a host fiber yield, which is faster, and the project is careful about the ordering: the high-level tier is an optimization layered over the authoritative model, never a substitute for it.

Enhancement layers of the kind other SNESRecomp titles carry, widescreen or MSU-1 music packs, are not part of what this project documents. The per-game side is the single-fiber runtime, the per-bank configuration, the build glue, and the optional high-level function bodies.


## Sources

- [SuperMetroidRecomp README and releases (GitHub)](https://github.com/mstan/SuperMetroidRecomp)
