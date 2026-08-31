---
title: "The Legend of Zelda: The Minish Cap"
kicker: "Game Boy Advance"
tags: ["Adaptive widescreen"]
featured: false
desc: "A GBARecomp preview for The Minish Cap, focused on native play, save states, and adaptive widescreen."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "game-boy-advance"
repo: "https://github.com/mstan/MinishCapRecomp"
group: "Game Boy Advance"
links:
  - { label: "Read: GBARecomp launch on 1379.tech", href: "https://1379.tech/expanding-the-recomp-ecosystem-with-gbarecomp/" }
verified: "2026-08-18"
updated: "2026-08-10"
added: "2026-05-25"
cover: "/covers/minish-cap.jpg"
---

The Minish Cap is one of the clearest [GBARecomp](/hardware/game-boy-advance) examples.

It runs as a native app from a cartridge dump you provide. The port keeps the original game behavior, then adds host features around it.

## Playable status

Yes, as an in-development preview. Windows builds are on the GitHub Releases page, and you can also build it from source.

The project expects the USA ROM and checks the file before it runs. Overworld, dialogue, and save states work. Not every corner of the game has been tested.

## What the recomp adds

The faithful default is the original 240x160 image.

![Native resolution: 240 pixels across, the view a GBA gives you.](./minish-cap-native.webp)

Adaptive widescreen opens the view as the window gets wider. It shows more of the room instead of stretching the old image.

![Adaptive widescreen: the same moment, now with the gardens on one side and the house on the other.](./minish-cap-adaptive.webp)
