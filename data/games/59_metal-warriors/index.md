---
title: "Metal Warriors"
kicker: "Super Nintendo"
tags: ["LAN netplay"]
featured: false
desc: "A mech game with two player head to head, rebuilt on SNESRecomp with deterministic LAN netplay and a headless test mode."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "community"
platform: "super-nintendo"
repo: "https://github.com/TechnicallyComputers/MetalWarriorsSNESRecomp"
group: "Super Nintendo"
cover: "./boxart.png"
verified: "2026-08-20"
updated: "2026-08-08"
added: "2026-07-21"
---

Metal Warriors is a mech game with a two player head to head mode, which turns out to be the interesting part of recompiling it. TechnicallyComputers rebuilt it on [SNESRecomp](/hardware/super-nintendo), and most of the work on show is about getting two players to see the same match: a lobby, a locked match configuration, and a test mode that runs two peers with no launcher and no human.

## Can I play it?

Yes, in alpha, with a caveat about what you are downloading. Two alpha builds are published, Alpha 1 on 2026-07-28 and Alpha 1.1 the next day, each with Windows, Linux, and macOS zips for Apple silicon and Intel. The README still describes the repository as a private playtest scaffold and says it is not a public release, so the downloads are ahead of their own description. Nothing claims a finished game.

It is built from a dump you provide, and the check is exact: Metal Warriors (USA), matched by CRC32 and SHA-256, with a 512 byte copier header stripped before hashing if your file has one. Stage the ROM at the top of the project and launch with no arguments to get the recomp-ui launcher, or pass the no-launcher flag with the ROM for a direct boot.

## What the recomp adds

Two player LAN netplay, on the shared [recomp-net](/blog/recomp-net) stack. The host opens a lobby, checks LAN or direct IP, picks an address and a port, 7777 by default, and creates the room. LAN rooms advertise only on the local registry, online rooms only on the lobby server, so the two never bleed into each other. The guest picks the matching row and joins, both players sit in the lobby modal watching the slots fill, and only when the host starts does either instance launch the game. Both sides need the same build and the same verified ROM, and the match configuration is locked for the duration so the simulation stays deterministic on both machines.

The part worth borrowing is the headless mode. A set of environment variables bypasses the launcher while exercising the same runtime and the same netcode, so two loopback peers can be started from a script with a shared session ID. Give it a tick count and it exits cleanly after that many synchronized ticks and prints a pass marker, which turns a two machine multiplayer feature into something a bounded CI job can check.

What it does not have is MSU-1 music, which the core team's Super Mario World and A Link to the Past builds do. The README says so plainly rather than leaving it to be discovered.

## Technical details

SNESRecomp translates the cartridge's 65816 code into C. Bring-up here is low level first: a single frame function drives the CPU from the reset and NMI vectors through an interpreter bridge, running until the machine goes quiet and then servicing interrupts, which is the conservative path to take before more of the game is proven safe to run as translated code.

The launcher is a repo-root recomp-ui submodule, the engine a snesrecomp submodule, with recomp-net carried inside the engine. Rendering goes through SDL3 and OpenGL. A trace enabled debug build opens a TCP server on port 4380.

One document in the repository shows what netplay work actually costs. It is a living set of notes on head to head stage props, the moving platforms and plates in the dual viewport mode: where the object list lives in work RAM, what each field in a record means, which byte identifies the viewport that owns an instance. All of it was identified from structured memory dumps and playtests, and the file asks to be updated when the next dump disagrees.

## Sources

- [MetalWarriorsSNESRecomp README and releases (GitHub)](https://github.com/TechnicallyComputers/MetalWarriorsSNESRecomp)
- [Head to head stage prop notes (GitHub)](https://github.com/TechnicallyComputers/MetalWarriorsSNESRecomp/blob/main/docs/H2H_STAGE_PROPS.md)
