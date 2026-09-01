---
title: "Super Mario Bros."
kicker: "NES"
tags: ["Voxel 3D", "Character mods", "Widescreen"]
featured: true
desc: "The NES original as a native PC game, with experimental character replacement and widescreen work."
year: "2026"
status: "Released"
availability: "Public build"
provenance: "core"
platform: "nes"
repo: "https://github.com/mstan/SuperMarioBrosNESRecomp"
group: "NES"
links:
  - { label: "NESRecomp progress article (1379.tech)", href: "https://1379.tech/nesrecomp-achieves-10-commercial-titles/" }
verified: "2026-08-18"
updated: "2026-08-14"
added: "2026-03-15"
cover: "./char-sonic.png"
---

Super Mario Bros. runs here as a native PC program, rebuilt from the original game by [NESRecomp](/hardware/nes).

It is one of the framework's biggest showcases because the enhancements go outside the original game engine. You can play the stock game, or experiment with character replacements, widescreen, and a 3D view.

![The game running natively, with Mario's job handed to Pikachu](/previews/super-mario-bros.mp4)

## Playable status

Yes. Windows builds are available on [GitHub Releases](https://github.com/mstan/SuperMarioBrosNESRecomp/releases), with an experimental Linux AppImage alongside. The download contains no game data: it is built from a dump you provide, selected on first launch.

All worlds and levels are believed completable, though not every path has been exhaustively tested.

## What the recomp adds

Character replacements are the headline: five experimental swaps, enabled one at a time from the launcher's Mods screen. Each swap pulls its character from a separate dump you supply, and the launcher verifies it and derives the sprites, animations, and sounds into a local cache, so nothing from those games ships in the download.

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

The stock 4:3 game remains available alongside the experimental modes.


## Sources

- [SuperMarioBrosNESRecomp README and releases (GitHub)](https://github.com/mstan/SuperMarioBrosNESRecomp)
- [NESRecomp framework README (GitHub)](https://github.com/mstan/nesrecomp)
- [NESRecomp progress article (1379.tech)](https://1379.tech/nesrecomp-achieves-10-commercial-titles/)
