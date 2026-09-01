---
title: "Nintendo DS"
kicker: "ARM9+ARM7"
tags: ["Dual CPU", "Adaptive 21:9"]
featured: false
desc: "An alpha ecosystem for native Nintendo DS ports. Metroid Prime Hunters is public, and a few other titles are running in development."
year: "2026"
status: "Alpha"
maturity: "Alpha"
availability: "Source only"
provenance: "core"
arch: "ARM946E-S + ARM7TDMI"
repo: "https://github.com/mstan/ndsrecomp"
group: "Early platform work"
links:
  - { label: "Building & Enhancing Recomps: Ecosystem Updates (1379.tech)", href: "https://1379.tech/building-enhancing-recomps-ecosystem-updates/" }
  - { label: "GenerationAmiga on Metroid Prime Hunters", href: "https://www.generationamiga.com/2026/08/16/metroid-prime-hunters-recomp-brings-the-nintendo-ds-classic-to-pc/" }
verified: "2026-08-18"
updated: "2026-08-31"
cover: "./mascot-room.webp"
---

ndsrecomp turns Nintendo DS games into native apps.

This is alpha work. It is past a simple proof of concept, but it still needs optimization, testing, and more public game projects.

You provide your own cartridge dump. Projects may also ask for legally obtained DS BIOS or firmware files.

## What runs today

[Metroid Prime Hunters](/games/metroid-prime-hunters) is the public game project today. It has adaptive widescreen work for the top screen.

The framework can run a few other titles in development, but those are not public compatibility promises yet.

The exact state still belongs on each game page. The platform page is here to explain the ecosystem.

## What DS ports can add

- Wider or custom layouts for the top and bottom screens.
- Mouse, touch, and gamepad-friendly input.
- Display options that fit modern monitors.
- Online and local multiplayer experiments where a game project supports them.
- Game-specific quality-of-life features.

## What to expect

Nintendo DS is more complex than the older cartridge systems here.

There are two CPUs, two screens, touch input, firmware behavior, wireless features, and a lot of timing-sensitive hardware. ndsrecomp is promising alpha work, but each game still needs serious bring-up and optimization.
