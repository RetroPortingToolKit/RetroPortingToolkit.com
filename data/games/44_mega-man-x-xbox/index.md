---
title: "Mega Man X for Original Xbox"
kicker: "Original Xbox"
tags: []
featured: false
desc: "Recompiled code travels: a community port that takes the Mega Man X recomp back onto a console, running on original Xbox hardware."
year: "2026"
availability: "Source only"
provenance: "community"
repo: "https://github.com/Team-Resurgent/MegaManX-X"
group: "Original Xbox"
verified: "2026-08-18"
cover: "./gameplay.png"
---

MegaManX-X is a community project by Team Resurgent that ports the [Mega Man X](/games/mega-man-x) SNES recompilation to original Xbox hardware. It is the clearest demonstration yet that recompiled code travels: because the game exists as portable C rather than a ROM inside an emulator, a homebrew team can point it at a 2001 console the same way the core project points it at Windows or Linux.

![Mega Man X running on original Xbox hardware (credit: Haguero)](/previews/mega-man-x-xbox.mp4)

## Can I play it?

Not from this repository alone. The source is public on GitHub, but no builds are published there, and compiling it requires the original Xbox homebrew toolchain (RXDK / XDK).

The repository does include the port's own release notes describing a finished v1.0 package (dated 2026-07-20, about 12 MB) that installs by copying a folder to a modded Xbox over FTP or disc and launching default.xbe. As with the upstream recomp, the game is built from a ROM dump you provide: Mega Man X (USA) Rev 1, placed in the package's Media folder, with headered and unheadered dumps both accepted.

## What the port delivers

Per its release notes, the port runs bare metal on original Xbox hardware with full audio, cheats, and ten save-state slots managed through the Xbox dashboard's save system, persisting across sessions with no manual setup.

Controls map to the Xbox pad: D-pad to move, A to jump, X to shoot with hold-to-charge, B to dash, triggers and White/Black to switch weapons.

## Technical details

The port sits on mstan's [MegaManXSNESRecomp](/games/mega-man-x), which statically recompiles the SNES 65816 CPU code to C while the rest of the console (PPU rendering, APU audio, DMA, hardware registers) runs through the [snesrecomp](/hardware/super-nintendo) runtime.

Team Resurgent's contribution is a custom XDK platform layer in Platform/xbox: Direct3D presentation, Xbox audio and input backends, and savegame plumbing through the dashboard's UDATA storage, replacing the SDL layer the PC builds use.

## Sources

- [MegaManX-X repository (GitHub)](https://github.com/Team-Resurgent/MegaManX-X)
- [Xbox port release notes (Readme.nfo in the repository)](https://github.com/Team-Resurgent/MegaManX-X/blob/main/Platform/xbox/Readme.nfo)
