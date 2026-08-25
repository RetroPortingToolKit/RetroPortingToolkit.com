---
title: "Timing models"
summary: "How closely a build tracks the passage of time on the original console, from one host call per instruction to a whole frame at a time, what each choice costs in speed, and what a coarser one breaks."
pageType: "concept"
tags: ["Timing", "Accuracy", "Correctness"]
repos:
  - "https://github.com/mstan/smsggrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/gbrecompiled"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/vbrecomp"
updated: "2026-08-25"
---

Recompiled code runs as fast as your computer can go, and that is exactly the problem: the console could not. Games were written against a machine with a known speed. They count cycles, they read a counter mid-frame, they expect an interrupt to arrive at a particular moment. So every project has to decide how closely it tracks the passage of guest time, and that one decision sets both how fast the port runs and which bugs it will have.

There is no fleet-wide answer here. The choice is made per console, by a project that knows what its games do with time. So "the ports are cycle accurate" and "the ports run a frame at a time" are both false about the fleet, whichever you pick.

## The choices, and which console made each

| Model | Console, and the project that chose it | How fine | Cost |
|---|---|---|---|
| Whole frame as a few calls | SNES, snesrecomp's shipping model | frame | fastest, and the compiled path has no per-instruction hook at all |
| Cycles counted per instruction, devices advanced per scanline | Master System and Game Gear, smsggrecomp | scanline | one tick call per function body |
| Cycles charged per instruction, devices catch up at events | Game Boy Advance, gbarecomp | event-scheduled | one add per instruction plus a flush |
| Tick before the access, split for read-modify-write | Game Boy, gbrecompiled | sub-instruction on marked accesses | split ticks per access |
| One instruction per call | a Z80 used as a sound chip, smsggrecomp's `--flat-step` | instruction | highest, the host takes control back every instruction |

Read the rest of the page against that table.

## One instruction at a time, for a Z80 used as a sound chip

