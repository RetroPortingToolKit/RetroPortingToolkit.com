---
title: "Nintendo DS"
kicker: "ARM9+ARM7"
tags: ["Dual CPU", "Adaptive 21:9"]
featured: false
desc: "Very early research on recompiling both DS CPUs; one public game consumer, Metroid Prime Hunters, is in public alpha."
year: "2026"
status: "Research"
availability: "Source only"
provenance: "core"
arch: "ARM946E-S + ARM7TDMI"
repo: "https://github.com/mstan/ndsrecomp"
group: "Early platform work"
links:
  - { label: "View source (GitHub)", href: "https://github.com/mstan/ndsrecomp" }
  - { label: "Building & Enhancing Recomps: Ecosystem Updates (1379.tech)", href: "https://1379.tech/building-enhancing-recomps-ecosystem-updates/" }
  - { label: "GenerationAmiga on Metroid Prime Hunters", href: "https://www.generationamiga.com/2026/08/16/metroid-prime-hunters-recomp-brings-the-nintendo-ds-classic-to-pc/" }
verified: "2026-08-18"
---

Research only. ndsrecomp is a source-only developer snapshot that recompiles both of the DS's CPUs; in the project's own words it is "very early pre-alpha (v0.0.1)" and "an experimental developer snapshot, not a ready-to-use emulator or a stable framework". One public game consumer exists: [Metroid Prime Hunters](/games/metroid-prime-hunters), in public alpha.

## What can be used today

The firmware-menu boot works. The one public game consumer is [Metroid Prime Hunters](/games/metroid-prime-hunters), which is in public alpha.

## Supported games

- [Metroid Prime Hunters](/games/metroid-prime-hunters)

## Enhancements

Adaptive 21:9 widescreen exists in the Metroid Prime Hunters consumer. The framework itself is too early for a general enhancement layer.

## Requirements

BIOS and firmware are user-supplied and hash-verified, with an opt-in FreeBIOS path. ndsrecomp distributes no BIOS, firmware, or game data.

## Known limitations

This is research, not a product: it is a developer snapshot with no compatibility promise, and it is not usable as a general DS emulator or framework.

## Technical details

ndsrecomp recompiles both of the DS's CPUs, the ARM946E-S and the ARM7TDMI, to C. A bounded interpreter tier handles code the guest copies into RAM. melonDS is used as a validation oracle.

## Get started

- [View source (GitHub)](https://github.com/mstan/ndsrecomp)

## Sources and coverage

- [Building & Enhancing Recomps: Ecosystem Updates (1379.tech)](https://1379.tech/building-enhancing-recomps-ecosystem-updates/)
- [GenerationAmiga on Metroid Prime Hunters](https://www.generationamiga.com/2026/08/16/metroid-prime-hunters-recomp-brings-the-nintendo-ds-classic-to-pc/)
