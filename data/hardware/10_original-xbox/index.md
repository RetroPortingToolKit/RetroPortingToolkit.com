---
title: "Original Xbox"
kicker: "x86"
tags: ["LLE", "Hardware probe"]
featured: false
desc: "Research with no public release: the Xbox work checks its answers against a real console, and only the probing tool is public so far."
year: "2026"
status: "Research"
availability: "No public release"
provenance: "core"
arch: "Intel Pentium III (x86)"
repo: "https://github.com/mstan/xboxlle-probe"
group: "Research"
links:
  - { label: "Building & Enhancing Recomps: Ecosystem Updates (1379.tech)", href: "https://1379.tech/building-enhancing-recomps-ecosystem-updates/" }
verified: "2026-08-18"
---

Research only, and not a recompilation ecosystem. The main Xbox project is not yet public, and nothing on this page runs games. The only visible piece is xboxlle-probe, a tool for measuring what a real console actually does.

## What runs today

Only the probe agent is public. It exists because little reference material exists for low-level Xbox faithfulness, so the project measures real silicon instead: the agent runs on a softmodded console and answers questions from a computer on the same network. The team's 2026-08-03 ecosystem update showed the non-public main project rendering its first frame of the console's boot sequence, a single dot whose pixels traveled from the real boot ROM through a retail kernel, emulated GPU commands, and guest memory out to a window. That is the current public high-water mark; no game or performance claims exist.

## Community

[Mega Man X for Original Xbox](/games/mega-man-x-xbox) is a Team-Resurgent port of the Super Nintendo recomp build to real Xbox hardware, unrelated to this research.

## Technical details

The original Xbox breaks the toolkit's pattern: its CPU is already x86, so there is little to recompile, and the approach is low-level emulation (LLE) of the hardware and operating system around it instead. The visible artifact is xboxlle-probe, a homebrew agent built with nxdk that the repo itself labels a "DANGEROUS low-level hardware probe agent" for a real original Xbox. It listens on a trusted LAN, offers named read-only CPU and GPU probes with JSON output, and gates every raw read, write, or code-execution request behind explicit arming, because a wrong register access can freeze or damage a console. The probe targets a console and software you already own and distributes no BIOS images or game data.

## Sources

- [Building & Enhancing Recomps: Ecosystem Updates (1379.tech)](https://1379.tech/building-enhancing-recomps-ecosystem-updates/)
