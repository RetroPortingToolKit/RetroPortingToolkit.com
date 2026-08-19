---
title: "NES"
kicker: "6502"
tags: ["Voxel 3D", "Text override", "Save states", "Mouse Zapper"]
featured: true
desc: "Ten commercial NES games rebuilt as native apps from your own cartridge dump, no BIOS needed, including a Zelda you can orbit in 3D."
year: "2026"
status: "Playable alpha"
availability: "Source only"
provenance: "core"
arch: "6502"
repo: "https://github.com/mstan/nesrecomp"
group: "Active platform ecosystems"
links:
  - { label: "NESRecomp: From Faxanadu to 4 Supported Commercial Titles (1379.tech)", href: "https://1379.tech/nesrecomp-from-faxanadu-to-4-supported-commercial-titles/" }
  - { label: "nesrecomp Achieves 10 Commercial Titles (1379.tech)", href: "https://1379.tech/nesrecomp-achieves-10-commercial-titles/" }
verified: "2026-08-18"
cover: "/consoles/nes.jpg"
---

Ten commercial NES games run as native apps built from your own cartridge dump, with no BIOS required at all. NESRecomp translates each cartridge's original program into C at build time and compiles it for modern systems, while a runner library stands in for the console's picture and sound hardware.

## What runs today

Ten titles have game repos, in varying states of completeness. Fully playable or believed so: [Super Mario Bros.](/games/super-mario-bros), [Duck Hunt](/games/duck-hunt), [The Legend of Zelda](/games/legend-of-zelda), [Faxanadu](/games/faxanadu), [Yoshi](/games/yoshi), [Yoshi's Cookie](/games/yoshis-cookie), and [Gumshoe](/games/gumshoe) (end to end, with one cosmetic HUD bug). [Dr. Mario](/games/dr-mario) is playable with one player tested, [Metroid](/games/metroid) covers the starting area, and [Mega Man 3](/games/mega-man-3) is a work in progress through its early stages.

Cartridge mapper support covers roughly 78% of the licensed NES library. Windows x64 is the primary, mature platform; macOS support is experimental and newly added (a community contribution by Nat Budin), and Linux likely works through the same path but is less tested.

## What the recomp adds

- An opt-in Voxel 3D renderer that reads the live tile map and rebuilds the scene in 3D: The Legend of Zelda becomes an orbitable tabletop diorama, and Super Mario Bros. a first-person experiment. The game underneath is unmodified.
- A text override system with hot reload: edit a JSON file while the game runs and the new text appears in about a second. Faxanadu is the showcase, and it opens the door to retranslation and accessibility work without ROM hacking.
- Twelve save-state slots on F1 through F12, with Shift to save.
- Mouse-as-Zapper substitution, so Duck Hunt and Gumshoe play with a mouse instead of a light gun.
- Turbo fast-forward on Tab, hotplug gamepad support, and crisp integer scaling that never stretches the picture.

## Technical details

NESRecomp reads a cartridge's 6502 machine code and rebuilds it as C: a JSR becomes a direct C function call and branches become gotos. Function discovery runs in two phases, a breadth-first walk from the interrupt vectors plus a pointer-table scanner that finds dynamically dispatched handlers, and code that cannot be resolved statically runs in durable interpreter islands whose discovery logs feed coverage back to the project. The decoder recognizes every undocumented 6502 opcode, emitting full semantics for the ones NES games actually use. Supported mappers are 0 (NROM), 1 (MMC1), 4 (MMC3), and 66 (GxROM), which the README puts at roughly 78% of the licensed library. The recompiler is pure C11; game runners use SDL2.

## Sources

- [NESRecomp: From Faxanadu to 4 Supported Commercial Titles (1379.tech)](https://1379.tech/nesrecomp-from-faxanadu-to-4-supported-commercial-titles/)
- [nesrecomp Achieves 10 Commercial Titles (1379.tech)](https://1379.tech/nesrecomp-achieves-10-commercial-titles/)
