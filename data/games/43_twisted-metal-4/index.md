---
title: "Twisted Metal 4"
kicker: "PlayStation"
tags: ["Multiplayer"]
featured: false
desc: "Four players, one screen, three platforms: an independent project keeping couch multiplayer alive on Windows, macOS, and Linux."
year: "2026"
status: "Released"
availability: "Public build"
provenance: "community"
platform: "playstation"
repo: "https://github.com/TechnicallyComputers/TwistedMetal4Recomp"
group: "PlayStation"
links:
  - { label: "PS1 Twisted Metal 4 comes to PC/Mac/Linux (retro-gamer.jp)", href: "https://retro-gamer.jp/?p=45562" }
verified: "2026-08-18"
cover: "./boxart.png"
---

TwistedMetal4 Recompiled is an independent community project by TechnicallyComputers that brings 989 Studios' 1999 car-combat game to Windows, macOS, and Linux, with the original 4-player multitap multiplayer intact. It is built on [PSXRecomp](/hardware/playstation) and updated at a fast clip, with releases landing days apart.

## Can I play it?

Yes, with one step in between. Releases are published on GitHub (latest v0.3.28, 2026-08-18), but they are not a finished binary: you download a release, point it at a disc dump you provide, and its built-in Generate and Build flow produces the native game on your machine.

No BIOS dump is needed by default, since the open-source OpenBIOS is used unless you supply your own. The same developer's RetComM Launcher can manage installs, updates, and disc and BIOS wiring across multiple recomp titles if you prefer that over the standalone flow.

## What the recomp keeps and adds

The headline is preservation: up to four players on one screen, matching the original multitap setup, on hardware that never had a multitap port.

Online play is on the roadmap. Per the coverage, the netcode can support both rollback and delay-based synchronization, but it is disabled in current builds pending testing.

## Technical details

The pipeline is the toolkit's standard one: PSXRecomp translates the game's MIPS R3000A machine code to C, which compiles to a native binary. Code the game loads dynamically at runtime is handled by an embedded MIPS interpreter.

The project pins its framework versions through git submodules and is part of the R.A.I.D. (Retro AI Development) community around AI-assisted reverse engineering and recompilation.

## Sources

- [PS1 Twisted Metal 4 comes to PC/Mac/Linux (retro-gamer.jp)](https://retro-gamer.jp/?p=45562)
- [TwistedMetal4Recomp README and releases (GitHub)](https://github.com/TechnicallyComputers/TwistedMetal4Recomp)
