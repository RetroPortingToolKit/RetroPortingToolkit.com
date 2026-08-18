---
title: "NES"
kicker: "6502"
tags: ["Voxel 3D", "Text override", "Save states", "Mouse Zapper"]
featured: true
desc: "Ten commercial titles rebuilt as native C from raw 6502 machine code, across four mappers, with no BIOS required at all."
year: "2026"
status: "Active"
provenance: "core"
arch: "6502"
repo: "https://github.com/mstan/nesrecomp"
group: "Established"
links:
  - { label: "nesrecomp on GitHub", href: "https://github.com/mstan/nesrecomp" }
  - { label: "NESRecomp: From Faxanadu to 4 Supported Commercial Titles (1379.tech)", href: "https://1379.tech/nesrecomp-from-faxanadu-to-4-supported-commercial-titles/" }
  - { label: "nesrecomp Achieves 10 Commercial Titles (1379.tech)", href: "https://1379.tech/nesrecomp-achieves-10-commercial-titles/" }
---

NESRecomp reads a cartridge's 6502 machine code and rebuilds it as a native C program. The README says it plainly: "This is NOT an emulator". With ten commercial game repos and no BIOS requirement at all, it is second only to PlayStation by title count.

## What works today

Ten commercial titles have game repos: Super Mario Bros., Duck Hunt, Dr. Mario, The Legend of Zelda, Metroid, Faxanadu, Yoshi, Yoshi's Cookie, Mega Man 3, and Gumshoe. Mapper support covers mappers 0, 1, 4, and 66, which the README puts at roughly 78% of the licensed NES library. Code that cannot yet be resolved statically runs in durable "interpreter islands". Windows x64 is the primary, mature platform; macOS support is experimental and newly added.

## Enhancements

A JSON-driven Text Override System with hot reload, showcased in Faxanadu. An opt-in Voxel 3D renderer. Save-state slots on Shift+F1 through F12. Mouse-as-Zapper substitution for light-gun titles.

## Games

- [Super Mario Bros.](/games/super-mario-bros)
- [The Legend of Zelda](/games/legend-of-zelda)
- [Metroid](/games/metroid)
- [Mega Man 3](/games/mega-man-3)
- [Dr. Mario](/games/dr-mario)
- [Faxanadu](/games/faxanadu)
- [Duck Hunt](/games/duck-hunt)
- [Yoshi](/games/yoshi)
- [Yoshi's Cookie](/games/yoshis-cookie)
- [Gumshoe](/games/gumshoe)

## Reading

- [NESRecomp: From Faxanadu to 4 Supported Commercial Titles (1379.tech)](https://1379.tech/nesrecomp-from-faxanadu-to-4-supported-commercial-titles/)
- [nesrecomp Achieves 10 Commercial Titles (1379.tech)](https://1379.tech/nesrecomp-achieves-10-commercial-titles/)

NESRecomp does not include game ROMs. Every title builds from your own legally dumped cartridge.
