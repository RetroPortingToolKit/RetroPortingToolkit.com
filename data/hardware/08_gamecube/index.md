---
title: "GameCube"
kicker: "PowerPC"
tags: ["Research"]
featured: false
desc: "Research only: gcnlle boots the GameCube system menu from a user-supplied firmware dump. No playable game builds yet."
year: "2026"
status: "Research"
availability: "Source only"
provenance: "core"
arch: "PowerPC (Gekko)"
repo: "https://github.com/mstan/gcnlle"
group: "Research"
links:
  - { label: "View source (GitHub)", href: "https://github.com/mstan/gcnlle" }
  - { label: "Building & Enhancing Recomps: Ecosystem Updates (1379.tech)", href: "https://1379.tech/building-enhancing-recomps-ecosystem-updates/" }
verified: "2026-08-18"
---

Research only. gcnlle can boot the GameCube system menu from a firmware dump supplied by the user. It does not currently provide playable game builds. In the project's own words, it is "research software, not a general GameCube emulator and not ready for ordinary game use".

## What can be used today

The native firmware menu boots from a user-supplied IPL dump. On Wind Waker, the boot path reaches the title sailing sequence; the README frames that as "an engineering acceptance route, not a whole-game or release claim".

## Supported games

None yet. No game pages exist for this platform.

## Requirements

A GameCube IPL dump and DSP dumps from hardware you own. gcnlle includes no Nintendo firmware, games, keys, or artwork.

## Known limitations

Not usable for ordinary games. The Wind Waker path is an acceptance test of the boot chain, not a playable release.

## Technical details

gcnlle, formerly gcnrecompiled (the old URL redirects), is a low-level-emulation-first static recompiler for the GameCube's PowerPC Gekko CPU, licensed GPL-3.0. It is built on a pinned snapshot of the mstan/DolRecomp fork of ExpansionPak/DolRecomp, and it starts where the console does: the firmware itself. The Wind Waker route runs the real IPL, DI, and apploader chain through content-validated recompiled code with a deliberately loud interpreter fallback.

## Get started

- [View source (GitHub)](https://github.com/mstan/gcnlle)

## Sources and coverage

- [Building & Enhancing Recomps: Ecosystem Updates (1379.tech)](https://1379.tech/building-enhancing-recomps-ecosystem-updates/)
