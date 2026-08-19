---
title: "Virtual Boy"
kicker: "V810"
tags: ["Cross-platform"]
featured: false
desc: "One commercial title, Mario's Tennis, running as a native tech demo on Windows, macOS, and Linux, built from your own cartridge dump."
year: "2026"
status: "Tech demo"
availability: "Source only"
provenance: "core"
arch: "NEC V810"
repo: "https://github.com/mstan/vbrecomp"
group: "Early platform work"
links:
  - { label: "VirtualBoy Recomp Gets Its First Title: Mario Tennis (1379.tech)", href: "https://1379.tech/virtualboy-recomp-gets-its-first-title-mario-tennis/" }
verified: "2026-08-18"
cover: "/consoles/virtual-boy.jpg"
---

Tech demo. One commercial title, [Mario's Tennis](/games/mario-tennis), runs as a native app on Windows, macOS, and Linux, built from a cartridge dump you provide. vbrecomp rebuilds Virtual Boy games as code compiled for modern systems, and it exists partly because the console is so obscure: a short library, no public disassemblies, and a simpler design than most of its contemporaries.

## What runs today

Mario's Tennis plays through its own per-game repo on all three desktop platforms, with gamepad support and fullscreen. It is a tech demo rather than a polished release, and the author does not plan to bring up the rest of the library alone. There is no enhancement layer yet; the stated ambition to "visually enrich" titles beyond the console's red-and-black display is a goal, not a shipped feature.

## Technical details

vbrecomp translates NEC V810 machine code into C, MIT licensed, with the framework and each game living in separate repos: the framework contains no game ROM and no game-derived generated C. The recompiled code yields cooperatively through a step-budget counter, so no platform-specific fiber or coroutine machinery is needed, which is part of why all three desktop platforms work. The runtime simulates the VIP display, VSU sound, timers, and interrupts, carries an always-on TCP debug server with trace ring buffers, and uses the Beetle VB libretro core as its validation oracle.

## Sources

- [VirtualBoy Recomp Gets Its First Title: Mario Tennis (1379.tech)](https://1379.tech/virtualboy-recomp-gets-its-first-title-mario-tennis/)
