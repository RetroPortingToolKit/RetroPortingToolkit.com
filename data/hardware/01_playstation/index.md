---
title: "PlayStation"
kicker: "MIPS"
tags: ["Widescreen", "Netplay", "Mods", "Save states"]
featured: true
desc: "The toolkit's most established ecosystem, with seven playable core-team titles and the decoder behind community ports of Spyro and Pepsiman."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
arch: "MIPS R3000A"
repo: "https://github.com/mstan/psxrecomp"
group: "Active platform ecosystems"
links:
  - { label: "View source (GitHub)", href: "https://github.com/mstan/psxrecomp" }
  - { label: "I Built a PS1 Static Recompiler With No Prior Experience (1379.tech)", href: "https://1379.tech/i-built-a-ps1-static-recompiler-with-no-prior-experience-and-claude-code/" }
  - { label: "psxrecomp Overhauled. Now BIOS + Tomba (1379.tech)", href: "https://1379.tech/psxrecomp-overhauled-now-bios-tomba/" }
  - { label: "Watch: save states and rewind in Tomba", href: "/blog/video-tomba-save-states-rewind" }
verified: "2026-08-18"
cover: "./mod-launcher.png"
---

Seven core-team titles are playable today, and the same decoder powers community projects like [OpenPete's Spyro the Dragon](/games/openpete-spyro) and the browser port of [Pepsiman](/games/pepsiman). PSXRecomp is the most established ecosystem in the toolkit: it uses static recompilation to turn a PlayStation game into portable code that builds as a native app for modern systems.

## What can be used today

Seven core-team titles are playable: [Tomba!](/games/tomba), [Tomba! 2](/games/tomba-2), [Ape Escape](/games/ape-escape), [Mega Man X4](/games/mega-man-x4), [X5](/games/mega-man-x5), [X6](/games/mega-man-x6), and [Tsumu Light](/games/tsumu-light). The project is careful to note that playable titles are not a promise that every game works without game-specific fixes.

## Supported games

- Core: [Tomba!](/games/tomba), [Tomba! 2](/games/tomba-2), [Ape Escape](/games/ape-escape), [Mega Man X4](/games/mega-man-x4), [Mega Man X5](/games/mega-man-x5), [Mega Man X6](/games/mega-man-x6), [Tsumu Light](/games/tsumu-light)
- Community: [OpenPete (Spyro the Dragon)](/games/openpete-spyro), [Xenogears](/games/xenogears), [Pepsiman](/games/pepsiman), [Twisted Metal 4](/games/twisted-metal-4), [Street Fighter Alpha 3](/games/street-fighter-alpha-3)

## Enhancements

Widescreen up to 21:9 including adaptive widescreen, supersampling, a mod loader that never modifies the original disc image, live language switching, save states with rewind, and an opt-in netplay build backed by the shared [recomp-net](/games/recomp-net) library. The Vulkan renderer is experimental.

## Requirements

PSXRecomp includes only the redistributable OpenBIOS image, which it boots by default; a user-supplied retail BIOS also works. Retail BIOS images and game discs remain copyrighted and are never distributed; every game builds from the user's own disc dump.

## Known limitations

Playable titles are not a promise that every game works without game-specific fixes. The Vulkan renderer is experimental.

## Technical details

PSXRecomp takes a PlayStation game's MIPS R3000A machine code, turns it into C, and builds it as a native program. The runtime is LLE-first, deep enough to recompile the real console BIOS and run it as the kernel, with an opt-out high-level tier. A small MIPS interpreter remains as a transient safety net for code that is not yet statically resolved, meant to be compiled away over time.

## Get started

- [View source (GitHub)](https://github.com/mstan/psxrecomp)

## Sources and coverage

- [I Built a PS1 Static Recompiler With No Prior Experience (1379.tech)](https://1379.tech/i-built-a-ps1-static-recompiler-with-no-prior-experience-and-claude-code/)
- [psxrecomp Overhauled. Now BIOS + Tomba (1379.tech)](https://1379.tech/psxrecomp-overhauled-now-bios-tomba/)
- [Time Extension on OpenPete and PSXRecomp](https://www.timeextension.com/news/2026/08/ps1-classic-spyro-the-dragon-comes-to-pc-with-the-help-of-ai-assisted-tool-psxrecomp)
- [Notebookcheck on Pepsiman in the browser](https://www.notebookcheck.net/A-recompiled-version-of-Pepsiman-lets-you-play-the-PS1-cult-classic-natively-in-your-browser-at-60-FPS.1354060.0.html)
- [retro-gamer.jp on Twisted Metal 4 (Japanese)](https://retro-gamer.jp/?p=45562)
- [Watch save states and rewind showcase (video)](/blog/video-tomba-save-states-rewind)
