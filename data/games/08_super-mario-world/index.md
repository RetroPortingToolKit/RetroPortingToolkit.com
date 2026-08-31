---
title: "Super Mario World"
kicker: "Super Nintendo"
tags: ["Adaptive widescreen", "MSU-1", "Mods"]
featured: true
desc: "The flagship SNES recompilation, playable end to end with adaptive widescreen and MSU-1 music support."
year: "2026"
status: "Mature alpha"
availability: "Public build"
provenance: "core"
platform: "super-nintendo"
repo: "https://github.com/mstan/SuperMarioWorldRecomp"
group: "Super Nintendo"
links:
  - { label: "Watch: character replacement in Super Mario World", href: "/blog/video-smw-character-test" }
  - { label: "snesrecomp's First Title: Super Mario World (1379.tech)", href: "https://1379.tech/snesrecomps-first-title-super-mario-world/" }
  - { label: "The Future of Game Preservation is Decomp-Annotated-Recomps (1379.tech)", href: "https://1379.tech/recomp-vs-decomp-wrong-question/" }
cover: "./smw-wide.png"
videoUrl: "https://www.youtube.com/watch?v=Owuku0zj4As"
verified: "2026-08-18"
updated: "2026-08-15"
added: "2026-04-01"
---

Super Mario World was the first game [SNESRecomp](/hardware/super-nintendo) ever recompiled, and it is still the flagship core project.

It runs the original game as a native program on your PC, with room for enhancements on top of the stock game.

![Super Mario World running as a native program.](/previews/super-mario-world.mp4)

## Playable status

Yes. It is playable end to end as a mature alpha.

Windows and Linux packages are on the GitHub releases page. It is built from a dump you provide: on first launch the game asks for your Super Mario World (USA) ROM.

## What the recomp adds

Start with the picture. There are three view modes: standard 4:3, fixed 16:9, and adaptive. Adaptive follows your window, so resizing wider reveals more of the level instead of stretching it.

![Adaptive widescreen: a wider window shows more level, not a wider Mario.](./smw-wide.png)

The rest of what the build adds:

- MSU-1 audio: CD-quality streaming music with a music pack you supply. Without one, you get the authentic soundtrack.
- Save states and turbo.

Mods can go past settings. An experimental Smash Bros. 64 catalog includes Captain Falcon as the first playable character option. It needs your own Super Smash Bros. 64 ROM for the donor content.

![Character replacement test](/covers/smw-character.jpg)

A replacement is behavior-level rather than a fresh sprite pasted over Mario: movement, abilities, animation, and sound all change with the character.

![Character replacement running in a stock level.](https://www.youtube.com/watch?v=Owuku0zj4As)


## Sources

- [SuperMarioWorldRecomp README (GitHub)](https://github.com/mstan/SuperMarioWorldRecomp)
- [SMW character replacement test (Gamemaster1379)](/blog/video-smw-character-test)
- [snesrecomp's First Title: Super Mario World (1379.tech)](https://1379.tech/snesrecomps-first-title-super-mario-world/)
- [The Future of Game Preservation is Decomp-Annotated-Recomps (1379.tech)](https://1379.tech/recomp-vs-decomp-wrong-question/)
