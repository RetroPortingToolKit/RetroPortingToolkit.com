---
title: "CD-i"
kicker: "SCC68070"
tags: ["System ROM recomp", "OS-9"]
featured: false
desc: "Very early research that recompiles the entire Philips CD-i system ROM; Hotel Mario reaches its title card, and gameplay is not yet reachable."
year: "2026"
status: "Research"
availability: "Source only"
provenance: "core"
arch: "Philips SCC68070"
repo: "https://github.com/mstan/cdirecomp"
group: "Research"
links:
  - { label: "View source (GitHub)", href: "https://github.com/mstan/cdirecomp" }
  - { label: "Building & Enhancing Recomps: Ecosystem Updates (1379.tech)", href: "https://1379.tech/building-enhancing-recomps-ecosystem-updates/" }
verified: "2026-08-18"
cover: "./hotel-mario-title.png"
---

Research only. cdirecomp can boot the Philips CD-i system ROM as native code and perform a very basic boot of a CD-i title; no game reaches gameplay yet. The project calls itself "a research project shared in the open, not a finished product".

## What can be used today

In the project's own words, it is in "Very early development" and "boots the real Philips CD-i system ROM as native code and can perform a very basic boot of a CD-i title. Hotel Mario reaches its title card. Gameplay is not yet reachable".

## Supported games

None yet. No game pages exist for this platform.

## Requirements

The user supplies their own system ROM and Mode-2 cue/bin dumps. cdirecomp ships no BIOS ROM, no disc images, and no game-derived generated code.

## Known limitations

No game reaches gameplay. Hotel Mario stops at its title card, and there is no compatibility story beyond that basic boot.

## Technical details

cdirecomp translates Philips CD-i games from SCC68070 machine code, a 68000-family CPU, into C. Its distinctive choice is scope: instead of a hand-made OS-9 high-level emulation layer, it recompiles the entire CD-RTOS/OS-9 system ROM. A clean-room interpreter is kept as the correctness floor beneath the recompiled code.

## Get started

- [View source (GitHub)](https://github.com/mstan/cdirecomp)

## Sources and coverage

- [Building & Enhancing Recomps: Ecosystem Updates (1379.tech)](https://1379.tech/building-enhancing-recomps-ecosystem-updates/)
