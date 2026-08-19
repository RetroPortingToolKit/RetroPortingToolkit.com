---
title: "retcomm-rbengine"
kicker: "Library"
tags: ["Rollback", "Save states"]
featured: false
desc: "The snapshot ring behind save states and rewind: a platform-agnostic rollback engine shared across the recomp ecosystems."
year: "2026"
availability: "Source only"
provenance: "community"
repo: "https://github.com/TechnicallyComputers/retcomm-rbengine"
group: "Shared libraries"
links:
  - { label: "View source (GitHub)", href: "https://github.com/TechnicallyComputers/retcomm-rbengine" }
  - { label: "Watch: save states and rewind in Tomba", href: "/blog/video-tomba-save-states-rewind" }
cover: "https://i.ytimg.com/vi/L36ppNkuJG0/hqdefault.jpg"
videoUrl: "https://www.youtube.com/watch?v=L36ppNkuJG0"
verified: "2026-08-18"
---

retcomm-rbengine is a shared library that describes itself as "A platform agnostic rollback engine for RetComM runtime environments". MIT-licensed and maintained by TechnicallyComputers, it was lifted from psxrecomp/runtime with the PSX-specific types removed, so any recompilation host can use it.

## What it does

Modules for admit pacing, input history, hash confirm, and a tick-keyed snapshot ring. The snapshot ring is the substrate that save states are built on, and the same machinery enables rewind.

## Used by

[PSXRecomp](/hardware/playstation) builds on it for save states and rewind; both were shown publicly in the Tomba save states and rewind showcase video (2026-08-12). It also pairs with [recomp-net](/games/recomp-net), where rollback netcode support is developing.

## Sources

- [Save states & rewind showcase (video)](/blog/video-tomba-save-states-rewind)
