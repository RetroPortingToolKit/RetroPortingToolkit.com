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
  - { label: "Watch: save states and rewind in Tomba", href: "/blog/video-tomba-save-states-rewind" }
cover: "https://i.ytimg.com/vi/L36ppNkuJG0/hqdefault.jpg"
videoUrl: "https://www.youtube.com/watch?v=L36ppNkuJG0"
verified: "2026-08-18"
---

retcomm-rbengine is the ecosystem's rollback engine: a platform-agnostic library of the host policies that make rollback netplay, and the snapshots underneath it, feel playable. It began life inside psxrecomp's runtime and was lifted out with the PlayStation-specific types removed, so any recompilation host can use it. MIT licensed, maintained by TechnicallyComputers.

## What it does

Six small modules that together manage time: a scheduler for admit pacing (when to run a frame, when to wait, when to invent an input), per-slot input history with hold-last invention, hash confirmation that compares local and peer frame commits, a tick-keyed snapshot ring, a filter for stale rollback messages, and a monotonic clock helper. The snapshot ring is the substrate that save states are built on, and the same machinery enables rewind. It depends on [recomp-net](/games/recomp-net), which owns the network session and wire protocol; this library owns what the host does with them.

## Which projects use it

[PSXRecomp](/hardware/playstation) builds on it for save states and rewind, both shown publicly in the Tomba showcase video (2026-08-12). Game-specific pieces, such as savestate serialization and state digests, stay in each engine and bind in through the library's hooks.

## Sources

- [Save states and rewind, shown off in Tomba (video)](/blog/video-tomba-save-states-rewind)
- [retcomm-rbengine README (GitHub)](https://github.com/TechnicallyComputers/retcomm-rbengine)
