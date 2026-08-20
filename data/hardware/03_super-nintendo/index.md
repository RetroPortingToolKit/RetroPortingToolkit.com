---
title: "Super Nintendo"
kicker: "65816"
tags: ["Widescreen", "MSU-1", "Mods", "Save states"]
featured: true
desc: "Three released games, from a fully playable Mega Man X to an early Link to the Past build, with widescreen and CD-quality music."
year: "2026"
status: "Playable alpha"
maturity: "Beta"
availability: "Public build"
provenance: "core"
arch: "65816"
repo: "https://github.com/mstan/snesrecomp"
group: "Active platform ecosystems"
links:
  - { label: "snesrecomp's First Title: Super Mario World (1379.tech)", href: "https://1379.tech/snesrecomps-first-title-super-mario-world/" }
  - { label: "Megaman X: Recompiled Release (1379.tech)", href: "https://1379.tech/megaman-x-recompiled-v1-0-0-release/" }
  - { label: "Watch: Mega Man X Recomp is out now", href: "/blog/video-mega-man-x-out-now" }
verified: "2026-08-18"
cover: "/consoles/super-nintendo.jpg"
---

Three Super Nintendo games have public releases, and in the README's own words: [Mega Man X](/games/mega-man-x) is "Fully playable", [Super Mario World](/games/super-mario-world) is "Believed playable end to end", and [A Link to the Past](/games/a-link-to-the-past) is "Playable through the early dungeon". SNESRecomp rebuilds each game's original code as a native app, built from a cartridge dump you provide.

## What runs today

The three releases above are all ROM-free downloads; Mega Man X ships Windows, macOS, and Linux builds. [Donkey Kong Country 2](/games/dkc2) is the newest addition, community work hosted in a core-team repository and just out of the gate. Mega Man X2, X3, Star Fox, and Super Metroid appear as development showcases in the framework README, not releases. The project states plainly that "SNESRecomp is alpha software", and each game repo is the authoritative source for what its build can do.

## What the recomp adds

- True widescreen: background streaming, object windows, HUD placement, and sprite rendering are widened together, so 16:9 shows more of the level instead of stretching it. Adaptive View grows the viewport with the window and can stop at an authentic map edge rather than inventing scenery.
- MSU-1 audio: Super Mario World and A Link to the Past can stream CD-quality music packs from their launchers while a verified stock ROM stays untouched.
- Versioned mod packages with independently toggleable features; Mega Man X's widescreen ships through this system.
- Save states, launcher-selectable display aspects (4:3 CRT, square pixels, square frame), and per-game launchers.

## Technical details

SNESRecomp translates 65816 machine code into C and links it against a shared hardware runtime. The 65816 is a harder target than most: its registers switch between 8-bit and 16-bit widths mid-program, so the analyzer has to track that state through every control path. Code that cannot yet be resolved statically falls through to a safe interpreter tier instead of becoming a correctness hole. The runtime supports LoROM and HiROM cartridges plus several enhancement chips at the instruction level: the Cx4 used by Mega Man X2 and X3, Super FX with Star Fox as the validation target, DSP-1 validated on Super Mario Kart, and SA-1 validated on Super Mario RPG. Development leans on differential testing against independently built reference emulator cores, and the project credits the snesrev ports, LakeSnes, and the SMWDisX disassembly as foundations.

## Sources

- [snesrecomp's First Title: Super Mario World (1379.tech)](https://1379.tech/snesrecomps-first-title-super-mario-world/)
- [Megaman X: Recompiled Release (1379.tech)](https://1379.tech/megaman-x-recompiled-v1-0-0-release/)
- [Mega Man X Recomp is Out Now! A SNES Recomp (Video Game Esoterica)](/blog/video-mega-man-x-out-now)
- [Building & Enhancing Recomps: Ecosystem Updates (1379.tech)](https://1379.tech/building-enhancing-recomps-ecosystem-updates/)
