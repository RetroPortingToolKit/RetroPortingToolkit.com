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
cover: "./title-screen-3x.png"
---

Mario's Tennis is the first and so far only commercial title on [vbrecomp](/hardware/virtual-boy), the core team's Virtual Boy recompiler. The console that demanded a red-and-black headset now plays on an ordinary monitor, at the correct speed, in a resizable window.

## Can I play it?

Yes. The project's README now calls it playable: a full match against the CPU completes without crashes, with audio, video, and input all wired. The v0.2.0 accuracy release (2026-06-29) brought the game up to correct play speed.

![A full match against the CPU, red on black, on a flat screen](/data/blog/23_virtualboy-mario-tennis/mpc-hc64_8tFh9FA05Z.png)

A Windows build is on the Releases page, alongside an experimental Linux AppImage and a macOS build from the first release, and the README documents building from source. The game is built from your own cart dump: the runtime checksum-verifies the ROM at launch and refuses any other file.

## What the recomp adds

A flat-screen presentation of a stereoscopic console: a single-eye view by default, or a --stereo flag that stacks both eye views. The window opens at 2x scale, resizes freely with letterboxing, and the framework supports fullscreen.

Keyboard and Xbox controller mappings cover both of the Virtual Boy's D-pads, and a turbo key skips the console's 50.27 Hz pacing. The author has said he is curious about someday visually enriching Virtual Boy titles beyond the original red and black, but that work has not landed.

## Technical details

The cart's V810 machine code is decoded once at codegen time and translated to C, one native function per cart function; at runtime there is no fetch, decode, execute loop. The runtime supplies the VIP renderer, VSU audio synthesis, interrupt and timer handling, and a TCP debug server, and the recompiled code yields cooperatively on a step-budget counter, so no platform-specific fiber machinery is needed.

Accuracy is checked against the Beetle VB libretro core as a development-only oracle that never ships in the binary. The title and warning screens are pixel-perfect against it, with 0 of 86,016 pixels differing at zero tolerance.

![The warning screen, one of the frames matched pixel for pixel against the reference core](/data/blog/23_virtualboy-mario-tennis/mpc-hc64_S9ftLySH8F.png)

The recompiler, runtime, and tooling are MIT licensed.

## Sources

- [VirtualBoy Recomp Gets Its First Title: Mario Tennis (1379.tech)](https://1379.tech/virtualboy-recomp-gets-its-first-title-mario-tennis/)
- [Project README and release notes (GitHub)](https://github.com/mstan/MarioTennisVirtualBoyRecomp)
