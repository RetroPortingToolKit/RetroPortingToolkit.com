---
title: "I Built a PS1 Static Recompiler With No Prior Experience (and Claude Code)"
kicker: "1379.tech"
tags: []
featured: true
desc: "Three weeks, no prior experience, Claude Code and Ghidra: the post where Tomba! first booted and everything else began."
date: "2026-03-11"
venue: "1379.tech"
group: "From the team"
layout: "article"
links:
  - { label: "Read on 1379.tech", href: "https://1379.tech/i-built-a-ps1-static-recompiler-with-no-prior-experience-and-claude-code/" }
---

This is the post that started everything: an account of building a PlayStation static recompiler with no prior experience in the field, over roughly three weeks of iteration with Claude Code and Ghidra.

The result at that point was Tomba! booting, playing its FMV intro, reaching the menu, and starting a new game. Modest next to what the ecosystems became, but the post's lasting contribution is a discipline rather than a demo: every fix goes into the compiler's inputs, never into hand-edits of the generated code. That rule keeps the entire output reproducible from the pipeline. It is the reason later projects could regenerate their code freely as the tooling improved instead of accumulating unreviewable patches.

Read today, the post doubles as the toolkit's founding document. The Tomba! project it describes grew into PSXRecomp, and the workflow it sketches, a human directing an AI agent against ground-truth hardware behavior, became the method behind every ecosystem that followed.

Related: [Tomba!](/games/tomba) on [PlayStation](/hardware/playstation).
