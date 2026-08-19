---
title: "segagenesisrecomp + Sonic the Hedgehog tech demo"
kicker: "1379.tech"
tags: []
featured: false
desc: "Sonic boots to Green Hill Zone as native code, with 133 functions verified in a single day of dual execution."
date: "2026-03-24"
venue: "1379.tech"
layout: "article"
cover: "./cover.png"
links:
  - { label: "Read on 1379.tech", href: "https://1379.tech/segagenesisrecomp-sonic-the-hedgehog-tech-demo/" }
---

- segagenesisrecomp: [https://github.com/mstan/segagenesisrecomp](https://github.com/mstan/segagenesisrecomp)
- Sonic runner: [https://github.com/mstan/SonicTheHedgehogRecom](https://github.com/mstan/SonicTheHedgehogRecomp)

[Watch: 2026 03 26 genesisrecomp Sonic the Hedgehog Tech Demo 2](https://www.youtube.com/watch?v=IINTsq1JBg8)

**EDIT** March 26th, 2026 Addendum

## Second Pass Improvements

After the initial write-up a few days , I took another pass at the project and made significantly more progress by improving the tooling and feedback loop. As a result, I was able to considerably improve Sonic's ability to navigate and improve the interactions within the game world.

### State Tracking via TCP

I introduced a lightweight TCP server with a ring buffer to track game state over time. I chose TCP over an MCP-style approach since the game is rebuilt frequently, and Claude handled disconnects/reconnects more reliably in this setup.

This gave Claude a continuous view of state transitions instead of isolated snapshots. As a result, it was able to better reason about temporal issues, most notably Sonic’s jumping bug, by observing how state evolved frame-to-frame rather than guessing from a single point in time.

### Function Discovery in Interpreter Mode

I also added a mechanism where, when running in interpreter (emulation) mode, the game would still dispatch any identified functions that could be cross-referenced against `game.cfg` for the recomp build.

This ended up being much more effective than doing discovery in native mode:

- In native mode, missing a function blocks discovery of anything downstream until a rebuild
- In interpreter mode, execution continues, allowing broader coverage in a single run

This allowed for faster iteration and more complete function discovery, especially for cases static analysis alone would miss.

### Current Status

These changes significantly improved debugging and coverage. However, some issues remain, most notably persistent audio distortion.

For my original write-up on this article, please see below.

## ORIGINAL WRITE-UP

[Watch: 2026 03 24 Sonic the Hedgehog Recompilation Tech Demo Showcase](https://www.youtube.com/watch?v=tMkbDKK5y38)

## Context

In my past articles, I've been exploring the feasibility of using Claude's AI to aid in the development recompiles and better my understanding in this space. After relative success with the Playstation and NES tech demos; I set my sights to try the Sega Genesis next.

Unlike the my previous demos however, the the Genesis has, overall, proven less fruitful than other attempts due to its architecture. While I did get the game to boot and render and play some basic functions, the process was overall a rocky one.

## Ghidra Didn’t Translate Well

On PS1, Ghidra was essential. It gave reliable function boundaries and control flow, and worked well as a reference during codegen.

On the Genesis, that broke down.

The 68000 code is full of:

- jump tables
- mid-function branches
- indirect jumps through registers

Ghidra can disassemble it, but it doesn’t produce clean function-level structure. That made it much less useful as a source of truth compared to the PS1 workflow.

## What Worked: Dual Execution

The approach that actually scaled was running native code alongside an interpreter Using clownmdemu as the base, native functions that were compiled were written in parallel and hooked at certain states of the interpreter's execution. Using the same state at the type of execution, this allowed me to determine if native equivalents existed (and flag dispatch misses where they did not), and for ones that did, whether they computed the end result in the same fashion.

Overall, this worked worked well:

- ~133 verified functions in ~1 day
- ~112 functions validated clean across 200k+ frames

It also surfaced real issues quickly:

- CMP not setting X flag correctly
- VDP control writes needing atomic 32-bit behavior
- BTST truncation issues

Without this setup, those would’ve been much harder to isolate.

## Fully Native Runner

After I was able to achieve a reasonable amount of native function execution integrity, (~337 functions), I switched the primary runner from interpreted + cpu emulation to a native execution. Doing so immediately began to expose the brittleness of native vs the hardware configuration of the Genesis.

- **Dark palettes**  
  VBlank handler clobbered registers, causing fade-in/fade-out sequences to end prematurely  
  → fix: manual full register save/restore
- **PLC softlock**  
  Nemesis decompression ran in wrong context  
  → fix: run it from fiber yield
- **Jump → restart loop**  
  Stack overflow corrupted timer memory  
  → fix: block writes at $FFFE00

Plus a few more stack/handler edge cases.  
~6 runtime fixes total.

## The Real Problem: Timing

The core issue isn’t just codegen: it’s timing.

On real hardware:

- 68K execution is interleaved with VDP scanlines
- VBlank fires mid-execution

The native runner executes logic in large uninterrupted chunks. That difference breaks behavior. For example, one bug I attempted to (unsuccessfuly) debug was Sonic's Jumping. It's my belief that the below is a consequence of the timing changes going from interpreted to native, the result being that Sonic can't jump. But I was unable to determine a solution during my spike into this recompiler.

- Sonic_Jump sets velocity
- Sonic_Move later clears it
- On real hardware, VBlank interrupts between them
- In native mode, both run back-to-back → velocity gets zeroed

Tried fixes:

- per-instruction cycle counting
- scanline interleaving
- injecting interrupts mid-run
- cycle-aware codegen

Cycle tracking seemed accurate, but behavior still diverges (likely input/interrupt timing edge cases).

## Current State

- Game boots
- SEGA logo works
- Title screen renders
- Green Hill loads
- Basic Movement, enemies, rings, HUD all work

Known issues:

- Jumping is broken
- Audio timing issues (Z80 not advancing correctly)
- Some sprite glitches
- Missing functions (picking up fallen rings after taking damage)

## Takeaway

Static recompilation on the Genesis works...to an extent  
Dual-execution validation works. But getting a holistic behaviorla match has proven much harder. While a foundation exists, it's hopeful that others can using this as a jumping off point for a more capable recompiler for the Genesis.

---

Related: [Sonic the Hedgehog](/games/sonic-the-hedgehog) on [Sega Genesis](/hardware/sega-genesis).
