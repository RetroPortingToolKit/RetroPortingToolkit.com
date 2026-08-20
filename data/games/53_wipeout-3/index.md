---
title: "Wipeout 3 Special Edition"
kicker: "PlayStation"
tags: []
featured: false
desc: "The front half of a recompilation: the disc fingerprinted, 1053 function starts mapped, and no build yet."
year: "2026"
status: "Research"
availability: "Source only"
provenance: "core"
platform: "playstation"
repo: "https://github.com/mstan/Wipeout-3-Special-Edition-Recomp"
group: "PlayStation"
verified: "2026-08-20"
updated: "2026-08-16"
added: "2026-08-16"
cover: "./boxart.png"
---

Wipeout 3 Special Edition Recompiled is an early [PSXRecomp](/hardware/playstation) project for the Psygnosis racer that introduced the F7200 anti-gravity league and its eight circuits. There is no build to download. What the repository holds is the front half of a recompilation: the part that pins down exactly which disc this is, and where the game's functions begin.

## Can I play it?

Not yet. There are no releases, and nothing has been published to run. The repository is a scaffold: the game configuration, the function seeds, the symbol plumbing, and a release workflow, with the recompiled C generated locally rather than committed.

Building it means following the developer flow in the README: initialize the submodules, build the framework's emitters, run the generator against a disc dump you provide, then configure and build with CMake.

The disc is pinned precisely. The project records the European Special Edition release, SCES-02845, as a 14-track cue, along with the data track's size and its MD5, SHA-1, and CRC32, plus a fingerprint of the whole disc layout. Retail BIOS images are not redistributed, and generation uses OpenBIOS unless you point it at your own.

## What the recomp adds

Nothing yet, beyond the shape the framework gives it. What has been staked out is the groundwork: 1053 function starts, taken in a first pass from the boot executable's call targets and expected to grow as overlays are found; a progressive symbol map that turns addresses into names as they are identified; an empty slot for preloaded mod packages; and the launcher wiring, box art included, that the framework's shared UI expects.

The README is honest about the stage: scaffolded with the New Project Layout, with the full flow living in the framework's project setup guide.

## Technical details

The scaffold records what the recompiler needs from the boot executable's header: a load address of 0x80010000, an entry point at 0x80162474, and roughly 1.4 MB of program text. Seeds come from the boot executable's own call targets, which is a first pass rather than a complete map. Disc-streamed overlays are the part that has to be discovered later, and on a game that spans a 14-track disc there will be plenty of them.

Names are handled as a progressive map: a symbols table is synced into a generated header, so identified functions gain names without generated code being touched by hand. Framework versions are authoritative through submodule gitlinks, and the pins file in the repository is treated as a snapshot rather than the source of truth.

## Sources

- [Project README and repository (GitHub)](https://github.com/mstan/Wipeout-3-Special-Edition-Recomp)
