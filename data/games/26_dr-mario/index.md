---
title: "Dr. Mario"
kicker: "NES"
tags: []
featured: false
desc: "Among the first four games NESRecomp ever brought up, on an MMC1 cartridge that exercises CHR bank switching."
year: "2026"
status: "Alpha"
provenance: "core"
platform: "nes"
repo: "https://github.com/mstan/DrMarioNesRecomp"
group: "NES"
links:
  - { label: "DrMarioNesRecomp on GitHub", href: "https://github.com/mstan/DrMarioNesRecomp" }
  - { label: "NESRecomp: From Faxanadu to 4 Supported Commercial Titles (1379.tech)", href: "https://1379.tech/nesrecomp-from-faxanadu-to-4-supported-commercial-titles/" }
---

Dr. Mario is one of the ten commercial titles supported by [NESRecomp](/hardware/nes), maintained by the core team, and it was among the first four the framework brought up. Its MMC1 cartridge exercises CHR ROM bank switching.

## What works today

The game runs as statically recompiled native code through the shared NESRecomp runner, with save-state slots available. Windows x64 is the primary platform; macOS support is experimental.

## Known limitations

A minor audio timing issue was noted in the team's 2026-03-28 write-up.

No game data is distributed; the project builds from your own legally dumped ROM.
