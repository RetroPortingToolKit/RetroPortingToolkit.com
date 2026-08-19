---
title: "CD-i"
kicker: "SCC68070"
tags: ["System ROM recomp", "OS-9"]
featured: false
desc: "Very early research that rebuilds the entire Philips CD-i player software; Hotel Mario reaches its title card, and gameplay is not yet reachable."
year: "2026"
status: "Research"
availability: "Source only"
provenance: "core"
arch: "Philips SCC68070"
repo: "https://github.com/mstan/cdirecomp"
group: "Research"
links:
  - { label: "Building & Enhancing Recomps: Ecosystem Updates (1379.tech)", href: "https://1379.tech/building-enhancing-recomps-ecosystem-updates/" }
verified: "2026-08-18"
cover: "/consoles/cd-i.jpg"
---

Research only. cdirecomp boots the real Philips CD-i player software as native code and can perform a very basic boot of a CD-i title: Hotel Mario reaches its title card, and gameplay is not yet reachable. The project calls itself "a research project shared in the open, not a finished product".

## What runs today

The recompiled system ROM boots to the CD-i's interactive player shell: navigation, the Time and Date and storage settings screens, media insert and eject, and persistent settings all work. From the shell, a user-supplied Hotel Mario disc loads, the Philips Interactive Media bumper plays with decoded XA audio, and the game reaches its title card with zero native dispatch misses. Your mouse drives the CD-i pointer directly, inside Hotel Mario as well as the shell, and the player's clock can optionally be set from your computer's clock once at startup. Gameplay is not reachable, and there is no compatibility story beyond this one bring-up. No game pages exist for this platform.

You supply your own system ROM and disc dumps; cdirecomp ships no BIOS ROM, no disc images, and no game-derived generated code.

## Technical details

cdirecomp translates the CD-i's SCC68070 machine code, a 68000-family CPU, into C. Its distinctive choice is scope: instead of hand-writing a high-level stand-in for the console's OS-9-based operating system, it recompiles the entire CD-RTOS system ROM and lets games make their system calls into that recompiled kernel, exactly as they would on hardware. A CD-i title is not a bare cartridge program but a set of relocatable modules the OS loads into RAM at run time, which is why the system ROM had to come first. The runtime models the MCD212 video decoder, the CD and XA-audio path, and the input controller as clean-room rewrites from hardware documentation, with a clean-room interpreter kept as the correctness floor beneath the recompiled code. The 68000 frontend descends from the author's own segagenesisrecomp.

## Sources

- [Building & Enhancing Recomps: Ecosystem Updates (1379.tech)](https://1379.tech/building-enhancing-recomps-ecosystem-updates/)
