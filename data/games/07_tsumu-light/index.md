---
title: "Tsumu Light"
kicker: "PlayStation"
tags: ["English translation", "Runtime text"]
featured: true
desc: "A puzzle game that never left Japan, now speaking English: an original fan translation applied at runtime, without touching the disc."
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

Tsumu Light is a hamster-themed stacking puzzle game that only ever released in Japan. This core [PSXRecomp](/hardware/playstation) project pairs the recompilation with an original English fan translation, so the menus, the stage names, and even the save dialogs finally read in English. It is the smallest game in the lineup and the one that shows the framework can do more than run code: it can localize.

## Playable status

Yes, as a playable alpha. A Windows package is on the GitHub releases page. The game is built from a dump you provide: your Tsumu Light (Japan) disc image, plus a standard PlayStation BIOS file.

English is the default language in the launcher, with the original Japanese one setting away. The puzzle stages play start to finish, and the game boots instantly.

## What the recomp adds

The translation is the reason this project exists. It covers the HUD, the menus, the stage-select names and high-score labels, and the memory-card save, format, and quit dialogs. It lives in a plain data file, translations/tsumu.toml, and is applied at runtime, so the game's own assets are never modified and the text can be revised without touching the game image at all.

Two smaller comforts come with it:

- Instant boot: the console startup sequence is skipped and the game launches straight in. The authentic slow boot remains available as an option.
- Keyboard or a DualShock and DualSense style pad both work. Tsumu is a digital game, so the pad presents as a digital controller and the analog options stay out of the way.


## Sources

- [Project README and releases (GitHub)](https://github.com/mstan/TsumuLightRecomp)
