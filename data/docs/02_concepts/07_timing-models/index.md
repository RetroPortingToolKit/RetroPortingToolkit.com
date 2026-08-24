---
title: "Timing models"
summary: "How finely a recompiled build models the passage of guest time, from one host call per instruction to a whole frame at a time, what each choice costs in speed, and what breaks under a coarser one."
section: "concepts"
sectionTitle: "Concepts"
pageType: "concept"
tags: ["Timing", "Accuracy", "Correctness"]
repos:
  - "https://github.com/mstan/smsggrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/gbrecompiled"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/vbrecomp"
updated: "2026-08-23"
---

Recompiled code runs as fast as the host can go, which is exactly the problem: the original console did not. Every project therefore has to decide how finely it models the passage of guest time, and that one decision sets both the speed of the port and the class of bugs it will have. The fleet spans the whole axis, from a whole frame executed as a few sequenced calls at one end to a model that advances hardware at the exact sub-instruction cycle at the other.

There is no fleet-wide answer here, and this is the page where that matters most. The choice is made per console, by a project that knows what its guest does with time, so a statement like "the ports are cycle accurate" or "the ports run a frame at a time" is false about the fleet no matter which one you pick. The table below is the mapping.

## The axis, and which console sits where

| Model | Console, and the project that chose it | Granularity | Cost |
|---|---|---|---|
| Whole frame as sequenced calls | SNES, snesrecomp's shipping model | frame | fastest, and the compiled path has no per-instruction hook at all |
| Per-instruction T-states, device advanced per scanline | Master System and Game Gear, smsggrecomp's function form | scanline | one tick call per function body |
| Per-instruction cycle charge, lazy device catch-up | Game Boy Advance, gbarecomp | event-scheduled | one add per instruction plus a flush |
| Tick before the access, read-modify-write split | Game Boy, gbrecompiled | per M-cycle for the marked accesses | split ticks per access |
| Flat single-step | a Z80 used as a coprocessor, smsggrecomp's `--flat-step` | one instruction per host call | highest, the host regains control every instruction |

Read the rest of the page against that table. Virtual Boy and NES appear further down without a row of their own, in the section on what accuracy cost the projects that moved up the axis, and [what correct enough means](/docs/concepts/accuracy-and-burndowns) records where each console's axis 2 currently stands.

## Flat step, for a Z80 used as a coprocessor

