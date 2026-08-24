---
title: "Nintendo 64"
kicker: "MIPS"
tags: ["Transfer Pak", "Fan translation", "Unmaintained"]
featured: false
desc: "The one platform here with no recompiler of its own: two Pokémon Stadium projects run on forks of N64Recomp, and the US one was set down in August 2026 when its author lost confidence in that foundation."
year: "2026"
status: "Partial"
maturity: "Alpha"
availability: "Public build"
provenance: "core"
arch: "NEC VR4300 (MIPS)"
group: "Early platform work"
links:
  - { label: "NES, SNES, Genesis, VirtualBoy, and PSX: A journey with AI and Recompilation (1379.tech)", href: "https://1379.tech/nes-snes-genesis-virtualboy-and-psx-a-journey-with-ai-and-recompilation/" }
verified: "2026-08-20"
cover: "./ss-anne-launcher.png"
---

The Nintendo 64 is the one platform on this site with no recompiler of its own. The two projects here, [Pokémon Stadium](/games/pokemon-stadium) and [Pocket Monsters Stadium](/games/pocket-monsters-stadium), are games built on a fork of N64Recomp, the static recompiler that already existed for this console, together with forks of its runtime and its renderer. That was a deliberate choice: the console already had a recompilation project, so the core team's effort went to systems that had none. In August 2026 the US Pokémon Stadium project was archived, its author's stated reason being that he considers the architecture he forked structurally unsound and would rather not stand behind work built on it. The last Windows build stays downloadable, the source stays buildable, and both games run from a ROM dump you provide.

## What runs today

[Pokémon Stadium](/games/pokemon-stadium), the US v1.0 release, reaches further of the two. Boot, the title and attract sequence, the in-game menus, and the Kid's Club mini games all work. GB Tower, the Game Boy player built into Stadium, plays Pokémon Red, Blue, and Yellow from start to live gameplay, reading your cartridge's save and writing it back. The Transfer Pak is emulated at bus level along with the cartridge it bridges to, so you can import a party from your own Game Boy dump on any of the four ports, and registered Pokémon persist between sessions. Battles start, play, and return to the menu. What has not been validated is a whole run: neither a full Stadium cup nor Gym Leader Castle has been played start to finish. Known issues include audio crackle and menu-level visual glitches. The final release is v0.4.7-beta for 64-bit Windows.

[Pocket Monsters Stadium](/games/pocket-monsters-stadium), the earlier Japanese release, is much rougher. It boots through the title, the cartridge select screen, the main menu, and into the 3D battle interface, and it carries an optional English layer applied as the game draws its text, 269 strings and growing, incomplete and prone to mis-sized lines. GB Tower play does not work there: it mis-reads valid Game Boy save data as corrupt, though importing a party still appears to. Only an unmodified Japanese Pokémon Green cartridge has been tested. Its own README expects it to break and says development will likely be set down until someone properly decompiles and annotates the ROM.

## Where the toolchain comes from

[N64Recomp](https://github.com/N64Recomp/N64Recomp) is prior work by Mr-Wiseguy, MIT licensed, and the best known static recompiler for this console; its companion runtime is the one behind the Zelda 64 recompilation. Both Stadium projects build on a fork of it, plus forks of [N64ModernRuntime](https://github.com/N64Recomp/N64ModernRuntime), which stands in for the console's operating system, and [RT64](https://github.com/rt64/rt64), the renderer. Each fork lists its own changes at the top of its README, and each game repo pins the exact commit it builds against. Because the work here is game specific rather than platform level, there is no platform repository to point at, and this page does not claim one. One thing to know before sending changes upstream: N64Recomp, N64ModernRuntime and RT64 each state in their contributing guidelines that AI must not be used to generate code for contributions to those projects.

## Technical details

The pipeline starts from pret's Pokémon Stadium disassembly and your own ROM. The disassembly rebuilds an identical ROM and produces an ELF that already carries every section's load address, its symbols, and its relocations, so the recompiler reads that ELF directly with no slicing step, emits C, and the result is compiled against the runtime into an executable. Stadium keeps much of itself compressed and expands pieces on demand inside a flat 8 MB address space; the fork unpacks those fragments at build time, recognizes the repeated ones, and lays them out so they stop overwriting each other. Rendering goes through RT64 with internal-resolution upscaling, 4x anti-aliasing on by default, optional supersampling, and a Direct3D 12 path that falls back to Vulkan on its own when the graphics device will not start.

The Japanese project's English layer works without touching the ROM. Nearly all of the game's text passes through one string-drawing routine; a hook reads the bytes at that routine, hashes them, looks the hash up in a small JSON table, and redraws the English replacement using the game's own font, which already contains Latin letters. Anything missing from the table is drawn unchanged, and the table reloads while the game runs.

## Sources

- [NES, SNES, Genesis, VirtualBoy, and PSX: A journey with AI and Recompilation (1379.tech)](https://1379.tech/nes-snes-genesis-virtualboy-and-psx-a-journey-with-ai-and-recompilation/)
- [N64Recomp, the upstream recompiler](https://github.com/N64Recomp/N64Recomp)
- [PokemonStadiumRecomp on GitHub](https://github.com/mstan/PokemonStadiumRecomp)
- [PocketMonstersStadiumRecomp on GitHub](https://github.com/mstan/PocketMonstersStadiumRecomp)
