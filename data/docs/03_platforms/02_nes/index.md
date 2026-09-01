---
title: "NES"
summary: "nesrecomp is a compact cartridge example: it translates 6502 code, links a runner for NES hardware, and teaches why mappers matter."
pageType: "project"
tags: ["NES", "6502", "Mappers"]
repos:
  - "https://github.com/mstan/nesrecomp"
updated: "2026-08-30"
---

NES is a useful early toolchain to understand because the machine is small and the problems are easy to see.

[nesrecomp](https://github.com/mstan/nesrecomp) reads the 6502 machine code in a NES cartridge dump and turns it into C. That C is compiled into native code and linked against a runner that models the NES hardware.

It is not the most mature path in the ecosystem, but it is a good example of how cartridge recompilation works.

## What does it translate?

The NES CPU is based on the 6502.

nesrecomp translates the game's CPU instructions. The runner handles the rest of the console: graphics, audio, controllers, cartridge hardware, memory, and timing.

That means the game logic can run as native code, while the runtime still acts like the NES around it.

## What files does it need?

For a game project, you provide your own legally obtained `.nes` cartridge dump.

NES does not need a BIOS file.

The exact dump matters. Region, revision, bad dumps, patches, or header differences can change what the project sees.

This site does not provide game files.

## What makes NES specific?

The main NES-specific problem is the cartridge.

Many NES cartridges contain a **mapper**. A mapper is hardware inside the cartridge that swaps which part of the ROM appears at a CPU address.

That means an address alone may not identify one piece of code. The same CPU address can refer to different banks at different times.

For a static recompiler, this matters a lot. The project has to know which bank was active when the game jumped to an address.

See [How does a project tell code from data?](/docs/concepts/code-discovery).

## Is generating code enough?

No.

The framework can build a static library, but a playable port still needs game-specific configuration and runner integration.

That configuration teaches the tool about the game's banks, function starts, data regions, and indirect jumps that cannot be guessed safely.

This is a common pattern across the ecosystem: the shared framework gets better over time, but each game still needs real port work.

## What happens if discovery misses code?

A missed address should not become a fake stub.

The project can log the miss, fall back to an interpreter when available, and feed the result back into the next build. The goal is to improve discovery until the game has the native coverage it needs.

Booting is only a milestone. Faithfulness still needs testing.

## What are the main limits?

- A generated library is not a full playable port by itself.
- Mapper support is central, and not every mapper or game pattern is equally mature.
- Some discovery still needs per-game configuration.
- Correctness depends on testing, not just a successful build.
