---
title: "Game Boy Advance"
kicker: "ARM7"
tags: ["Adaptive widescreen", "Android", "Mods", "Save states"]
featured: true
desc: "The toolkit's first 32-bit target: ARM7TDMI to C++, about ten game repos, adaptive widescreen that genuinely widens, and an Android APK."
year: "2026"
status: "Experimental previews"
provenance: "core"
arch: "ARM7TDMI"
repo: "https://github.com/mstan/gbarecomp"
group: "Active development"
links:
  - { label: "gbarecomp on GitHub", href: "https://github.com/mstan/gbarecomp" }
  - { label: "Expanding the *recomp ecosystem with GBARecomp (1379.tech)", href: "https://1379.tech/expanding-the-recomp-ecosystem-with-gbarecomp/" }
  - { label: "Building & Enhancing Recomps: Ecosystem Updates (1379.tech)", href: "https://1379.tech/building-enhancing-recomps-ecosystem-updates/" }
---

GBARecomp recompiles Game Boy Advance games from ARM7TDMI machine code, ARM and Thumb interworking included, into C++. It was the toolkit's first 32-bit target, and the GBA BIOS was the first binary it booted. The README is upfront about the game projects: "These projects are experimental previews and byproducts of developing the framework".

## What works today

About ten game repos exist, including The Minish Cap, Mega Man Zero, Super Mario Advance 2 and 4, Mario Kart Super Circuit, WarioWare Twisted!, three Dragon Ball Z titles, Pokemon Ruby/Sapphire/Emerald host-clock work, and Shrek GBA Video. An interpreter and self-healing tier handles unresolved code and is compiled into a persistent native cache. Networking is not supported yet.

## Enhancements

Opt-in adaptive widescreen that gives a genuinely wider logical view, not a stretch. A .gbamod mod format, color profiles, save states, RTC support, and substitution for gyro, solar, and rumble cartridge hardware. An Android arm64 APK exists.

## Games

- [The Minish Cap](/games/minish-cap)
- [Mega Man Zero](/games/mega-man-zero)
- [WarioWare Twisted!](/games/warioware-twisted)
- [Mario Kart Super Circuit](/games/mario-kart-super-circuit)
- [Dragon Ball Z: Buu's Fury](/games/dbz-buus-fury)
- [Pokemon Ruby/Sapphire](/games/pokemon-ruby-sapphire)
- [Pokemon FireRed/LeafGreen](/games/pokemon-firered-leafgreen)
- [Pokemon Emerald](/games/pokemon-emerald)
- [Super Mario Advance 2](/games/super-mario-advance-2)
- [Super Mario Advance 4](/games/super-mario-advance-4)
- Community: [Boktai](/games/boktai)

## Reading

- [Expanding the *recomp ecosystem with GBARecomp (1379.tech)](https://1379.tech/expanding-the-recomp-ecosystem-with-gbarecomp/)
- [Building & Enhancing Recomps: Ecosystem Updates (1379.tech)](https://1379.tech/building-enhancing-recomps-ecosystem-updates/)

GBARecomp does not include the BIOS, ROMs, generated ROM-derived source, saves, or extracted game data. Everything builds from your own legally dumped BIOS and cartridges.
