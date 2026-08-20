---
title: "Bomberman Party Edition"
kicker: "PlayStation"
tags: ["Multitap", "Five players"]
featured: false
desc: "Five pads compiled into the runtime and a multitap wired to port 2, on a game that has not reached its own title screen yet."
year: "2026"
status: "Research"
availability: "Public build"
provenance: "community"
platform: "playstation"
repo: "https://github.com/TechnicallyComputers/BombermanPartyEditionRecomp"
group: "PlayStation"
cover: "./boxart.png"
verified: "2026-08-20"
updated: "2026-08-18"
added: "2026-07-23"
---

Of the three Bomberman projects TechnicallyComputers runs on [PSXRecomp](/hardware/playstation), this is the one where the multiplayer is the whole game, and it is the one that has put the most engineering into pads. It is also the one still trying to reach its own title screen.

## Can I play it?

No. The project's bring-up notes say the low level BIOS boot gets as far as the SCEA license screen, with the PlayStation logo drawing glitched, and that title and menu bring-up continues: after the license screen the boot sticks during the early handoff to the game's executable. The README has carried that same line through its August updates, so it is the project's current word on the matter, not a stale note.

There are downloads, and they are worth understanding before you fetch one. Releases run to v0.3.16 (2026-08-18) with Windows, Linux, and macOS packages, but they are a setup host: the zip carries no generated game code, so the first run generates from a disc you provide and then rebuilds. That disc is the USA release, serial SLUS-01189, and the preferred dump is the Redump image the project names in its disc notes.

## What the recomp adds

Five pads, decided at compile time. The runtime target is built with a maximum of five players, against the framework default of two, and the game config carries the same number so the lobby and the launcher's controller cards agree.

The wiring is specific to this title. The multitap arms only once the game itself is entered, and only when three or more players are in play, so the BIOS boot runs on normal pads. Where most titles put the tap on console port 1, this one puts it on port 2: port 1 stays player one, and the four pads in the SCPH-1070 become players two through five. Bulk polling follows the real tap's latch, which is the level of fidelity a five player Bomberman needs to feel right.

Pads are digital only and locked that way. DualShock and analog multitap support are not offered for this game.

Five player netplay is not finished. The host relay lives in recomp-net and its unit tests pass, but the project lists a matching five slot lobby server build and live multi client validation as open work, and unlike its two stablemates this title has no netplay block in the RetComM catalogue yet.

## Technical details

Generation from the disc produces 41 shards and roughly 3,600 dispatch entries, seeded from function prologues and jump-and-link targets.

The disc tool takes what people actually have. A Redump bin and cue pair is hash gated and copied into place. A cooked 2048 byte ISO, the format common in managed ROM libraries, is checked by boot executable and serial and then rebuilt into a MODE2/2352 working image. Raw 2448 byte sector dumps are trimmed to 2352. That matters for a PlayStation game, because a cooked ISO has already thrown away sector data the disc may need.

Release builds come out of CI on four runners: Ubuntu, Windows through MSYS2 MinGW64, macOS on Apple silicon, and macOS on Intel. Two extra scripts sit in the repository for the netplay work, a Linux build with ICE for online connectivity and a Windows cross build from Linux using MinGW-w64 with SDL2 statically linked where it can be. Profile guided optimization is available in the framework but switched off for this title, and a debug build listens on port 4530.

## Sources

- [Bomberman Party Edition Recomp README and releases (GitHub)](https://github.com/TechnicallyComputers/BombermanPartyEditionRecomp)
- [Project bring-up notes, ISSUES.md (GitHub)](https://github.com/TechnicallyComputers/BombermanPartyEditionRecomp/blob/main/ISSUES.md)
- [Disc identity notes, DISC.md (GitHub)](https://github.com/TechnicallyComputers/BombermanPartyEditionRecomp/blob/main/DISC.md)
