---
title: "Shadow Tower"
desc: "An experimental Shadow Tower recompilation for Linux and Windows x64. Mouse look, WASD, upscaled rendering, and sharper texture filtering."
kicker: "Community submission"
tags: ["Community"]
provenance: "community"
repo: "https://github.com/JFryy/reshadowtower"
status: "Community submission"
links: [{"label":"Project on GitHub","href":"https://github.com/JFryy/reshadowtower"}]
added: "2026-09-19"
updated: "2026-09-19"
submissionId: "e088138b7a320e6a"
draft: false
creator: {"github":"JFryy"}
cover: "./submission-1.png"
---

An experimental Shadow Tower recompilation for Linux and Windows x64. Mouse look, WASD, upscaled rendering, and sharper texture filtering.

## Project

An experimental Shadow Tower recompilation for Linux and Windows x64. Mouse look, WASD, upscaled rendering, and sharper texture filtering.

Requires your own Shadow Tower \(USA\), SLUS-00863 BIN/CUE dump. No retail BIOS needed. OpenBIOS is included in the build.

- Linux x64: prior builds were gameplay-tested on Arch Linux. The current debug-disabled player build has been rebuilt and headless-startup-tested with isolated saves and no open sockets; manual gameplay revalidation is pending.
- Windows x64: cross-compiled on Linux and smoke-tested under Wine. Earlier tests verified gameplay rendering, injected turning input, and save-state save/load. The current debug-disabled build passed OpenGL startup and clean exit under Wine, with no debug listener. Native MSYS2 builds and gameplay on real Windows still need verification.
- Source builds only: no verified portable release packages. Build from your own disc; do not redistribute generated game code or local game assets.
- A full playthrough has not been verified. Geometry seam correction was checked in selected scenes, not throughout the game. Back up normal memory-card saves.
- No widescreen mode or frame-rate unlock. Gameplay retains roughly 20 updates per second; higher rendering resolution does not change this.