[`smsggrecomp`](https://github.com/mstan/smsggrecomp) emits a second output shape, chosen with `--flat-step`, for a Z80 used as a coprocessor rather than as the machine's main processor. From [`FLAT_STEP.md`](https://github.com/mstan/smsggrecomp/blob/main/FLAT_STEP.md):

> It is intended for a Z80 used as a coprocessor, where the
> host machine must regain control after every instruction to interleave CPUs,
> devices, reset, bus ownership, and interrupts.

The mechanism is as blunt as the name: "The generated `<prefix>_step()` executes exactly one decoded instruction from `g_z80.pc` and returns. Every byte offset in the input image is emitted as a possible PC, so computed control flow does not depend on a profiling manifest." That last clause is worth noticing, because it sidesteps the problem described in [`/docs/concepts/code-discovery`](/docs/concepts/code-discovery): if every byte offset was emitted as an entry point, a computed jump cannot land somewhere the recompiler failed to emit. Self-modifying code is handled by guarding the compiled bytes against live memory, keeping captured variants as alternate byte sequences at the same address, and falling back to a dispatch-miss handler; code that rewrites only an operand keeps its statically decoded opcode and reads the live immediate at execution time.

The price is the obvious one. Returning to the host after every instruction gives up the thing static recompilation is for, which is long runs of straight-line native code. This mode does not replace the normal function-form output, and shares its decoder, semantic emitters, flag representation and timing tables.

## The frame model, on SNES

At the other end, [`snesrecomp`](https://github.com/mstan/snesrecomp) runs each frame as discrete sequenced host calls. This is the SNES shipping model and nothing else in the fleet works this way.

From [`FRAME_MODEL_TIMING.md`](https://github.com/mstan/snesrecomp/blob/main/FRAME_MODEL_TIMING.md):

```text title="FRAME_MODEL_TIMING.md"
RtlRunFrame:
  run_frame()      = I_NMI()  then  scheduler (MmxSchedulerTick HLE / $8099 LLE)
  draw_ppu_frame() = PPU line render + HDMA + raster-IRQ sim (I_IRQ at scanline vTimer)
```

The document is candid that hardware does not work this way:

> Real hardware interleaves these **continuously**: the CPU executes instructions
> non-stop; NMI fires at vblank start (~scanline 225) *interrupting whatever
> instruction boundary it lands on*; the raster IRQ fires at scanline `vTimer`
> mid-frame, likewise. The recomp instead runs the whole CPU frame, *then* the
> whole render/IRQ pass, so an interrupt's effects land at a different point in
> the guest's execution than on hardware.

This is the clearest example in the fleet of what a coarser model actually breaks. An interrupt is not just an event, it is an event at a place in the instruction stream, and a frame model has thrown that place away. The consequence is recorded in the SNES burndown: the runner "never raises an interrupt". Co-simulation found the residual it produces, a fork on one game at frame 157.

What makes it hard to fix is structural, not lazy:

> - The **compiled** recomp has **no continuous instruction stream**: it is host-C
>   functions with block-granular `master_cycles`. You cannot "fire an interrupt
>   between instructions" cleanly; there is no instruction boundary to land on.
> - The **interp816 (LLE) path DOES** have an instruction stream and per-opcode
>   `cyclesUsed`. Interrupt timing is therefore **feasible in the LLE/interp path**
>   and not (cheaply) in the compiled path.

Three options are costed. Cycle-accurate interrupts in the interpreted path is the recommended one; firing interrupts between compiled blocks is rejected as having a "much larger blast radius"; a hybrid would use the interpreted cycle model to set the compiled path's interrupt phase. The document's own status line is "**Status: scoped, not yet implemented**", so treat this section as a description of the shipping model and its known cost, not of a fix.

## Cycle exact, on Game Boy

[`gbrecompiled`](https://github.com/mstan/gbrecompiled) is the one project in the fleet pushing the other way, and it has the most precise statement of what a whole-instruction model gets wrong. Part of why it is this console is that the Game Boy has public fixtures that measure at that granularity: the project runs the Blargg and Mooneye test ROMs as co-simulation fixtures, and the Mooneye interrupt subset fails on what its own scorecard calls "the exact-T-cycle checks". A model gets pushed where something is watching. From [`MEM_TIMING_SCOPING.md`](https://github.com/mstan/gbrecompiled/blob/master/MEM_TIMING_SCOPING.md):

> A cycle-derived I/O read that lands exactly on a PPU/timer boundary cycle (e.g.
> `LDH A,($44)` reading `LY` as it ticks `0x8F→0x90`) samples the **post-boundary**
> value in the recomp but the **pre-boundary** value on hardware, because the
> recomp advances the whole instruction's clock (and thus the PPU) *before* the
> inline bus read.

One instruction, one register read, one cycle of error, and a game that polls the scanline counter to time an effect sees a different number than it would on hardware. The fix is to move the tick relative to the access rather than to make the whole model finer.

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

The table it reads from is shared with the code emitter, so compiled and interpreted code place their ticks identically, which is what keeps co-simulation's pairing 1 meaningful. It is also honest about its own reach: the access kinds cover only the data bus that the timing test ROMs probe.

Two results from that programme are worth carrying. Four separate open divergences turned out to have one root, which the initiative document states as its central claim: hardware advances and is sampled at whole-instruction granularity rather than at the exact M-cycle, and because the processor checks interrupts at instruction boundaries on real hardware too, the failing interrupt tests are not a separate dispatch-timing axis at all. "Fix the cycle at which hardware advances and is accessed, and all four move together." And a prototype measured the effect rather than assuming it: at N=1 nothing changed, at N=4 the first divergence moved from instruction 61,348 to instruction 2,266,273. A rejected option is kept in the document with its reason, "Moves the error, doesn't fix it. Documented here so we don't try it."

## What accuracy costs, measured

The projects that moved up the axis wrote down what it cost them. [`vbrecomp`](https://github.com/mstan/vbrecomp) took interrupts mid-block, which "yields ~every device event (~259 cyc), so headless free-run dropped from ~30x to ~5x realtime; still ample for the harness and real-time play". gbrecompiled names split-tick overhead as a risk of its cycle-exact phases and keeps a per-region opt-out as the containment lever. [`gbarecomp`](https://github.com/mstan/gbarecomp) sits in the middle, charging cycles per instruction and letting devices catch up lazily at events. [`nesrecomp`](https://github.com/mstan/nesrecomp) went the other way on its renderer: once per-scanline parity had been demonstrated, making the dot-based PPU the sole renderer became the goal.

Cost is not the only reason to stay coarse. A finer model is also more code to be wrong in, which is why the fleet has a standing rule about the order of operations, from nesrecomp's [`COSIM.md`](https://github.com/mstan/nesrecomp/blob/master/COSIM.md):

> Land each timing rung **behind** the co-sim: build the certifier, then change
> the timing, then measure. Never ship a timing change unmeasured.

## What selects a model

Start from what the guest does with time, at two levels. The console sets the floor: a processor that has to interleave with other hardware every instruction wants flat stepping, whatever it costs, and that is a fact about the machine, not about any game on it. Then the game sets the rest. A game that reads a hardware counter mid-instruction, reprograms waitstates, or drives an effect from a raster interrupt will expose a frame or whole-instruction model, and the burndown row that records the result is axis 2, cycle and timing. A game that does none of those things runs correctly under a much cheaper model on the same console, and the cheaper model is then the right engineering choice. That is why a timing verdict has to name a game as well as a console before it means anything.

Read the words carefully when a project describes its own model. gbrecompiled uses "cycle exact" as the name of a phased programme, not as a status. The granularity vocabulary in the GBA burndown, `CYCLE-ACCURATE` through `EVENT-SCHEDULED` to `NOT-MODELED`, exists so that a document can say which one it means. [`/docs/concepts/accuracy-and-burndowns`](/docs/concepts/accuracy-and-burndowns) has each console's current row.

## Source

- smsggrecomp: [`FLAT_STEP.md`](https://github.com/mstan/smsggrecomp/blob/main/FLAT_STEP.md), [`SMS_GG_ACCURACY_BURNDOWN.md`](https://github.com/mstan/smsggrecomp/blob/main/SMS_GG_ACCURACY_BURNDOWN.md)
- snesrecomp: [`FRAME_MODEL_TIMING.md`](https://github.com/mstan/snesrecomp/blob/main/FRAME_MODEL_TIMING.md), [`SNES_ACCURACY_BURNDOWN.md`](https://github.com/mstan/snesrecomp/blob/main/SNES_ACCURACY_BURNDOWN.md)
- gbrecompiled: [`MEM_TIMING_SCOPING.md`](https://github.com/mstan/gbrecompiled/blob/master/MEM_TIMING_SCOPING.md), [`CYCLE_EXACT_INITIATIVE.md`](https://github.com/mstan/gbrecompiled/blob/master/CYCLE_EXACT_INITIATIVE.md), [`GATE5_SCORECARD.md`](https://github.com/mstan/gbrecompiled/blob/master/GATE5_SCORECARD.md), [`runtime/src/interpreter.c`](https://github.com/mstan/gbrecompiled/blob/master/runtime/src/interpreter.c), [`runtime/include/gb_timing.h`](https://github.com/mstan/gbrecompiled/blob/master/runtime/include/gb_timing.h)
- gbarecomp: [`GBA_ACCURACY_BURNDOWN.md`](https://github.com/mstan/gbarecomp/blob/main/GBA_ACCURACY_BURNDOWN.md)
- vbrecomp: [`VB_ACCURACY_BURNDOWN.md`](https://github.com/mstan/vbrecomp/blob/master/VB_ACCURACY_BURNDOWN.md)
- nesrecomp: [`COSIM.md`](https://github.com/mstan/nesrecomp/blob/master/COSIM.md), [`ACCURACY_PHASE_PLAN.md`](https://github.com/mstan/nesrecomp/blob/master/ACCURACY_PHASE_PLAN.md)

## Next

- [`/docs/concepts/co-simulation`](/docs/concepts/co-simulation) is how a timing change is measured before it ships.
- [`/docs/concepts/accuracy-and-burndowns`](/docs/concepts/accuracy-and-burndowns) records where each console's timing axis actually stands.
- [`/docs/guides/debug-a-divergence`](/docs/guides/debug-a-divergence) is the workflow when a timing bug shows up as a diverging state hash.
- [`/docs/concepts/glossary`](/docs/concepts/glossary) defines flat step, cycle exact and the granularity verdicts.
