---
title: "Mario's Tennis"
kicker: "Virtual Boy"
tags: []
featured: false
desc: "The Virtual Boy lives: its framework's first and only title, running at correct play speed as a tech demo."
year: "2026"
status: "Tech demo"
availability: "Public build"
provenance: "core"
platform: "virtual-boy"
repo: "https://github.com/mstan/MarioTennisVirtualBoyRecomp"
group: "Virtual Boy"
links:
  - { label: "Build from your copy (GitHub)", href: "https://github.com/mstan/MarioTennisVirtualBoyRecomp" }
  - { label: "VirtualBoy Recomp Gets Its First Title: Mario Tennis (1379.tech)", href: "https://1379.tech/virtualboy-recomp-gets-its-first-title-mario-tennis/" }
verified: "2026-08-18"
---

Mario's Tennis is the first and so far only commercial title on [vbrecomp](/hardware/virtual-boy), the Virtual Boy static recompiler maintained by the core team.

## Can I play it?

Tech demo running at correct play speed. The current release is v0.2.0 (2026-06-29), an accuracy release that brought the game up to speed. You build from your own ROM dump.

## What works

Gameplay runs at correct play speed as of v0.2.0. The author's stated ambition for the platform is to visually enrich Virtual Boy titles beyond the original red-and-black presentation, but that work has not landed.

## Technical notes

The game runs as statically recompiled V810 code in the framework's step-budget cooperative yield runtime, validated against the Beetle VB libretro core as an oracle.

## Sources

- [VirtualBoy Recomp Gets Its First Title: Mario Tennis (1379.tech)](https://1379.tech/virtualboy-recomp-gets-its-first-title-mario-tennis/)
