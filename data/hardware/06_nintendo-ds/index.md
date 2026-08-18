---
title: "Nintendo DS"
kicker: "ARM9+ARM7"
tags: ["Dual CPU", "Adaptive 21:9"]
featured: false
desc: "ndsrecomp, very early pre-alpha dual-CPU static recompiler research with one public game consumer."
year: "2026"
status: "Pre-alpha"
provenance: "core"
arch: "ARM946E-S + ARM7TDMI"
repo: "https://github.com/mstan/ndsrecomp"
group: "Early and experimental"
links:
  - { label: "ndsrecomp on GitHub", href: "https://github.com/mstan/ndsrecomp" }
  - { label: "Building & Enhancing Recomps: Ecosystem Updates (1379.tech)", href: "https://1379.tech/building-enhancing-recomps-ecosystem-updates/" }
  - { label: "GenerationAmiga on Metroid Prime Hunters", href: "https://www.generationamiga.com/2026/08/16/metroid-prime-hunters-recomp-brings-the-nintendo-ds-classic-to-pc/" }
---

ndsrecomp is static recompiler research for the Nintendo DS, targeting both of its CPUs: the ARM946E-S and the ARM7TDMI, recompiled to C. The project describes itself as "very early pre-alpha (v0.0.1)", "an experimental developer snapshot, not a ready-to-use emulator or a stable framework", a source-only developer snapshot with no compatibility promise.

## What works today

The firmware-menu boot works. A bounded interpreter tier handles code the guest copies into RAM. melonDS is used as a validation oracle. BIOS and firmware are user-supplied and hash-verified, with an opt-in FreeBIOS path. The one public game consumer is [Metroid Prime Hunters](/software/metroid-prime-hunters), which is in public alpha.

## Enhancements

Adaptive 21:9 widescreen exists in the Metroid Prime Hunters consumer. The framework itself is too early for a general enhancement layer.

## Known limitations

This is research, not a product: it is a developer snapshot with no compatibility promise, and it is not usable as a general DS emulator or framework.

## Software

- [Metroid Prime Hunters](/software/metroid-prime-hunters)

## Reading

- [Building & Enhancing Recomps: Ecosystem Updates (1379.tech)](https://1379.tech/building-enhancing-recomps-ecosystem-updates/)
- [GenerationAmiga on Metroid Prime Hunters](https://www.generationamiga.com/2026/08/16/metroid-prime-hunters-recomp-brings-the-nintendo-ds-classic-to-pc/)

ndsrecomp distributes no BIOS, firmware, or game data; everything builds from your own legally dumped copies.
