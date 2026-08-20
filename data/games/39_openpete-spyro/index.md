---
title: "OpenPete (Spyro the Dragon)"
kicker: "PlayStation"
tags: ["PC port", "Widescreen", "High framerate"]
featured: true
desc: "Spyro the Dragon as a native Windows app: save states, rewind, widescreen, and framerates the PlayStation never allowed."
year: "2026"
status: "Released"
availability: "Public build"
provenance: "community"
platform: "playstation"
group: "Community"
links:
  - { label: "Visit openpete.com", href: "https://openpete.com" }
  - { label: "PS1 Classic Spyro Comes To PC With PSXRecomp (Time Extension)", href: "https://www.timeextension.com/news/2026/08/ps1-classic-spyro-the-dragon-comes-to-pc-with-the-help-of-ai-assisted-tool-psxrecomp" }
  - { label: "Spyro the Dragon fan PC port at 240 FPS (ixbt.games)", href: "https://ixbt.games/en/news/2026/08/16/spustia-28-let-na-pk-mozno-poigrat-v-originalnuiu-spyro-the-dragon-s-playstation-1-v-240-fps-vysel-fanatskii-pk-port.html" }
verified: "2026-08-18"
cover: "./openpete-spyro.jpg"
---

OpenPete is a community-built native PC port of Spyro the Dragon, named after Spyro's development codename. It is a hybrid: functions the fan decompilation has worked out by hand run as rewritten code, and [PSXRecomp](/hardware/playstation) covers everything the decompilation has not reached yet. The result plays like Spyro, but behaves like a modern PC game.

## Can I play it?

Yes, on Windows. The current build is v0.1.4 (2026-08-17), downloadable from [openpete.com](https://openpete.com) and built from a disc dump you provide (Spyro the Dragon, NTSC-U, SCUS-94228). Linux builds from source today, with a packaged release planned; macOS on Apple silicon is planned. The source tree is not yet public: the project says it still carries copyrighted game data used for validation, which has to be separated out first.

## What the port adds

Rendering is decoupled from the original 29.913 Hz simulation, so the framerate is whatever your machine can do; press coverage showed it running at 240 FPS. Beyond that: widescreen at 16:9, 21:9, or 32:9, extended draw distance, save states and rewind, HD texture pack support, music replacement for all 48 tracks, and optional PSX-style visual modes for anyone who wants the original look back. Gameplay is untouched; the changes are presentation only. The developers have said they hope to extend the work to Spyro 2 and 3.

## Technical details

Three components meet in the middle. The spyro-1 matching decompilation supplies hand-written source for the functions it covers (Time Extension credits altro50's still-unfinished decompilation work). Matthew Stanley's PSXRecomp, an AI-assisted static recompiler, translates the remaining MIPS machine code to C. SoapyMan's PsyCross provides the platform layer in place of the PSY-Q libraries. On top of all that sits a custom Vulkan renderer that draws from game state directly rather than reproducing the PS1 GPU. The port is developed by Amec and tyscorp.

## Sources

- [openpete.com](https://openpete.com)
- [PS1 Classic Spyro Comes To PC With PSXRecomp (Time Extension)](https://www.timeextension.com/news/2026/08/ps1-classic-spyro-the-dragon-comes-to-pc-with-the-help-of-ai-assisted-tool-psxrecomp)
- [Spyro the Dragon fan PC port at 240 FPS (ixbt.games)](https://ixbt.games/en/news/2026/08/16/spustia-28-let-na-pk-mozno-poigrat-v-originalnuiu-spyro-the-dragon-s-playstation-1-v-240-fps-vysel-fanatskii-pk-port.html)
