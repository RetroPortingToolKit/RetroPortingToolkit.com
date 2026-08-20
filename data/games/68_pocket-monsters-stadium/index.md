---
title: "Pocket Monsters Stadium"
kicker: "Nintendo 64"
tags: ["English translation", "Runtime text"]
featured: false
desc: "The Japan-only first Stadium, with English drawn over the Japanese as the game renders it. It reaches the battle screen, and GB Tower does not work."
year: "2026"
status: "Partial"
availability: "Public build"
provenance: "core"
platform: "nintendo-64"
repo: "https://github.com/mstan/PocketMonstersStadiumRecomp"
group: "Nintendo 64"
verified: "2026-08-20"
updated: "2026-07-21"
added: "2026-06-11"
cover: "./boxart.webp"
---

Pocket Monsters Stadium is the original Japanese release that predates the international [Pokémon Stadium](/games/pokemon-stadium), and it never left Japan. This project forks that recompilation to see how far the same approach carries onto a different ROM, and adds an English text layer that is drawn as the game renders rather than patched into the cartridge. It is early, and it says so first thing.

## Can I play it?

Partly. The recomp boots through the title screen, the cartridge-select screen, and the main menu, and gets into the 3D battle UI with the English layer applied. Deeper paths can crash or hang.

The clearest limit is Game Boy mode. GB Tower does not work: valid Game Boy save data is mis-flagged as corrupt and imported Pokémon will not load. Registering a party into Stadium does appear to work. Only Pokémon Green, Japanese and unmodified, has been tested as a cartridge, and even that does not show a proper icon when loaded. Other cartridges are untested.

Two experimental Windows builds are on the releases page, the latest v0.0.2 (2026-06-26), both marked as prereleases. It runs from a dump you provide: Pocket Monsters Stadium (Japan), 16 MB. The ROM is commonly distributed byte-swapped as `.v64` and has to be converted to native big-endian `.z64` first.

The author expects development to be set down until someone properly decompiles and annotates the ROM. The sibling project had solid pret decompilation coverage to lean on and this one does not, which made bug hunting slow and difficult.

## What the recomp adds

The English layer, and the way it is applied. The game funnels almost all of its text through a single string-drawing routine. A hook reads the source bytes at that routine, hashes them, looks the hash up in a small JSON table, and on a hit renders an English replacement through the game's own font glyphs, which already contain Latin letters, so nothing has to be injected. Untranslated text falls through unchanged, and no ROM is modified and no assets are repacked.

269 strings are covered so far: the main menu, battle and tournament setup, cup and rule descriptions, rental Pokémon, moves, types, and the stat screens. Replacement text is not bounded by the length of the Japanese it replaces, and Latin spacing is tightened so English fits the original text boxes. The table hot-reloads while the game runs, so an edited line shows up without a rebuild, and the repository ships tooling that captures the strings on screens you visit and lists what is still untranslated.

The translation is incomplete by the project's own account: many strings are still Japanese, some English may be wrong or mis-sized, and a few UI sprites still have transparency artifacts.

## Technical details

Three forks, the same ones the sibling project uses: N64Recomp for the static recompilation, N64ModernRuntime standing in for the N64's operating system, and rt64 for rendering. The separate repository is deliberate. This game is close enough to the international release that the idle thread entry point sits at the same address, which makes the other game's pret-decompiled source a useful oracle for naming unknown functions here, but the ROM, the symbol map, and the game logic all differ, so it gets its own recompilation tree.

Getting it to boot at all is written up in the repository's findings log: a boot deadlock caused by scheduler starvation on loop back-edges, truncated delay-slot corruption, identifying the libultra routines, and building the resource-server layer. From a cold start it now runs the full resident init, the cooperative scheduler, the no-drive resolution for the disk-drive library, the audio engine, and the resource server, then builds graphics tasks and renders the terminal and Poké Ball main menu scene, Japanese no-cartridge prompt included. The project is GPL-3.0.

## Sources

- [PocketMonstersStadiumRecomp README and releases (GitHub)](https://github.com/mstan/PocketMonstersStadiumRecomp)
- [Pokémon Stadium, the sibling project](/games/pokemon-stadium)
