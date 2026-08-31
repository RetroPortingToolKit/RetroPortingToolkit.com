---
title: "Bomberman World"
kicker: "PlayStation"
tags: ["Netplay", "Five players"]
featured: false
desc: "Crystal hunts and armored boss fights: the solo quest of the three Bomberman projects, on a release every few days."
year: "2026"
status: "Tech demo"
availability: "Public build"
provenance: "community"
platform: "playstation"
repo: "https://github.com/TechnicallyComputers/Bomberman-World-Recomp"
group: "PlayStation"
cover: "./boxart.png"
verified: "2026-08-20"
updated: "2026-08-18"
added: "2026-08-08"
---

Bomberman World is the quest game of the three Bomberman projects TechnicallyComputers has running on [PSXRecomp](/hardware/playstation). You clear an area by bombing your way to every Crystal on the map, which opens the exit; the fourth area of each world puts a Dark Force Bomber in the way. Beat one and the game hands you battle armor with a normal and a special attack, for that world's second boss only. Move on and the armor is gone, which is the project's own advice to use it while you have it.

## Playable status

There are builds, and the project does not say how far the game gets. Releases carry Windows, Linux, and macOS zips for both Apple silicon and Intel. No file in the repository claims a playable state, so treat it as an early build rather than a finished port.

The flow is the one this group uses across its titles. Run a release zip standalone through its built-in Generate and Build step, or let the RetComM Launcher handle installs, updates, and disc wiring across several projects at once. It is built from a dump you provide: the USA disc, serial SLUS-00680, gated on the size, MD5, and SHA-1 recorded in the project's config. OpenBIOS covers the generate step unless you point it at your own retail BIOS.

## What the recomp adds

The player count, carried across. Bomberman World was a five player game on a multitap, and the project keeps that number: five in the game config, and five netplay slots in the RetComM catalogue entry, over the shared [recomp-net](/blog/recomp-net) stack on either LAN or ICE transports. That entry is a declaration in the catalogue, not a tested result.

Past the player count the project ships nothing of its own. No widescreen, no mods, no translation layer. What you get is the framework's defaults: the OpenGL renderer at 4:3, digital pads, and memory cards written to a saves folder next to the game.


## Sources

- [Bomberman World Recomp README and releases (GitHub)](https://github.com/TechnicallyComputers/Bomberman-World-Recomp)
- [RetComM catalogue entry for Bomberman World (GitHub)](https://github.com/TechnicallyComputers/retcomm-catalog/blob/main/titles/bomberman-world-psx.json)
