---
title: "PS1 static recompiler with Claude Code"
author: "Matthew Stanley"
kicker: "1379.tech"
tags: []
featured: true
desc: "The earliest PSXRecomp story: three weeks of AI-assisted experimentation leading to Tomba running as a native PC application."
date: "2026-03-11"
venue: "1379.tech"
layout: "article"
cover: "./cover.png"
links:
  - { label: "Read the original on 1379.tech", href: "https://1379.tech/i-built-a-ps1-static-recompiler-with-no-prior-experience-and-claude-code/" }
  - { label: "Watch the first Tomba! boot", href: "https://www.youtube.com/watch?v=CID9oVhgCyY" }
---

This is the beginning of the PSXRecomp story: Matt approached PlayStation static recompilation without prior low-level console-development experience and used Claude Code, Ghidra, and emulator comparison to get Tomba running as a native Windows application.

The experiment was rough and incomplete, but it established the development loop that later projects refined: translate known code ahead of time, compare behavior against a trusted implementation, and investigate every divergence rather than assuming a successful boot means correctness.

Retro Porting Toolkit exists downstream of that first attempt. The original article is the detailed account of what worked, what failed, and how AI fit into the process.

[Read Matt's full PSXRecomp origin story on 1379.tech →](https://1379.tech/i-built-a-ps1-static-recompiler-with-no-prior-experience-and-claude-code/)

Related: [Tomba!](/games/tomba) on [PlayStation](/hardware/playstation).
