---
title: "What correct enough means"
summary: "How the fleet turns accuracy into something measurable: a seven-axis burndown per console, a two-condition gate before any axis counts as done, and the current state of each console in its own words."
pageType: "concept"
tags: ["Correctness", "Testing", "Accuracy"]
repos:
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/vbrecomp"
  - "https://github.com/mstan/smsggrecomp"
  - "https://github.com/mstan/gbrecompiled"
  - "https://github.com/mstan/segagenesisrecomp"
updated: "2026-08-23"
---

"Does the port work" is not a question anyone can answer, so the fleet stopped asking it. Six repositories have an accuracy burndown instead: a living scorecard that breaks a console into seven fixed axes, gives each axis a status, names the external reference it was checked against, and records the method used to check it. Five of them can be read in the toolchain repositories as they stand; the sixth, psxrecomp's, is the template every other one names. A burndown is where a project writes down what it has actually measured, and just as importantly what it has not. This page is the method and the current state, quoted rather than summarised, because summarising is how these numbers get upgraded by accident.

## The seven axes

Every burndown in the fleet declares descent from one template. [`gbarecomp`](https://github.com/mstan/gbarecomp) states it plainly in [`GBA_ACCURACY_BURNDOWN.md`](https://github.com/mstan/gbarecomp/blob/main/GBA_ACCURACY_BURNDOWN.md):

> Companion scorecard for the faithful GBA recompiler core, modeled 1:1 on the
> psxrecomp `ACCURACY_BURNDOWN.md` 7-axis framework [snip]. That project
> owns the methodology; this doc transposes it to ARM7TDMI / GBA hardware

The axes are the same on NES, SNES, GBA, Virtual Boy and Master System:

1. Instruction semantics
2. Cycle and timing
3. Interrupt and event timing
4. Memory and MMIO
5. Peripherals: video, audio and input, split into sub-axes where useful
6. Static versus dynamic recompiler fidelity
7. [Determinism](/docs/concepts/determinism)

That fixed shape is what makes two consoles comparable at all. It also means an axis cannot quietly disappear because nobody worked on it; it sits there with a status.

The shape is where the sharing stops. Every row under those axes is one console's measurement against one console's reference, taken under one console's scope, and axis 2 in particular is not a common yardstick: a project pursuing cycle exactness and a project running a whole frame as a few calls both have an axis 2, and the numbers in them are not the same kind of number. [Timing models](/docs/concepts/timing-models) maps which console made which choice, and is worth reading before comparing two rows.

## What makes an item done

Each axis carries a status, the external comparative it is cross-referenced against, and a validation method. The bar for the top status is two independent conditions, not one. The rule is fleet-wide; the wording below is gbarecomp's, and the parenthesis in it is a GBA reference list, so read the named documents and emulators as that console's version of condition (a) rather than as the fleet's:

> Every item gets: **status**, the **external comparative(s)** to cross-reference
> it against, and a **validation method**. "Looks good" is NOT a status
>
> > **An item is only GREEN once it is BOTH (a) cross-referenced against a
> > reference (GBATEK / NanoBoyAdvance source / mGBA source / a hardware test ROM)
> > AND (b) runtime-validated against an accurate oracle. Self-agreement
> > (compiled == our interp) is necessary but NOT sufficient.**

Condition (b) is [`/docs/concepts/co-simulation`](/docs/concepts/co-simulation): the burndown is the ledger, co-simulation is the instrument that fills it in. Two more rules govern how an entry is allowed to be written. A discrepancy someone read about is "a **HYPOTHESIS, not a bug**", to be validated by diffing output against the oracle on the same input before any code changes. And no measurement may come from instrumentation that is armed after the fact, because by the time a probe is set up the interesting moment has usually already gone past.

Scope is written into the claim itself. [`smsggrecomp`](https://github.com/mstan/smsggrecomp) defines exactly what its numbers cover, in [`ACCURACY.md`](https://github.com/mstan/smsggrecomp/blob/main/ACCURACY.md):

> **What "exercised path" means, exactly:** boot through the attract/demo loop with
> no input (plus a hand-played confirmation by the maintainer). It is **NOT**
> whole-game, played-to-completion validation. [snip] Claims should always be quoted with this
> scope.

## Two ways of tracking progress

The fleet uses two scales, which is worth knowing before comparing two burndowns side by side. [`nesrecomp`](https://github.com/mstan/nesrecomp) uses a numeric ladder in [`NES_ACCURACY_BURNDOWN.md`](https://github.com/mstan/nesrecomp/blob/master/NES_ACCURACY_BURNDOWN.md):

> Status scale: **0 NOT-MODELED · 1 WEAK · 2 PARTIAL · 3 STRONG · 4 GREEN** (GREEN ⇒ both
> gate conditions in §0 met).

gbarecomp uses checkboxes plus a separate vocabulary for how finely a thing is modelled, so an item can be done without being cycle accurate and the document still says which:

> Status taxonomy (per item): `[ ]` open · `[~]` partial/in-progress · `[x]`
> done-and-dual-gate-validated. [snip]
> Granularity verdicts (the GBA cycle vocabulary): `CYCLE-ACCURATE` /
> `SCANLINE-ACCURATE` / `FRAME-ACCURATE` / `EVENT-SCHEDULED` / `NOT-MODELED`.

## What a real row looks like

Three entries from three consoles, verbatim, because the texture of these documents is the point: they carry numbers, dates, artefact paths, and the residual that is still open.

NES, axis 2 of the status table:

> | 2 Cycle/timing | 3 STRONG | cross-title cycle_compare drift: **SMB 0.51 / Zelda 0.41 / MM3 0.37 cyc/frame** ; all dominated by frame-len 29781 vs 29780.5; model holds NROM/MMC1/MMC3. **DMC DMA cycle-steal now charged to the budget** (4 cyc/fetch) [snip] | alternating frame budget + monotonic `g_cpu_cycles` (deferred, 0.0017% ; owner-deprioritized); dynamic penalties |

Master System, axis 2, from [`SMS_GG_ACCURACY_BURNDOWN.md`](https://github.com/mstan/smsggrecomp/blob/main/SMS_GG_ACCURACY_BURNDOWN.md):

> - [x] **Per-anchor Δcycle vs Mesen: DONE 2026-06-28.** Anchor = IM1/VBlank
>   handler `0x0038`, 1798/1800 hits. Median Δ = **59,736 on both**; max Δ =
>   **79,206 identical**; **cumulative diff = −247 cyc over 1797 frames ≈ 0 net
>   drift** (−0.14 cyc/frame). The +0.043% gross total is thus CONFIRMED pure
>   boot-offset, not rate drift. Verdict: **JITTER-ONLY** (oscillates, no drift).
>   `_diag/accuracy/cyc0038_compare.json`.

And the same axis on [`vbrecomp`](https://github.com/mstan/vbrecomp), in [`VB_ACCURACY_BURNDOWN.md`](https://github.com/mstan/vbrecomp/blob/master/VB_ACCURACY_BURNDOWN.md):

> - [x] **Direct per-instruction cycle Δ MEASURED** via the `RB_CPUHOOK` ring
>   (the `cyc_watch` role; `tools/cpuhook_compare.py`). Over the first 557,125
>   instructions from boot the cumulative cycle Δ (recomp − oracle) stayed
>   within **[−95, 0]**: the flat-base cost model tracks the oracle's
>   guest-cycle counter to **~1e-4**.

Open items are written the same way. GBA records that waitstates are hardcoded to the power-on default, so "Games that reprogram WAITCNT (most do [snip]) diverge in cycle counts", and that ROM prefetch timing is not modelled at all: "NBA models this; we don't."

## The rigorous end: gates, a scorecard and a ratchet

[`gbrecompiled`](https://github.com/mstan/gbrecompiled) runs the most demanding programme in the fleet, and it is the clearest picture of what "done" costs. Above the four co-simulation gates it adds a fifth, running the full-state comparison across the public Blargg and Mooneye test ROMs as fixtures, on the reasoning that a ROM whose on-screen verdict says PASS can still split mid-run, and that residual is "exactly the class the ratchet exists to expose". A separate boot gate runs the real BIOS to the `0xFF50` handoff and compares the handoff registers against the high level skip state; on Tetris with the DMG BIOS it reports "handoff at PC=0x0100 SP=0xFFFE, **0 CPU-handoff diffs**".

A passing run is then pinned so it cannot silently regress.

From [`tools/cosim_baselines.tsv`](https://github.com/mstan/gbrecompiled/blob/master/tools/cosim_baselines.tsv):

```text title="tools/cosim_baselines.tsv"
# Pinned co-simulation A-vs-B (recomp vs interpreter) baselines — the ratchet.
# The chain hash is the cumulative FNV fold of context-A's full-state hash at
# every T-cycle checkpoint. A recompiler/runtime change that alters guest
# behavior changes this hash; that is the regression signal.
# target        stride  frames  chain
tetris          456     700     E92927C083145FD7
megaman_xtreme2 456     1000    B02E9D35794D298E
instr_timing    456     120     5D103AEB0D3F03DB
```

Those three chains were re-pinned in July 2026 after two deliberate timing fixes, and the file records why, which is the discipline that keeps a ratchet from becoming a rubber stamp: a baseline moves when a behaviour change justifies it, never to make a regression go away.

The scorecard that comes out of gate 5 is not flattering, and that is what makes it useful. [`GATE5_SCORECARD.md`](https://github.com/mstan/gbrecompiled/blob/master/GATE5_SCORECARD.md) reports every Blargg CPU, interrupt, EI and HALT test passing, `mem_timing` and `mem_timing-2` each failing two subtests, and `oam_bug` failing. On the Mooneye acceptance suite the interrupt subset is 0 of 5, with the reason stated rather than excused:

> These fail on the per-M-cycle interrupt-*dispatch* axis: our dispatch is
> instruction-granular (`gb_handle_interrupts` at step/loop boundaries), so the
> exact-T-cycle checks fail.

The timer subset is "**9/13 PASS**", with all four failures clustering on the TIMA overflow and TMA reload window, which localises the bug rather than just counting it. And the harness carries its own controls: three ROMs known to pass are run to confirm the pass detection works, "so the FAILs above are real".

## Where each console stands

Quoted from the burndowns, not upgraded. Read every row with the scope it was measured under.

| Console | What its own document says |
|---|---|
| NES | All 8 rows of its status table at **3 STRONG**. No axis is GREEN on the document's own scale. Co-simulation gates 1, 2 and 3 pass across four games; two titles carry unresolved residuals. |
| SNES | Axis 1 STRONG, axis 2 "COMPLETE: model validated vs bsnes", PPU "VERIFIED PIXEL-EXACT vs bsnes". Axis 3 records that the runner "never raises an interrupt". |
| GBA | Opened at 0 of 7 GREEN, "every axis failed gate-(b) until NBA was wired". After the burndown, on one game: "axes 1, 6, 7 GREEN; axis 2 near-GREEN". Axis 1 has no hardware-ROM validation. |
| Virtual Boy | All 7 axes recorded as won for one game, each with a cross-process artefact. Its oracle is "instruction-accurate, not cycle/pipeline-accurate", so the cycle axis cannot be green against that oracle alone. |
| Master System and Game Gear | All 7 axes validated against two independent oracles, scoped to the exercised path. Its own biggest gap: "**Whole-game validation**: NOT done." |
| Game Boy and Game Boy Color | `ACCURACY.md` (2026-03-17) reports 28/70 on the public matrices. `GATE5_SCORECARD.md` (2026-07-02) reports different results for overlapping ROMs. Neither document supersedes the other, so there is no single current number. |
| Genesis | No seven-axis burndown in the tree. Its co-simulation reports pairing 1 bit-exact over 2M cycles, and pairing 2 gone with the deleted oracle. |
| PlayStation | Every other burndown names psxrecomp's `ACCURACY_BURNDOWN.md` as the template it was modelled on. That file is not in the repository as cloned, so PSX's own per-axis verdicts are not documented here. |

## What the projects say must not be claimed

The fleet's own limits on how these numbers may be used, and this page keeps them. Do not say a game "works" or is fully verified; the repositories claim state convergence over named fixtures with named residuals. Do not say emulation is absent; every project ships device emulation, an interpreter fallback tier, and in several cases a third-party emulator core in development builds. Do not treat co-simulation as proof of hardware correctness; pairing 1 proves the recompiled code equals the project's own interpreter, and only an independent oracle arbitrates the rest. And do not quote a number without its fixture and scope, because the projects do not.

## Source

- nesrecomp: [`NES_ACCURACY_BURNDOWN.md`](https://github.com/mstan/nesrecomp/blob/master/NES_ACCURACY_BURNDOWN.md), [`COSIM.md`](https://github.com/mstan/nesrecomp/blob/master/COSIM.md)
- gbarecomp: [`GBA_ACCURACY_BURNDOWN.md`](https://github.com/mstan/gbarecomp/blob/main/GBA_ACCURACY_BURNDOWN.md)
- smsggrecomp: [`ACCURACY.md`](https://github.com/mstan/smsggrecomp/blob/main/ACCURACY.md), [`SMS_GG_ACCURACY_BURNDOWN.md`](https://github.com/mstan/smsggrecomp/blob/main/SMS_GG_ACCURACY_BURNDOWN.md)
- vbrecomp: [`VB_ACCURACY_BURNDOWN.md`](https://github.com/mstan/vbrecomp/blob/master/VB_ACCURACY_BURNDOWN.md)
- gbrecompiled: [`GATE5_SCORECARD.md`](https://github.com/mstan/gbrecompiled/blob/master/GATE5_SCORECARD.md), [`COSIM_ORACLE.md`](https://github.com/mstan/gbrecompiled/blob/master/COSIM_ORACLE.md), [`ACCURACY.md`](https://github.com/mstan/gbrecompiled/blob/master/ACCURACY.md), [`tools/cosim_baselines.tsv`](https://github.com/mstan/gbrecompiled/blob/master/tools/cosim_baselines.tsv)
- snesrecomp: [`SNES_ACCURACY_BURNDOWN.md`](https://github.com/mstan/snesrecomp/blob/main/SNES_ACCURACY_BURNDOWN.md)
- segagenesisrecomp: [`COSIM.md`](https://github.com/mstan/segagenesisrecomp/blob/master/COSIM.md)

## Next

- [`/docs/concepts/co-simulation`](/docs/concepts/co-simulation) is the instrument that satisfies condition (b) of the gate.
- [`/docs/concepts/timing-models`](/docs/concepts/timing-models) explains what axis 2, cycle and timing, is actually measuring.
- [`/docs/guides/set-up-co-simulation`](/docs/guides/set-up-co-simulation) is how to produce the evidence a row needs.
- [`/docs/guides/debug-a-divergence`](/docs/guides/debug-a-divergence) turns an open row into a located bug.
- [`/docs/concepts/glossary`](/docs/concepts/glossary) defines burndown, gate, dual gate and ratchet as the fleet uses them.
