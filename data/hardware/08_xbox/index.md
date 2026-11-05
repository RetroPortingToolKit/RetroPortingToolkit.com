---
title: "Original Xbox"
kicker: "x86"
tags: ["Adaptive widescreen", "Host-native HLE", "Internal resolution", "Mods"]
featured: false
desc: "An early beta ecosystem for native original Xbox ports. Blinx and Jet Set Radio Future are public betas, and the Dashboard runs as its own native app."
year: "2026"
status: "Alpha"
maturity: "Alpha"
availability: "Public build"
provenance: "core"
arch: "Intel Pentium III (x86) + NV2A"
repo: "https://github.com/mstan/xboxllr"
group: "Early platform work"
links:
  - { label: "Read: Introducing XboxLLR", href: "/blog/introducing-xboxllr" }
  - { label: "Read: Slowing down to speed up", href: "/blog/slowing-down-to-speed-up" }
verified: "2026-11-04"
updated: "2026-11-04"
cover: "./cover.webp"
---

XboxLLR, the Xbox Low Level Recompiler, turns original Xbox games into native apps.

This is early beta work. It runs two public games and the original Dashboard, but it does not run arbitrary Xbox games.

You provide your own game files: the extracted `default.xbe` plus the complete asset folder that matches the supported revision. No firmware, executables, game media, keys or saves are included.

## What runs today

- [Blinx: The Time Sweeper](/games/blinxrecomp-7f8296d8). Public beta for Windows and Linux. Tested through World 2. End-to-end completion is not guaranteed.
- [Jet Set Radio Future](/games/jet-set-radio-future). Public beta for Windows and Linux. Not tested end to end.
- The original Xbox Dashboard 5960. A limited native preview. Home, Memory, Music and Settings open, Xbox Live stays offline, and it cannot launch other games.

Each game's own page and repository carry its exact state.

## How it is built

XboxLLR translates the game's x86 code to C ahead of time. There is no fallback interpreter. Code the build did not find stops with a diagnostic instead of guessing.

Console behavior is built in two layers. A faithful low-level path sets the contract. Faster host-native code then replaces groups of those low-level parts while keeping the same inputs and outputs. The [platform page](/docs/platforms/xbox) explains how, and [What are HLE and LLE?](/docs/concepts/hle-and-lle) explains why.

## What Xbox ports can add

- Adaptive widescreen that fits the window, from 4:3 up to 32:9, with the HUD anchored to the edges.
- Higher internal resolution, supersampling, FXAA and anisotropic filtering.
- Optional blended 60 or 120 Hz presentation. The game still runs at its original speed.
- Game-specific mods, such as removing Blinx's ten-minute stage limit or importing your own graffiti into Jet Set Radio Future.
