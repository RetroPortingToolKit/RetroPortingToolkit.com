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
group: "PlayStation"
verified: "2026-08-18"
updated: "2026-08-19"
added: "2026-07-22"
cover: "./boxart.png"
---

XenogearsRecomp is an independent community project by OpokXeno that rebuilds Xenogears (USA, Disc 1) as a native PC application. It uses [PSXRecomp](/hardware/playstation) as its recompilation framework rather than reimplementing that layer, one of the clearest signs of the toolkit being picked up outside the core team. Its most unusual trait: the game literally speeds itself up as you play, compiling more of itself to native code in the background.

## Playable status

Yes, in alpha. Prebuilt releases for Windows, macOS, and Linux are published on GitHub. You point the launcher at a disc dump you provide (Xenogears USA Disc 1, .cue plus .bin). No BIOS file is needed to play: the open-source OpenBIOS is bundled and runs by default, with your own retail SCPH1001 dump as an optional alternative.

Honest caveats from the project itself: the game boots, plays through the title screen, intro FMV, and opening gameplay with rendering, audio, input, and memory-card saves all working, but no complete playthrough has been validated. Everything past the opening should be treated as unverified, and only the USA Disc 1 release is supported.

## What the recomp adds

The launcher exposes renderer choice, widescreen, screen-look options, and controller settings, with full input rebinding in-app; keyboard and gamepad both work out of the box. The project flags most enhancements as untested or unpolished for now.

The performance story is the standout. Xenogears streams chunks of code (overlays for the field, battles, and the world map) off the disc as you play. On a first playthrough these run in an interpreter while being captured; afterwards they compile to native code in the background and are cached, so the game runs faster on every subsequent session with no work on your part.


## Sources

- [XenogearsRecomp README and releases (GitHub)](https://github.com/OpokXeno/xenogears-recomp)
