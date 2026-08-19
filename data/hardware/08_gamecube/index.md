---
title: "GameCube"
kicker: "PowerPC"
tags: ["Research"]
featured: false
desc: "Research only: the GameCube's own system menu, rolling cube and all, boots natively from a firmware dump you provide. No playable games yet."
year: "2026"
status: "Research"
availability: "Source only"
provenance: "core"
arch: "PowerPC (Gekko)"
repo: "https://github.com/mstan/gcnlle"
group: "Research"
links:
  - { label: "Building & Enhancing Recomps: Ecosystem Updates (1379.tech)", href: "https://1379.tech/building-enhancing-recomps-ecosystem-updates/" }
verified: "2026-08-18"
---

Research only. gcnlle recompiles the GameCube's boot firmware and runs its native system menu, the rolling cube logo, calendar, settings, and memory-card manager included, from a firmware dump you provide. It does not provide playable game builds; in the project's own words it is "research software, not a general GameCube emulator and not ready for ordinary game use".

## What runs today

The recompiled firmware menu runs on Windows. Memory-card management works end to end on Dolphin-compatible card images, and the console clock reads your computer's time once at boot, then keeps its own time the way real hardware would. On Wind Waker, the boot path reaches the title sailing sequence; the README frames that as "an engineering acceptance route, not a whole-game or release claim", and performance on that path is far from real time. There are no game pages for this platform yet.

Running anything requires a GameCube IPL dump and DSP dumps from your own hardware. gcnlle includes no Nintendo firmware, games, keys, or artwork.

## Technical details

gcnlle, formerly gcnrecompiled (the old URL redirects), is a low-level-emulation-first static recompiler for the GameCube's PowerPC Gekko CPU, licensed GPL-3.0. It starts where the console does, with the firmware itself, and models the hardware the firmware touches: EXI, SRAM, RTC, memory cards, video, GX graphics, DSP audio, disc, and controller interfaces. The recompiler is built on a pinned snapshot of the mstan/DolRecomp fork of ExpansionPak/DolRecomp. Interactive runs default to a Vulkan renderer with a synchronized software fallback, while the software renderer remains the correctness baseline, and the Wind Waker route runs the real IPL, disc, and apploader chain through content-validated recompiled code with a deliberately loud interpreter fallback.

## Sources

- [Building & Enhancing Recomps: Ecosystem Updates (1379.tech)](https://1379.tech/building-enhancing-recomps-ecosystem-updates/)
