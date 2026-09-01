---
title: "Game Boy Advance"
summary: "gbarecomp targets ARM7TDMI games, where the hard part is one CPU switching between ARM and Thumb code while the port runs."
pageType: "project"
tags: ["Game Boy Advance", "ARM7TDMI", "Interworking", "Recompiler"]
repos:
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/MinishCapRecomp"
  - "https://github.com/Shy/BoktaiRecomp"
updated: "2026-08-30"
---

Game Boy Advance is experimental.

[gbarecomp](https://github.com/mstan/gbarecomp) translates GBA game code into C++ and links it against a runtime that models the handheld hardware.

The framework is general-purpose in direction. It can run games and support enhancements, but it still needs refinement before it is a broad first-choice path.

## What does it translate?

The GBA uses an ARM7TDMI CPU.

That CPU can run two instruction sets:

- **ARM**, with 32-bit instructions
- **Thumb**, with 16-bit instructions

The game can switch between them while it runs.

gbarecomp translates both modes and keeps track of which mode each function belongs to.

## What files does it need?

For a playable game project, you usually provide two legally obtained files:

- the GBA game dump
- a GBA BIOS file, if the project requires it

Some framework work may use generated or open alternatives where appropriate, but retail BIOS files are not provided here.

This site does not provide game files or copyrighted retail BIOS files.

## What makes GBA hard?

The hard part is **interworking**.

ARM and Thumb share the same address space. An address alone may not be enough to say what code is there. The project also needs to know which instruction set is active.

That matters for function discovery, jump tables, branches, interrupts, and any code that switches modes.

If the mode is wrong, the recompiler reads the bytes with the wrong instruction width.

## What else does the runtime handle?

The runtime models the rest of the GBA around the translated CPU code.

That includes graphics, audio, DMA, timers, interrupts, save hardware, cartridge behavior, and special devices used by some games.

Some GBA projects also explore adaptive widescreen and other enhancements. Those features should stay opt-in and should not change the faithful default view.

## What happens if discovery misses code?

A missed function should become a visible development problem, not hidden fake behavior.

The project can use fallback execution, logs, or a cache path to keep the game moving while pointing developers at the missing coverage.

As with the other frameworks, the goal is to improve the tool and the game configuration, not patch around missing behavior with stubs.

## What are the main limits?

- The framework is still earlier than PlayStation and SNES.
- Interworking makes discovery and dispatch more complex.
- A playable project may require a legally obtained BIOS.
- Enhancements need game-specific validation.
- Generated code is a starting point, not a finished port.
