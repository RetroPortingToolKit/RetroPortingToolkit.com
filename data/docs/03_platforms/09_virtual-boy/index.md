---
title: "Virtual Boy"
summary: "vbrecomp is a focused tech demo today: one Mario Tennis path, no enhancement claim, and no broad platform guarantee."
pageType: "project"
tags: ["Virtual Boy", "V810", "Stereoscopy", "Oracle"]
repos:
  - "https://github.com/mstan/vbrecomp"
  - "https://github.com/mstan/MarioTennisVirtualBoyRecomp"
updated: "2026-08-30"
---

Virtual Boy is a tech demo today.

[vbrecomp](https://github.com/mstan/vbrecomp) translates Virtual Boy game code into C and links it against a runtime for the rest of the machine.

The public proof point is Mario Tennis. That is useful, but narrow. It does not mean the framework is ready for the full library.

There is no enhancement claim here. Treat it as one working path that proves the toolchain shape.

## What does it translate?

Virtual Boy games run on a NEC V810 CPU.

vbrecomp translates that V810 machine code ahead of time. The generated C is compiled into native code.

The runtime handles memory, cartridge behavior, input, timing, and the display hardware.

## What files does it need?

For a game project, you provide your own legally obtained Virtual Boy cartridge dump.

Virtual Boy does not need a BIOS file.

The exact dump matters. A project may check the file identity before running so it does not build or launch against the wrong bytes.

This site does not provide game files.

## What makes Virtual Boy specific?

The CPU is only part of the job.

The runtime also has to model the display, input, memory behavior, timing, and the way the game expects the hardware to behave.

The display is unusual because the hardware renders separate left-eye and right-eye images. That matters for faithfulness, even if the current port does not turn it into a polished modern stereo experience.

## What is proven today?

Mario Tennis is the proof point.

That means the framework can translate and run a real game path. It does not prove broad compatibility. It does not prove every mode, every timing edge, or every game-specific hardware pattern.

Read it as a useful technical milestone, not a platform promise.

## What are the main limits?

- This is a tech demo.
- The public path is Mario Tennis.
- No enhancement path is claimed.
- Broad game support is not guaranteed.
- A second game may expose missing runtime or discovery work.

## Next

- [Virtual Boy games](/hardware/virtual-boy)
- [How does a project tell code from data?](/docs/concepts/code-discovery)
- [Proving it with co-simulation](/docs/concepts/co-simulation)
- [Glossary](/docs/concepts/glossary)
