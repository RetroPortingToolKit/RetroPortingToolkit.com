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
updated: "2026-08-10"
added: "2026-03-25"
cover: "/data/blog/19_journey-with-ai-and-recompilation/SonicTheHedgehogRecomp_cJeXxJybYL.png"
---

Sonic the Hedgehog was the first game brought up on [SegaGenesisRecomp](/hardware/sega-genesis), the core team's Sega Genesis recompilation project. It is the title that proved the approach: Green Hill Zone is playable start to finish, all three acts and the Robotnik boss, as native PC code built from the original game's logic.

![Green Hill Zone, running as a native build.](/previews/sonic-the-hedgehog.mp4)

## Playable status

Playable alpha. Green Hill Zone is fully completable. Later zones run but still have missing objects while function discovery continues.

Windows builds are on the releases page, alongside an experimental Linux AppImage and an early macOS build. The pre-boot launcher verifies your ROM, sets up keyboard and gamepad controls, and exposes the settings before the game boots. Either way, the game is built from a ROM dump you provide.

## What the recomp adds

An opt-in 16:9 widescreen setting. The renderer draws extra columns on each side and the recompiled game code widens its own object, tile, and ring logic to match, so the wider view is real rather than stretched. With it off, output stays byte for byte identical to the 4:3 original.

The launcher also offers an intro skip, window scaling, and volume control. Beyond that: save states in nine slots, a hold-to-turbo key, and plug-and-play gamepad support. Two further opt-in extras come from the shared engine: CRT-style color modes, and a cleaner FM audio path that substitutes only while it continuously proves it still matches the original sound.


## Sources

- [segagenesisrecomp + Sonic the Hedgehog tech demo (1379.tech)](https://1379.tech/segagenesisrecomp-sonic-the-hedgehog-tech-demo/)
- [Project README and release notes (GitHub)](https://github.com/mstan/SonicTheHedgehogRecomp)
