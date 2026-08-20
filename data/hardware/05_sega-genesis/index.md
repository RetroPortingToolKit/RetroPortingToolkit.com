---
title: "Sega Genesis"
kicker: "68000"
tags: ["Widescreen", "Netplay", "Split-screen"]
featured: false
desc: "Sonic the Hedgehog 1, 2, and 3 & Knuckles rebuilt as native apps from your own cartridge, with opt-in widescreen that shows more of the stage."
year: "2026"
status: "Playable alpha"
maturity: "Beta"
availability: "Source only"
provenance: "core"
arch: "Motorola 68000"
repo: "https://github.com/mstan/segagenesisrecomp"
group: "Active platform ecosystems"
links:
  - { label: "segagenesisrecomp + Sonic the Hedgehog tech demo (1379.tech)", href: "https://1379.tech/segagenesisrecomp-sonic-the-hedgehog-tech-demo/" }
  - { label: "SegaGenesisRecomp Gets Game #2: Sonic the Hedgehog 2 (1379.tech)", href: "https://1379.tech/segagenesisrecomp-gets-game-2-sonic-the-hedgehog-2/" }
verified: "2026-08-18"
cover: "/consoles/sega-genesis.jpg"
---

Three Sonic games run as native apps, each with its own released source repo: [Sonic the Hedgehog](/games/sonic-the-hedgehog), [Sonic the Hedgehog 2](/games/sonic-the-hedgehog-2), and [Sonic 3 & Knuckles](/games/sonic-3-and-knuckles). SegaGenesisRecomp translates a Genesis game's original program into C and runs it against a clean-room runtime, built from a cartridge dump you provide.

## What runs today

The three Sonic repos are released, and per-game configuration directories in the framework cover further bring-up work across the Sonic family and beyond. Playable does not mean exhaustively validated: the project's own Sonic 2 announcement notes that less traveled code paths can still hit issues, and its status table lists the frontend and runtime as "Active" with the Z80 sound recompiler as "Experimental".

## What the recomp adds

- Opt-in 16:9 widescreen that draws extra columns of real stage on both sides. It is gameplay-gated, so menus, title cards, and 2-player split-screen stay at the authentic 4:3, and with the toggle off the output is byte-identical to the faithful path.
- Netplay integration in the runner, built on a shared netplay submodule.
- An opt-in "verified-enhancement shadow" layer for audio and video: cleaner FM sound and CRT-style color profiles that are continuously checked against the authentic output and revert loudly the moment they stop matching. Everything is off by default.

## Technical details

SegaGenesisRecomp turns Motorola 68000 machine code into C through a shared 68K recompiler core, and brings an experimental static recompiler for the Z80 sound processor along for the ride. When static dispatch misses, execution falls back to a clean-room Tier-3 interpreter, and per-instruction cycle costs come from the project's own clean-room MC68000 timing model rather than an emulator dependency. Generated C is deliberately kept out of git. The runner builds natively on Windows, macOS, and Linux. The optional widescreen builds are produced from the Sonic Retro community disassemblies as build-time sources only; the 4:3 path reassembles byte-identically to the canonical ROMs, and the original ROM is never patched.

## Sources

- [segagenesisrecomp + Sonic the Hedgehog tech demo (1379.tech)](https://1379.tech/segagenesisrecomp-sonic-the-hedgehog-tech-demo/)
- [SegaGenesisRecomp Gets Game #2: Sonic the Hedgehog 2 (1379.tech)](https://1379.tech/segagenesisrecomp-gets-game-2-sonic-the-hedgehog-2/)
