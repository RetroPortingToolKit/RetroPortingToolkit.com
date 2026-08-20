---
title: "Bomberman Fantasy Race"
kicker: "PlayStation"
tags: ["Netplay"]
featured: false
desc: "Bomberman on animal mounts: a battle racer with a wagering system, and the one of the three projects with a two player ceiling."
year: "2026"
status: "Tech demo"
availability: "Public build"
provenance: "community"
platform: "playstation"
repo: "https://github.com/TechnicallyComputers/Bomberman-Fantasy-Race-Recomp"
group: "PlayStation"
cover: "./boxart.png"
verified: "2026-08-20"
updated: "2026-08-18"
added: "2026-08-07"
---

This is the odd one in Bomberman's PlayStation run and the reason it is worth a page of its own: a battle racer where you ride animals. Ten mounts, seven courses, a triangle jump, a bomb dash and a catapult to get past the pack, and more than fifteen power ups thrown with a distance meter. Two players race split screen, and the game lets them bet on the outcome. TechnicallyComputers has it building as a native app on [PSXRecomp](/hardware/playstation).

## Can I play it?

One release exists: v0.1.1, published on 2026-08-18, with Windows, Linux, and macOS zips for Apple silicon and Intel. The repository was scaffolded on 2026-08-07 and says nothing about how far the game runs, so treat it as an early build rather than a game you sit down with.

Getting there works the same way as the group's other titles: run the release zip standalone and use its Generate and Build step, or drive it from the RetComM Launcher. It is built from a dump you provide, the USA disc with serial SLUS-00823, verified against the CRC32, MD5, and SHA-1 in the project config, with OpenBIOS standing in for a retail BIOS unless you supply one.

## What the recomp adds

The same as its stablemate Bomberman World, which is to say the framework's defaults and a netplay declaration, with no enhancements written for this game. The difference is the number: the RetComM catalogue lists two netplay slots here, over recomp-net on LAN or ICE, where Bomberman World lists five. Two is what the split screen already was, so what the network adds is distance rather than seats.

Pads are digital and the analog multitap path is switched off in the config, which is the setting these PlayStation projects start from.

## Technical details

Two numbers in the project config separate this one from its siblings. The disc is small, about 260 MB against Bomberman World's 657 MB, and the game does not load where the others do: its executable sits at 0x8003004C with an entry point at 0x800C0AE4, while Bomberman World and Bomberman Party Edition both load at the usual 0x80010000. A static recompiler has to be told that, because everything it emits is addressed from it.

The rest is the standard [PSXRecomp](/hardware/playstation) shape: MIPS R3000A machine code translated ahead of time to C, function starts seeded from a Ghidra export, strict mode on, and the psxrecomp, recomp-ui, and nested recomp-net submodules pinned by gitlink rather than tracking the framework's branch.

## Sources

- [Bomberman Fantasy Race Recomp README and releases (GitHub)](https://github.com/TechnicallyComputers/Bomberman-Fantasy-Race-Recomp)
- [RetComM catalogue entry for Bomberman Fantasy Race (GitHub)](https://github.com/TechnicallyComputers/retcomm-catalog/blob/main/titles/bomberman-fantasy-race-psx.json)
