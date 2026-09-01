---
title: "NES"
kicker: "6502"
tags: ["Voxel 3D", "Text override", "Save states", "Mouse Zapper"]
featured: true
desc: "A source-only ecosystem for native NES ports from your own cartridge dump, with experiments like text replacement, save states, mouse light-gun input, mods, and alternate renderers."
year: "2026"
status: "Playable alpha"
maturity: "Beta"
availability: "Source only"
provenance: "core"
arch: "6502"
repo: "https://github.com/mstan/nesrecomp"
group: "Active platform ecosystems"
links:
  - { label: "NESRecomp early progress article (1379.tech)", href: "https://1379.tech/nesrecomp-from-faxanadu-to-4-supported-commercial-titles/" }
  - { label: "NESRecomp ecosystem article (1379.tech)", href: "https://1379.tech/nesrecomp-achieves-10-commercial-titles/" }
verified: "2026-08-18"
cover: "./mascot-room.webp"
---

NESRecomp turns NES cartridge code into native apps. You provide your own cartridge dump.

This ecosystem is practical, but still early. The older the console is, the simpler the CPU may look, but the cartridge hardware can still make each game its own problem.

## What runs today

Several public projects exist today, including [Super Mario Bros.](/games/super-mario-bros), [Duck Hunt](/games/duck-hunt), [The Legend of Zelda](/games/legend-of-zelda), [Faxanadu](/games/faxanadu), [Yoshi](/games/yoshi), [Yoshi's Cookie](/games/yoshis-cookie), [Gumshoe](/games/gumshoe), [Dr. Mario](/games/dr-mario), and [Metroid](/games/metroid).

Each game repo is the authority for what works. Some are playable end to end. Some are useful framework targets. Some are still there to prove out a mapper, renderer, or workflow.

## What NES ports can add

- Save states and fast-forward without changing the game file.
- Mouse input for Zapper-style games.
- Runtime text replacement for translation and accessibility work.
- Character swaps and other opt-in mods.
- Alternate renderers that sit outside the original game logic.

## How to read the status

NESRecomp is strongest when the game uses cartridge hardware the framework already understands. A new mapper or unusual hardware pattern can still turn one "simple" NES game into real framework work.

This is why the public game list is not the same thing as whole-console support.
