---
title: "Sega Genesis"
summary: "segagenesisrecomp is an experimental two-CPU target: the main 68000 is translated, while the Z80 sound side has to stay tightly scheduled around it."
pageType: "project"
tags: ["Sega", "68000", "Dual CPU", "Audio", "Widescreen"]
repos:
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/smsggrecomp"
updated: "2026-08-30"
---

Sega Genesis is an experimental recomp path.

[segagenesisrecomp](https://github.com/mstan/segagenesisrecomp) translates Genesis game code into C and links it against a runtime that models the rest of the console.

The important wrinkle is that the Genesis is not only one CPU. It has a main 68000 and a Z80 sound processor that have to stay in sync.

That makes it a useful framework to study, but not the easiest first target.

## What does it translate?

Genesis game logic mainly runs on a Motorola 68000.

segagenesisrecomp translates that 68000 code ahead of time. The generated C is then compiled into native code for the host machine.

The runtime handles video, audio, input, memory, cartridge behavior, timing, and the Z80 side of the machine.

The Z80 is special. On Genesis, it is usually a sound coprocessor. That means the runtime has to interleave two processors instead of letting one translated program run freely.

## What files does it need?

For a game project, you provide your own legally obtained Genesis or Mega Drive cartridge dump.

Genesis does not need a BIOS file for the normal cartridge path.

The exact dump still matters. Region, revision, bad dumps, patches, and header differences can change what the project sees.

This site does not provide game files.

## What makes Genesis hard?

The hard part is the two-CPU shape.

The 68000 drives the game and talks to video hardware. The Z80 often runs the sound driver. Both touch shared hardware, and the timing between them matters.

If the 68000 runs too far ahead, audio or hardware state can drift. If the Z80 is modeled too loosely, a game can sound right in one scene and break in another.

The safe approach is to keep the runtime faithful first, then optimize after the behavior is understood.

## What about the Z80?

The Z80 work is shared with [Master System and Game Gear](/docs/platforms/master-system-game-gear).

That matters because the same CPU has two different jobs:

- on Master System and Game Gear, the Z80 is the whole console CPU;
- on Genesis, the Z80 is a coprocessor beside the 68000.

The second job is harder to schedule. The host needs control back often enough to keep the two CPUs and the video/audio hardware aligned.

## What about widescreen?

Genesis widescreen work is usually game-specific.

Many 2D games do not draw a whole world and then crop it. They draw only what the original screen needs. Widening the view can expose empty tilemap space, stale background data, wrapped sprites, or game logic that expected the old camera width.

That does not make widescreen impossible. It means the port has to change the right game-specific draw and camera rules, and leave the original 4:3 behavior as the faithful default.

## What are the main limits?

- The framework is still experimental.
- Two-CPU timing is the central risk.
- Z80 behavior is shared with another framework but used differently here.
- Widescreen is per game, not a universal switch.
- A successful build is only the start of bring-up.
