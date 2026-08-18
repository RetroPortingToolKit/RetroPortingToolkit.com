---
title: "Tsumu Light"
kicker: "PlayStation"
tags: ["English translation", "Runtime text"]
featured: true
desc: "A puzzle game that never left Japan, now speaking English: an original fan translation applied at runtime, no ROM patching."
year: "2026"
status: "Alpha"
provenance: "core"
platform: "playstation"
repo: "https://github.com/mstan/TsumuLightRecomp"
group: "PlayStation"
links:
  - { label: "TsumuLightRecomp on GitHub", href: "https://github.com/mstan/TsumuLightRecomp" }
---

Tsumu Light is a Japanese PlayStation puzzle game that never released outside Japan. This [PSXRecomp](/hardware/playstation) project, currently at v0.0.2 (2026-07-10), pairs the recompilation with an original English fan translation, so the game finally reads in English.

## What works today

The game runs through the recompiled runtime with the translation available from the launcher.

## Enhancements

The English translation is applied at runtime from translations/tsumu.toml rather than by patching the ROM, and it is selectable in the launcher. Because the text lives in a plain data file, the translation can be revised without touching the game image at all.

No game data is distributed; the project builds from your own legally dumped disc image.
