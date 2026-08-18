---
title: "CD-i"
kicker: "SCC68070"
tags: ["System ROM recomp", "OS-9"]
featured: false
desc: "cdirecomp, very early research that recompiles the whole Philips CD-i system ROM as native code."
year: "2026"
status: "Research"
provenance: "core"
arch: "Philips SCC68070"
repo: "https://github.com/mstan/cdirecomp"
group: "Research"
links:
  - { label: "cdirecomp on GitHub", href: "https://github.com/mstan/cdirecomp" }
  - { label: "Building & Enhancing Recomps: Ecosystem Updates (1379.tech)", href: "https://1379.tech/building-enhancing-recomps-ecosystem-updates/" }
---

cdirecomp is a static recompiler ecosystem for Philips CD-i games, translating SCC68070 machine code (a 68000-family CPU) into C. Its distinctive choice is scope: it recompiles the entire CD-RTOS/OS-9 system ROM rather than writing a hand-made OS-9 high-level emulation layer. The project calls itself "a research project shared in the open, not a finished product".

## What works today

In the project's own words, it is in "Very early development" and "boots the real Philips CD-i system ROM as native code and can perform a very basic boot of a CD-i title. Hotel Mario reaches its title card. Gameplay is not yet reachable". A clean-room interpreter is kept as the correctness floor beneath the recompiled code.

## Enhancements

None yet. The work so far is entirely about correct boot and system-ROM execution.

## Known limitations

No game reaches gameplay. Hotel Mario stops at its title card, and there is no compatibility story beyond that basic boot.

## Software

No game pages exist for this platform yet.

## Reading

- [Building & Enhancing Recomps: Ecosystem Updates (1379.tech)](https://1379.tech/building-enhancing-recomps-ecosystem-updates/)

cdirecomp ships no BIOS ROM, no disc images, and no game-derived generated code; the user supplies their own system ROM and Mode-2 cue/bin dumps.
