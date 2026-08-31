---
title: "Metal Warriors"
kicker: "Super Nintendo"
tags: []
featured: false
desc: "A native Super Nintendo mech game build with exact ROM checks and a low-level interpreter bridge."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "community"
platform: "super-nintendo"
repo: "https://github.com/TechnicallyComputers/MetalWarriorsSNESRecomp"
group: "Super Nintendo"
cover: "./boxart.png"
verified: "2026-08-20"
updated: "2026-08-31"
added: "2026-07-21"
---

TechnicallyComputers rebuilt Metal Warriors on [SNESRecomp](/hardware/super-nintendo). The public project shows its exact ROM checks, launcher flow, and low-level path from reset to a running frame.

## Can I play it?

Yes, in alpha, with a caveat about what you are downloading. Two alpha builds are published, Alpha 1 on 2026-07-28 and Alpha 1.1 the next day, each with Windows, Linux, and macOS zips for Apple silicon and Intel. The README still describes the repository as a private playtest scaffold and says it is not a public release, so the downloads are ahead of their own description. Nothing claims a finished game.

It is built from a dump you provide, and the check is exact: Metal Warriors (USA), matched by CRC32 and SHA-256, with a 512 byte copier header stripped before hashing if your file has one. Stage the ROM at the top of the project and launch with no arguments to get the recomp-ui launcher, or pass the no-launcher flag with the ROM for a direct boot.

## What the recomp adds

What it does not have is MSU-1 music, which the core team's Super Mario World and A Link to the Past builds do. The README says so plainly rather than leaving it to be discovered.

## Technical details

SNESRecomp translates the cartridge's 65816 code into C. Bring-up here is low level first: a single frame function drives the CPU from the reset and NMI vectors through an interpreter bridge, running until the machine goes quiet and then servicing interrupts, which is the conservative path to take before more of the game is proven safe to run as translated code.

The launcher is a repo-root recomp-ui submodule and the engine is a snesrecomp submodule. Rendering goes through SDL3 and OpenGL. A trace enabled debug build opens a TCP server on port 4380.

## Sources

- [MetalWarriorsSNESRecomp README and releases (GitHub)](https://github.com/TechnicallyComputers/MetalWarriorsSNESRecomp)
