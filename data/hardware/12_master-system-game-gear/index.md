---
title: "Master System and Game Gear"
kicker: "Z80"
tags: ["Cross-platform", "Shared Z80 core"]
featured: false
desc: "A very early tech demo for Sega's 8-bit systems. One Master System game and one Game Gear game have narrow bring-up."
year: "2026"
status: "Tech demo"
maturity: "Tech demo"
availability: "Public build"
provenance: "core"
arch: "Zilog Z80"
repo: "https://github.com/mstan/smsggrecomp"
group: "Early platform work"
links:
  - { label: "Recomp + AI: 5 Months Later (1379.tech)", href: "https://1379.tech/recomp-ai-5-months-later/" }
verified: "2026-08-20"
cover: "./sonicblast-gameplay.png"
---

smsggrecomp is a very early tech demo for Sega's 8-bit systems.

It targets both Master System and Game Gear because the two machines are closely related.

You provide your own cartridge dump.

## What runs today

[Sonic the Hedgehog](/games/sonic-the-hedgehog-sms) on Master System can play Green Hill Zone.

[Sonic Blast](/games/sonic-blast) on Game Gear reaches its title screen.

That is the current scope. These are narrow demos, not end-to-end releases, and they do not include major enhancements yet.

## What these ports can add

- Native desktop builds.
- Gamepad-friendly runners.
- Modern window handling.
- Debugging tools for checking game behavior.
- Future enhancement work, once the base games are stronger.

## What to expect

Treat this as a tech demo.

It proves the shared Z80 path can work for these systems. It does not yet guarantee complete games, polished releases, or broad compatibility.
