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

## Playable status

No. The project's bring-up notes say the low level BIOS boot gets as far as the SCEA license screen, with the PlayStation logo drawing glitched, and that title and menu bring-up continues: after the license screen the boot sticks during the early handoff to the game's executable. The README has carried that same line through its August updates, so it is the project's current word on the matter, not a stale note.

There are downloads, and they are worth understanding before you fetch one. Windows, Linux, and macOS packages are published, but they are a setup host: the zip carries no generated game code, so the first run generates from a disc you provide and then rebuilds. That disc is the USA release, serial SLUS-01189, and the preferred dump is the Redump image the project names in its disc notes.

## What the recomp adds

Five pads, decided at compile time. The runtime target is built with a maximum of five players, against the framework default of two, and the game config carries the same number so the lobby and the launcher's controller cards agree.

The wiring is specific to this title. The multitap arms only once the game itself is entered, and only when three or more players are in play, so the BIOS boot runs on normal pads. Where most titles put the tap on console port 1, this one puts it on port 2: port 1 stays player one, and the four pads in the SCPH-1070 become players two through five. Bulk polling follows the real tap's latch, which is the level of fidelity a five player Bomberman needs to feel right.

Pads are digital only and locked that way. Analog multitap support is not offered for this game.

Five player netplay is not finished. The host relay lives in recomp-net and its unit tests pass, but the project lists a matching five slot lobby server build and live multi client validation as open work, and unlike its two stablemates this title has no netplay block in the RetComM catalogue yet.


## Sources

- [Bomberman Party Edition Recomp README and releases (GitHub)](https://github.com/TechnicallyComputers/BombermanPartyEditionRecomp)
- [Project bring-up notes, ISSUES.md (GitHub)](https://github.com/TechnicallyComputers/BombermanPartyEditionRecomp/blob/main/ISSUES.md)
- [Disc identity notes, DISC.md (GitHub)](https://github.com/TechnicallyComputers/BombermanPartyEditionRecomp/blob/main/DISC.md)
