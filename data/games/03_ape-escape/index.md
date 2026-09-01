---
title: "Ape Escape"
kicker: "PlayStation"
tags: ["Widescreen"]
featured: false
desc: "The first public PSXRecomp game built around analog movement and camera control."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "playstation"
repo: "https://github.com/mstan/ApeEscapeRecomp"
group: "PlayStation"
verified: "2026-08-18"
updated: "2026-08-11"
added: "2026-06-07"
cover: "./ape-escape.png"
---

Ape Escape is a milestone for [PSXRecomp](/hardware/playstation): the first public PlayStation recomp here built around analog movement and camera control.

That matters because Ape Escape is not a digital-pad game with analog added later. Movement, camera control, gadgets, and monkey-catching all depend on analog input feeling right.

## Playable status

Yes, as a playable alpha. Windows and experimental Linux packages are on the GitHub releases page. The game is built from a dump you provide: your Ape Escape (USA) disc image, and a bundled open-source BIOS boots it out of the box.

It has been played end to end. Treat it as an alpha, but not just a boot demo.

## What the recomp adds

Widescreen is the headline, in 16:9, 21:9, and Adaptive modes. Adaptive follows the live window shape from 4:3 through 21:9, opening up the 3D field of view rather than stretching the picture.

![Running at 21:9](./ape-escape-21x9.png)

The rest of the additions:

- Frame blending at your display's refresh rate or a fixed 60, 120, 144, or 165, with a Clarity mode that reduces double-image trails.
- FMV skipping that ends movies through the game's normal completion path.

## Sources

- [Project README and releases (GitHub)](https://github.com/mstan/ApeEscapeRecomp)
