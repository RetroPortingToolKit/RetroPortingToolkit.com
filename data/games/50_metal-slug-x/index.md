---
title: "Metal Slug X"
kicker: "PlayStation"
tags: []
featured: false
desc: "2,930 mostly tiny functions and not one undecoded word: the cleanest static analysis of any community PlayStation project here."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "community"
platform: "playstation"
repo: "https://github.com/TechnicallyComputers/Metal-Slug-X-Recomp"
group: "PlayStation"
verified: "2026-08-20"
updated: "2026-08-18"
added: "2026-08-07"
cover: "./boxart.png"
---

A static recompilation of the PlayStation conversion of SNK's run and gun classic, released in North America and PAL regions by Agetec, built on [PSXRecomp](/hardware/playstation) by TechnicallyComputers. Of the community PlayStation projects here it is the one the recompiler's analysis understands best, and the smallest disc by a wide margin.

## Can I play it?

In alpha, on a fast cadence. Six releases landed between 2026-08-14 and 2026-08-18, ending at v0.1.19, each with zips for Windows, macOS Intel, macOS Apple silicon, and Linux. The project makes no claim about how far the game plays.

It builds from a dump you provide, the USA disc SLUS-01212, verified by size, MD5, and SHA-1 first. OpenBIOS boots it unless you supply a retail BIOS.

One practical note the project raises about dumps: it flags Track-01-only cue sheets, which fail the multi-track netplay and catalog gates, and asks for a full Redump cue instead.

## What the recomp adds

Nothing beyond a native build yet. Output is 4:3 on the OpenGL renderer, with the controller in digital mode. The widescreen scan under `analysis/` is the richest of these projects, with 44 candidate sites and horizontal margin arithmetic worked out to the instruction, including one site whose bounds check reads as a 320-pixel screen with a 48-pixel margin on each side. None of it is enabled in the build.

## Technical details

The numbers are unusually clean. The boot executable is 606 KB holding 2,930 functions and 115,636 instructions, which averages under 40 instructions per function: a lot of small, sprite-driven routines rather than a few large systems. 1,640 of them were seeded straight from the boot executable's call targets.

Against Marvel vs. Capcom's image, the difference in how well the analysis holds up is stark. Metal Slug X has 799 verified functions to 379 rated low, where Marvel vs. Capcom has 326 verified to 1,541 low. It has zero undecoded words and zero partially recovered functions, and needed only 24 jump tables resolved. Coverage reaches 462,544 of 620,544 bytes, and 1,541 of the 2,930 functions are reachable from the entry point.

What it does have a lot of is function pointers: 974 functions have their address taken somewhere in the image, against 168 indirect calls the analysis could not resolve. The symbol map is at 210 entries, 52 of them named by hand.

## Sources

- [Metal-Slug-X-Recomp README, analysis files and releases (GitHub)](https://github.com/TechnicallyComputers/Metal-Slug-X-Recomp)
