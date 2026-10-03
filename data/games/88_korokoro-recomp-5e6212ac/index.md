---
title: "KoroKoro Post nin"
desc: "Native static recompilation of KoroKoro Post nin (PS1) for Windows, with an experimental Android build. Built with psxrecomp; users provide their own game dump"
kicker: "PlayStation · Static Recompilation"
tags:
  - "PlayStation"
  - "Static Recompilation"
  - "Windows"
  - "Android"
  - "Widescreen"
  - "Touch Controls"
  - "Accelerometer"
provenance: "community"
repo: "https://github.com/elprogramadorloco-arch/korokoro-recomp"
status: "Playable v0.1 · Android alpha"
links: [{"label":"Project on GitHub","href":"https://github.com/elprogramadorloco-arch/korokoro-recomp"}]
added: "2026-10-03"
updated: "2026-10-03"
submissionId: "5e6212ac506b52d2"
draft: false
creator: {"github":"elprogramadorloco-arch","discord":"elprogramadorloco_87045"}
platform: "playstation"
cover: "https://s.pacn.ws/1/p/57/pa.93575.1.png?v=ji2gy5&width=1059"
updates:
  - date: "2026-10-03"
    text: "v0.1 released for Windows; Android alpha added with widescreen, accelerometer steering and touch controls"
---

KoroKoroRecomp is a native static recompilation of **KoroKoro Post nin** for the original PlayStation (Japan, SLPS-03479).

It is **not an emulator**. The original game code is translated to C with [psxrecomp](https://github.com/mstan/psxrecomp) and compiled into a native executable.

## Windows

The public **v0.1** release builds a native Windows executable from the user's own game dump.



- Boot, title screen, menus and intro
- Stage 1
- Pause
- Time up
- Game over and continue
- SPU audio and CD music

Stages 2–10, memory card functionality and the ending have not been fully verified yet.

## Android

An **Android alpha** is also available.

It currently includes:

- Full-screen widescreen support
- Accelerometer steering: tilt the phone like a steering wheel to rotate the maze
- Native touch interaction for the title menu and yes/no dialogs
- Tap anywhere on the "PRESS START" screen
- Touch zones for the remaining PS1 controls

Fully native mobile controls for every screen are still in development.

The Android build targets **Android 8.0+ on 64-bit ARM devices**.

## Building

The repository contains **no game data**.

Users provide their own copy of KoroKoro Post nin as CHD or CUE/BIN and run the included build script. The Windows and Android packages automatically download their required toolchains and build a private copy locally.

[Source code and releases](https://github.com/elprogramadorloco-arch/korokoro-recomp)
