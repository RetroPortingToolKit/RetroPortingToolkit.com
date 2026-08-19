---
title: "Xenogears"
kicker: "PlayStation"
tags: []
featured: false
desc: "One of PlayStation's biggest RPGs rebuilt as a native PC app by an independent developer, and it gets faster the more you play."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "community"
platform: "playstation"
repo: "https://github.com/OpokXeno/xenogears-recomp"
group: "Community"
verified: "2026-08-18"
---

XenogearsRecomp is an independent community project by OpokXeno that rebuilds Xenogears (USA, Disc 1) as a native PC application. It uses [PSXRecomp](/hardware/playstation) as its recompilation framework rather than reimplementing that layer, one of the clearest signs of the toolkit being picked up outside the core team. Its most unusual trait: the game literally speeds itself up as you play, compiling more of itself to native code in the background.

## Can I play it?

Yes, in alpha. Prebuilt releases for Windows, macOS, and Linux are published on GitHub; the latest is v0.5.0 (2026-08-17). You point the launcher at a disc dump you provide (Xenogears USA Disc 1, .cue plus .bin). No BIOS file is needed to play: the open-source OpenBIOS is bundled and runs by default, with your own retail SCPH1001 dump as an optional alternative.

Honest caveats from the project itself: the game boots, plays through the title screen, intro FMV, and opening gameplay with rendering, audio, input, and memory-card saves all working, but no complete playthrough has been validated. Everything past the opening should be treated as unverified, and only the USA Disc 1 release is supported.

## What the recomp adds

The launcher exposes renderer choice, supersampling, widescreen, screen-look options, and controller settings, with full input rebinding in-app; keyboard and gamepad both work out of the box. The project flags most enhancements as untested or unpolished for now.

The performance story is the standout. Xenogears streams chunks of code (overlays for the field, battles, and the world map) off the disc as you play. On a first playthrough these run in an interpreter while being captured; afterwards they compile to native code in the background and are cached, so the game runs faster on every subsequent session with no work on your part.

## Technical details

PSXRecomp translates the game's MIPS R3000A machine code to C, which compiles to a native x64 binary alongside a PS1 hardware simulation runtime (GPU, SPU, CD-ROM, DMA, timers, GTE, memory cards). Both BIOS backends, OpenBIOS and retail SCPH1001, are recompiled into the executable, so the boot path runs as native code with no interpreter on the hot path. Statically recompiled functions run natively; disc-streamed overlays go through the capture-then-compile pipeline described above. The project is openly developed with AI assistance, holds AI output to the same build-and-verify bar as human work, and is licensed under PolyForm Noncommercial 1.0.0.

## Sources

- [XenogearsRecomp README and releases (GitHub)](https://github.com/OpokXeno/xenogears-recomp)
