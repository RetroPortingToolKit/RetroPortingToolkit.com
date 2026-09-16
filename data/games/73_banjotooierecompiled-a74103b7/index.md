---
title: "Banjo Tooie Recompiled"
desc: "Static recompilation of Banjo-Tooie (USA) to native Windows, built on N64Recomp + N64ModernRuntime + RT64. Runs the full game with widescreen, high-refresh interpolation, and native audio/input."
kicker: "Community submission"
tags: ["Community"]
provenance: "community"
repo: "https://github.com/Vidanox/BanjoTooieRecompiled"
status: "Community submission"
links: [{"label":"Project on GitHub","href":"https://github.com/Vidanox/BanjoTooieRecompiled"}]
added: "2026-09-16"
updated: "2026-09-16"
submissionId: "a74103b7df3ac077"
draft: false
---

Static recompilation of Banjo-Tooie \(USA\) to native Windows, built on N64Recomp + N64ModernRuntime + RT64. Runs the full game with widescreen, high-refresh interpolation, and native audio/input.

## Project

A native PC port of Banjo-Tooie \(USA\) produced by statically recompiling the original N64 ROM with N64Recomp, and rendering through RT64.

The recompiler translates the game's MIPS code into C once, ahead of time; there is no emulator at runtime. The result is a normal Windows executable that plays the original game logic, with the enhancements a native port makes possible: widescreen, high refresh rates, and an in-game settings menu.

Playable end to end. Verified working: boot, attract loop, the intro cutscene, gameplay, repeated scene transitions, audio, controller input, overlay load/unload, and save/load. Multi-minute soaks run without crashes, stalls, or missing-function lookups.

The skybox does not reach the sides of a 16:9 frame at Aspect Ratio: Expand. Tooie's sky dome was authored for a 4:3 frustum, so at 16:9 the outermost columns can show through to the sky draw's own black fill. The only way to make the dome cover is to draw it at a different horizontal scale than the world, which makes the sky scroll against the world whenever the camera turns — a worse artefact. The default is therefore the aligned behaviour, and Aspect Ratio: Original avoids the issue entirely. This is a content limitation of the original game, not a port defect.

- Scene correctness has not been diffed against the original hardware.
- The alternate CPU-skinned character forms are not covered by the high-refresh interpolation metadata \(the ordinary Banjo/Kazooie form is\).

Made by [Vidanox](https://github.com/Vidanox). [Source repository](https://github.com/Vidanox/BanjoTooieRecompiled) on GitHub.
