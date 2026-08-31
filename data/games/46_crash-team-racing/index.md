---
title: "Crash Team Racing"
kicker: "PlayStation"
tags: []
featured: false
desc: "Pulled from the catalog by its own developer over a post-race bug, with the deepest hand-annotated symbol map of any community PlayStation project."
year: "2026"
status: "Partial"
availability: "Public build"
provenance: "community"
platform: "playstation"
group: "PlayStation"
verified: "2026-08-20"
updated: "2026-08-18"
added: "2026-08-07"
cover: "./boxart.png"
---

A static recompilation of Naughty Dog's 1999 kart racer, built on [PSXRecomp](/hardware/playstation) by TechnicallyComputers. It is the rare project that leads with its own disclaimer: the developer has pulled it from the catalog until a post-race bug is fixed, and left the whole investigation in the repository for anyone to read.

## Playable status

Partly, and the project would rather you waited. The README opens with a disclaimer: selecting Change Level fails to load the post-race screen, and the developer notes there are potentially other issues still to test for. The plan is stated plainly, that the game returns to the catalog and to the RetComM Launcher once it is stable.

If you want to try it anyway, builds are published on GitHub with zips for Windows, macOS Intel, macOS Apple silicon, and Linux. It is built from a dump you provide: the USA disc, SCUS-94426, checked against a recorded size, MD5, SHA-1, and CRC32 before it will build. OpenBIOS is used unless you supply your own retail BIOS.

## What the recomp adds

Nothing cosmetic yet. The build ships at the console's 4:3 output with the OpenGL renderer and the controller in digital mode, which is what the original wanted. A widescreen scan sits in the repository under `analysis/`, with 35 candidate sites found by static analysis, but the project has not wired any of them into the build. The scan's own header is blunt about why: every candidate is safe to compile, and only playtesting shows whether widening a given site is right.

What the project does have is depth. Its symbol map carries 827 entries, 97 of them named by hand and 31 marked confirmed, which is more hand annotation than any of the other community PlayStation titles here.


## Sources

- The Crash-Team-Racing-Recomp repository is no longer publicly available on GitHub, checked 2026-08-24. This page describes the project as it stood when the repository was public.
