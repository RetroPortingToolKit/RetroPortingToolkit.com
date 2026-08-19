---
title: "Game Boy Advance"
kicker: "ARM7"
tags: ["Adaptive widescreen", "Android", "Mods", "Save states"]
featured: true
desc: "Fifteen Game Boy Advance titles running as experimental previews, with a wider view that shows more of the world and a phone build whose gyroscope stands in for the tilt cartridge."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
arch: "ARM7TDMI"
repo: "https://github.com/mstan/gbarecomp"
group: "Active platform ecosystems"
links:
  - { label: "Expanding the *recomp ecosystem with GBARecomp (1379.tech)", href: "https://1379.tech/expanding-the-recomp-ecosystem-with-gbarecomp/" }
  - { label: "Building & Enhancing Recomps: Ecosystem Updates (1379.tech)", href: "https://1379.tech/building-enhancing-recomps-ecosystem-updates/" }
verified: "2026-08-18"
cover: "./minish-cap-adaptive.webp"
---

Fifteen Game Boy Advance titles run as native apps across thirteen public game repos, counting the paired Pokémon versions. The projects are, in the README's words, "experimental previews and byproducts of developing the framework". GBARecomp was the toolkit's first 32-bit target, and it rebuilds each cartridge's original code for modern systems, including phones.

## What runs today

The public repos cover [The Minish Cap](/games/minish-cap), [Mega Man Zero](/games/mega-man-zero), [WarioWare Twisted!](/games/warioware-twisted), [Mario Kart Super Circuit](/games/mario-kart-super-circuit), three Dragon Ball Z games including [Buu's Fury](/games/dbz-buus-fury), [Super Mario Advance 2](/games/super-mario-advance-2), [Super Mario Advance 4](/games/super-mario-advance-4), [Pokémon Ruby/Sapphire](/games/pokemon-ruby-sapphire), [Pokémon FireRed/LeafGreen](/games/pokemon-firered-leafgreen), [Pokémon Emerald](/games/pokemon-emerald), and even the Shrek GBA Video Movie Pak, which plays the complete film through its original 64 MiB cartridge mapper. The community has added [Boktai](/games/boktai), whose solar sensor reads real local weather. WarioWare Twisted! also ships an experimental Android arm64 APK with touch setup, on-screen controls, and phone gyro input.

These are previews, not finished ports: each game builds from a cartridge dump you provide, and every repo documents its own validated revision and limitations.

## What the recomp adds

- Adaptive widescreen that genuinely widens the logical view rather than stretching it. The GBA is unusually well suited to this: games often keep far more of the world in memory than the small screen could show. The faithful 240x160 view stays the default.
- A 60 FPS track-rendering mod for Mario Kart Super Circuit, enabling behavior found in the game's code but never switched on by its original developers.
- Cartridge hardware mapped to modern devices: WarioWare Twisted!'s gyro works from a DualSense controller's motion sensor or a phone's, the Boktai solar sensor is modeled at the pin level, and real-time-clock cartridges seed from your computer's clock.
- Five screen color profiles that reproduce how the games looked on real GBA panels, from unlit original hardware to the backlit SP.
- Versioned .gbamod mod packages, save states, and optional host-clock behavior for the Pokémon games. The cartridge image is never rewritten.

## Technical details

GBARecomp translates ARM7TDMI machine code, ARM and Thumb interworking included, into C++ compiled against a shared hardware runtime. The first binary it booted was the GBA BIOS itself, setting a correctness foundation before any game. Code that cannot be resolved statically falls back to an interpreter, and an embedded background compiler turns that interpreted code into cached native shards on disk, so coverage self-heals the more a game is played; players can feed the resulting coverage manifests back to the project. Save hardware (SRAM, EEPROM, Flash), GPIO devices, DMA, timers, and audio are modeled at their original interfaces, and Android is supported through the SDL application boundary.

## Sources

- [Expanding the *recomp ecosystem with GBARecomp (1379.tech)](https://1379.tech/expanding-the-recomp-ecosystem-with-gbarecomp/)
- [Building & Enhancing Recomps: Ecosystem Updates (1379.tech)](https://1379.tech/building-enhancing-recomps-ecosystem-updates/)
