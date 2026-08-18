---
title: "Sega Genesis"
kicker: "68000"
tags: ["Widescreen", "Netplay", "Split-screen"]
featured: false
desc: "SegaGenesisRecomp, a 68000-to-C static recompiler with the Sonic family released, netplay, and experimental Z80 sound recompilation."
year: "2026"
status: "Alpha"
provenance: "core"
arch: "Motorola 68000"
repo: "https://github.com/mstan/segagenesisrecomp"
group: "Active development"
links:
  - { label: "segagenesisrecomp on GitHub", href: "https://github.com/mstan/segagenesisrecomp" }
  - { label: "segagenesisrecomp + Sonic the Hedgehog tech demo (1379.tech)", href: "https://1379.tech/segagenesisrecomp-sonic-the-hedgehog-tech-demo/" }
  - { label: "SegaGenesisRecomp Gets Game #2: Sonic the Hedgehog 2 (1379.tech)", href: "https://1379.tech/segagenesisrecomp-gets-game-2-sonic-the-hedgehog-2/" }
---

SegaGenesisRecomp statically recompiles Genesis games from Motorola 68000 machine code into C, with an experimental static recompiler for the Z80 sound processor alongside it. Generated C is deliberately not tracked in git, and the project carries no emulator-core dependency. The project's own status table lists the frontend and runtime as "Active" and the Z80 recompiler as "Experimental".

## What works today

Three game repos are released: Sonic the Hedgehog, Sonic the Hedgehog 2, and Sonic 3 & Knuckles. Per-game configuration directories exist for seven titles across the Sonic family plus Puyo Puyo and Rocket Knight Adventures bring-up. When static dispatch misses, execution falls back to a clean-room Tier-3 interpreter.

## Enhancements

Opt-in 16:9 widescreen injection, netplay integration in the runner with a netplay submodule, 2-player split-screen for the Sonic family, and a "verified-enhancement shadow" audio/video layer that is off by default.

## Software

- [Sonic the Hedgehog](/software/sonic-the-hedgehog)
- [Sonic the Hedgehog 2](/software/sonic-the-hedgehog-2)
- [Sonic 3 & Knuckles](/software/sonic-3-and-knuckles)

## Reading

- [segagenesisrecomp + Sonic the Hedgehog tech demo (1379.tech)](https://1379.tech/segagenesisrecomp-sonic-the-hedgehog-tech-demo/)
- [SegaGenesisRecomp Gets Game #2: Sonic the Hedgehog 2 (1379.tech)](https://1379.tech/segagenesisrecomp-gets-game-2-sonic-the-hedgehog-2/)

SegaGenesisRecomp distributes no ROMs and no game-derived generated code; every game builds from your own legally dumped cartridge.
