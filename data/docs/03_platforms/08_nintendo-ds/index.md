---
title: "Nintendo DS"
summary: "ndsrecomp is an alpha-stage framework: Prime Hunters is the public example, and the toolchain can run several title paths while optimization work continues."
pageType: "project"
tags: ["Nintendo DS", "ARM", "Dual CPU", "HLE"]
repos:
  - "https://github.com/mstan/ndsrecomp"
  - "https://github.com/mstan/MetroidPrimeHuntersRecomp"
updated: "2026-08-30"
---

Nintendo DS is an alpha-stage recomp path.

[ndsrecomp](https://github.com/mstan/ndsrecomp) translates Nintendo DS ARM code into C and links it against a runtime that models the handheld around it.

Publicly, the main example is Metroid Prime Hunters. The framework can run a few title paths, but it is still working through optimization and refinement.

It is not a broad beginner path yet. The system is complicated, and alpha means the basics are real while the rough edges are still expected.

Use this page as a maturity snapshot, not a compatibility promise.

## What does it translate?

The Nintendo DS has two ARM processors:

- ARM9, the main CPU;
- ARM7, the support CPU for audio, input, firmware services, and other hardware work.

ndsrecomp translates code for both processors.

The runtime then has to schedule both CPUs together and model the rest of the machine: memory, DMA, graphics, audio, input, touch, cartridge behavior, BIOS behavior, firmware behavior, and timing.

## What files does it need?

For a game project, you provide your own legally obtained cartridge dump.

Some DS paths also need BIOS or firmware files. Use legally obtained files. This site does not provide them.

Some framework work may use open-source BIOS alternatives where appropriate, but those alternatives are not the same thing as pretending the retail files do not matter. The faithful path still needs a real reference.

This site does not provide game files or copyrighted retail BIOS files.

## What makes DS hard?

The hard part is the whole-machine shape.

The two CPUs communicate with each other. They share memory in specific ways. They wait on hardware events, interrupts, DMA, timers, touch input, cartridge reads, and video timing.

If one CPU runs too far ahead of the other, the game can behave differently even when both translated instruction streams are individually correct.

That makes DS a scheduling and hardware-model problem, not just a CPU translation problem.

## What are the main limits?

- The framework is alpha-stage.
- Performance and optimization are still active problems.
- Two-CPU scheduling has to be handled carefully.
- BIOS and firmware behavior matter.
- A working title path does not mean broad compatibility.
