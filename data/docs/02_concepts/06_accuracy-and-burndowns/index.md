---
title: "What correct enough means"
summary: "How these projects turn accuracy into something you can measure: a seven-part scorecard per console, two conditions before any part counts as done, and each console's current state in its own words."
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
updated: "2026-08-25"
---

"Does the port work" is not a question anyone can answer, so these projects stopped asking it. Six of them keep a **burndown** instead: a scorecard file, kept in the repository and updated as work lands, that splits the console into seven fixed parts, gives each part a status, names the outside reference it was checked against, and records how it was checked. A burndown is where a project writes down what it has measured and, just as importantly, what it has not.

## The seven axes

Each part is called an axis, and every burndown here uses the same seven, copied from psxrecomp's template:

1. Instruction meanings
2. Cycle and timing
3. Interrupt and event timing
4. Memory and hardware registers
5. Video, audio and input
6. Agreement between the static and the run-time recompiler paths
7. [Determinism](/docs/concepts/determinism)

The fixed shape is what makes two consoles comparable at all. It also means an axis cannot quietly vanish because nobody worked on it. It sits there with a status.

The shape is where the sharing stops. Every row under those headings is one console's measurement, against one console's reference, under one console's scope. Axis 2 in particular is not a common yardstick: a project chasing exact cycles and a project running a whole frame at a time both have an axis 2, and the numbers in them are not the same kind of number. [Timing models](/docs/concepts/timing-models) says which console chose which, and is worth reading before comparing two rows.

## What makes an item done

