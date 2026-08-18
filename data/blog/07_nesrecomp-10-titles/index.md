---
title: "nesrecomp Achieves 10 Commercial Titles"
kicker: "1379.tech"
tags: []
featured: true
desc: "Ten NES games, four mappers, one shared runner: the point where a new game became a translation job, not a porting project."
date: "2026-05-21"
venue: "1379.tech"
group: "From the team"
layout: "article"
links:
  - { label: "Read on 1379.tech", href: "https://1379.tech/nesrecomp-achieves-10-commercial-titles/" }
---

Two months after its first public milestone, the NES ecosystem hits double digits: 10 commercial titles supported, spanning the NROM, MMC1, MMC3, and GxROM mappers. The pipeline translates 6502 assembly to C ahead of time, and every game runs on a single shared runner rather than a per-game fork.

The post explains the selection strategy behind the roster: games with good public disassemblies were prioritized, because existing annotation makes verification faster and the recompiled output more legible. That choice foreshadows the ecosystem's later direction, and the article already includes early prototyping of a recomp-to-decomp source-port path for Super Mario Bros., treating the recompiled C as a starting point for something progressively closer to source.

Ten titles on one runner makes the post's core argument on its own: mapper support, rendering, and input all live in shared code, so each new game is mostly a translation problem rather than a porting project.

Related: [Super Mario Bros.](/games/super-mario-bros), [The Legend of Zelda](/games/legend-of-zelda), and [Metroid](/games/metroid) on [NES](/hardware/nes).
