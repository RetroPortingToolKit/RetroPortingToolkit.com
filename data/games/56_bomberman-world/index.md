---
title: "Bomberman World"
kicker: "PlayStation"
tags: []
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
updated: "2026-08-31"
added: "2026-08-08"
---

Bomberman World is the quest game of the three Bomberman projects TechnicallyComputers has running on [PSXRecomp](/hardware/playstation). You clear an area by bombing your way to every Crystal on the map, which opens the exit; the fourth area of each world puts a Dark Force Bomber in the way. Beat one and the game hands you battle armor with a normal and a special attack, for that world's second boss only. Move on and the armor is gone, which is the project's own advice to use it while you have it.

## Can I play it?

There are builds, and the project does not say how far the game gets. Releases carry Windows, Linux, and macOS zips for both Apple silicon and Intel, and they land fast: v0.1.19 was published on 2026-08-18, ten days after the repository's first commit. No file in the repository claims a playable state, so the version number is the honest description.

The flow is the one this group uses across its titles. Run a release zip standalone through its built-in Generate and Build step, or let the RetComM Launcher handle installs, updates, and disc wiring across several projects at once. It is built from a dump you provide: the USA disc, serial SLUS-00680, gated on the size, MD5, and SHA-1 recorded in the project's config. OpenBIOS covers the generate step unless you point it at your own retail BIOS.

## What the recomp adds

The project ships no enhancements of its own. No widescreen, no mods, no translation layer. What you get is the framework's defaults: the OpenGL renderer at 4:3, digital controls, and memory cards written to a saves folder next to the game.

## Technical details

PSXRecomp translates the disc's MIPS R3000A code to C and compiles it as a native program. Function starts come from a Ghidra export checked into the repository, and the recompiler runs in strict mode, so the seed list is the contract rather than a hint. Names accumulate through a progressive symbol map: a symbols file is synced by script into a generated header, which is how a project like this turns addresses into readable code over time without rewriting what has already been generated.

Framework versions are pinned by submodule gitlink rather than floating on whatever the framework's own branch happens to be. A pins snapshot file sits alongside as a record, but the gitlinks are what release CI actually builds.

## Sources

- [Bomberman World Recomp README and releases (GitHub)](https://github.com/TechnicallyComputers/Bomberman-World-Recomp)
- [RetComM catalogue entry for Bomberman World (GitHub)](https://github.com/TechnicallyComputers/retcomm-catalog/blob/main/titles/bomberman-world-psx.json)
