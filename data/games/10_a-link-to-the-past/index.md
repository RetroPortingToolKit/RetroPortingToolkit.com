---
title: "The Legend of Zelda: A Link to the Past"
kicker: "Super Nintendo"
tags: ["Adaptive widescreen", "MSU-1"]
featured: false
desc: "An early SNESRecomp build with adaptive widescreen and MSU-1 music support."
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

A Link to the Past is an early [SNESRecomp](/hardware/super-nintendo) core project. Its standout feature is adaptive widescreen: make the window wider and you see more of Hyrule.

## Playable status

The early game, yes. Boot, the attract demo, file select, the overworld, and early dungeon combat are hand-verified. Later content is not fully verified yet.

Windows and Linux builds are on the GitHub releases page. It is built from a dump you provide: on first launch the game asks for your A Link to the Past (USA) ROM and verifies it by checksum.

## What the recomp adds

Adaptive widescreen follows your window or fullscreen shape, so resizing wider reveals more of the overworld or dungeon instead of stretching the image.

![The standard presentation: the same rain-soaked overworld at 256 pixels across.](./alttp-standard.png)

The other headline is MSU-1 audio: CD-quality streaming music from a pack you supply. Without a pack, the game plays its normal soundtrack, and sound effects stay on the original sound engine.


## Sources

- [ZeldaAlttPSNESRecomp README (GitHub)](https://github.com/mstan/ZeldaAlttPSNESRecomp)
