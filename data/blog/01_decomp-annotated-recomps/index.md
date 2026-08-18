---
title: "The Future of Game Preservation is Decomp-Annotated-Recomps"
kicker: "1379.tech"
tags: []
featured: true
desc: "Why the recomp-versus-decomp debate misses the point, argued with a one-line Super Mario World physics mod."
date: "2026-08-17"
venue: "1379.tech"
group: "From the team"
layout: "article"
links:
  - { label: "Read on 1379.tech", href: "https://1379.tech/recomp-vs-decomp-wrong-question/" }
---

The most recent essay from the team argues that recompilation and decompilation are not competitors but layers of the same preservation strategy. A recomp gets a game running natively now; disassembly annotations then make that output progressively more source-like.

The concrete example is [Super Mario World](/software/super-mario-world), where 1,937 of the recompiled game's 2,074 functions carry real names from disassembly data. That density is what turns a one-line change into a real mod: the essay demonstrates altering Mario's horizontal movement physics by overriding a single named address.

It also shows where the ceiling is once a game is code instead of a ROM inside an emulator: NES-framework tech demos running 3D skeletal models, 44.1 kHz audio mixing, and particle effects, none of which the original hardware could do. The through-line is that framework improvements compound: every new game exposes an assumption hiding in the shared runtime, and fixing it benefits every other title.

Related: [Super Mario World](/software/super-mario-world) on [Super Nintendo](/hardware/super-nintendo).
