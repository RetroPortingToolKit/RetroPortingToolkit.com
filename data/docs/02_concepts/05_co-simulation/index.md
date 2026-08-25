---
title: "Co-simulation"
summary: "Run two versions of the same console side by side from the same start, stop both at the same point in game time, compare everything, and halt at the first difference. That first difference is the bug."
pageType: "concept"
tags: ["Correctness", "Testing", "Co-simulation"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/gbrecompiled"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/snesrecomp"
updated: "2026-08-25"
---

A recompiler turns a game's machine code into code you can compile, and nothing about the result proves it still behaves like the console. Co-simulation is how these projects find out. Two versions of the same console run the same game from the same reset. Both stop at the same point in game time, called a checkpoint. Everything that could affect what happens next is squeezed into one number, a hash. Matching hashes, keep going. The first checkpoint where they differ is where the two versions stopped agreeing, and everything after it is consequence.

## Why this and not another debugging tool

[psxrecomp](https://github.com/mstan/psxrecomp) has one debugging rule: "Never debug the final symptom." Co-simulation is that rule as a tool, written after two weeks of wrong answers. From [`docs/internal/COSIM_ORACLE.md`](https://github.com/mstan/psxrecomp/blob/master/docs/internal/COSIM_ORACLE.md):

> The fix for that failure mode is not another probe. It is a **decision procedure**:
> a tool that compares the **complete architectural state** of two backends, stepped
> deterministically from boot, and halts at the **first** state that differs. Whatever
> it halts on *is* the first divergence; there is no hypothesis that can be "wrong."

![The rungs are guest cycles, not clock time. Both sides fold each hash into a running total, so the first total that differs is the first difference, and the first sub-hash under it names the part of the machine.](./lockstep.svg)

Four things below are shared by every project that has co-simulation: the two pairings, a clock both sides can count, a whole-machine hash with smaller hashes inside it, and the self-checks. Two are not: which two versions are compared, and what a project does when it cannot stop them both.

## Two pairings, two different proofs

**Pairing 1** compares the recompiled code against the project's own interpreter, which shows the recompiler agrees with the project's own model of the machine. **Pairing 2** compares against an emulator somebody else wrote, and it is the only setup that catches a mistake both of your own halves share. [nesrecomp](https://github.com/mstan/nesrecomp) opens its scorecard with the reason:

> **Self-agreement is NOT accuracy.** "The recompiled C agrees with our own runner's
> interpreter / our own APU" proves *backend equivalence*, not *correctness*; both can be
> identically wrong.

[gbrecompiled](https://github.com/mstan/gbrecompiled) shows how: its recompiler and its interpreter share one timing table, so an error in that table appears in both and pairing 1 sails past it. What fills the two columns is per project, and no row generalises to another.

| Project | Pairing 1, recompiler correctness | Pairing 2, independent oracle |
|---|---|---|
| psxrecomp | the same binary under `PSX_FORCE_INTERP` | Beetle PSX libretro core, built as `libmednafen_psx.a` |
| gbrecompiled | `runtime/src/interpreter.c`, both as `GBContext*` in one process | SameBoy `Core/`, linked in-process by `runtime/src/sameboy_oracle.c` |
| segagenesisrecomp | the clean-room Tier-3 interpreter, `GENESIS_FORCE_INTERP` | clownmdemu, deleted along with the emulator core |
| gbarecomp | a whole-program force-interp backend built for this purpose | NanoBoyAdvance, `_nba_oracle/nba_oracle.cpp` on TCP 19844, unbuilt |
| nesrecomp | recomp against recomp, determinism only | Mesen NES libretro core, hosted in-process by `nesref` |
| snesrecomp | `interp816.c` driving the runner's own devices | bsnes through a libretro frontend, frame-granular |

Pairing 2 means several projects link somebody else's emulator into development builds. None of it ships. [snesrecomp](https://github.com/mstan/snesrecomp) states the rule for everyone: co-simulation is dev-build only, "NEVER in the shipping Production config: zero bytes in released exes."

> **You provide this.** Every co-simulation run needs a game file, and you supply your own.

## The clock both sides count

To compare two machines you need them at the same moment. That moment is counted in guest time, never in blocks of code, because the recompiler's blocks and the interpreter's instructions do not line up. Each project picks a number both of its versions advance the same way: a cycle counter on PlayStation and Game Boy, the ARM7 master cycle on Game Boy Advance.

Two consoles could not use the obvious number. segagenesisrecomp's recompiled code skips a wait loop its interpreter really spins through, so only a raster-driven master cycle works. nesrecomp derives its frame number from cycles instead of counting interrupts, because a game that switches its interrupt off would stall one side's count.

## What gets hashed

Every project hashes the whole machine and keeps smaller hashes per part, so a mismatch points somewhere before anyone compares bytes. One rule governs what goes in, from [`runtime/include/cosim_state.h`](https://github.com/mstan/psxrecomp/blob/master/runtime/include/cosim_state.h):

> The single correctness rule: this hash must cover EVERY piece of state that can
> influence future guest execution, and NOTHING that is host-only (pointers, padding,
> jmpbufs, fiber/malloc addresses). A missed execution-relevant field is a blind spot
> (false "no divergence"); an included host-only field is a false positive.

The most copied consequence is that the program counter, the address of the instruction being run, stays out of the compared hash. The comment below carries the measurement that settled it, on one PlayStation run.

From [`runtime/src/cosim_state.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/cosim_state.c):

```c title="runtime/src/cosim_state.c"
static uint64_t hash_cpu(const CPUState *c) {
    uint64_t h = FNV_OFF;
    uint32_t gte_data[32];
    h = fnv(h, c->gpr, sizeof c->gpr);
    /* cpu->pc is DELIBERATELY EXCLUDED from the cross-backend hash. The compiled
     * backend does not keep cpu->pc current mid-execution — it writes pc only at block
     * transfers, and it is transiently 0 between dispatch calls — whereas the interp
     * keeps pc exact per-instruction. So at a mid-instruction cycle checkpoint the two
     * backends legitimately hold different pc values while being in the SAME
     * architectural state (verified: at the first flagged divergence, cp32, ONLY pc
     * differed; every gpr/cop0/hi/lo/micro-state matched). Including pc produced a false
     * first-divergence. This is NOT a blind spot: a REAL control-flow split shows up as a
     * differing gpr/memory value within one checkpoint. pc stays available via the `cpu`
     * TCP command for reporting. */
    h = fnv_u32(h, c->hi); h = fnv_u32(h, c->lo);
    h = fnv(h, c->cop0, sizeof c->cop0);
```

Trimming the hash on a hunch is forbidden. Hashing only the video chip because the CPU is believed good, gbrecompiled writes, "re-creates the single-signal blind spot the method eliminates and *assumes the thing under test*."

## Stopping both sides in the same place

At each checkpoint a project hashes the state, folds it into a running total, records a row, and waits for permission to continue. Whether it can do that last step at all is per project.

From [`runtime/src/cosim.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/cosim.c):

```c title="runtime/src/cosim.c"
static void cosim_record_checkpoint(uint64_t cycle, uint32_t pc) {
    uint64_t h = cosim_state_hash(NULL);
    uint64_t cp = ++g_cp;
    g_chain = fold(fold(g_chain, cycle), h);
    Entry *e = &g_ring[cp & (RING_N - 1u)];
    e->cp = cp; e->pc = pc; e->hash = h;
    e->istat = i_stat; e->imask = i_mask; e->cycle = cycle;

    /* deterministic park: consume one checkpoint of budget, else block for `step`.
     * The guest ALWAYS stops here (a fixed cycle boundary), never at a wall-time point. */
    if (g_run_budget > 0) { g_run_budget--; return; }
    g_parked = 1;
    while (g_run_budget <= 0) {
        int tok = g_go_token;
        while (g_go_token == tok && g_run_budget <= 0) COSIM_SLEEP(1);
    }
    g_parked = 0;
    g_run_budget--;
}
```

The comment is the load-bearing part. An earlier design let both sides run freely and stopped them by flag, so they stopped at different guest moments and the harness invented differences that were not in the game. nesrecomp cannot stop its oracle mid-frame at all, so it runs both sides and lines them up afterwards.

## The tests that test the test

No result is believed until a set of self-checks passes. They are tests that prove the test works.

1. **The recompiled build against itself must show zero differences.** That proves the harness is repeatable, the hashing is stable, and no host-only state leaked in.
2. **The interpreter against itself must be zero too**, and the outside emulator against itself where there is one.
3. **A deliberately injected fault must halt the run in exactly the right place and name the right subsystem.**
4. **A full byte-by-byte compare every so often**, even when the hashes agree. A failure here is a bug in the tool, not in the game.

Check 3 is the one to understand, because checks 1 and 2 are passed easily by a broken tool: a hasher that returns a constant reports perfect agreement forever. So a known fault is pushed into live memory and the run has to fail in a specific way.

From [`tools/nes_cosim.py`](https://github.com/mstan/nesrecomp/blob/master/tools/nes_cosim.py):

```python title="tools/nes_cosim.py"
def cmd_gate3(exe, rom, frames):
    inj_frame = max(5, frames // 2)
    print(f"[Gate 3] fault injection at frame {inj_frame} ({frames} frames)")
    rc = 0
    with tempfile.TemporaryDirectory() as d:
        clean = load(run(exe, rom, os.path.join(d, "clean.jsonl"), frames))
        # (a) OAM inject — should localize to ppu_mem and self-heal next frame.
        oam = load(run(exe, rom, os.path.join(d, "oam.jsonl"), frames,
                       inject=f"{inj_frame}:oam:7:ff"))
        div = first_divergence(clean, oam)
        if div and div[0] == inj_frame and "ppu_mem" in div[1]:
            print(f"  PASS[oam]: detected at frame {inj_frame}, localized to {div[1]}")
        else:
            print(f"  FAIL[oam]: expected first divergence at {inj_frame} in ppu_mem, got {div[:2] if div else None}")
            rc = 1
```

It is not theoretical. A parsing bug in the PlayStation coordinator once made both sides report nothing, so every comparison was nothing against nothing, which is to say equal, forever. The tool now stops and says it is blind instead of reporting agreement. One warning: projects number these checks differently. The checks are the same; only the numbers move.

## What co-simulation does not prove

It does not prove the port matches the hardware. Pairing 1 only proves the recompiled code matches the project's own interpreter, and pairing 2 is missing on Genesis, unbuilt on Game Boy Advance, and open on Game Boy.

It is also blind to anything outside the hashed state. nesrecomp is explicit: it "is blind to display/feel", with a standing rule that nothing ships on headless numbers alone. And one whole class of bug sits underneath it. A recompiler can be wrong by never emitting a function at all, which shows up as a jump to nothing, not as a differing hash. That is [telling code from data](/docs/concepts/code-discovery).

## Source

- psxrecomp: [`docs/internal/COSIM_ORACLE.md`](https://github.com/mstan/psxrecomp/blob/master/docs/internal/COSIM_ORACLE.md), [`runtime/src/cosim.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/cosim.c), [`runtime/src/cosim_state.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/cosim_state.c), [`tools/cosim.py`](https://github.com/mstan/psxrecomp/blob/master/tools/cosim.py)
- nesrecomp: [`COSIM.md`](https://github.com/mstan/nesrecomp/blob/master/COSIM.md), [`tools/nes_cosim.py`](https://github.com/mstan/nesrecomp/blob/master/tools/nes_cosim.py)
- gbrecompiled: [`COSIM_ORACLE.md`](https://github.com/mstan/gbrecompiled/blob/master/COSIM_ORACLE.md). gbarecomp: [`COSIM_ORACLE.md`](https://github.com/mstan/gbarecomp/blob/main/COSIM_ORACLE.md)
- segagenesisrecomp: [`COSIM.md`](https://github.com/mstan/segagenesisrecomp/blob/master/COSIM.md). snesrecomp: [`SNES_COSIM.md`](https://github.com/mstan/snesrecomp/blob/main/SNES_COSIM.md)

## Next

- [Set up co-simulation](/docs/guides/set-up-co-simulation) stands one up, with real commands.
- [Debug a divergence](/docs/guides/debug-a-divergence) is what to do once a run halts.
- [What correct enough means](/docs/concepts/accuracy-and-burndowns) is how a clean run becomes a claim.
- [Timing models](/docs/concepts/timing-models) is the usual reason two versions disagree at all.
