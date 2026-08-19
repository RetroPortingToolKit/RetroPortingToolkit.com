---
title: "Sonic the Hedgehog 2"
kicker: "Sega Genesis"
tags: ["Widescreen"]
featured: false
desc: "Sonic 2 is the title that made the Genesis framework general, and the first with native two player split-screen versus."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "sega-genesis"
repo: "https://github.com/mstan/SonicTheHedgehog2Recomp"
group: "Sega Genesis"
links:
  - { label: "SegaGenesisRecomp Gets Game #2: Sonic the Hedgehog 2 (1379.tech)", href: "https://1379.tech/segagenesisrecomp-gets-game-2-sonic-the-hedgehog-2/" }
verified: "2026-08-18"
cover: "/data/blog/19_journey-with-ai-and-recompilation/SonicTheHedgehog2Recomp_5jt992tJom.png"
---

Sonic the Hedgehog 2 is the second game recompiled by [SegaGenesisRecomp](/hardware/sega-genesis), announced in the 2026-05-21 write-up. It earned its place by forcing the framework to grow up: hardcoded Sonic 1 assumptions became shared, configurable Genesis behavior, and the game brought the first native two player versus mode with it.

## Can I play it?

Playable alpha. You can boot the game and navigate stages; less traveled code paths, boss fights especially, are likely to still have issues. The newest release is v0.4.0 (2026-06-17), which added the pre-boot launcher. Windows builds are on the Releases page, alongside an experimental Linux AppImage and a macOS build from earlier tags. The game is built from a ROM dump you provide.

## What the recomp adds

The opt-in 16:9 widescreen setting shared with the other Genesis titles: real extra columns, byte-identical 4:3 when off. Two player versus works natively, and because the clean-room renderer draws the full 448-line interlaced frame progressively, you can pick between a tv mode that squashes it exactly the way original hardware looked on a TV, and a raw mode that shows all 448 lines at full height, sharper than a real Genesis could display. Netplay is in development on the shared engine's delay-sync runtime and lobby flow, with scripts that launch two local peers, the host as Sonic and the guest as Tails. The opt-in CRT color modes and verified FM audio shadow apply here too.

One known behavioral difference: the half-pipe special stages run about twice as fast as on original hardware. The stage was heavy enough to lag the original 68000, so its loop effectively ran at 30 Hz; the recomp never overruns the frame budget and runs the same code at a full 60 Hz. The project tracks frame-lag emulation as a future enhancement.

## Technical details

The game runs as statically recompiled 68000 code on the shared clean-room runtime, with the interpreter tier as fallback for static-dispatch misses. The current regeneration pass finds roughly 4,000 functions across hundreds of jump tables. Split-screen exercises VDP interlace mode 2: double vertical resolution, 8x16-pixel cells, and double-resolution sprite coordinates, every line rendered rather than approximated. The AGPL clownmdemu core is a development-only conformance oracle and is never part of the shipped binary.

## Sources

- [SegaGenesisRecomp Gets Game #2: Sonic the Hedgehog 2 (1379.tech)](https://1379.tech/segagenesisrecomp-gets-game-2-sonic-the-hedgehog-2/)
- [Project README and release notes (GitHub)](https://github.com/mstan/SonicTheHedgehog2Recomp)