The bar for the top status is two conditions, not one. The rule is used across the fleet; the wording is [gbarecomp](https://github.com/mstan/gbarecomp)'s, and the list in brackets is that console's references:

> Every item gets: **status**, the **external comparative(s)** to cross-reference
> it against, and a **validation method**. "Looks good" is NOT a status
>
> > **An item is only GREEN once it is BOTH (a) cross-referenced against a
> > reference (GBATEK / NanoBoyAdvance source / mGBA source / a hardware test ROM)
> > AND (b) runtime-validated against an accurate oracle. Self-agreement
> > (compiled == our interp) is necessary but NOT sufficient.**

An **oracle** is a reference version to compare against. Condition (b) is [co-simulation](/docs/concepts/co-simulation): the burndown is the ledger, co-simulation is the instrument that fills it in.

Two more rules govern how an entry may be written. A difference somebody read about is "a **HYPOTHESIS, not a bug**" until it has been reproduced against the oracle on the same input. And no measurement may come from instrumentation switched on after the fact, because by then the interesting moment has usually gone past.

Scope goes into the claim itself. [smsggrecomp](https://github.com/mstan/smsggrecomp) says exactly what its numbers cover, in [`ACCURACY.md`](https://github.com/mstan/smsggrecomp/blob/main/ACCURACY.md):

> **What "exercised path" means, exactly:** boot through the attract/demo loop with
> no input (plus a hand-played confirmation by the maintainer). It is **NOT**
> whole-game, played-to-completion validation. [snip] Claims should always be quoted with this
> scope.

## Two ways of counting progress

Worth knowing before you compare two scorecards. [nesrecomp](https://github.com/mstan/nesrecomp) uses a numbered ladder:

> Status scale: **0 NOT-MODELED · 1 WEAK · 2 PARTIAL · 3 STRONG · 4 GREEN** (GREEN ⇒ both
> gate conditions in §0 met).

gbarecomp uses checkboxes, plus a separate vocabulary for how finely a thing is modelled, from `CYCLE-ACCURATE` down to `NOT-MODELED`. So an item there can be done without being cycle accurate, and the document still says which.

## What a real row looks like

Two entries, quoted, because the texture is the point. These documents carry numbers, dates, file paths, and whatever is still open.

Master System, axis 2, from [`SMS_GG_ACCURACY_BURNDOWN.md`](https://github.com/mstan/smsggrecomp/blob/main/SMS_GG_ACCURACY_BURNDOWN.md):

> - [x] **Per-anchor Δcycle vs Mesen: DONE 2026-06-28.** Anchor = IM1/VBlank
>   handler `0x0038`, 1798/1800 hits. Median Δ = **59,736 on both**; max Δ =
>   **79,206 identical**; **cumulative diff = −247 cyc over 1797 frames ≈ 0 net
>   drift** (−0.14 cyc/frame). The +0.043% gross total is thus CONFIRMED pure
>   boot-offset, not rate drift. Verdict: **JITTER-ONLY** (oscillates, no drift).
>   `_diag/accuracy/cyc0038_compare.json`.

And the same axis on [vbrecomp](https://github.com/mstan/vbrecomp):

> - [x] **Direct per-instruction cycle Δ MEASURED** via the `RB_CPUHOOK` ring
>   (the `cyc_watch` role; `tools/cpuhook_compare.py`). Over the first 557,125
>   instructions from boot the cumulative cycle Δ (recomp − oracle) stayed
>   within **[−95, 0]**: the flat-base cost model tracks the oracle's
>   guest-cycle counter to **~1e-4**.

Open items are written the same way. The GBA burndown records that memory wait times are fixed at the power-on default, so games that change them "diverge in cycle counts", and that one timing feature is not modelled at all: "NBA models this; we don't."

## The strictest programme in the fleet

[gbrecompiled](https://github.com/mstan/gbrecompiled) shows what done actually costs. On top of the co-simulation self-checks it adds one more, running the public Game Boy test ROMs as fixtures under full-state comparison, because a ROM that prints PASS on screen can still differ mid-run.

A clean run is then pinned so it cannot slip back.

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

Those numbers were re-pinned after two deliberate timing fixes, and the file records why. That is the discipline that keeps a baseline from becoming a rubber stamp: it moves when a behaviour change justifies it, never to make a failure go away.

The scorecard that comes out is not flattering, which is what makes it useful. It reports the CPU, interrupt and HALT tests passing, two memory timing suites failing two subtests each, and one suite failing outright. On another test set the interrupt group is 0 of 5, with the reason stated rather than excused:

> These fail on the per-M-cycle interrupt-*dispatch* axis: our dispatch is
> instruction-granular (`gb_handle_interrupts` at step/loop boundaries), so the
> exact-T-cycle checks fail.

The timer group is 9 of 13, with all four failures in one narrow window, which locates the bug instead of just counting it. And the harness runs three ROMs known to pass, to confirm that its pass detection works, "so the FAILs above are real".

## Where each console stands

Quoted from the burndowns, not upgraded. Read every row with the scope it was measured under.

| Console | What its own document says |
|---|---|
| NES | All 8 rows of its status table at **3 STRONG**. No axis is GREEN on the document's own scale. |
| SNES | Axis 1 STRONG, axis 2 "COMPLETE: model validated vs bsnes", PPU "VERIFIED PIXEL-EXACT vs bsnes". Axis 3 records that the runner "never raises an interrupt". |
| GBA | Opened at 0 of 7 GREEN, "every axis failed gate-(b) until NBA was wired". After the burndown, on one game: "axes 1, 6, 7 GREEN; axis 2 near-GREEN". |
| Virtual Boy | All 7 axes recorded as won for one game. Its oracle is "instruction-accurate, not cycle/pipeline-accurate", so the cycle axis cannot be green against that oracle alone. |
| Master System and Game Gear | All 7 axes validated against two independent oracles, scoped to the exercised path. Its own biggest gap: "**Whole-game validation**: NOT done." |
| Game Boy and Game Boy Color | Two documents report different results for overlapping ROMs, and neither supersedes the other, so there is no single current number. |
| Genesis | No seven-axis burndown in the tree. Pairing 1 bit-exact over 2M cycles, pairing 2 gone with the deleted oracle. |
| PlayStation | Every other burndown names psxrecomp's as the template. That file is not in the repository as cloned, so its per-axis verdicts are not documented here. |

## What must not be claimed

These are the projects' own limits on how their numbers may be used.

- Do not say a game "works" or is fully verified. The repositories claim agreement over named tests, with named leftovers.
- Do not say emulation is absent. Every project models devices, keeps an interpreter as a fallback, and several link somebody else's emulator into development builds.
- Do not treat co-simulation as proof of hardware correctness. Only an independent oracle arbitrates that.
- Do not quote a number without its test and its scope, because the projects do not.

## Source

- nesrecomp: [`NES_ACCURACY_BURNDOWN.md`](https://github.com/mstan/nesrecomp/blob/master/NES_ACCURACY_BURNDOWN.md). gbarecomp: [`GBA_ACCURACY_BURNDOWN.md`](https://github.com/mstan/gbarecomp/blob/main/GBA_ACCURACY_BURNDOWN.md)
- smsggrecomp: [`ACCURACY.md`](https://github.com/mstan/smsggrecomp/blob/main/ACCURACY.md), [`SMS_GG_ACCURACY_BURNDOWN.md`](https://github.com/mstan/smsggrecomp/blob/main/SMS_GG_ACCURACY_BURNDOWN.md). vbrecomp: [`VB_ACCURACY_BURNDOWN.md`](https://github.com/mstan/vbrecomp/blob/master/VB_ACCURACY_BURNDOWN.md)
- gbrecompiled: [`GATE5_SCORECARD.md`](https://github.com/mstan/gbrecompiled/blob/master/GATE5_SCORECARD.md), [`COSIM_ORACLE.md`](https://github.com/mstan/gbrecompiled/blob/master/COSIM_ORACLE.md), [`tools/cosim_baselines.tsv`](https://github.com/mstan/gbrecompiled/blob/master/tools/cosim_baselines.tsv)
- snesrecomp: [`SNES_ACCURACY_BURNDOWN.md`](https://github.com/mstan/snesrecomp/blob/main/SNES_ACCURACY_BURNDOWN.md). segagenesisrecomp: [`COSIM.md`](https://github.com/mstan/segagenesisrecomp/blob/master/COSIM.md)

## Next

- [Co-simulation](/docs/concepts/co-simulation) is the instrument that satisfies condition (b).
- [Timing models](/docs/concepts/timing-models) explains what axis 2 is measuring.
- [Set up co-simulation](/docs/guides/set-up-co-simulation) produces the evidence a row needs.
- [Debug a divergence](/docs/guides/debug-a-divergence) turns an open row into a located bug.
