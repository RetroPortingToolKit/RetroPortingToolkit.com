---
title: "retcomm-rbengine"
author: "Shokunin"
kicker: "Library"
tags: ["Rollback", "Save states"]
featured: false
desc: "The snapshot ring behind save states and rewind: a platform-agnostic rollback engine shared across the recomp ecosystems."
date: "2026-08-12"
repo: "https://github.com/TechnicallyComputers/retcomm-rbengine"
links:
  - { label: "Watch: save states and rewind in Tomba", href: "/blog/video-tomba-save-states-rewind" }
cover: "https://i.ytimg.com/vi/L36ppNkuJG0/hqdefault.jpg"
videoUrl: "https://www.youtube.com/watch?v=L36ppNkuJG0"
verified: "2026-08-18"
updated: "2026-08-31"
added: "2026-08-12"
---

retcomm-rbengine is the ecosystem's rollback engine: a platform-agnostic library for snapshots, save states, and rewind. It began life inside psxrecomp's runtime and was lifted out with the PlayStation-specific types removed, so any recompilation host can use it. MIT licensed, maintained by TechnicallyComputers.

## What it does

Its modules manage frame timing and a tick-keyed snapshot ring. The snapshot ring is the substrate that save states are built on, and the same machinery enables rewind.

![Tomba on PSXRecomp, the runtime this library was lifted out of](/previews/retcomm-rbengine.mp4)

## Which projects use it

[PSXRecomp](/hardware/playstation) builds on it for save states and rewind, both shown publicly in the Tomba showcase video (2026-08-12).

![Save states and rewind, shown off in Tomba](https://www.youtube.com/watch?v=L36ppNkuJG0)

Game-specific pieces, such as savestate serialization and state digests, stay in each engine and bind in through the library's hooks.

## Sources

- [Save states and rewind, shown off in Tomba (video)](/blog/video-tomba-save-states-rewind)
- [retcomm-rbengine README (GitHub)](https://github.com/TechnicallyComputers/retcomm-rbengine)
