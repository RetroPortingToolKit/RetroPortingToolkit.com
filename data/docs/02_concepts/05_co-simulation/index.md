---
title: "Co-simulation"
summary: "The fleet's decision procedure for correctness: two implementations of the same console stepped on a shared guest clock, full architectural state hashed at every checkpoint, halting at the first checkpoint that differs."
section: "concepts"
sectionTitle: "Concepts"
pageType: "concept"
tags: ["Correctness", "Testing", "Co-simulation"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/gbrecompiled"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/snesrecomp"
updated: "2026-08-23"
---

A static recompiler turns a game's machine code into C, and nothing about the resulting C tells you it still behaves like the machine it came from. Co-simulation is the fleet's answer. Two complete implementations of the same console run from the same reset, both stop at the same guest moment, everything that can influence what happens next is hashed, and the run halts at the first checkpoint whose hashes differ. That checkpoint is the first divergence by construction, which is the whole point: there is no hypothesis about the cause that can turn out to be wrong.

## Why a decision procedure and not another probe

[`psxrecomp`](https://github.com/mstan/psxrecomp) reduces all debugging to capturing state, comparing state and finding the first difference, under one rule in [`PRINCIPLES.md`](https://github.com/mstan/psxrecomp/blob/master/PRINCIPLES.md): "Never debug the final symptom." Co-simulation is that rule as a tool, written after two weeks of wrong root causes. From [`docs/internal/COSIM_ORACLE.md`](https://github.com/mstan/psxrecomp/blob/master/docs/internal/COSIM_ORACLE.md):

> The fix for that failure mode is not another probe. It is a **decision procedure**:
> a tool that compares the **complete architectural state** of two backends, stepped
> deterministically from boot, and halts at the **first** state that differs. Whatever
> it halts on *is* the first divergence; there is no hypothesis that can be "wrong."

![The rungs are guest cycles, not wall clock time. Both sides hash everything that can influence what happens next and fold it into a running chain, so the first chain that differs is the first divergence and the first sub-hash under it names the subsystem.](./lockstep.svg)

Four things on this page are the shared design, meaning every project that has co-simulation does them: the two pairings, the clock-keyed ruler, a whole-machine hash with per-subsystem sub-hashes, and the self-check gates. Two things are not shared and must be read per project: which implementations are on each side, and what a project does when it cannot park both of them. The sections below mark which is which as they go.

## Two pairings, two different proofs

The pairings are shared design. Every project runs the comparison in two configurations that prove different things. Pairing 1 compares the recompiled code against the project's own interpreter backend, showing the recompiler agrees with the project's own model of the machine. Pairing 2 compares against an independently authored emulator, and is the only configuration that can arbitrate a shared mistake. [`nesrecomp`](https://github.com/mstan/nesrecomp) opens its scorecard with the reason, in [`NES_ACCURACY_BURNDOWN.md`](https://github.com/mstan/nesrecomp/blob/master/NES_ACCURACY_BURNDOWN.md):

> **Self-agreement is NOT accuracy.** "The recompiled C agrees with our own runner's
> interpreter / our own APU" proves *backend equivalence*, not *correctness*; both can be
> identically wrong.

[`gbrecompiled`](https://github.com/mstan/gbrecompiled) names the mechanism: the recompiler and the interpreter share `gb_timing.h`, so a bug in that table diverges from hardware identically in both and passes pairing 1. [`segagenesisrecomp`](https://github.com/mstan/segagenesisrecomp) says pairing 1 "is BLIND to the runner", because VDP, Z80 scheduling, mixer and timing are shared code on both sides.

What fills the two columns is per project, and nothing in one row generalises to another.

| Project | Pairing 1, recompiler correctness | Pairing 2, independent oracle |
|---|---|---|
| psxrecomp | the same binary under `PSX_FORCE_INTERP` | Beetle PSX libretro core, built as `libmednafen_psx.a` |
| gbrecompiled | `runtime/src/interpreter.c`, both as `GBContext*` in one process | SameBoy `Core/`, linked in-process by `runtime/src/sameboy_oracle.c` |
| segagenesisrecomp | the clean-room Tier-3 interpreter, `GENESIS_FORCE_INTERP` | clownmdemu, deleted along with the emulator core |
| gbarecomp | a whole-program force-interp backend built for this purpose | NanoBoyAdvance, `_nba_oracle/nba_oracle.cpp` on TCP 19844, unbuilt |
| nesrecomp | recomp against recomp, determinism only | Mesen NES libretro core, hosted in-process by `nesref` |
| snesrecomp | `interp816.c` driving the runner's own devices | bsnes through a libretro frontend, frame-granular |

Pairing 2 means several projects link a third-party emulator core into development builds. None of it ships. [`snesrecomp`](https://github.com/mstan/snesrecomp) states the rule for everyone: co-simulation is dev-build only, "NEVER in the shipping Production config: zero bytes in released exes."

> **You provide this.** Every co-simulation run takes a game file and you supply your own. The projects do not distribute game files, which is also why the Genesis decoder's ROM-dependent test is left manual and the NES self-tests use synthetic ROMs.

## The ruler both sides advance

Shared design: the two sides must be at the same guest moment when compared, and comparison is clock-keyed and never block-keyed, because the recompiler's blocks come from a build-time control flow graph and the interpreter's from single instructions, so a block-leader hash sequence would never line up. Which quantity is the clock is per console, and each project picks one both of its implementations advance identically: `psx_cycle_count` on PlayStation, the 32 bit T-cycle counter `ctx->cycles` on Game Boy, the ARM7 master cycle on GBA.

Two consoles could not use the obvious quantity, and both reasons are specific to the machine. segagenesisrecomp needs two clocks. Its recompiled code fast-forwards the `WaitForVBlank` spin that a pure interpreter actually spins through, so the instruction axis drifts between backends and only the raster-driven `master_cycle`, advanced by the scanline loop rather than by CPU execution, is a valid cross-backend ruler.

nesrecomp derives its video frame index from the cycle ruler rather than counting NMIs, and that choice is sharper than it looks. A frame per NMI stalls when a game suppresses the NMI: one side stops counting, every later comparison is off by a frame, and the run reports a phase shift that is really bookkeeping. Deriving `g_cosim_vframe` from cycles keeps both sides naming the same frame across NMI-off scene transitions. The cost is that one derived frame can receive two emitted rows at such a transition, so the coordinator deduplicates last-wins per frame before it compares. [`/docs/platforms/nes`](/docs/platforms/nes) covers the rest of that toolchain.

## What gets hashed, and what is deliberately left out

Shared design again. Every project hashes the whole machine and keeps per-subsystem sub-hashes alongside, so a mismatch localises before anyone diffs a byte, and how many sub-hashes there are follows the console: 13 on PlayStation, 14 on Game Boy, 10 each on Genesis, SNES and NES. One rule governs what goes in. It was written for psxrecomp and every other project in the fleet works to it, from [`runtime/include/cosim_state.h`](https://github.com/mstan/psxrecomp/blob/master/runtime/include/cosim_state.h):

> The single correctness rule: this hash must cover EVERY piece of state that can
> influence future guest execution, and NOTHING that is host-only (pointers, padding,
> jmpbufs, fiber/malloc addresses). A missed execution-relevant field is a blind spot
> (false "no divergence"); an included host-only field is a false positive.

The most copied consequence is that the program counter is excluded from the compared hash. That exclusion is now shared design, but it is not an axiom: the comment below is psxrecomp's, and it carries the measurement on one PlayStation run that settled the argument. A project on another console adopting the rule is adopting a conclusion someone else's evidence supports.

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

Two other exclusions recur. Backend bookkeeping that legitimately differs stays out: gbarecomp hashes cycles-since-event, never the interrupt-poll call count, because the recompiler polls per block and the interpreter per instruction. Host padding is zeroed rather than hashed, after an uninitialised `MapperState` struct produced a false divergence on NES that gate 1 caught. Trimming the surface on a hunch is forbidden: hashing only the PPU because the CPU is known good, gbrecompiled writes, "re-creates the single-signal blind spot the method eliminates and *assumes the thing under test*."

## The deterministic park

The lockstep itself is small. Shared design is the four steps at each checkpoint: hash the state, fold the hash into a running chain, stamp a ring row, then block until the coordinator grants more budget. Whether a project can perform the fourth step at all is per project, and one of them cannot. The implementation below is psxrecomp's.

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

The comment is the load-bearing part. An earlier design let both sides free-run and stopped them asynchronously; the two processes noticed the stop flag at different wall-times and parked at different cycles, which is harness nondeterminism wearing the costume of a guest bug. The stride is fixed from the environment at launch, before either process executes an instruction. Once a divergence window is known, shrinking the stride toward one inside that window and re-running reproduces the same divergence, because the run is deterministic.

nesrecomp cannot park at all, for a reason that belongs to its oracle rather than to its console: the libretro ABI gives it no way to stop Mesen mid-frame. It free-runs both sides and aligns offline, comparing frame `N` against oracle frame `N + offset`. When trajectories drift it uses adaptive offset search and a scroll-phase classifier to decide which residual it has: "a discrete shift that recovers a high match = alignment; a match that stays low = a genuine divergence or phase desync". That is a classifier, not a fudge factor, which is what keeps the numbers honest.

## The gates that check the checker

No result is believed until a set of self-checks passes, and this is the most interesting idea here: a test that proves the test works. The four gates are shared design; the canonical write-up of them is gbrecompiled's, and the numbering is not shared at all, as the note at the end of this section records.

1. **Recomp against recomp must be zero divergence** across the run, which proves the coordinator is deterministic, the hashing is stable, and no host-only state leaked in. It also assumes the build is deterministic to begin with, which is a property in its own right: see [`/docs/concepts/determinism`](/docs/concepts/determinism).
2. **Interpreter against interpreter must be zero**, and oracle against oracle when an external emulator is in play.
3. **An injected fault must halt the run at exactly the right place and name the right subsystem.** This is the only gate that catches a comparison that is silently blind.
4. **A hash versus byte audit** every N checkpoints, forcing a full compare even when the hashes agree. A failure here is reported as a tool bug, not a guest divergence.

Gate 3 is the one to understand. Gates 1 and 2 are satisfied trivially by a broken tool: a hasher that returns a constant, or a coordinator that parses neither side and so compares nothing against nothing, reports perfect agreement forever. So a known fault is injected into live state and the run is required to fail in a specific way. nesrecomp flips one byte into live memory just before the hash is taken, then checks not only that the tool noticed but where it said the problem was.

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

The gate is not theoretical. A stride-2 parser in the PlayStation coordinator misaligned on a leading status word, returned `chain=None` for both sides, and made every comparison `None == None`, which is to say equal, forever. Its fix lives in the parser's docstring, the shortest good argument in the fleet for why a verification tool needs verifying. The coordinator now aborts outright when it cannot parse a chain, printing that the tool is "BLIND" rather than reporting agreement.

From [`tools/cosim.py`](https://github.com/mstan/psxrecomp/blob/master/tools/cosim.py):

```python title="tools/cosim.py"
def kv(resp):
    """parse a reply into {key: next_token} for every token that is followed by
    another token. Robust to a leading bare status word (e.g. 'parked cp N cycle M
    chain HEX'): we scan ALL adjacent pairs, so 'chain' -> HEX is always captured
    regardless of the leading word's parity. (The earlier stride-2 parser misaligned
    on the leading 'parked'/'timeout' word and returned chain=None for BOTH sides,
    making every compare None==None == 'equal' — a silent blind spot. Gate 4 exists
    to catch exactly this.)"""
```

One warning for anyone reading across repositories: the gates are numbered inconsistently. psxrecomp calls fault injection gate 4, as its `inject` protocol commands do, while gbrecompiled and nesrecomp call it gate 3 and reserve 4 for the byte audit. The gates are the same, only the numbers move.

## What a run reports

On a chain mismatch the coordinator prints the checkpoint and guest cycle, both chain hashes, both sub-hash lines annotated "(the FIRST subsystem hash that differs is where it split)", CPU and device field dumps, and the last 16 ring rows from each side. It warns separately when the two sides parked at different cycles, naming that as harness nondeterminism rather than a guest bug. Localisation continues from there with per-field diffs, covered by symptom in [`/docs/guides/debug-a-divergence`](/docs/guides/debug-a-divergence). A green run is kept too: the chain hash folds every checkpoint, so the final value is pinnable as a regression baseline.

## What co-simulation does not prove

It does not prove hardware correctness. Pairing 1 proves the recompiled code equals the project's own interpreter, and only pairing 2 arbitrates against an independent implementation. Pairing 2 is currently absent on Genesis, where the clownmdemu oracle was deleted along with the emulator core, unbuilt on GBA, and carrying an open first divergence on Game Boy, where SameBoy splits from the recompiled build on the PPU sub-scanline LY phase.

It is also blind to anything outside the hashed state. nesrecomp is explicit: "Not an emulator, not a renderer check. It measures *state convergence* across two implementations. It is blind to display/feel", with a standing rule that nothing ships on headless numbers alone. And a divergent byte does not close a bug by itself. [`SuperMarioWorldRecomp`](https://github.com/mstan/SuperMarioWorldRecomp) records that a final close "needs visible-symptom tie".

And one whole class of failure sits underneath it: a recompiler can be wrong by never emitting a function at all, which is a failure of [`/docs/concepts/code-discovery`](/docs/concepts/code-discovery) and surfaces as a dispatch miss, not as a differing hash.

## Source

- psxrecomp: [`docs/internal/COSIM_ORACLE.md`](https://github.com/mstan/psxrecomp/blob/master/docs/internal/COSIM_ORACLE.md), [`runtime/src/cosim.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/cosim.c), [`runtime/src/cosim_state.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/cosim_state.c), [`runtime/include/cosim_state.h`](https://github.com/mstan/psxrecomp/blob/master/runtime/include/cosim_state.h), [`tools/cosim.py`](https://github.com/mstan/psxrecomp/blob/master/tools/cosim.py), [`PRINCIPLES.md`](https://github.com/mstan/psxrecomp/blob/master/PRINCIPLES.md)
- nesrecomp: [`COSIM.md`](https://github.com/mstan/nesrecomp/blob/master/COSIM.md), [`tools/nes_cosim.py`](https://github.com/mstan/nesrecomp/blob/master/tools/nes_cosim.py), [`runner/src/runtime.c`](https://github.com/mstan/nesrecomp/blob/master/runner/src/runtime.c)
- gbrecompiled: [`COSIM_ORACLE.md`](https://github.com/mstan/gbrecompiled/blob/master/COSIM_ORACLE.md), [`runtime/src/differential.c`](https://github.com/mstan/gbrecompiled/blob/master/runtime/src/differential.c)
- gbarecomp: [`COSIM_ORACLE.md`](https://github.com/mstan/gbarecomp/blob/main/COSIM_ORACLE.md)
- segagenesisrecomp: [`COSIM.md`](https://github.com/mstan/segagenesisrecomp/blob/master/COSIM.md), [`runner/cosim.c`](https://github.com/mstan/segagenesisrecomp/blob/master/runner/cosim.c)
- snesrecomp: [`SNES_COSIM.md`](https://github.com/mstan/snesrecomp/blob/main/SNES_COSIM.md)

## Next

- [`/docs/guides/set-up-co-simulation`](/docs/guides/set-up-co-simulation) stands one up, with real commands.
- [`/docs/guides/debug-a-divergence`](/docs/guides/debug-a-divergence) is what to do once a run halts.
- [`/docs/concepts/accuracy-and-burndowns`](/docs/concepts/accuracy-and-burndowns) is how a green run becomes a claim.
- [`/docs/concepts/timing-models`](/docs/concepts/timing-models) is the usual reason two backends disagree at all.
- [`/docs/concepts/glossary`](/docs/concepts/glossary) defines oracle, pairing, chain hash and ratchet as the fleet uses them.
