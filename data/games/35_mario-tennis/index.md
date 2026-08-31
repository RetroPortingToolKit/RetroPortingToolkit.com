---
title: "Mario's Tennis"
kicker: "Virtual Boy"
tags: []
featured: false
desc: "The Virtual Boy on a flat screen: a full match against the CPU plays at correct speed, no headset required."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "virtual-boy"
repo: "https://github.com/mstan/MarioTennisVirtualBoyRecomp"
group: "Virtual Boy"
links:
  - { label: "VirtualBoy Recomp Gets Its First Title: Mario Tennis (1379.tech)", href: "https://1379.tech/virtualboy-recomp-gets-its-first-title-mario-tennis/" }
verified: "2026-08-18"
updated: "2026-07-23"
added: "2026-05-20"
cover: "./title-screen-3x.png"
---

Mario's Tennis is the first and so far only commercial title on [vbrecomp](/hardware/virtual-boy), the core team's Virtual Boy recompiler. The console that demanded a red-and-black headset now plays on an ordinary monitor, at the correct speed, in a resizable window.

## Playable status

Yes. The project's README now calls it playable: a full match against the CPU completes without crashes, with audio, video, input, and correct play speed all wired.

![A full match against the CPU, red on black, on a flat screen](/data/blog/23_virtualboy-mario-tennis/mpc-hc64_8tFh9FA05Z.png)

A Windows build is on the Releases page, alongside experimental Linux and macOS builds, and the README documents building from source. The game is built from your own cart dump: the runtime checksum-verifies the ROM at launch and refuses any other file.

## What the recomp adds

A flat-screen presentation of a stereoscopic console: a single-eye view by default, or a --stereo flag that stacks both eye views. The window opens at 2x scale, resizes freely with letterboxing, and the framework supports fullscreen.

Keyboard and Xbox controller mappings cover both of the Virtual Boy's D-pads, and a turbo key skips the console's 50.27 Hz pacing. The author has said he is curious about someday visually enriching Virtual Boy titles beyond the original red and black, but that work has not landed.


## Sources

- [VirtualBoy Recomp Gets Its First Title: Mario Tennis (1379.tech)](https://1379.tech/virtualboy-recomp-gets-its-first-title-mario-tennis/)
- [Project README and release notes (GitHub)](https://github.com/mstan/MarioTennisVirtualBoyRecomp)
