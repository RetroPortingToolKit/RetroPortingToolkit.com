---
title: "Dr. Mario"
kicker: "NES"
tags: []
featured: false
desc: "One of the first four games the NES project ever ran, now a playable native PC puzzle game with remappable controls."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "nes"
repo: "https://github.com/mstan/DrMarioNesRecomp"
group: "NES"
links:
  - { label: "NESRecomp: From Faxanadu to 4 Supported Commercial Titles (1379.tech)", href: "https://1379.tech/nesrecomp-from-faxanadu-to-4-supported-commercial-titles/" }
verified: "2026-08-18"
updated: "2026-08-31"
added: "2026-03-28"
cover: "/data/blog/20_nesrecomp-10-titles/DrMarioRecomp_eoeWPp44eP.png"
---

A core project: Dr. Mario was among the [first four commercial titles](/blog/nesrecomp-4-titles) [NESRecomp](/hardware/nes) ever supported. It is still the quickest proof that the idea works. A puzzle game you download, point at your own dump, and play.

## Playable status

Yes, in single player. Windows and experimental Linux builds are on [GitHub Releases](https://github.com/mstan/DrMarioNesRecomp/releases). It is built from a dump you provide, the USA version, verified by checksum.

![One-player mode at level 00, medium speed, four viruses left in the bottle.](/data/blog/20_nesrecomp-10-titles/DrMarioRecomp_8cliR8zN4q.png)

One-player mode is tested through virus clearing. The options menu works for level, speed, and music selection, and all three music settings play. Ending sequences are untested, and audio may run slightly fast in some configurations.

## What the recomp adds

Controls are fully remappable through a plain settings file generated next to the executable on first run. The shared runner adds save states and a fast-forward toggle.


## Sources

- [DrMarioNesRecomp README and releases (GitHub)](https://github.com/mstan/DrMarioNesRecomp)
- [NESRecomp: From Faxanadu to 4 Supported Commercial Titles (1379.tech)](https://1379.tech/nesrecomp-from-faxanadu-to-4-supported-commercial-titles/)
