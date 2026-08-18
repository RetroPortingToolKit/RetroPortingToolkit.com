---
title: "GameCube"
kicker: "PowerPC"
tags: ["LLE-first", "IPL boot"]
featured: false
desc: "gcnlle, experimental LLE-first GameCube IPL static recompiler research that boots the native firmware menu."
year: "2026"
status: "Research"
provenance: "core"
arch: "PowerPC (Gekko)"
repo: "https://github.com/mstan/gcnlle"
group: "Research"
links:
  - { label: "gcnlle on GitHub", href: "https://github.com/mstan/gcnlle" }
  - { label: "Building & Enhancing Recomps: Ecosystem Updates (1379.tech)", href: "https://1379.tech/building-enhancing-recomps-ecosystem-updates/" }
---

gcnlle, formerly gcnrecompiled (the old URL redirects), is an experimental LLE-first static recompiler for the GameCube's PowerPC Gekko CPU, licensed GPL-3.0. It is built on a pinned snapshot of the mstan/DolRecomp fork of ExpansionPak/DolRecomp. In the project's own words, it is "research software, not a general GameCube emulator and not ready for ordinary game use".

## What works today

It boots the native firmware menu from a user-supplied IPL dump. On Wind Waker, the real IPL, DI, and apploader path reaches the title sailing sequence through content-validated native code plus loud interpreter fallback. The README frames that carefully: it is "an engineering acceptance route, not a whole-game or release claim".

## Enhancements

None. This is boot-path research, not a game platform.

## Known limitations

Not usable for ordinary games. The Wind Waker path is an acceptance test of the boot chain, and nothing here is a playable release.

## Software

No game pages exist for this platform yet.

## Reading

- [Building & Enhancing Recomps: Ecosystem Updates (1379.tech)](https://1379.tech/building-enhancing-recomps-ecosystem-updates/)

gcnlle includes no Nintendo firmware, games, keys, or artwork; the user supplies their own IPL and DSP dumps from hardware they own.
