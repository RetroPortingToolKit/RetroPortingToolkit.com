---
title: "NES"
kicker: "6502"
tags: ["Voxel 3D", "Text override", "Save states", "Mouse Zapper"]
featured: true
desc: "NESRecomp, a 6502-to-C static recompiler ecosystem with 10 commercial titles across four mappers."
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

NESRecomp statically recompiles NES games from 6502 machine code into C and builds them as native programs. The README is direct about what it is: "This is NOT an emulator". By title count it is the second most established ecosystem in the toolkit after PlayStation, with ten commercial game repos and no BIOS requirement at all.

## What works today

Ten commercial titles have game repos: Super Mario Bros., Duck Hunt, Dr. Mario, The Legend of Zelda, Metroid, Faxanadu, Yoshi, Yoshi's Cookie, Mega Man 3, and Gumshoe. Mapper support covers mappers 0, 1, 4, and 66, which the README puts at roughly 78% of the licensed NES library. Code that cannot yet be resolved statically runs in durable "interpreter islands". Windows x64 is the primary, mature platform; macOS support is experimental and newly added.

## Enhancements

A JSON-driven Text Override System with hot reload, showcased in Faxanadu. An opt-in Voxel 3D renderer. Save-state slots on Shift+F1 through F12. Mouse-as-Zapper substitution for light-gun titles.

## Software

- [Super Mario Bros.](/software/super-mario-bros)
- [The Legend of Zelda](/software/legend-of-zelda)
- [Metroid](/software/metroid)
- [Mega Man 3](/software/mega-man-3)
- [Dr. Mario](/software/dr-mario)
- [Faxanadu](/software/faxanadu)
- [Duck Hunt](/software/duck-hunt)
- [Yoshi](/software/yoshi)
- [Yoshi's Cookie](/software/yoshis-cookie)
- [Gumshoe](/software/gumshoe)

## Reading

- [NESRecomp: From Faxanadu to 4 Supported Commercial Titles (1379.tech)](https://1379.tech/nesrecomp-from-faxanadu-to-4-supported-commercial-titles/)
- [nesrecomp Achieves 10 Commercial Titles (1379.tech)](https://1379.tech/nesrecomp-achieves-10-commercial-titles/)

NESRecomp does not include game ROMs. Every title builds from your own legally dumped cartridge.
