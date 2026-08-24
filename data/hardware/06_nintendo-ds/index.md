---
title: "Nintendo DS"
kicker: "ARM9+ARM7"
tags: ["Dual CPU", "Adaptive 21:9"]
featured: false
desc: "Very early research on rebuilding both DS processors; one public game, Metroid Prime Hunters, is in public alpha."
year: "2026"
status: "Research"
maturity: "Alpha"
availability: "Source only"
provenance: "core"
arch: "ARM946E-S + ARM7TDMI"
repo: "https://github.com/mstan/ndsrecomp"
group: "Early platform work"
links:
  - { label: "Building & Enhancing Recomps: Ecosystem Updates (1379.tech)", href: "https://1379.tech/building-enhancing-recomps-ecosystem-updates/" }
  - { label: "GenerationAmiga on Metroid Prime Hunters", href: "https://www.generationamiga.com/2026/08/16/metroid-prime-hunters-recomp-brings-the-nintendo-ds-classic-to-pc/" }
verified: "2026-08-18"
cover: "/consoles/nintendo-ds.jpg"
---

Research only. ndsrecomp recompiles both of the DS's processors; in the project's own words it is "very early pre-alpha (v0.0.1)" and an experimental developer snapshot with no compatibility promise. One public game consumer exists: [Metroid Prime Hunters](/games/metroid-prime-hunters), in public alpha.

## What runs today

The original DS firmware menu is the baseline target: the runtime boots through both BIOSes, passes the Health & Safety screen, and reaches a menu you can drive with mouse touch input. [Metroid Prime Hunters](/games/metroid-prime-hunters) is the one public game, with adaptive 21:9 widescreen bring-up for its top screen. The framework has also demonstrated early bring-up across further titles, experimental online play through Wiimmfi, and experimental same-machine local wireless multiplayer, all as narrow developer results rather than releases.

This is a developer snapshot, not a product: there are no turnkey game builds from a clean clone, whole-machine save states are not implemented yet, and it is not usable as a general DS emulator or framework.

## Technical details

ndsrecomp recompiles both CPUs to C: the ARM946E-S main processor and the ARM7TDMI, which shares its core family with the GBA and started as a port of gbarecomp's ARM implementation. A dual-CPU, event-aligned scheduler interleaves them over shared memory, and a bounded interpreter tier handles code the guest copies into RAM. BIOS and firmware dumps are user-supplied and hash-verified, with an opt-in FreeBIOS path for a no-dump boot; the online-play plumbing builds on melonDS's Wi-Fi work, and melonDS also serves as the accuracy oracle with DeSmuME as a secondary cross-check. The top and bottom screens can render as one stacked window or two independent ones. The recompiler, the generated code, and the project's own tooling are MIT licensed; because the runner links that vendored melonDS code, the project's own attribution notices state that the runner binary is a combined work whose distribution must comply with GPL-3.0-or-later.

## Sources

- [Building & Enhancing Recomps: Ecosystem Updates (1379.tech)](https://1379.tech/building-enhancing-recomps-ecosystem-updates/)
- [GenerationAmiga on Metroid Prime Hunters](https://www.generationamiga.com/2026/08/16/metroid-prime-hunters-recomp-brings-the-nintendo-ds-classic-to-pc/)
