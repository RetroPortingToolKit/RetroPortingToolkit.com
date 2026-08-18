---
title: "Pokemon Ruby & Sapphire"
kicker: "Game Boy Advance"
tags: ["RTC"]
featured: false
desc: "Gen 3 arrives with its clock still ticking: the cartridge real-time clock is modeled right in the GBARecomp runtime."
year: "2026"
status: "Alpha"
provenance: "core"
platform: "game-boy-advance"
repo: "https://github.com/mstan/RubySapphireRecomp"
group: "Game Boy Advance"
links:
  - { label: "RubySapphireRecomp on GitHub", href: "https://github.com/mstan/RubySapphireRecomp" }
---

Pokemon Ruby and Sapphire carry Gen 3 into the [GBARecomp](/hardware/game-boy-advance) lineup, currently at v0.0.3 (2026-07-17), the release that added a pre-boot launcher.

## What works today

The games run through the recompiled runtime, launched via the pre-boot launcher added in the current release.

## Enhancements

The cartridge's real-time clock is modeled by the GBARecomp runtime rather than left unimplemented.

## Known limitations

The README warns of flash save and RTC quirks in this early release.

No game data is distributed; the project builds from your own legally dumped ROM and GBA BIOS.
