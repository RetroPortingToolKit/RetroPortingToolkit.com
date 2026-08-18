---
title: "PlayStation"
kicker: "MIPS"
tags: ["Widescreen", "Netplay", "Mods", "Save states"]
featured: true
desc: "PSXRecomp, the most established ecosystem: recompiles the real PS1 BIOS and runs seven playable first-party titles."
year: "2026"
status: "Established"
provenance: "core"
arch: "MIPS R3000A"
repo: "https://github.com/mstan/psxrecomp"
group: "Established"
links:
  - { label: "psxrecomp on GitHub", href: "https://github.com/mstan/psxrecomp" }
  - { label: "I Built a PS1 Static Recompiler With No Prior Experience (1379.tech)", href: "https://1379.tech/i-built-a-ps1-static-recompiler-with-no-prior-experience-and-claude-code/" }
  - { label: "psxrecomp Overhauled. Now BIOS + Tomba (1379.tech)", href: "https://1379.tech/psxrecomp-overhauled-now-bios-tomba/" }
  - { label: "Save states & rewind showcase (video)", href: "https://www.youtube.com/watch?v=L36ppNkuJG0" }
---

PSXRecomp statically recompiles PlayStation games from MIPS R3000A machine code into C, then builds them as native programs. It is the most established ecosystem in the toolkit: it recompiles the real console BIOS and runs it as the kernel, and it is the decoder behind community projects like [OpenPete's Spyro the Dragon](/software/openpete-spyro) and the browser port of [Pepsiman](/software/pepsiman).

## What works today

Seven first-party titles are playable: [Tomba!](/software/tomba), [Tomba! 2](/software/tomba-2), [Ape Escape](/software/ape-escape), [Mega Man X4](/software/mega-man-x4), [X5](/software/mega-man-x5), [X6](/software/mega-man-x6), and [Tsumu Light](/software/tsumu-light). The runtime is LLE-first: it boots the redistributable OpenBIOS image by default, or a user-supplied retail BIOS, with an opt-out high-level tier. A small MIPS interpreter remains as a transient safety net for code that is not yet statically resolved, meant to be compiled away over time. The project is careful to note that playable titles are not a promise that every game works without game-specific fixes.

## Enhancements

Widescreen up to 21:9 including adaptive widescreen, supersampling, a mod loader that never modifies the original disc image, live language switching, save states with rewind, and an opt-in netplay build backed by the shared [recomp-net](/software/recomp-net) library. The Vulkan renderer is experimental.

## Software

- Core: [Tomba!](/software/tomba), [Tomba! 2](/software/tomba-2), [Ape Escape](/software/ape-escape), [Mega Man X4](/software/mega-man-x4), [Mega Man X5](/software/mega-man-x5), [Mega Man X6](/software/mega-man-x6), [Tsumu Light](/software/tsumu-light)
- Community: [OpenPete (Spyro the Dragon)](/software/openpete-spyro), [Xenogears](/software/xenogears), [Pepsiman](/software/pepsiman), [Twisted Metal 4](/software/twisted-metal-4)

## Reading

- [Time Extension on OpenPete and PSXRecomp](https://www.timeextension.com/news/2026/08/ps1-classic-spyro-the-dragon-comes-to-pc-with-the-help-of-ai-assisted-tool-psxrecomp)
- [Notebookcheck on Pepsiman in the browser](https://www.notebookcheck.net/A-recompiled-version-of-Pepsiman-lets-you-play-the-PS1-cult-classic-natively-in-your-browser-at-60-FPS.1354060.0.html)
- [retro-gamer.jp on Twisted Metal 4 (Japanese)](https://retro-gamer.jp/?p=45562)

PSXRecomp includes only the redistributable OpenBIOS image. Retail BIOS images and game discs remain copyrighted and are never distributed; every game builds from your own legally dumped copy.
