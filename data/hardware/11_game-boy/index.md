---
title: "Game Boy"
kicker: "LR35902"
tags: ["Link cable", "Save states", "Super Game Boy"]
featured: false
desc: "Pokémon Red and Blue plays from the title screen through to the Elite Four, and the runtime adds link cable play over the network, Super Game Boy borders, and a webcam standing in for the Game Boy Camera."
year: "2026"
status: "Playable alpha"
maturity: "Alpha"
availability: "Public build"
provenance: "core"
arch: "Sharp LR35902 (SM83)"
repo: "https://github.com/mstan/gbrecompiled"
group: "Early platform work"
links:
  - { label: "Recomp + AI: 5 Months Later (1379.tech)", href: "https://1379.tech/recomp-ai-5-months-later/" }
verified: "2026-08-20"
cover: "./dino.png"
---

[Pokémon Red and Blue](/games/pokemon-red-blue) plays from its title screen through to the Elite Four, built from a cartridge dump you provide. gbrecompiled translates a Game Boy game's SM83 machine code into portable C and compiles it as a native program, with the console's graphics, sound, and cartridge mappers handled by a runtime library. This is the platform the core team did not start from scratch: the toolkit's stated reason for skipping the Game Boy early on was that a recompiler already existed for it, so the work here is a development fork of arcanite24's gb-recompiled rather than a new ecosystem. The README sends anyone who wants a stable build to that upstream.

## What runs today

Three game projects use the fork. [Pokémon Red and Blue](/games/pokemon-red-blue) calls itself an early working prototype in its own README: playable with either ROM from the title screen to the Elite Four, with some animations chugging, brief audio stutter in animation-heavy scenes, and no link cable support in that build. [Pokémon Yellow](/games/pokemon-yellow) goes past what the cartridge shipped with, back-porting the full National Dex, numbers 1 to 251, out of the pokecrystal decompilation source. [Tetris](/games/tetris) has its own recompiler configuration in the framework repo. Windows builds are published for both Pokémon projects.

Across a 1,609 ROM test sweep the recompiler translated 1,592 of them, 98.94%. The project is explicit that this counts translation and not playability: whether a game actually runs depends on how much of its code the analysis found and on how accurate the runtime is.

## What the recomp adds

Most of the list below arrived with the GB-Recomp fork by christopher-roelofs, which this fork merged in as its base. The README's credits section splits out who wrote what.

- Link cable play between two recompiled games over TCP, speaking the BGB protocol. A trade between two Gen 1 Pokémon cartridges has been verified. Instances find each other on a LAN by themselves, and a companion rendezvous server introduces players across the internet before the game traffic goes peer to peer.
- Super Game Boy support: palettes, the cartridge's own border, and mask effects, enabled from the cartridge header and toggleable mid-game. You can drop your own 256x224 PNG borders next to the binary and cycle through them.
- A host webcam standing in for the Game Boy Camera, through native capture APIs on Linux, macOS, and Windows. It is off unless you build it in, so cartridges that do not need it never link it.
- A virtual Game Boy Printer that writes what it receives out as PNG files, joining multi-page jobs into one image.
- A shader pipeline on a GLES 2.0 backend, with sharp, scanline, and CRT-style presets. The choice sticks per game, as do palette, hardware mode, and border.
- Save states with a multi-slot interface, input remapping with controller support, and a launcher that skips its own picker when only one game is registered.
- A scripted Mystery Gift stand-in for Gold, Silver, and Crystal: pick an item or a decoration from a menu, and the next infrared exchange in-game delivers it. The cartridge's own flow runs unmodified afterwards, so the item turns up at the Goldenrod counter.

## Technical details

The recompiler finds reachable code statically, starting at 0x100, the interrupt vectors, and any entry points named in a per-game TOML file. It follows bank switches across cross-bank calls, resolves computed jumps through jump tables, and emits one C file per ROM bank. Anything the analysis misses falls back to an interpreter at runtime and is logged with its bank and address, so the next build can name it in the TOML and turn it into compiled code. Generated code links against libgbrt, which supplies memory-mapped I/O, a scanline renderer, four-channel audio, timers, interrupts, DMA, CRC32 ROM validation, and battery-backed saves. A TCP debug server listens locally for register state, watchpoints, sprite memory, and frame stepping. It builds on macOS, Linux, and Windows through CMake and Ninja.

This fork's own changes are mostly accuracy and speed in the runtime: memory write protection during rendering, per-scanline scroll latching, correct window trigger timing, mode 3 timing that varies with sprite count and fine scroll, tile-batched background drawing, and an audio fade instead of a pop when the sound buffer runs dry.

## Sources

- [Recomp + AI: 5 Months Later (1379.tech)](https://1379.tech/recomp-ai-5-months-later/)
- [NES, SNES, Genesis, VirtualBoy, and PSX: A journey with AI and Recompilation (1379.tech)](https://1379.tech/nes-snes-genesis-virtualboy-and-psx-a-journey-with-ai-and-recompilation/)
- [gbrecompiled on GitHub](https://github.com/mstan/gbrecompiled)
- [arcanite24/gb-recompiled, the upstream project](https://github.com/arcanite24/gb-recompiled)
