---
title: "Sonic the Hedgehog 2"
kicker: "Sega Genesis"
tags: ["Widescreen"]
featured: false
desc: "Sonic 2 running through SegaGenesisRecomp, with early widescreen and two-player versus work."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "sega-genesis"
repo: "https://github.com/mstan/SonicTheHedgehog2Recomp"
group: "Sega Genesis"
links:
  - { label: "SegaGenesisRecomp Gets Game #2: Sonic the Hedgehog 2 (1379.tech)", href: "https://1379.tech/segagenesisrecomp-gets-game-2-sonic-the-hedgehog-2/" }
verified: "2026-08-18"
updated: "2026-08-10"
added: "2026-05-05"
cover: "/data/blog/19_journey-with-ai-and-recompilation/SonicTheHedgehog2Recomp_5jt992tJom.png"
---

Sonic the Hedgehog 2 runs through [SegaGenesisRecomp](/hardware/sega-genesis).

It helped move the Genesis work past one-game assumptions. The framework had to become more configurable, and the game brought split-screen versus into the test set.

![Emerald Hill Zone, running as a native build.](/previews/sonic-the-hedgehog-2.mp4)

## Playable status

Playable alpha. You can boot the game and navigate stages. Less traveled paths, especially boss fights, are likely to still have issues.

Windows builds are on the releases page, alongside experimental Linux and macOS builds. The game is built from a ROM dump you provide.

## What the recomp adds

The opt-in 16:9 widescreen setting shared with the other Genesis titles: real extra columns instead of stretching the image.

Two-player versus works natively. The project also exposes display options for the original split-screen mode, including a TV-style view and a raw full-height view.

One known behavioral difference: the half-pipe special stages run faster than they should. The project still needs frame-lag behavior for that path.


## Sources

- [SegaGenesisRecomp Gets Game #2: Sonic the Hedgehog 2 (1379.tech)](https://1379.tech/segagenesisrecomp-gets-game-2-sonic-the-hedgehog-2/)
- [Project README and release notes (GitHub)](https://github.com/mstan/SonicTheHedgehog2Recomp)
