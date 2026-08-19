---
title: "Sonic the Hedgehog"
kicker: "Sega Genesis"
tags: ["Widescreen"]
featured: false
desc: "Green Hill Zone was the proving ground: SegaGenesisRecomp's first title runs it start to finish, with a widescreen setting and intro skip."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "sega-genesis"
repo: "https://github.com/mstan/SonicTheHedgehogRecomp"
group: "Sega Genesis"
links:
  - { label: "segagenesisrecomp + Sonic the Hedgehog tech demo (1379.tech)", href: "https://1379.tech/segagenesisrecomp-sonic-the-hedgehog-tech-demo/" }
verified: "2026-08-18"
---

Sonic the Hedgehog was the first game brought up on [SegaGenesisRecomp](/hardware/sega-genesis), the core team's Sega Genesis recompilation project, and it is the title that proved the approach: Green Hill Zone is playable start to finish, all three acts and the Robotnik boss, as native PC code built from the original game's logic.

## Can I play it?

Playable alpha. Green Hill Zone is fully completable; later zones run but still have missing objects while function discovery continues. The newest release is v0.6.0 (2026-06-17), which added a pre-boot launcher that verifies your ROM, sets up keyboard and gamepad controls, and exposes the settings before the game boots. Windows builds are on the Releases page, alongside an experimental Linux AppImage and an early macOS build from prior tags, and the README documents building from source on Windows, macOS, and Linux. Either way, the game is built from a ROM dump you provide.

## What the recomp adds

An opt-in 16:9 widescreen setting: the renderer draws extra columns on each side and the recompiled game code widens its own object, tile, and ring logic to match, so the wider view is real rather than stretched. With it off, output stays byte for byte identical to the 4:3 original. The launcher also offers an intro skip, window scaling, and volume control. Beyond that: save states in nine slots, a hold-to-turbo key, and plug-and-play gamepad support. Two further opt-in extras come from the shared engine: CRT-style color modes, and a cleaner FM audio path that substitutes only while it continuously proves it still matches the original sound.

## Technical details

The recompiler translates more than 530 of the ROM's 68000 subroutines into C, which compiles to native code and runs against a clean-room runtime with its own VDP renderer, bus, Z80 scheduling, and ymfm FM synthesis. The generated code runs on a cooperative fiber that interleaves with scanline rendering, and a clean-room interpreter tier catches static-dispatch misses. Bring-up moved fast: dual execution against a reference interpreter verified about 133 functions in a single day during the original tech demo. The AGPL clownmdemu core is used only by unshipped development builds, as a conformance oracle.

## Sources

- [segagenesisrecomp + Sonic the Hedgehog tech demo (1379.tech)](https://1379.tech/segagenesisrecomp-sonic-the-hedgehog-tech-demo/)
- [Project README and release notes (GitHub)](https://github.com/mstan/SonicTheHedgehogRecomp)
