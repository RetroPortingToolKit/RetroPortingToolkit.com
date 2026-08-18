---
title: "retcomm-rbengine"
kicker: "Library"
tags: ["Rollback", "Save states"]
featured: false
desc: "Platform-agnostic rollback engine whose snapshot ring underpins save states and rewind across the recomp ecosystems."
year: "2026"
status: "Active"
provenance: "community"
repo: "https://github.com/TechnicallyComputers/retcomm-rbengine"
group: "Shared libraries"
links:
  - { label: "retcomm-rbengine on GitHub", href: "https://github.com/TechnicallyComputers/retcomm-rbengine" }
  - { label: "Save states & rewind showcase (video)", href: "https://www.youtube.com/watch?v=L36ppNkuJG0" }
---

retcomm-rbengine describes itself as "A platform agnostic rollback engine for RetComM runtime environments". It is MIT-licensed, maintained by TechnicallyComputers, and was lifted from psxrecomp/runtime with the PSX-specific types removed so any recompilation host can use it.

## What it provides

Modules for admit pacing, input history, hash confirm, and a tick-keyed snapshot ring.

## Why it matters

The snapshot ring is the substrate that save states are built on, and the same machinery enables rewind: both were shown publicly in the [PSXRecomp](/hardware/playstation) Tomba save states and rewind showcase video (2026-08-12). It also pairs with [recomp-net](/software/recomp-net), where rollback netcode support is developing.

The library ships no game data of any kind; it is infrastructure that recompilation projects link against.
