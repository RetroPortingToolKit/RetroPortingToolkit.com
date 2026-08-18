---
title: "segagenesisrecomp + Sonic the Hedgehog tech demo"
kicker: "1379.tech"
tags: []
featured: false
desc: "Sonic boots to Green Hill Zone as native code, with 133 functions verified in a single day of dual execution."
date: "2026-03-24"
venue: "1379.tech"
group: "From the team"
layout: "article"
links:
  - { label: "Read on 1379.tech", href: "https://1379.tech/segagenesisrecomp-sonic-the-hedgehog-tech-demo/" }
---

This post introduces the Sega Genesis recompiler through its first tech demo: Sonic the Hedgehog booting to Green Hill Zone as native code, with known issues openly listed.

The pace of the bring-up is the headline number: 133 functions verified in a single day using dual execution, where the recompiled code and a reference implementation run side by side and every divergence is caught immediately. Of those, 112 were validated across more than 200,000 frames. The post also explains why the 68000 is genuinely difficult for static recompilation: jump tables and indirect jumps hide control flow from ahead-of-time analysis, and a VBlank-ordering jump bug found during the work is documented in detail.

As the tech-demo label says, this was a proof of concept rather than a release. But the dual-execution methodology it established, validating recompiled output frame by frame against a reference, became a fixture of how the later ecosystems verify their work.

Related: [Sonic the Hedgehog](/games/sonic-the-hedgehog) on [Sega Genesis](/hardware/sega-genesis).
