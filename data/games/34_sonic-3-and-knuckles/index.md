---
title: "Sonic 3 & Knuckles"
kicker: "Sega Genesis"
tags: ["Widescreen"]
featured: false
desc: "One repo, three builds: Sonic 3, Sonic & Knuckles, and the combined lock-on cartridge, all on the shared Genesis engine."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "sega-genesis"
repo: "https://github.com/mstan/Sonic3AndKnucklesRecomp"
group: "Sega Genesis"
links:
  - { label: "SegaGenesisRecomp Gets Game #2: Sonic the Hedgehog 2 (1379.tech)", href: "https://1379.tech/segagenesisrecomp-gets-game-2-sonic-the-hedgehog-2/" }
verified: "2026-08-18"
updated: "2026-08-10"
added: "2026-05-29"
cover: "./boxart.png"
---

Sonic 3 & Knuckles is really three games in one repository on [SegaGenesisRecomp](/hardware/sega-genesis): Sonic 3 alone, Sonic & Knuckles alone, and the combined 4 MB cartridge, each as its own build. The lock-on trick that let the original cartridges physically stack lives on here as a memory-mapping problem the recomp has to solve.

## Playable status

Playable alpha, with the three builds at different depths. Sonic 3 alone is the furthest along: a playable bring-up that reaches Angel Island with working saves. Sonic & Knuckles alone is in bring-up, and the combined Sonic 3 & Knuckles build is early bring-up.

Windows builds are available for all three variants. An experimental Linux AppImage of the combined build and a macOS build are also available. Each variant is built from a ROM dump you provide, one per mode.

## What the recomp adds

The pre-boot launcher, and the framework's opt-in 16:9 widescreen for the standalone Sonic 3 and Sonic & Knuckles builds. The combined build's widescreen is still in bring-up, and battery-backed save data works in the Sonic 3 build.

The shared engine's opt-in CRT color modes and verified FM audio shadow are available here too, and for development builds an experimental statically recompiled Z80 sound driver can replace the embedded interpreter.


## Sources

- [SegaGenesisRecomp Gets Game #2: Sonic the Hedgehog 2 (1379.tech)](https://1379.tech/segagenesisrecomp-gets-game-2-sonic-the-hedgehog-2/)
- [Project README and release notes (GitHub)](https://github.com/mstan/Sonic3AndKnucklesRecomp)
