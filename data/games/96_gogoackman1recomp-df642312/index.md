---
title: "Go Go Ackman Recompiled"
desc: "Features - In-game menu - press Esc - Widescreen support - User can switch between widescreen and 4:3 in real time by pressing \"u\" or by enabling/disabling the option on the menu - Switch between 4:3 and 8:7 aspect ratio (both have widescreen support) - Vibration/rumble support - Shader support when \"output method\" is set to OpenGL (only .glsl and .glslp shaders are supported) - shader files go in the \"shaders\" folder - Turbo function - press Tab - Rewind function - press \"r\" - Support for the"
kicker: "Community submission"
tags: ["Community"]
provenance: "community"
repo: "https://github.com/catmidori/gogoackman1recomp"
status: "Community submission"
platform: "super-nintendo"
links: [{"label":"Project on GitHub","href":"https://github.com/catmidori/gogoackman1recomp"}]
added: "2026-10-15"
updated: "2026-10-15"
submissionId: "df642312441bd47a"
draft: false
creator: {"github":"catmidori","discord":"meltmidori"}
cover: "./submission-1.png"
release: "v1.0"
download: "https://github.com/catmidori/gogoackman1recomp/releases/tag/v1.0"
---

Features - In-game menu - press Esc - Widescreen support - User can switch between widescreen and 4:3 in real time by pressing "u" or by enabling/disabling the option on the menu - Switch between 4:3 and 8:7 aspect ratio \(both have widescreen support\) - Vibration/rumble support - Shader support when "output method" is set to OpenGL \(only .glsl and .glslp shaders are supported\) - shader files go in the "shaders" folder - Turbo function - press Tab - Rewind function - press "r" - Support for the

## Project

A desktop port of the Snes game Go Go Ackman built with [SNESRecomp](/hardware/super-nintendo), SDL3, and Dear ImGui. Available for Windows and Linux, including Flatpak packaging.

The original game ROM is supplied separately by the user. No ROM image is embedded in the executable.

- In-game menu - press Esc
- Widescreen support - User can switch between widescreen and 4:3 in real time by pressing "u" or by enabling/disabling the option on the menu
- Switch between 4:3 and 8:7 aspect ratio \(both have widescreen support\)
- Vibration/rumble support
- Shader support when "output method" is set to OpenGL \(only .glsl and .glslp shaders are supported\) - shader files go in the "shaders" folder
- Turbo function - press Tab

Use Mods → Load .ips file to convert a supported patch into a native package, then transfer it to Active. Activate one translation at a time. These hashes identify the IPS inputs, not the original ROM or generated package.

These hashes match src/ackmantranslation.h and the supplied IPS files. The PT-BR converter applies the embedded English base before the Portuguese overlay in memory, producing one self-contained package. Unknown IPS files use a bounded native fallback; conversion alone does not establish gameplay compatibility. See translation conversion and native conversion.
