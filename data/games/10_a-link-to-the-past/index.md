---
title: "The Legend of Zelda: A Link to the Past"
kicker: "Super Nintendo"
tags: ["Adaptive widescreen", "MSU-1"]
featured: false
desc: "Hyrule playable through the early dungeon, with adaptive widescreen, CD-quality music packs, and a first Linux build."
year: "2026"
status: "Partial"
availability: "Public build"
provenance: "core"
platform: "super-nintendo"
repo: "https://github.com/mstan/ZeldaAlttPSNESRecomp"
group: "Super Nintendo"
verified: "2026-08-18"
updated: "2026-08-12"
added: "2026-05-19"
cover: "./alttp-adaptive.png"
---

A Link to the Past is one of the three released [SNESRecomp](/hardware/super-nintendo) titles, maintained as a core project. Its standout feature is adaptive widescreen: make the window wider and you simply see more of Hyrule.

## Can I play it?

The early game, yes. The project describes it as playable through the early dungeon: boot, the attract demo, file select, the overworld, and dungeon sword combat are hand-verified, and music and sound effects play throughout. Later content, from Hyrule Castle's interior onward, is not yet verified.

The current release is v0.6.1 (2026-08-06); v0.6.0 moved to SDL3 and shipped the project's first Linux build. It is built from a dump you provide: on first launch the game asks for your A Link to the Past (USA) ROM and verifies it by checksum.

## What the recomp adds

Adaptive widescreen arrived as a mod in v0.6.0. The logical width follows your window or fullscreen aspect ratio, so resizing wider reveals more of the overworld or dungeon instead of stretching the image. At 16:9 the view is about 398 pixels wide, against the original 256.

![The standard presentation: the same rain-soaked overworld at 256 pixels across.](./alttp-standard.png)

The other headline is MSU-1 audio: CD-quality streaming music from a pack you supply, while you still load your stock ROM. Without a pack the game plays its normal soundtrack, and sound effects always stay on the original sound engine.

Save states, turbo, fullscreen, and auto-detected controllers come as standard.

## Technical details

The 65816 CPU code is statically translated to C; the rest of the console, the PPU, the SPC700 audio coprocessor, and DMA, runs through an embedded snes9x emulator core: recompile the CPU, emulate the silicon.

The MSU-1 driver is qwertymodo's ALttP patch, building on Conn's work, bundled under the MIT license. The regeneration step applies it to a throwaway copy of your ROM, so the driver ends up compiled into the binary. Widescreen caps at a 446-pixel logical width, roughly 2:1, because wider views cannot represent every sprite safely in the SNES's 9-bit sprite coordinate space. Screens without valid extended terrain pillarbox rather than showing wrapped tile data.

## Sources

- [ZeldaAlttPSNESRecomp README (GitHub)](https://github.com/mstan/ZeldaAlttPSNESRecomp)
