---
title: "Super Mario Bros."
kicker: "NES"
tags: ["Voxel 3D", "Character mods", "Widescreen"]
featured: true
desc: "The NES original as a native PC game, where Mario is optional: play as Pikachu, Samus, Link, Captain Falcon, or Sonic."
year: "2026"
status: "Released"
availability: "Public build"
provenance: "core"
platform: "nes"
repo: "https://github.com/mstan/SuperMarioBrosNESRecomp"
group: "NES"
links:
  - { label: "nesrecomp Achieves 10 Commercial Titles (1379.tech)", href: "https://1379.tech/nesrecomp-achieves-10-commercial-titles/" }
verified: "2026-08-18"
updated: "2026-08-14"
added: "2026-03-15"
cover: "/covers/smb-voxel.jpg"
---

Super Mario Bros. runs here as a native PC program, rebuilt from the original game by [NESRecomp](/hardware/nes) and maintained by the core team. It was the first of the framework's [ten commercial titles](/blog/nesrecomp-10-titles) to reach a full release, and it is where the ecosystem tries its boldest ideas: you can finish the game as Mario, or hand his job to Pikachu, Samus, Link, Captain Falcon, or Sonic.

![The game running natively, with Mario's job handed to Pikachu](/previews/super-mario-bros.mp4)

## Can I play it?

Yes. v1.8.0 shipped on 2026-08-14 as a Windows x64 download on [GitHub Releases](https://github.com/mstan/SuperMarioBrosNESRecomp/releases), with an experimental Linux AppImage alongside; macOS support in the framework is newer and experimental, by building from source. The download contains no game data: it is built from a dump you provide, selected on first launch.

All worlds and levels are believed completable, though not every path has been exhaustively tested. One known quirk: the title-screen demo can play out slightly differently between launches. Gameplay is unaffected.

## What the recomp adds

Character replacements are the headline: five experimental swaps, off by default and enabled one at a time from the launcher's Mods screen. Each swap pulls its character from a separate dump you supply, and the launcher verifies it and derives the sprites, animations, and sounds into a local cache, so nothing from those games ships in the download.

Pikachu comes with his Smash 64 moveset.

![Pikachu takes the lead role at the start of World 1-1](./char-pikachu.png)

So does Captain Falcon.

![Captain Falcon steps in, down in the World 1-2 underground](./char-captain-falcon.png)

Samus keeps her beams, missiles, and Morph Ball bombs.

![Samus runs the course from the first hill of World 1-1](./char-samus.png)

Link jumps and stabs the way he does in Zelda II.

![Link visits the Mushroom Kingdom, sword out](./char-link.png)

Sonic gets a spindash that carries momentum through brick rows.

![Sonic joins the roster, underground in World 1-2](./char-sonic.png)

Two display modes push further. An experimental widescreen mode fills a 16:9 frame with real level content beyond the original narrow viewport, no stretching involved. An experimental first-person Voxel 3D mode turns the flat level upright and puts the camera at Mario's eye level, with tank controls and a live numpad camera rig; Numpad 0 toggles it. The two modes are mutually exclusive.

Underneath the mods, the shared runner adds twelve save-state slots (Shift+F1 through Shift+F12 to save, F1 through F12 to load), a fast-forward toggle, and gamepad support. With every mod disabled you get the plain 4:3 game, verified byte-identical to the emulator reference.

## Technical details

A Mapper 0 (NROM) cartridge, the simplest layout NESRecomp covers. The 6502 machine code is translated to C at build time and compiled to native x64; the console's video, audio, and cartridge hardware are simulated by the shared runner library. Widescreen and Voxel 3D are presentation-only packages that never patch the stock ROM. On macOS the game runs natively but shows minor timing and demo differences that do not appear on Windows.

## Sources

- [SuperMarioBrosNESRecomp README and releases (GitHub)](https://github.com/mstan/SuperMarioBrosNESRecomp)
- [NESRecomp framework README (GitHub)](https://github.com/mstan/nesrecomp)
- [nesrecomp Achieves 10 Commercial Titles (1379.tech)](https://1379.tech/nesrecomp-achieves-10-commercial-titles/)
