---
title: "SNES"
summary: "snesrecomp is the silver-standard framework today: strong results, hard CPU details, and good use of community disassembly work."
pageType: "project"
tags: ["SNES", "65816", "Static recompilation", "Timing"]
repos:
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/SuperMarioWorldRecomp"
  - "https://github.com/mstan/MegaManXSNESRecomp"
updated: "2026-08-30"
---

SNES is the next strongest recomp path after PlayStation.

[snesrecomp](https://github.com/mstan/snesrecomp) translates Super Nintendo game code into C and links it against a runtime that models the rest of the console.

The results can be excellent, especially when a game has strong public disassembly work to help guide discovery. Super Mario World is a good example of that pattern.

## What does it translate?

SNES games run on a Ricoh 5A22 CPU, based on the 65816.

snesrecomp translates the main CPU code. The runtime handles the rest of the machine: graphics, audio, DMA, cartridge mapping, timing, and enhancement chips where supported.

The audio side is not just a sound register. The SNES has separate audio hardware with its own processor and memory, so the runtime has real console work to do.

## What files does it need?

For a game project, you provide your own legally obtained `.sfc` or `.smc` cartridge dump.

SNES does not need a separate retail BIOS file.

Some SNES games use enhancement chips, such as SuperFX, DSP-1, or Cx4. snesrecomp supports these today. They were brought up with real ROM dumps and checked against the faithful low-level path.

Because those chip ROMs are small and awkward for users to obtain, snesrecomp can ship higher-level layers for them. That is a setup choice, not a compromise in the correctness floor.

The exact dump still matters. Region, revision, copier headers, patches, and bad dumps can all change what the project sees.

This site does not provide game files.

## What makes SNES hard?

The 65816 can change how wide some instructions are while the game runs.

Two status flags, usually called M and X, decide whether certain registers and immediate values are 8-bit or 16-bit. That means the same bytes can decode differently depending on CPU state.

For a static recompiler, that is a serious problem. The tool cannot only ask "what address is this?" It also has to ask "what CPU mode reached this address?"

If it guesses wrong, it can read the next instruction from the wrong byte.

## Why do disassemblies help here?

Many SNES games were written heavily in assembly.

A good community disassembly can identify functions, labels, data tables, hardware writes, and banks. That gives the project a map while still building the port from the user's own game file.

This is one reason SNES can be strong when the right game and the right existing knowledge line up.

## What is the faithful floor?

snesrecomp keeps an interpreter as the correctness floor.

That matters because the compiled path may not cover every mode or edge case yet. If the exact generated variant is not available, the runtime can fall back to the faithful path instead of guessing.

That is the same philosophy described in [What are HLE and LLE?](/docs/concepts/hle-and-lle): do not fake the behavior just to make one path look complete.

## What are the main limits?

- The CPU mode problem makes discovery and code generation harder than on simpler 6502 targets.
- Enhancement chips vary by game and are not all equal.
- Timing and interrupt behavior are advanced areas that need careful testing.
- Some game support depends on strong per-game knowledge.
