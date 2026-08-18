---
title: "Original Xbox"
kicker: "x86"
tags: ["LLE", "Hardware probe"]
featured: false
desc: "Xbox low-level emulation research validated against a real console; the main artifact is not yet public."
year: "2026"
status: "Research (not yet public)"
provenance: "core"
arch: "Intel Pentium III (x86)"
repo: "https://github.com/mstan/xboxlle-probe"
group: "Research"
links:
  - { label: "xboxlle-probe on GitHub", href: "https://github.com/mstan/xboxlle-probe" }
  - { label: "Building & Enhancing Recomps: Ecosystem Updates (1379.tech)", href: "https://1379.tech/building-enhancing-recomps-ecosystem-updates/" }
---

The original Xbox work differs from every other ecosystem here: because the console's CPU is x86, the approach is low-level emulation (LLE) rather than recompilation to a different architecture. The main artifact of that work is not yet public. The one public repo is xboxlle-probe, described as a "DANGEROUS low-level hardware probe agent for a real original Xbox, built with nxdk".

## What works today

The probe agent exists to validate behavior against a real softmodded console rather than against emulators alone. The team's 2026-08-03 ecosystem update on 1379.tech discusses the LLE work and notes probing real hardware over network and USB. No boot or performance claims are made here because none are verified in public.

## Enhancements

None. There is no public runtime to enhance.

## Known limitations

The LLE project itself has no public repository or releases. Only the hardware probe is visible, and it is a research tool, not something to run games with.

## Software

- Community: [Mega Man X for Original Xbox](/software/mega-man-x-xbox), a Team-Resurgent port of the SNES recomp build to real Xbox hardware, unrelated to the LLE research.

## Reading

- [Building & Enhancing Recomps: Ecosystem Updates (1379.tech)](https://1379.tech/building-enhancing-recomps-ecosystem-updates/)

Nothing here distributes BIOS images or game data; the probe targets a console and software the user already owns.
