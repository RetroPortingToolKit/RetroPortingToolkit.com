---
title: "Original Xbox"
kicker: "x86"
tags: ["LLE", "Hardware probe"]
featured: false
desc: "Research with no public release: the Xbox work is low-level emulation validated against a real console, and only a hardware probe tool is visible."
year: "2026"
status: "Research"
availability: "No public release"
provenance: "core"
arch: "Intel Pentium III (x86)"
repo: "https://github.com/mstan/xboxlle-probe"
group: "Research"
links:
  - { label: "View probe source (GitHub)", href: "https://github.com/mstan/xboxlle-probe" }
  - { label: "Building & Enhancing Recomps: Ecosystem Updates (1379.tech)", href: "https://1379.tech/building-enhancing-recomps-ecosystem-updates/" }
verified: "2026-08-18"
---

Research only, and not a recompilation ecosystem. The main Xbox project is not yet public, and nothing on this page runs games. The only visible piece is xboxlle-probe, a tool for probing a real console.

## What can be used today

Only the probe agent is public. It exists to validate behavior against a real softmodded console rather than against emulators alone; the team's 2026-08-03 ecosystem update on 1379.tech discusses the work and notes probing real hardware over network and USB. No boot or performance claims are made here because none are verified in public.

## Supported games

- Community: [Mega Man X for Original Xbox](/games/mega-man-x-xbox), a Team-Resurgent port of the SNES recomp build to real Xbox hardware, unrelated to this research.

## Requirements

The probe targets a console and software the user already owns. Nothing here distributes BIOS images or game data.

## Known limitations

The main project has no public repository or releases. Only the hardware probe is visible, and it is a research tool, not something to run games with.

## Technical details

The original Xbox breaks the toolkit's pattern: its CPU is already x86, so the approach is low-level emulation (LLE) rather than static recompilation to a different architecture. The visible artifact is xboxlle-probe, described as a "DANGEROUS low-level hardware probe agent for a real original Xbox, built with nxdk".

## Get started

- [View probe source (GitHub)](https://github.com/mstan/xboxlle-probe)

## Sources and coverage

- [Building & Enhancing Recomps: Ecosystem Updates (1379.tech)](https://1379.tech/building-enhancing-recomps-ecosystem-updates/)
