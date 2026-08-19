---
title: "Expanding the *recomp ecosystem with GBARecomp"
kicker: "1379.tech"
tags: []
featured: true
desc: "The GBA joins the family, and the first binary GBARecomp ever booted was not a game but the console's own BIOS."
date: "2026-06-24"
venue: "1379.tech"
layout: "article"
links:
  - { label: "Read on 1379.tech", href: "https://1379.tech/expanding-the-recomp-ecosystem-with-gbarecomp/" }
---

This post announces GBARecomp, the project's first 32-bit static recompilation target. The ARM7TDMI brings a challenge none of the earlier consoles had: ARM/THUMB interworking, where the CPU switches between two instruction encodings mid-program and the recompiler has to follow it across the boundary.

The bring-up path is telling. The first binary GBARecomp ever booted was the GBA BIOS itself, and by the time of this announcement five games were booting to playable states. The framework backs its static output with a fallback interpreter plus a JIT that emits native shards, so code the static pass cannot resolve still runs while coverage improves.

The post also sets out the provenance requirements: the framework requires the user's own legally obtained BIOS and ROMs, and distributes neither. As the fourth-plus ecosystem built on the same playbook, GBARecomp makes a solid case that the approach generalizes across architectures rather than being a MIPS or 6502 trick.

Related: [Game Boy Advance](/hardware/game-boy-advance), including [The Minish Cap](/games/minish-cap) and [Mega Man Zero](/games/mega-man-zero).
