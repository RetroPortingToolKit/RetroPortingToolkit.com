---
title: "Game Boy Advance"
kicker: "ARM7"
tags: ["Adaptive widescreen", "Android", "Mods", "Save states"]
featured: true
desc: "About ten Game Boy Advance titles running as experimental previews, with adaptive widescreen that genuinely widens the view and an Android build."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
arch: "ARM7TDMI"
repo: "https://github.com/mstan/gbarecomp"
group: "Active platform ecosystems"
links:
  - { label: "View source (GitHub)", href: "https://github.com/mstan/gbarecomp" }
  - { label: "Expanding the *recomp ecosystem with GBARecomp (1379.tech)", href: "https://1379.tech/expanding-the-recomp-ecosystem-with-gbarecomp/" }
  - { label: "Building & Enhancing Recomps: Ecosystem Updates (1379.tech)", href: "https://1379.tech/building-enhancing-recomps-ecosystem-updates/" }
verified: "2026-08-18"
---

About ten Game Boy Advance titles run as native apps, which the README describes as "experimental previews and byproducts of developing the framework". GBARecomp uses static recompilation to turn GBA games into code compiled for modern systems, and it was the toolkit's first 32-bit target.

## What can be used today

About ten game repos exist, including The Minish Cap, Mega Man Zero, Super Mario Advance 2 and 4, Mario Kart Super Circuit, WarioWare Twisted!, three Dragon Ball Z titles, Pokémon Ruby/Sapphire/Emerald host-clock work, and Shrek GBA Video. An Android arm64 APK exists.

## Supported games

- [The Minish Cap](/games/minish-cap)
- [Mega Man Zero](/games/mega-man-zero)
- [WarioWare Twisted!](/games/warioware-twisted)
- [Mario Kart Super Circuit](/games/mario-kart-super-circuit)
- [Dragon Ball Z: Buu's Fury](/games/dbz-buus-fury)
- [Pokémon Ruby/Sapphire](/games/pokemon-ruby-sapphire)
- [Pokémon FireRed/LeafGreen](/games/pokemon-firered-leafgreen)
- [Pokémon Emerald](/games/pokemon-emerald)
- [Super Mario Advance 2](/games/super-mario-advance-2)
- [Super Mario Advance 4](/games/super-mario-advance-4)
- Community: [Boktai](/games/boktai)

## Enhancements

Opt-in adaptive widescreen that gives a genuinely wider logical view, not a stretch. A .gbamod mod format, color profiles, save states, RTC support, and substitution for gyro, solar, and rumble cartridge hardware.

## Requirements

GBARecomp does not include the BIOS, ROMs, generated ROM-derived source, saves, or extracted game data. Everything builds from the user's own legally dumped BIOS and cartridges.

## Known limitations

The game projects are experimental previews rather than finished releases. Networking is not supported yet.

## Technical details

GBARecomp recompiles Game Boy Advance games from ARM7TDMI machine code, ARM and Thumb interworking included, into C++. The GBA BIOS was the first binary it booted. An interpreter and self-healing tier handles unresolved code and is compiled into a persistent native cache.

## Get started

- [View source (GitHub)](https://github.com/mstan/gbarecomp)

## Sources and coverage

- [Expanding the *recomp ecosystem with GBARecomp (1379.tech)](https://1379.tech/expanding-the-recomp-ecosystem-with-gbarecomp/)
- [Building & Enhancing Recomps: Ecosystem Updates (1379.tech)](https://1379.tech/building-enhancing-recomps-ecosystem-updates/)
