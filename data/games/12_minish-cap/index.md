---
title: "The Legend of Zelda: The Minish Cap"
kicker: "Game Boy Advance"
tags: ["Adaptive widescreen"]
featured: false
desc: "Hyrule, wider: the game GBARecomp was built around, with adaptive widescreen demonstrated up to 21:9."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "game-boy-advance"
repo: "https://github.com/mstan/MinishCapRecomp"
group: "Game Boy Advance"
links:
  - { label: "Expanding the *recomp ecosystem with GBARecomp (1379.tech)", href: "https://1379.tech/expanding-the-recomp-ecosystem-with-gbarecomp/" }
  - { label: "Building & Enhancing Recomps: Ecosystem Updates (1379.tech)", href: "https://1379.tech/building-enhancing-recomps-ecosystem-updates/" }
verified: "2026-08-18"
cover: "/covers/minish-cap.jpg"
gallery:
  - { src: "./minish-cap-native.webp", caption: "Native resolution" }
  - { src: "./minish-cap-adaptive.webp", caption: "Adaptive widescreen" }
---

The Minish Cap is the game [GBARecomp](/hardware/game-boy-advance) was built around, and it is the most mature title in the GBA lineup. When the framework was announced in June 2026 with six games booting, Minish Cap was already into gameplay. It is also the clearest demonstration of what the approach can do that an original cartridge cannot: widen the view until you see almost twice as much of Hyrule.

## Can I play it?

Yes, as an in-development preview. Windows builds are on the GitHub Releases page, currently v0.0.4 (July 2026), and you can also build from source. Either way the game runs from a dump you provide: the runtime checks the USA ROM's fingerprint and refuses to launch anything else. Overworld, dialogue, and save states all work, but not every corner of the game has been tested, so expect rough edges.

## What the recomp adds

The faithful default is the original 240x160 image. Enable Adaptive Widescreen from the launcher's Mods page and the logical view widens as the window does, from 240 up to 480 pixels across while staying 160 tall. A 21:9 display shows roughly 373x160, and the feature has been demonstrated at 21:9 in the ecosystem write-ups. The extra width is not a stretch: the side margins read the game's own rendered room layers, so authored scenery continues to the real room edge without repeating. The HUD follows the corners of the wider view while dialogue stays centered over the play area. Entities and scripted effects keep their original behavior, so sprites can still pop in at the edges of the extended view.

Save states work from the keyboard: Shift+F1 through F9 to save a slot, F1 through F9 to load it.

The port also improves itself as you play. Any code path the static recompiler has not covered runs through a built-in interpreter the first time it is hit, is then compiled to native code in-process, and is remembered on disk, so the next launch runs it natively from the start.

## Technical details

The ROM's ARM7TDMI machine code is statically translated to native C: every function the game runs becomes a generated C function. Unlike most recomp projects, the GBA BIOS is recompiled and executed too rather than replaced with high-level stubs, so the boot sequence and interrupt handlers run as recompiled code. The gbarecomp runtime models the rest of the console: the PPU, the APU and M4A sound engine, DMA, timers, the cartridge EEPROM save chip, and hardware I/O.

Only symbol metadata (function names, addresses, sizes) from the zeldaret/tmc decompilation enters the repo, never its C source. The self-improvement path uses a toolchain-less JIT backend (sljit), with healed code persisted per ROM under `recomp_cache/`; it is on by default and can be disabled for a pure-interpreter run.

## Sources

- [MinishCapRecomp README (GitHub)](https://github.com/mstan/MinishCapRecomp)
- [Expanding the *recomp ecosystem with GBARecomp (1379.tech)](https://1379.tech/expanding-the-recomp-ecosystem-with-gbarecomp/)
- [Building & Enhancing Recomps: Ecosystem Updates (1379.tech)](https://1379.tech/building-enhancing-recomps-ecosystem-updates/)
