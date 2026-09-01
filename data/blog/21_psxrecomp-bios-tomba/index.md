---
title: "psxrecomp Overhauled. Now BIOS + Tomba"
author: "Matthew Stanley"
kicker: "1379.tech"
tags: []
featured: true
desc: "PSXRecomp moves from a narrow Tomba proof of concept to a BIOS-first foundation that more PlayStation games can share."
date: "2026-05-21"
venue: "1379.tech"
layout: "article"
cover: "./f50d04fb-2bc2-4854-8649-4f593853ea8f.png"
links:
  - { label: "Read the original on 1379.tech", href: "https://1379.tech/psxrecomp-overhauled-now-bios-tomba/" }
---

PSXRecomp's early Tomba work initially relied on high-level replacements for PlayStation services. The overhaul described here instead recompiles and boots a real BIOS supplied by the user, then runs the game on top of that more faithful base.

That architectural change matters beyond Tomba. Moving common system behavior into a reusable foundation reduces the number of game-specific assumptions and gives later PlayStation ports a clearer place to start.

[Read Matt's PSXRecomp overhaul article on 1379.tech →](https://1379.tech/psxrecomp-overhauled-now-bios-tomba/)

Related: [Tomba!](/games/tomba) on [PlayStation](/hardware/playstation).
