---
title: "BattleTanx: Global Assault PC Port"
desc: "Native Windows and Linux port of BattleTanx: Global Assault using N64Recomp, N64ModernRuntime, RT64, and SDL2. Requires a legally owned original game image; no copyrighted game data is included."
kicker: "Community submission"
tags: ["Community"]
provenance: "community"
repo: "https://github.com/TheGh0stShip/BattleTanx-Global-Assault-PC-Port"
status: "Community submission"
links: [{"label":"Project on GitHub","href":"https://github.com/TheGh0stShip/BattleTanx-Global-Assault-PC-Port"}]
added: "2026-10-15"
updated: "2026-10-15"
submissionId: "90ea2c36edc71635"
draft: false
creator: {"github":"TheGh0stShip"}
cover: "./submission-1.png"
---

Native Windows and Linux port of BattleTanx: Global Assault using N64Recomp, N64ModernRuntime, RT64, and SDL2. Requires a legally owned original game image; no copyrighted game data is included.

## Project

This repository is the definitive native PC port of BattleTanx: Global Assault, built from the completed matching Nintendo 64 decompilation. The Windows runtime boots the original game, renders through RT64/Direct3D 12, plays audio through SDL2, supports keyboard and SDL game controllers, and has been played through the original menus into campaign gameplay. Linux uses RT64's Vulkan backend.

The port uses N64Recomp for the recovered CPU program, RSPRecomp for audio microcode, N64ModernRuntime for N64 operating-system services, and RT64 for display-list rendering. It is a native host executable—not an emulator bundle. The completed byte-matching decompilation remains in this repository as the auditable source and compatibility foundation. Matching-decompilation work is developed upstream in TheGh0stShip/BattleTanx-Global-Assault; this repository owns the PC runtime, compatibility patches, packaging, and PC release validation.

No ROM or ROM-derived assets are included. Supply your own legally obtained dump.

- Native Windows x64 executable with Direct3D 12 rendering.
- Native Linux build path with Vulkan rendering.
- Original menus and campaign gameplay are playable.
- Keyboard and SDL game-controller input, rumble, and SDL audio are connected.
- Original 4:3, match-window, 16:9, 16:10, 21:9, and 32:9 renderer projection modes are selectable; game-specific HUD and split-screen validation remains in progress.
- Default-off gameplay mods provide extended fog-free visibility and independent turret aiming with dual sticks or mouse and keyboard.
