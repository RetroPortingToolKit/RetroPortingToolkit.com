---
title: "The Future of Game Preservation is Decomp-Annotated-Recomps"
kicker: "1379.tech"
tags: []
featured: true
desc: "One named address, one line of code, and Mario moves differently: why recomp versus decomp was never the real fight."
date: "2026-08-17"
venue: "1379.tech"
layout: "article"
links:
  - { label: "Read on 1379.tech", href: "https://1379.tech/recomp-vs-decomp-wrong-question/" }
---

The most recent essay from the team argues that static recompilation and decompilation are not rivals. They are layers of the same preservation strategy. A recomp gets a game running natively now; disassembly annotations then make that output progressively more source-like.

The concrete example is [Super Mario World](/games/super-mario-world), where 1,937 of the recompiled game's 2,074 functions carry real names from disassembly data. That density is what turns a one-line change into a real mod: the essay alters Mario's horizontal movement physics by overriding a single named address.

It also shows what opens up once a game is code instead of a ROM inside an emulator: NES-framework tech demos running 3D skeletal models, 44.1 kHz audio mixing, and particle effects, none of which the original hardware could do. The through-line is that framework improvements compound. Every new game exposes an assumption hiding in the shared runtime, and fixing it benefits every other title.

Related: [Super Mario World](/games/super-mario-world) on [Super Nintendo](/hardware/super-nintendo).
