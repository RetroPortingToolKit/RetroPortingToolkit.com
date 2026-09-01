---
title: "Tsumu Light"
kicker: "PlayStation"
tags: ["English translation", "Runtime text"]
featured: true
desc: "A Japan-only puzzle game with an English fan translation applied at runtime."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "playstation"
repo: "https://github.com/mstan/TsumuLightRecomp"
group: "PlayStation"
verified: "2026-08-18"
updated: "2026-08-11"
added: "2026-07-07"
cover: "./boxart.jpg"
---

Tsumu Light is a hamster-themed stacking puzzle game that only released in Japan.

This [PSXRecomp](/hardware/playstation) project pairs the native build with an original English fan translation. Menus, stage names, save dialogs, and other text now read in English.

## Playable status

Yes, as a playable alpha. A Windows package is on the GitHub releases page. The game is built from a dump you provide: your Tsumu Light (Japan) disc image, plus a legally obtained PlayStation BIOS file.

English is available from the launcher, with the original Japanese text still available. The puzzle stages play start to finish.

## What the recomp adds

The translation is the reason this project exists. It covers the HUD, menus, stage select, high scores, and memory-card dialogs.

The translation lives in `translations/tsumu.toml` and is applied at runtime. The game image is not modified, and the translation can be revised without rebuilding the disc.


## Sources

- [Project README and releases (GitHub)](https://github.com/mstan/TsumuLightRecomp)
