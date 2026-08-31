---
title: "Master System and Game Gear"
summary: "smsggrecomp is an experimental Z80 framework for Sega's 8-bit machines, and its flat-step mode also helps the Genesis sound CPU path."
pageType: "project"
tags: ["Sega", "Z80", "Flat step", "Accuracy"]
repos:
  - "https://github.com/mstan/smsggrecomp"
  - "https://github.com/mstan/segagenesisrecomp"
updated: "2026-08-30"
---

Master System and Game Gear share a useful recomp path.

[smsggrecomp](https://github.com/mstan/smsggrecomp) translates Z80 game code into C and links it against a runtime for Sega's 8-bit hardware.

This ecosystem is extremely early. Treat it as a tech demo, not a ready platform.

Today it barely proves the shape with one Master System game path and one Game Gear game path. Those paths do not imply full-game, end-to-end validation, and they do not claim enhancements.

Even so, it is a good place to understand small-console recompilation: one main CPU, cartridge banking, video timing, audio, and input.

It also matters to Genesis work because Genesis uses a Z80 as its sound processor.

## What does it translate?

Master System and Game Gear games run on a Z80 CPU.

smsggrecomp translates that Z80 code ahead of time. The generated C is built as native code.

The runtime handles the rest of the machine: graphics, audio, input, cartridge mapping, interrupts, memory, and timing.

Game Gear is close to Master System, but not identical. It has a smaller visible screen, more color, and stereo audio support.

## What files does it need?

For a game project, you provide your own legally obtained cartridge dump.

Master System and Game Gear do not need a BIOS file for the normal cartridge path.

The exact dump matters. Region, revision, mapper behavior, and bad dumps can change what the project sees.

This site does not provide game files.

## What makes these systems hard?

The main issue is cartridge mapping.

Small consoles often have more game data than the CPU can see at once. A mapper swaps different ROM banks into the same CPU address range.

That means an address is not always enough. The project may also need to know which bank was active when the game reached that address.

Timing also matters. Video interrupts and audio writes happen while the CPU is running, so the runtime cannot treat time as a loose suggestion.

## What is flat step?

Flat step is a special output mode.

Normal generated code tries to run a whole function efficiently. Flat step runs one guest instruction, then returns control to the host.

That is slower, but it is useful when another machine is in charge of scheduling. Genesis needs that shape for its Z80 sound processor, because the 68000 and Z80 have to be interleaved.

This is a good example of a feature that is not only about one console. A useful framework piece can become part of another framework's runtime.

## What are the main limits?

- The framework is still extremely early.
- Treat the current game paths as tech demos.
- Whole-game validation is not guaranteed.
- Enhancements are not the point of this path yet.
- Mapper behavior and timing need game-by-game testing.
- Some debug surfaces are still developer tools, not polished user features.
- Genesis uses the Z80 work differently than Master System and Game Gear do.

## Next

- [Master System and Game Gear games](/hardware/master-system-game-gear)
- [Sega Genesis](/docs/platforms/sega-genesis)
- [How does a project tell code from data?](/docs/concepts/code-discovery)
- [When should timing be changed?](/docs/concepts/timing-models)
- [What are HLE and LLE?](/docs/concepts/hle-and-lle)
