---
title: "PlayStation"
kicker: "MIPS"
tags: ["Widescreen", "Netplay", "Mods", "Save states"]
featured: true
desc: "Seven core-team games are playable today, and the same framework powers community ports of Spyro, Xenogears, and Pepsiman."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
arch: "MIPS R3000A"
repo: "https://github.com/mstan/psxrecomp"
group: "Active platform ecosystems"
links:
  - { label: "I Built a PS1 Static Recompiler With No Prior Experience (1379.tech)", href: "https://1379.tech/i-built-a-ps1-static-recompiler-with-no-prior-experience-and-claude-code/" }
  - { label: "psxrecomp Overhauled. Now BIOS + Tomba (1379.tech)", href: "https://1379.tech/psxrecomp-overhauled-now-bios-tomba/" }
  - { label: "Watch: save states and rewind in Tomba", href: "/blog/video-tomba-save-states-rewind" }
verified: "2026-08-18"
cover: "./mod-launcher.png"
---

Seven core-team PlayStation games are playable today, and the same framework powers community projects like [OpenPete's Spyro the Dragon](/games/openpete-spyro) and the browser build of [Pepsiman](/games/pepsiman). PSXRecomp is the toolkit's most established ecosystem: it takes a game's original program off the disc, rebuilds it as a native app for modern systems, and leaves the game logic untouched. Every game builds from a disc dump you provide.

## What runs today

The core titles ship as standalone builds with their own launchers: [Tomba!](/games/tomba), [Tomba! 2](/games/tomba-2), [Ape Escape](/games/ape-escape), [Mega Man X4](/games/mega-man-x4), [Mega Man X5](/games/mega-man-x5), [Mega Man X6](/games/mega-man-x6), and [Tsumu Light](/games/tsumu-light). Community projects extend the list: [OpenPete (Spyro the Dragon)](/games/openpete-spyro), [Xenogears](/games/xenogears), [Pepsiman](/games/pepsiman), [Twisted Metal 4](/games/twisted-metal-4), and [Street Fighter Alpha 3](/games/street-fighter-alpha-3).

No BIOS dump is needed to play: builds boot the bundled open-source OpenBIOS by default, and a retail BIOS dump can be selected instead. The project is careful to note that a playable catalog is not a promise that any game works without game-specific fixes, and the Vulkan renderer is experimental.

## What the recomp adds

- Widescreen that genuinely widens the view rather than stretching it, on 3D and 2D games alike, up to 21:9. Tomba! 2 tracks the window adaptively; the authentic 4:3 output stays byte-identical when widescreen is off.
- Save states and rewind, shown publicly [on Tomba!](/blog/video-tomba-save-states-rewind).
- Mods as versioned packages with independently toggleable features. Your disc image is never rewritten, so a mod turns off as easily as it turned on.
- Live language switching: translations are hot-reloaded TOML tables, so a Japanese-only game like Tsumu Light can be played in English, and a translator can see an edited line in-game without rebuilding.
- Supersampling, plus opt-in fixes for the PS1's polygon jitter and texture warp that leave game logic untouched.
- Authentic 1x CD-ROM load times by default, with opt-in turbo and fast-loading mods when you want them.
- Opt-in netplay support, in active development on the shared [recomp-net](/games/recomp-net) rollback library.
- Games get faster as you play them: code the disc streams in at runtime is captured and compiled to native code in the background, and your discoveries persist between sessions.

## Technical details

PSXRecomp translates a game's MIPS R3000A machine code to C and compiles it as a native program linked against a hardware-accurate runtime. The architecture is LLE-first: the recompiled BIOS, either the bundled OpenBIOS or a compatible retail image, runs as the actual kernel and serves as the correctness oracle, with an opt-out high-level tier layered on top for instant boot. Code that cannot be seen ahead of time, mainly disc-streamed overlays, is captured on first load and recompiled to cached native code; a small MIPS interpreter remains as a transient safety net that the project intends to compile away. Renderers are software, OpenGL (default), and experimental Vulkan. The framework builds on Windows, macOS, and Linux; the ready-made CLI release is currently 64-bit Windows.

## Sources

- [I Built a PS1 Static Recompiler With No Prior Experience (1379.tech)](https://1379.tech/i-built-a-ps1-static-recompiler-with-no-prior-experience-and-claude-code/)
- [psxrecomp Overhauled. Now BIOS + Tomba (1379.tech)](https://1379.tech/psxrecomp-overhauled-now-bios-tomba/)
- [Time Extension on OpenPete and PSXRecomp](https://www.timeextension.com/news/2026/08/ps1-classic-spyro-the-dragon-comes-to-pc-with-the-help-of-ai-assisted-tool-psxrecomp)
- [Notebookcheck on Pepsiman in the browser](https://www.notebookcheck.net/A-recompiled-version-of-Pepsiman-lets-you-play-the-PS1-cult-classic-natively-in-your-browser-at-60-FPS.1354060.0.html)
- [retro-gamer.jp on Twisted Metal 4 (Japanese)](https://retro-gamer.jp/?p=45562)
- [Watch: save states and rewind in Tomba](/blog/video-tomba-save-states-rewind)
