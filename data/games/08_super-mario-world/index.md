---
title: "Super Mario World"
kicker: "Super Nintendo"
tags: ["Adaptive widescreen", "MSU-1", "Mods"]
featured: true
desc: "The flagship SNES recompilation: believed playable end to end, with adaptive widescreen, CD-quality music, and a two-player co-op build with netplay."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "super-nintendo"
repo: "https://github.com/mstan/SuperMarioWorldRecomp"
group: "Super Nintendo"
links:
  - { label: "Watch: character replacement in Super Mario World", href: "/blog/video-smw-character-test" }
  - { label: "snesrecomp's First Title: Super Mario World (1379.tech)", href: "https://1379.tech/snesrecomps-first-title-super-mario-world/" }
  - { label: "The Future of Game Preservation is Decomp-Annotated-Recomps (1379.tech)", href: "https://1379.tech/recomp-vs-decomp-wrong-question/" }
cover: "https://i.ytimg.com/vi/Owuku0zj4As/hq2.jpg"
videoUrl: "https://www.youtube.com/watch?v=Owuku0zj4As"
verified: "2026-08-18"
gallery:
  - { src: "./smw-wide.png", caption: "Widescreen gameplay" }
  - { src: "/covers/smw-character.jpg", caption: "Character replacement test" }
  - { src: "/covers/smw-extensible.jpg", caption: "An extensible engine" }
---

Super Mario World was the first game [SNESRecomp](/hardware/super-nintendo) ever recompiled, and it is still the flagship of the core project. The whole game runs as a native program on your PC, and a separate co-op build puts Mario and Luigi in the same level at the same time, on one machine or over the internet.

## Can I play it?

Yes, as an in-development preview. The project calls it believed fully playable: the first two worlds are hand-verified end to end, verification of Vanilla Dome is in progress, and the later worlds are expected to play the same. The current release is v0.11.0 (2026-08-12), packaged for Windows with a Linux AppImage alongside. It is built from a dump you provide: on first launch the game asks for your Super Mario World (USA) ROM.

## What the recomp adds

- Three view modes: Standard 4:3, Fixed 16:9, and Adaptive. Adaptive follows your window, so resizing wider reveals more of the level instead of stretching it.
- Simultaneous co-op: a separate build where both players are active in levels at once. It applies the 2 Player Simultaneous Co-op Hack by Noobish Noobsicle, Bloony Fox, and NesDraug to your own ROM on first launch. Widescreen and MSU-1 are disabled in this build for now.
- Netplay: the co-op build supports two-player online or LAN play. The host plays Mario, the guest plays Luigi, and the launcher handles lobbies.
- MSU-1 audio: CD-quality streaming music with a music pack you supply; without one you get the authentic soundtrack.
- A mod catalog: v0.11.0 added an experimental Smash Bros 64 catalog with Captain Falcon as the first playable character option. It is off by default and needs your own Super Smash Bros. 64 ROM for the donor content.
- Save states, turbo, and auto-detected controllers with a position-true default mapping.

## Technical details

The 65816 CPU code is statically translated to C, so every function the game runs on the SNES's main CPU is a generated C function. The rest of the console, the PPU, the SPC700 audio coprocessor, DMA, and register I/O, runs through a LakeSnes-derived hardware core: recompile the CPU, emulate the silicon. The port is built on the SMWDisX disassembly, and 1,937 of the game's 2,074 functions carry their actual names in the recompiled source, which makes this the leading example of a disassembly-annotated recompilation. Widescreen caps at a 446-pixel logical width because wider views cannot represent every sprite safely in the SNES's 9-bit sprite coordinate space.

## Sources

- [SuperMarioWorldRecomp README (GitHub)](https://github.com/mstan/SuperMarioWorldRecomp)
- [SMW character replacement test (Gamemaster1379)](/blog/video-smw-character-test)
- [snesrecomp's First Title: Super Mario World (1379.tech)](https://1379.tech/snesrecomps-first-title-super-mario-world/)
- [The Future of Game Preservation is Decomp-Annotated-Recomps (1379.tech)](https://1379.tech/recomp-vs-decomp-wrong-question/)