[smsggrecomp](https://github.com/mstan/smsggrecomp) can emit a second shape of output, chosen with `--flat-step`. From [`FLAT_STEP.md`](https://github.com/mstan/smsggrecomp/blob/main/FLAT_STEP.md):

> It is intended for a Z80 used as a coprocessor, where the
> host machine must regain control after every instruction to interleave CPUs,
> devices, reset, bus ownership, and interrupts.

The mechanism is as blunt as the name: the generated step function runs exactly one instruction and returns. Every byte offset is a possible entry point, so a jump the recompiler could not predict cannot land somewhere it failed to emit.

The price is the obvious one. Returning to the host after every instruction gives up the thing static recompilation is for, which is long runs of native code with nothing in the way. This mode does not replace the normal output; it exists for one job.

## A whole frame at a time, on SNES

At the other end, [snesrecomp](https://github.com/mstan/snesrecomp) runs each frame as a few separate calls: run the CPU for a frame, then draw the frame, then handle the raster interrupt. Nothing else in the fleet works this way.

The document is candid that hardware does not, in [`FRAME_MODEL_TIMING.md`](https://github.com/mstan/snesrecomp/blob/main/FRAME_MODEL_TIMING.md):

> Real hardware interleaves these **continuously**: the CPU executes instructions
> non-stop; NMI fires at vblank start (~scanline 225) *interrupting whatever
> instruction boundary it lands on*; the raster IRQ fires at scanline `vTimer`
> mid-frame, likewise. The recomp instead runs the whole CPU frame, *then* the
> whole render/IRQ pass, so an interrupt's effects land at a different point in
> the guest's execution than on hardware.

This is the clearest example in the fleet of what a coarser model breaks. An interrupt is not just an event, it is an event at a place in the instruction stream, and a frame model has thrown that place away. The SNES burndown records the consequence: the runner "never raises an interrupt". Co-simulation found what that costs on one game, a split at frame 157.

What makes it hard to fix is structural. The compiled code has no continuous instruction stream to interrupt: it is host functions with block-sized time steps, so there is no instruction boundary to land on. The interpreter does have one, so accurate interrupt timing is feasible there and not cheaply in compiled code. Three options are costed in the document and its own status line is "**Status: scoped, not yet implemented**", so read this as the shipping model and its known cost, not as a fix.

## Down to a fraction of an instruction, on Game Boy

[gbrecompiled](https://github.com/mstan/gbrecompiled) pushes the other way, and it has the sharpest statement of what a whole-instruction model gets wrong. Part of why it is this console is that the Game Boy has public test ROMs that measure at that scale. A model gets pushed where something is watching.

From [`MEM_TIMING_SCOPING.md`](https://github.com/mstan/gbrecompiled/blob/master/MEM_TIMING_SCOPING.md):

> A cycle-derived I/O read that lands exactly on a PPU/timer boundary cycle (e.g.
> `LDH A,($44)` reading `LY` as it ticks `0x8F→0x90`) samples the **post-boundary**
> value in the recomp but the **pre-boundary** value on hardware, because the
> recomp advances the whole instruction's clock (and thus the PPU) *before* the
> inline bus read.

One instruction, one register read, one cycle of error. A game that watches the scanline counter to time an effect sees a different number than it would on hardware. The fix moves the tick relative to the access instead of making the whole model finer.

From [`runtime/src/interpreter.c`](https://github.com/mstan/gbrecompiled/blob/master/runtime/src/interpreter.c):

```c title="runtime/src/interpreter.c"
        /* Sub-instruction memory timing: for marked load/store/IO/ALU-(HL)
         * opcodes, advance the clock for the whole instruction BEFORE the inline
         * bus access so it samples PPU/timer state at the final M-cycle (the tail
         * tick below is then guarded). None of the marked opcodes are conditional,
         * so extra_cycles is always 0 for them. CB-(HL) sets this inside its case. */
        GBOpTiming op_acc = GB_OP_TIMING[opcode];
        int ticked_before = 0;
        if (op_acc.kind == GB_ACC_RMW) {
            /* Read-modify-write: advance only to the READ M-cycle; the write
             * tick (op_acc.split_t) is emitted mid-handler, so the read samples
             * one M-cycle before the write (cycle-accurate, not both-at-end). */
            gb_tick(ctx, (uint8_t)(cycles - op_acc.split_t));
            ticked_before = 1;
        } else if (MEM_TICK_BEFORE[opcode]) {
            gb_tick(ctx, cycles);
            ticked_before = 1;
        }
```

The table it reads from is shared with the code emitter, so compiled and interpreted code put their ticks in the same places. That is what keeps pairing 1 of [co-simulation](/docs/concepts/co-simulation) meaningful.

Two results from that work are worth carrying. Four separate open differences turned out to have one cause, and fixing when the clock advances moved all four together. And a prototype measured the effect instead of assuming it: at one setting nothing changed, at another the first difference moved from instruction 61,348 to instruction 2,266,273.

## What accuracy costs, measured

The projects that moved up this scale wrote down the bill. [vbrecomp](https://github.com/mstan/vbrecomp) started taking interrupts inside a block, which fires on roughly every device event, and "headless free-run dropped from ~30x to ~5x realtime; still ample for the harness and real-time play". gbrecompiled names split ticks as a risk of its own programme and keeps a per-region opt-out as the lever. [gbarecomp](https://github.com/mstan/gbarecomp) sits in the middle, charging cycles per instruction and letting devices catch up later.

Cost is not the only reason to stay coarse. A finer model is more code to be wrong in, which is why there is a standing rule about the order of work, from nesrecomp's [`COSIM.md`](https://github.com/mstan/nesrecomp/blob/master/COSIM.md):

> Land each timing rung **behind** the co-sim: build the certifier, then change
> the timing, then measure. Never ship a timing change unmeasured.

## What picks a model

Start from what the guest does with time, at two levels.

The console sets the floor. A processor that has to take turns with other hardware every instruction wants one instruction per call, whatever it costs, and that is a fact about the machine rather than about any game on it.

Then the game sets the rest. A game that reads a hardware counter mid-instruction, or drives an effect from a raster interrupt, will expose a frame model or a whole-instruction one. A game that does none of those runs correctly under a much cheaper model on the same console, and the cheaper model is then the right engineering choice. That is why a timing verdict has to name a game as well as a console before it means anything.

Read the words carefully when a project describes its own model. gbrecompiled uses "cycle exact" as the name of a programme of work, not as a status.

## Source

- smsggrecomp: [`FLAT_STEP.md`](https://github.com/mstan/smsggrecomp/blob/main/FLAT_STEP.md). snesrecomp: [`FRAME_MODEL_TIMING.md`](https://github.com/mstan/snesrecomp/blob/main/FRAME_MODEL_TIMING.md), [`SNES_ACCURACY_BURNDOWN.md`](https://github.com/mstan/snesrecomp/blob/main/SNES_ACCURACY_BURNDOWN.md)
- gbrecompiled: [`MEM_TIMING_SCOPING.md`](https://github.com/mstan/gbrecompiled/blob/master/MEM_TIMING_SCOPING.md), [`CYCLE_EXACT_INITIATIVE.md`](https://github.com/mstan/gbrecompiled/blob/master/CYCLE_EXACT_INITIATIVE.md), [`runtime/src/interpreter.c`](https://github.com/mstan/gbrecompiled/blob/master/runtime/src/interpreter.c)
- gbarecomp: [`GBA_ACCURACY_BURNDOWN.md`](https://github.com/mstan/gbarecomp/blob/main/GBA_ACCURACY_BURNDOWN.md). vbrecomp: [`VB_ACCURACY_BURNDOWN.md`](https://github.com/mstan/vbrecomp/blob/master/VB_ACCURACY_BURNDOWN.md). nesrecomp: [`COSIM.md`](https://github.com/mstan/nesrecomp/blob/master/COSIM.md)

## Next

- [Co-simulation](/docs/concepts/co-simulation) is how a timing change is measured before it ships.
- [What correct enough means](/docs/concepts/accuracy-and-burndowns) records where each console's timing axis stands.
- [Debug a divergence](/docs/guides/debug-a-divergence) is the workflow when a timing bug shows up as a differing hash.
- [Glossary](/docs/concepts/glossary) defines flat step, cycle exact and the granularity words.
