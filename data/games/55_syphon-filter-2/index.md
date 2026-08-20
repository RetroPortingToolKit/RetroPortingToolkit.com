---
title: "Syphon Filter 2"
kicker: "PlayStation"
tags: ["Mouse look", "Widescreen"]
featured: false
desc: "Both discs of the campaign played end to end, with optional mouse aim, 16:9, and PGXP geometry, every one of them off by default."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "community"
platform: "playstation"
repo: "https://github.com/Alexbeav/syphon-filter-2-recompiled"
group: "PlayStation"
verified: "2026-08-20"
updated: "2026-08-13"
added: "2026-08-06"
cover: "./sf2-banner.jpg"
---

Syphon Filter 2 Recompiled is a community project by Alexbeav that rebuilds the complete two-disc PlayStation release as a native Windows program on [PSXRecomp](/hardware/playstation). Its claim is coverage rather than polish: the project says both discs, the connected campaign, and the transition between them have been played and verified.

## Can I play it?

Yes, on Windows, and the build happens on your machine. The download for v0.1.2-alpha, published 2026-08-07, is what the project calls an owned-input setup kit: it carries the compiler, the runtime tools, and the project's verified recipe, but no executable containing game code.

Put your own SCUS-94451 Disc 1 cue and bin beside the extracted kit, with Disc 2 alongside if you have it, and run SETUP.bat. It finds the disc and an installed MinGW toolchain, builds locally from a dump you provide, and opens the launcher. Later sessions use the play.bat it generates.

The bootstrap deliberately avoids WinGet, Git, pip, and Visual Studio. The WinLibs and Python runtimes it needs, along with pinned framework and launcher sources, are downloaded into the kit, verified by SHA-256 before extraction, and bounded by explicit timeouts. An MIT-licensed OpenBIOS is bundled. The project is direct about the label: this is an alpha, not a finished PC port.

## What the recomp adds

Three mods, all off by default. Native 16:9 widens the world, with authored handling for the scenes meant to stay 4:3. PGXP steadies geometry and falls back cleanly when the data behind it is incomplete. Mouse Look gives direct camera and manual aim control while leaving scripted cameras in charge of their own shots. Each was accepted on Mission 1, and broader campaign coverage is exactly what the project asks testers for.

Input runs through the retail pad path: two bindings per control, keyboard and Mouse1 through Mouse5, and Xbox-style controllers, with changes applying the next time you press Launch. Presentation adds 4x supersampling over OpenGL. Saves are local memory cards.

What it does not add is a higher frame rate, and the explanation is unusually candid. High-refresh experiments were built and then removed: they produced smooth host-side counters but still visibly ran at a third of the rate, with serious rendering artifacts. The project's reading is that a pure recompilation only ever sees flattened GPU packets, after the retail code has already folded camera, object, bone, and projection state together, leaving nothing coherent to interpolate between. Real 60 FPS would need at least partial decompilation, or an equivalent interface onto that state.

## Technical details

The resident executable is statically recompiled to native x64. Streamed overlays that the ahead-of-time pass does not cover stay with a compatibility interpreter, and automatic overlay compilation is switched off in this alpha on purpose, because warmed native shards have their own qualification path that is not part of the release. The game's 20 Hz world update is preserved rather than reworked.

Setup does the rest locally: it pins a framework commit, extracts the boot executable and verifies it by SHA-256, regenerates the BIOS and game backends, and builds with MinGW and Ninja. The framework it builds against is the project's own fork of PSXRecomp. CI only ever builds and tests the redistributable kit, never receives retail input, and cannot produce a game executable.

Development was AI-assisted and human-directed, with acceptance resting on machine-checkable executable identity, deterministic routes, bounded runtime telemetry, repeated clean-process comparisons, and human visual testing. Generated code is never hand-edited: fixes go into source-owned recompiler and runtime code, or into verified configuration. The framework source is PolyForm Noncommercial 1.0.0.

## Sources

- [Project README and releases (GitHub)](https://github.com/Alexbeav/syphon-filter-2-recompiled)
