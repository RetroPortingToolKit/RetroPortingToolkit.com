---
title: "Sega Genesis"
kicker: "68000"
tags: ["Widescreen", "Netplay", "Split-screen"]
featured: false
desc: "Sonic the Hedgehog 1, 2, and 3 & Knuckles running as native apps built from the user's own cartridges, with netplay, split-screen, and opt-in widescreen."
year: "2026"
status: "Playable alpha"
availability: "Source only"
provenance: "core"
arch: "Motorola 68000"
repo: "https://github.com/mstan/segagenesisrecomp"
group: "Active platform ecosystems"
links:
  - { label: "View source (GitHub)", href: "https://github.com/mstan/segagenesisrecomp" }
  - { label: "segagenesisrecomp + Sonic the Hedgehog tech demo (1379.tech)", href: "https://1379.tech/segagenesisrecomp-sonic-the-hedgehog-tech-demo/" }
  - { label: "SegaGenesisRecomp Gets Game #2: Sonic the Hedgehog 2 (1379.tech)", href: "https://1379.tech/segagenesisrecomp-gets-game-2-sonic-the-hedgehog-2/" }
verified: "2026-08-18"
---

Three Sonic games run as native apps, each with a released source repo: Sonic the Hedgehog, Sonic the Hedgehog 2, and Sonic 3 & Knuckles. SegaGenesisRecomp uses static recompilation to turn Genesis games into native apps built from the user's own cartridge dumps.

## What can be used today

Three game repos are released: Sonic the Hedgehog, Sonic the Hedgehog 2, and Sonic 3 & Knuckles. Per-game configuration directories exist for seven titles across the Sonic family plus Puyo Puyo and Rocket Knight Adventures bring-up.

## Supported games

- [Sonic the Hedgehog](/games/sonic-the-hedgehog)
- [Sonic the Hedgehog 2](/games/sonic-the-hedgehog-2)
- [Sonic 3 & Knuckles](/games/sonic-3-and-knuckles)

## Enhancements

Opt-in 16:9 widescreen injection, netplay integration in the runner with a netplay submodule, 2-player split-screen for the Sonic family, and a "verified-enhancement shadow" audio/video layer that is off by default.

## Requirements

SegaGenesisRecomp distributes no ROMs and no game-derived generated code; every game builds from the user's own cartridge dump.

## Known limitations

Puyo Puyo and Rocket Knight Adventures are bring-up work, not released games. The Z80 sound-chip recompiler is experimental.

## Technical details

SegaGenesisRecomp turns Genesis games from Motorola 68000 machine code into C, and brings an experimental static recompiler for the Z80 sound processor along for the ride. Generated C is deliberately kept out of git, and games do not run inside a general-purpose console emulator. When static dispatch misses, execution falls back to a clean-room Tier-3 interpreter. The project's own status table lists the frontend and runtime as "Active" and the Z80 recompiler as "Experimental".

## Get started

- [View source (GitHub)](https://github.com/mstan/segagenesisrecomp)

## Sources and coverage

- [segagenesisrecomp + Sonic the Hedgehog tech demo (1379.tech)](https://1379.tech/segagenesisrecomp-sonic-the-hedgehog-tech-demo/)
- [SegaGenesisRecomp Gets Game #2: Sonic the Hedgehog 2 (1379.tech)](https://1379.tech/segagenesisrecomp-gets-game-2-sonic-the-hedgehog-2/)
