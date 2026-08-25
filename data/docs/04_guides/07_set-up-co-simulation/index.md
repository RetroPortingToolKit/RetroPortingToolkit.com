---
title: "Set up co-simulation"
summary: "Standing up an oracle and a comparison harness on a real project: which toolchains ship one, what each needs on disk, how the stride is fixed, the four gates in the order they must run, and how a green run is pinned as a baseline."
pageType: "guide"
tags: ["Correctness", "Testing", "Co-simulation"]
repos:
  - "https://github.com/mstan/gbrecompiled"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/snesrecomp"
updated: "2026-08-25"
---

This is the setup work: choosing an oracle, getting two implementations of the same console running from one reset, fixing the checkpoint stride, proving the comparator is not lying to you, and pinning the result so it stays true tomorrow. [Proving it with co-simulation](/docs/concepts/co-simulation) explains what co-simulation is. This page stops where a run halts, which is where [debug a divergence](/docs/guides/debug-a-divergence) begins. One warning before you plan a day around this: the harnesses are not the same everywhere, and two projects document an oracle you will not find in the tree.

## What your project ships

There is no single harness here. Each project made its own choice, and that choice changes what you have to install and what you can prove.

| Project | How the two sides run | What you need on disk | Where it stands |
|---|---|---|---|
| [gbrecompiled](https://github.com/mstan/gbrecompiled) (GB, GBC) | In one process. Both backends thread a full `GBContext*`, so the comparison needs no second process and no TCP. | The recompiled game executable. A DMG or CGB boot ROM for the separate boot gate. | Gates 1 to 4 pass on Tetris, with pinned chain-hash baselines. |
| [gbarecomp](https://github.com/mstan/gbarecomp) (GBA) | Two OS processes plus a Python coordinator over TCP. | The runtime plus a whole-program force-interp backend built for this purpose. | All gates pass. The independent oracle is unbuilt. |
| [nesrecomp](https://github.com/mstan/nesrecomp) (NES) | Two free-running processes writing JSONL traces that are diffed after the fact. It cannot park at all. | The recompiled game executable, a `nesref` binary and `mesen_libretro.dll`. | Gates 1, 2 and 3 pass across four games. |
| [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp) | Two OS processes plus TCP, built as the dev-only `_cosim` and `_oracle_cosim` targets. | The `_cosim` target and the coordinator, on ports 4600 and 4601. | Gates 1 to 3 runnable. Gate 3 only flips a CPU register. Pairing 2 is gone. |
| [psxrecomp](https://github.com/mstan/psxrecomp) | Two OS processes plus a Python coordinator over TCP. This is the design every other project transposed. | The same binary twice, one side forced to the interpreter. Beetle PSX built as `libmednafen_psx.a` for the independent pairing. | The gates live in the tool's own docstring. |
| [snesrecomp](https://github.com/mstan/snesrecomp) | `SNES_COSIM.md` describes a build shape, a TCP protocol and two tracks. | `runner/src/cosim.c` and `cosim_state.c` are in the tree. | A design document. No completed comparison result is recorded. |

Three more repositories carry co-simulation files that this page does not describe: [`cdirecomp/docs/COSIM-SPEC.md`](https://github.com/mstan/cdirecomp/blob/master/docs/COSIM-SPEC.md), [`gcnlle/docs/COSIM_DESIGN.md`](https://github.com/mstan/gcnlle/blob/master/docs/COSIM_DESIGN.md) and [`ndsrecomp/oracle/`](https://github.com/mstan/ndsrecomp/tree/main/oracle).

> **You provide this.** Every run below takes a game file and you supply your own. The projects do not distribute game files. That is also why the Genesis decoder's ROM-dependent test is left manual and the NES self-tests use synthetic ROMs.

**Checkpoint.** You can name your row in that table, the two implementations you are about to compare, and whether they run in one process or two.

## Choosing and building the oracle

Two [pairings](/docs/concepts/glossary#pairing) prove different things, and you run both if the project has both. Pairing 1 compares the recompiled code against the project's own interpreter. It proves the recompiler agrees with the project's own model of the machine. Pairing 2 compares against an emulator somebody else wrote, and it is the only setup that can settle a mistake both shipped backends share.

What plays the reference implementation, per project:

| Project | Pairing 1 | Pairing 2 |
|---|---|---|
| gbrecompiled | `runtime/src/interpreter.c` | SameBoy's `Core/`, linked in-process |
| gbarecomp | a force-interp backend | NanoBoyAdvance |
| nesrecomp | recompiled against recompiled | Mesen, hosted by `nesref` |
| segagenesisrecomp | the clean-room interpreter under `GENESIS_FORCE_INTERP` | retired, see below |
| psxrecomp | the same binary under `PSX_FORCE_INTERP` | Beetle PSX |
| snesrecomp | `interp816.c` | bsnes |

Two projects document an oracle that is not there:

- **Genesis pairing 2 has been retired.** [`COSIM.md`](https://github.com/mstan/segagenesisrecomp/blob/master/COSIM.md) opens with it: "**2026-07-27: pairing #2 is gone.** It compared the own backend against the clownmdemu oracle, and that oracle has been deleted along with the emulator core". The chunk-level numbers still in that document are historical. On Genesis today you can stand up pairing 1 only.
- **gbarecomp's spec was written before its own primary pairing existed**, and still says "⚠️ **This mode does not exist yet.**" for it. That backend was built later the same day. The independent NanoBoyAdvance oracle is the part that remains unbuilt.

On NES the oracle is named on the command line, which shows what pairing 2 costs you: two extra binaries you must already have.

From [`tools/nes_cosim.py`](https://github.com/mstan/nesrecomp/blob/master/tools/nes_cosim.py):

```sh
python ../nesrecomp/tools/nes_cosim.py abram \
  ./MyGameRecomp.exe ./rom.nes /f/Projects/nesref/nesref.exe \
  /f/Projects/nesref/cores/mesen_libretro.dll 900
```

The last two paths are the author's. Point them at your own `nesref` build and Mesen core. The trailing `900` is the frame count.

> **Note.** Co-simulation is a development build only. snesrecomp states the rule for the whole fleet: the co-sim code compiles only in a dev target and is "NEVER in the shipping Production config: zero bytes in released exes."

**Checkpoint.** Both sides launch and neither crashes on its own. On Game Boy, `--oracle-selfcheck` proves the embedded oracle boots before you compare anything with it.

## The stride, fixed before anything runs

The stride is how many units of the shared guest clock pass between checkpoints. On Game Boy it is a flag, `--cosim-stride`, defaulting to 456 T-cycles, which is one scanline. On PlayStation and SNES it is read from the environment at launch. Genesis instead picks which clock to count at all, with `--clock frame|cycle`, because its recompiled code fast-forwards a spin that a pure interpreter really spins through. [Timing models](/docs/concepts/timing-models) explains why the two backends disagree about time.

What matters in practice is that the stride is fixed before either side executes an instruction, and that the guest stops at a multiple of it rather than when someone tells it to stop. That design was paid for.

From [`runtime/src/cosim.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/cosim.c):

> The guest parks at EVERY checkpoint boundary (a deterministic guest cycle = multiple
> of stride) and only advances when the coordinator grants budget via `step N`. It does
> NOT free-run: the earlier "free-run until you notice an async stop cycle" design was
> racy; two processes noticed the flag at different wall-times and parked at different
> cycles (a HARNESS nondeterminism, not a guest one).

That is the argument for the design. Two processes that notice a stop flag at different wall-times park at different guest cycles, and comparing two different guest moments reports a difference. It looks exactly like a guest bug and it is not one. If a run warns that the two sides parked at different cycles, fix that before reading anything else it printed.

Pick a coarse stride first. Once you know the divergence window, shrink the stride toward 1 inside that window and re-run. The run is deterministic, so the same divergence comes back.

Set the determinism knobs at the same time. psxrecomp names headless, single thread, no host audio sink, no resampler and no host throttle. gbarecomp adds `RECOMP_RTC_EPOCH` to pin the real-time clock. nesrecomp deletes `saves/*.srm` before each run, because a stale battery save changes the second boot path.

**Checkpoint.** Run one side twice with identical settings and compare the chain hashes. They must match. If they do not, nothing below this line will mean anything.

## The four gates, in order

No comparison result is believed until the gates pass. Run them in order, and do not skip one because the previous one was green.

| Gate | What it proves | Game Boy | NES |
|---|---|---|---|
| 1. Self-determinism | The coordinator is deterministic, the hashing is stable, no host-only state leaked in | `--cosim-pair aa` | `gate1 <exe> <rom> 900` |
| 2. Second-backend determinism | The other backend is deterministic and context instancing is clean | `--cosim-pair bb` | `gate2 <nesref> <core> <rom> 900` |
| 3. Injected-fault localisation | The comparator is not silently blind | `--cosim-inject wram\|ppu\|apu\|cpu\|timer` with `--cosim-inject-at K` | `gate3 <exe> <rom> 900` |
| 4. Hash versus byte audit | The hash maintenance is faithful to the bytes | `--cosim-audit N` | no command of its own in the NES coordinator |

Gate 3 is the one people skip and the one that matters most. gbrecompiled states why, and the emphasis is theirs:

> **Injected fault halts at the right place and names the subsystem.** "This is the ONLY gate that catches a silently-blind compare (a parse bug or `None == None` compare passes Gate 1 trivially while catching nothing) [snip] **Never skip it.**"

That is not a theoretical risk. A stride-2 parser in the PlayStation coordinator misaligned on the leading status word of a reply, returned `chain=None` for both sides, and made every comparison `None == None`, which is to say equal, forever. The runs were clean and they were measuring nothing. Gate 3 also checks localisation, not just detection: nesrecomp requires the divergence at the injected frame *and* named to the injected subsystem, so a comparator that notices everything and localises nothing still fails.

Gate 4 is the cheap insurance behind the hash itself, and it reports its failures as tool bugs in those words.

From [`runtime/src/differential.c`](https://github.com/mstan/gbrecompiled/blob/master/runtime/src/differential.c):

```c title="runtime/src/differential.c"
        /* Gate 4: hash-vs-byte audit — force a full compare even when hashes
         * matched, proving the hash maintenance is faithful to the bytes. */
        if (opt.audit_interval > 0 && (checkpoint_index % opt.audit_interval) == 0) {
            char audit_msg[256] = {0};
            if (!gb_diff_compare_contexts(ctx_a, ctx_b, true, audit_msg, sizeof(audit_msg))) {
                fprintf(stderr,
                        "[COSIM] AUDIT FAILURE at checkpoint %" PRIu64
                        ": hashes matched but bytes differ (%s) — TOOL BUG\n",
                        checkpoint_index, audit_msg);
```

Where the harness is two processes, the fault is injected over the wire, and the coordinator's whole vocabulary is small enough to read at once.

From [`runtime/src/cosim.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/cosim.c):

```c title="runtime/src/cosim.c"
 *   seq                       -> "seq <n> chain <hex> parked <0|1>"
 *   runto <n>                 -> set stop=n, resume; blocks until parked at n (or exit)
 *   chain                     -> "chain <hex> seq <n>"
 *   hash                      -> "hash <hex> pc <hex> istat <hex> imask <hex> cyc <n>"
 *   sub                       -> per-subsystem hashes of the current state
 *   window <n>                -> last n ring rows (bounded to RING_N)
 *   inject ram <phys> <xor>   -> gate-4 fault into RAM
 *   inject reg <idx> <xor>    -> gate-4 fault into a CPU reg (idx 0..31, 32=hi,33=lo)
 *   reset                     -> reset incremental hash state
```

Read `inject` there as fault injection whatever its number: psxrecomp calls it gate 4, while gbrecompiled and nesrecomp call it gate 3. The gates are the same, only the numbers move. Genesis drives the same idea with `--inject` and `--inject-at`.

**Checkpoint.** Every gate prints PASS. On NES the gates exit non-zero on FAIL, so they can gate CI directly. Only now run the real pairing and believe its first-divergence report.

## A green run, and how to keep it

A green run is worth more than a one-off result, because the [chain hash](/docs/concepts/glossary#chain-hash) folds every checkpoint into one value. Any past divergence sticks in it, so the final value is a regression baseline you can assert later. gbrecompiled keeps those baselines in a file.

From [`tools/cosim_baselines.tsv`](https://github.com/mstan/gbrecompiled/blob/master/tools/cosim_baselines.tsv):

```text title="tools/cosim_baselines.tsv"
# Pinned co-simulation A-vs-B (recomp vs interpreter) baselines — the ratchet.
# The chain hash is the cumulative FNV fold of context-A's full-state hash at
# every T-cycle checkpoint. A recompiler/runtime change that alters guest
# behavior changes this hash; that is the regression signal.
# [snip]
# target        stride  frames  chain
tetris          456     700     E92927C083145FD7
megaman_xtreme2 456     1000    B02E9D35794D298E
instr_timing    456     120     5D103AEB0D3F03DB
```

Each row is re-asserted by one command that exits 0 on a match, which turns verification into a ratchet instead of a one-off. The project's own standing gate set shows what to re-run after any change to the recompiler or the runtime.

From [`CYCLE_EXACT_INITIATIVE.md`](https://github.com/mstan/gbrecompiled/blob/master/CYCLE_EXACT_INITIATIVE.md):

```text title="CYCLE_EXACT_INITIATIVE.md"
# oracle (DMG + CGB) — first-divergence must advance, never regress
tetris.exe    --cosim-oracle --boot-rom dmg_boot.bin --cosim-checkpoints 6000000
megaman_xtreme2.exe --cosim-oracle --boot-rom cgb_boot.bin --cosim-checkpoints 6000000
# pairing + boot gates
python tools/gbc_cosim.py --exe tetris.exe --checkpoints 300      # 8/8, chain 1CB1212F869F05F6
tetris.exe --boot-gate --boot-rom dmg_boot.bin                    # 0 diffs
# A-vs-B baselines (re-pin only on intended behavior change)
python tools/gbc_cosim.py --exe tetris.exe --ab-frames 700 --expect-chain E92927C083145FD7
python tools/gbc_cosim.py --exe megaman_xtreme2.exe --ab-frames 1000 --expect-chain B02E9D35794D298E
# blargg (TRIPWIRE: mem_timing must stay >= current; 03 must stay ok)
build+run mem_timing / mem_timing-2 / instr_timing   (read screens)
# mooneye timer + interrupt subsets (tools/mooneye_sweep.sh)
```

The comment on the baseline lines is the discipline. Those three chains were re-pinned on 2026-07-02 after two fixes that deliberately change guest-visible timing, and the file records that reason. Re-pin because you changed behaviour on purpose, never to make a red run go away.

Be precise about what green buys. Pairing 1 proves the recompiled code equals the project's own interpreter, so a bug both sides share is invisible to it. Headless numbers are also blind to display and feel: nesrecomp's rule is never to ship or flip a default on headless co-sim numbers alone. Turning a green run into an accuracy claim is [what correct enough means](/docs/concepts/accuracy-and-burndowns).

**Checkpoint.** You have a chain hash, a stride, a frame count and a named fixture written down together, and a command that re-asserts them.

## When it comes back red

Read the first differing sub-hash, the checkpoint and cycle, and the skew warning. Then go to [debug a divergence](/docs/guides/debug-a-divergence), which is organised by symptom.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| A co-sim build appears to hang on launch | It is parked, waiting for a coordinator that is not there | Expected. "Cosim builds **park** waiting for the coordinator; run standalone, they hang." |
| The coordinator reports agreement forever | It may be comparing nothing against nothing | Run gate 3. The psxrecomp coordinator now aborts when it cannot parse a chain, printing that the tool is blind |
| A warning that the two sides parked at different cycles | Harness nondeterminism, not a guest divergence | Fix this first. Every comparison after it is meaningless |
| Gate 1 fails with an `sram` nondeterminism | A stale battery save changed the second boot path | Delete `saves/*.srm` before each run |
| Gate 1 fails in `mapper` on NES | Uninitialised struct padding folded into the hash | `memset` the `MapperState` before hashing. Host padding is zeroed, never hashed |
| A first divergence where only the program counter differs | The compiled backend does not keep `pc` current mid-execution | Expected, and the reason `pc` is excluded from the compared hash. A real control-flow split shows up as a differing register or memory value |
| Huge divergence on a game with an RNG | The trajectories desynced, which is not a bug in the port | Freeze the seed: `NESRECOMP_FREEZE="0x18=0x00"` and `NESREF_FREEZE="0x18=0x00"` |
| NES frames look phase shifted | Per-NMI frame counting stalls on a suppressed frame | Already handled by the cycle-derived frame index; re-check alignment with the adaptive offset search before calling it a divergence |
| Genesis region match rates look alarming | Whole-region sub-hashes over-report: one differing byte flags the whole region | Read them as "did ANY byte differ", and use the chunk-level `memchunks` localiser for an honest number |
| A test ROM busy-loops past the frame cap | Common with LCD-off timing tests | The Game Boy sweep harnesses carry a 25 s per-ROM `timeout` guard for exactly this |
| `msys` cmake breaks a co-sim build | Wrong toolchain picked up | Use the VS developer shell and the VS-bundled cmake |

## Source

- gbrecompiled: [`COSIM_ORACLE.md`](https://github.com/mstan/gbrecompiled/blob/master/COSIM_ORACLE.md), [`runtime/src/differential.c`](https://github.com/mstan/gbrecompiled/blob/master/runtime/src/differential.c), [`tools/cosim_baselines.tsv`](https://github.com/mstan/gbrecompiled/blob/master/tools/cosim_baselines.tsv), [`tools/gbc_cosim.py`](https://github.com/mstan/gbrecompiled/blob/master/tools/gbc_cosim.py), [`CYCLE_EXACT_INITIATIVE.md`](https://github.com/mstan/gbrecompiled/blob/master/CYCLE_EXACT_INITIATIVE.md), [`GATE5_SCORECARD.md`](https://github.com/mstan/gbrecompiled/blob/master/GATE5_SCORECARD.md)
- nesrecomp: [`COSIM.md`](https://github.com/mstan/nesrecomp/blob/master/COSIM.md), [`tools/nes_cosim.py`](https://github.com/mstan/nesrecomp/blob/master/tools/nes_cosim.py)
- psxrecomp: [`runtime/src/cosim.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/cosim.c), [`tools/cosim.py`](https://github.com/mstan/psxrecomp/blob/master/tools/cosim.py), [`docs/internal/COSIM_ORACLE.md`](https://github.com/mstan/psxrecomp/blob/master/docs/internal/COSIM_ORACLE.md)
- segagenesisrecomp: [`COSIM.md`](https://github.com/mstan/segagenesisrecomp/blob/master/COSIM.md), [`runner/cosim.c`](https://github.com/mstan/segagenesisrecomp/blob/master/runner/cosim.c)
- gbarecomp: [`COSIM_ORACLE.md`](https://github.com/mstan/gbarecomp/blob/main/COSIM_ORACLE.md), [`oracle/gba_cosim.py`](https://github.com/mstan/gbarecomp/blob/main/oracle/gba_cosim.py). snesrecomp: [`SNES_COSIM.md`](https://github.com/mstan/snesrecomp/blob/main/SNES_COSIM.md)

## Next

- [Debug a divergence](/docs/guides/debug-a-divergence) is what to do when the run comes back red.
- [Proving it with co-simulation](/docs/concepts/co-simulation) is the theory, including what gets hashed.
- [TCP debug protocol](/docs/reference/tcp-protocol) is the wire format behind every two-process harness.
- [NES](/docs/platforms/nes) and [Game Boy](/docs/platforms/game-boy) are the two harnesses quoted most here. [The glossary](/docs/concepts/glossary) defines oracle, pairing, chain hash and ratchet.
