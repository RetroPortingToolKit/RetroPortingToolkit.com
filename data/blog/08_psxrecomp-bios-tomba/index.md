---
title: "psxrecomp Overhauled. Now BIOS + Tomba"
kicker: "1379.tech"
tags: []
featured: false
desc: "The PSX recompiler starts booting the real SCPH1001 BIOS as its kernel, with Tomba! reasonably playable on top."
date: "2026-05-21"
venue: "1379.tech"
group: "From the team"
layout: "article"
links:
  - { label: "Read on 1379.tech", href: "https://1379.tech/psxrecomp-overhauled-now-bios-tomba/" }
---

This post documents the overhaul that defined PSXRecomp's architecture: instead of faking the PlayStation's operating system with high-level stubs, the recompiler statically recompiles the SCPH1001 BIOS itself and uses it as the kernel. The real boot sequence, disc detection, and memory-card management all run as native code.

On top of that foundation, Tomba! is described as reasonably playable: BIOS boot, disc detection, FMV playback, memory cards, and gameplay all working. The post is equally clear about what does not work yet, with an honest caveat about functions the game loads into RAM at runtime, which the static pass cannot see ahead of time and calls "dirty RAM" code.

The roadmap laid out here, multi-disc support, streamed music, and widescreen, reads in hindsight like a checklist the ecosystem then spent the following months completing.

Related: [Tomba!](/software/tomba) on [PlayStation](/hardware/playstation).
