---
title: "Debug a divergence"
summary: "A co-simulation run has halted, or a port looks wrong: how to read the halt report, prove the comparator is not blind, and localise the fault to one write and one function, organised by the symptom you actually have."
pageType: "guide"
tags: ["Debugging", "Co-simulation", "Correctness"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/cdirecomp"
  - "https://github.com/mstan/gcnlle"
  - "https://github.com/mstan/SuperMarioWorldRecomp"
  - "https://github.com/mstan/PokemonStadiumRecomp"
updated: "2026-08-27"
---

Something is wrong with a port: a comparison halted at a checkpoint, or the screen is black, or the sound is a click. The work that follows goes from the first differing checkpoint down to the one write and the one function behind it. [Proving it with co-simulation](/docs/concepts/co-simulation) explains what co-simulation is and why it halts where it does. Start here once it has printed a report.

## Read the halt report before touching anything

On a chain mismatch the coordinator prints the checkpoint number and the guest cycle, both chain hashes, both sub-hash lines, CPU and device field dumps, and the last 16 ring rows from each side. Three fields do most of the work.

The **first differing sub-hash names the subsystem**, which decides whether you read a CPU emitter or a video model. The **checkpoint and cycle** give you a window to re-run with a smaller stride. The **cycle skew warning** is not a divergence at all. If the two sides parked at different cycles, the coordinator says so, and that is harness nondeterminism rather than a guest bug. Fix it before anything else, because every comparison after it is meaningless. Oracle, chain hash, sub-hash and dispatch miss are defined in [the glossary](/docs/concepts/glossary).

## Do not trust a green run you have not gated

A comparator can go blind and keep reporting agreement. This is not hypothetical. In psxrecomp a stride-2 parser misaligned on the leading status word of a reply and returned `chain=None` for both sides, so every comparison was `None == None`, which is to say equal, forever. The run was clean and it was measuring nothing.

That is why fault injection is a gate and not an extra. Four checks: recompiled against recompiled must be zero, interpreter against interpreter must be zero, an **injected fault must halt at the right place and name the right subsystem**, and a hash versus byte audit forces a full compare even when the hashes agree. Only the third catches a blind comparator, because a broken one passes the first two trivially.

The same class of bug hides in the hasher, and the guard against it is five lines.

From [`tools/nes_cosim.py`](https://github.com/mstan/nesrecomp/blob/master/tools/nes_cosim.py):

```python title="tools/nes_cosim.py"
def assert_hash_nonnull(rows, label):
    """Guard against a silently-blind hasher: the sub-hashes must not all be a
    single constant across the run (a constant hasher passes A-vs-A trivially)."""
    seen = set()
    for r in rows[: min(len(rows), 50)]:
        seen.add(r["sub"]["ram"])
    if len(seen) <= 1:
        print(f"  ! {label}: ram sub-hash is CONSTANT across frames — hasher may be blind")
        return False
    return True
```

The psxrecomp coordinator now refuses to continue when it cannot parse a chain. It prints that the tool is blind and stops, rather than reporting agreement.

> **Warning.** If gate 3 has not been run on this build of the comparator, run it before you spend a day reading generated C.

## The loop every repository runs

Before any symptom-specific work, every DEBUG document runs one loop. psxrecomp's is the shortest, from [`DEBUG.md`](https://github.com/mstan/psxrecomp/blob/master/DEBUG.md):

```text title="DEBUG.md"
0. Tool validation (first use only)
1. Sync state (NOT frame number)
2. Dump full state (native + oracle) via TCP debug server
3. Diff bytes
4. Find FIRST divergence
5. Trace writer (function + instruction + call path)
6. Classify (codegen / runner / timing / config)
7. Fix the tool (never generated output)

If ANY step is skipped:
-> STOP and restart
```

Three rules inside it appear in nearly every repository, and they are the ones people break.

**Sync on hardware events, not frame numbers.** Frames drift after a single timing glitch. On ndsrecomp they cannot work at all: the DS has two CPUs at different clocks. gbarecomp lists the sync points it accepts: VBlank IRQ count, DMA completion count per channel, timer overflow count per timer, SWI count, BIOS IRQ return count, and a specific PC at a function entry.

**Query the always-on ring, never arm and re-run.** From gbarecomp's [`DEBUG.md`](https://github.com/mstan/gbarecomp/blob/main/DEBUG.md): probes query the ring buffer for the window you care about. If the event you need is not in the ring, make the ring longer. Starting a process and talking to it takes real time, so by the time you armed a trace, the interesting event already happened.

**Never pause and step two observers to synchronise them.** Pause-and-step is for a human at a debugger, not for lining up two processes. To compare two observers you free-run, query the rings, and diff. Co-simulation is the one exception, because it parks at a fixed guest cycle rather than when someone notices a flag.

## By symptom

### The game silently skips whole subroutines

Check this before anything else, every run, in every toolchain that has it. From gbarecomp's [`DEBUG.md`](https://github.com/mstan/gbarecomp/blob/main/DEBUG.md):

```text title="DEBUG.md"
# RULE 0a — DISPATCH MISS CHECK (every run, before any debugging)

Before anything else, read `dispatch_misses.log` next to the game
executable.

- If non-empty: add the listed functions (with detected mode: ARM or
  THUMB) to `game.toml [functions]`, regenerate, rebuild, re-run.
- Repeat until `dispatch_misses.log` is empty.

A game with dispatch misses is FUNDAMENTALLY BROKEN. Do not debug
anything else until resolved.
```

vbrecomp, smsggrecomp and cdirecomp state the same rule for their own dispatchers, and all of them call it a silent game-breaking bug. The live equivalent over TCP is `dispatch_miss_info`. psxrecomp attaches the counters to `ping`, so every heartbeat carries `dispatch_miss_total` and `dispatch_miss_unique`.

### It boots to a black screen

A black screen is almost never a renderer bug. From PokemonStadiumRecomp's [`DEBUG.md`](https://github.com/mstan/PokemonStadiumRecomp/blob/main/DEBUG.md):

```text title="DEBUG.md"
## First-divergence rule

Always find the **first** divergence, not a downstream symptom.

- A black screen ten frames after boot is rarely a renderer bug.
  It's usually an earlier state divergence whose only visible
  manifestation is the blank frame.
- Walk back: latest known-good frame → first divergent frame →
  first divergent function call → first divergent register / mem
  store within that function.
```

Two platform traps sit under this symptom. On gcnlle an all-black screenshot can be the correct output: until the GX command processor is modelled the menu never draws, and a `mean_luma` near 16 is how you tell a correct black frame from a broken one. On psxrecomp, plain `screenshot` and `screenshot_file` capture native 15-bit VRAM and cannot see anything that exists only in the hi-res mirror, so use `screenshot_hires` to check those.

Whatever you find, hold the bar psxrecomp sets for calling it fixed:

```text
Examples of FALSE success:
- "counter reached 0" is NOT success if the shell still retries
- "IRQ fired" is NOT success if the waiting code still loops
- "callback returned" is NOT success if the owning state machine does not advance
- "data structure written" is NOT success if the consumer still rejects it
- "handler installed" is NOT success if the VBlank counter never increments
- "chain head populated" is NOT success if pixels don't reach the screen
```

### Graphics are wrong

Classify the corruption before you pick a memory region. From YoshiNESRecomp's [`DEBUG.md`](https://github.com/mstan/YoshiNESRecomp/blob/master/DEBUG.md):

```text title="DEBUG.md"
## TITLE SCREEN TRIAGE

Before deep debugging, classify the corruption:

- Wrong tile SHAPES → CHR / mapper issue
- Correct shapes, wrong tiles → nametable issue
- Wrong colors → palette issue

This determines which memory region to inspect first.
```

gbarecomp adds the render-versus-data split: if VRAM, OAM and palette writes match but the framebuffer differs, it is almost certainly a render bug. Compare `ppu_state` and `framebuf_diff`.

SuperMarioWorldRecomp has the best worked example. It walks a visible Layer 3 corruption down to a one-line emitter bug in six steps: find the first divergent byte in the VRAM write differ, move to the block trace, find the matching call on each side, diff those calls to the first register disagreement, read the emitter code that produces that register, then regenerate and check visually.

Two of its warnings generalise. Do not just stare at the generated C: a 500 line function will not show you a bug that depends on a value arriving from before the call. And a first-call comparison without filtering lands on an early exit on both sides.

### It desyncs from the oracle

This is the main loop, with two additions. Walk backwards to the **first** divergence, because later differences are consequences and only the first has a cause. Then switch surfaces: the frame ring finds the first frame where the byte diverges, and the write ring finds the write that produced it. gbarecomp's sequence for "which store produced this byte":

```text
5. **Trace the writer** — function + instruction + call path. For
   "which store produced this byte":
   - Arm `rdb_range` covering the suspect address.
   - Run past the divergence.
   - `rdb_dump` — the last entry at that address is the bug writer.
   - For block context: `trace_blocks_range` around the writer's PC
     and `get_block_trace` for register state at each block entry.
   - To park right before the bad write: `rdb_watch_add addr=<a>
     val=<bad>`.
```

For a cheap first cut, gbarecomp's `state_hash` is one read-only call over IWRAM, EWRAM, VRAM, palette and OAM plus the cycle counter. It localises by region and doubles as a run-twice determinism probe. gcnlle's `cosim_pages` returns hashes for up to 256 four-kilobyte pages, so you can narrow a memory mismatch before fetching bytes. On Genesis, `python tools/boot_smoke.py --game sonic1 --port 4380 --dump-on-diff` dumps the full 64KB of work RAM when the run differs from its baseline.

Finish by classifying, because the class decides who fixes it. psxrecomp's five classes each name the file to change:

```text
codegen:
- Wrong C emitted by strict_translator
- Fix: recompiler/src/strict_translator.cpp

runner:
- Wrong hardware simulation (MMIO, DMA, IRQ, GPU, timers)
- Fix: runtime/src/*.c

timing:
- Events fire at wrong cycle / wrong order
- Fix: runtime timing logic

config:
- Missing function seed, wrong address alias
- Fix: seed files, address_aliases.json

discovery:
- Function not found, dispatch miss
- Fix: function finder pipeline
```

gbarecomp reduces its nine classes to the same decision: decoder and codegen faults go to the tool, runtime, timing, I/O and device faults go to the console core, and metadata faults go to `game.toml`.

### It crashes, freezes, or the watchdog trips

psxrecomp writes three files: `psx_crash.txt`, `psx_last_run_report.json` and `psx_freeze_heartbeat.json`. The heartbeat carries the counters that separate a guest bug from a runtime bug. `bail_first` counts detected contract violations, meaning wild control transfers, and a small count with the game continuing normally is the fix working. `bail_resolved` and `bail_flattened` count how those were recovered. `bail_anomaly` must stay zero. Anything else is a runtime bug.

For a freeze inside interpreted code there are two tripwires. `s3_smear_watch` latches the first interpreted instruction in a PC window that clobbers a callee-saved register, and `callret_watch` records the return path that let it come back. The equivalents elsewhere are `crash_status`, `freeze_status` and `watchdog_status` on vbrecomp, and on segagenesisrecomp a dump of the last 64 bus accesses and function entries. One rule applies everywhere, from PokemonStadiumRecomp: do not disable a watchdog assertion. If the watchdog fires, the state is wrong, so fix the state.

### Audio is wrong

Two failure classes need different tools. If the **generated stream** is wrong, use the register-write taps: `fm_state`, `psg_state`, `fm_trace`, `audio_stats` and `audio_wav` on Genesis, `audio_state` and `audio_cap` on GBA, the SPU family on PlayStation.

If the stream is right but the **speaker got something else**, a WAV capture cannot see it, because the WAV taps the generated stream. Genesis built rings for that case: `dropped_flushes` and `underrun_flushes` are splices the speaker heard and the WAV never shows, and `audio_delivery_dump {"path":"x.txt"}` is the probe for "I just heard a click". One caution from gbarecomp: some games drive game logic timing off audio DMA, so audio can be a correctness bug.

### It is slow

Check for observer interference first. The debug server runs on the main thread, so every millisecond spent sending a response is a millisecond the game does not run. Two apparent idle-loop problems in psxrecomp turned out to be a TCP client draining large dumps slowly and throttling the main loop to 6 fps. The tell is a large `tcp_send_stall_ms` delta in `psx_freeze_heartbeat.json`, alongside `tcp_clients_dropped`. Responses too big for the 15 second budget belong in the `*_dump_file` variants.

Then check whether the code is actually running natively. The interpreter is a fallback, and areas that never compiled stay slow, which in development usually means `gcc` is not on `PATH` for the `gcc` tier. Query `overlay_loader_status`, `autocompile_status` and `dispatch_stats`, then profile with the rings rather than a stopwatch: `frame_perf`, `phase_profile`, `phase_hot`, `stack_profile`.

## Write the finding down in the shape they expect

Three repositories want the same nine things in a divergence report. A report missing one gets rejected.

1. The target behaviour.
2. The oracle used.
3. The sync point, as a hardware-event count.
4. The diff: subsystem, address, expected, actual.
5. The first divergence, as a measured index.
6. The writer: function, PC, call path.
7. The classification.
8. A minimal fix in the recompiler, the runtime or the config. Never in generated code.
9. A re-test plan.

## What never happens

gbarecomp lists the forbidden moves, and the whole fleet repeats them:

```text
- Editing `generated/*.c` by hand.
- Adding `if (game == "minish_cap")` to the GBA core.
- Stubbing an SWI to "return what the game expects."
- Silencing an unmapped IO read because it's noisy.
- Pausing both native and oracle and stepping in lockstep.
```

PokemonStadiumRecomp adds: do not stub in C, stub in `game.toml`, so the stub is declared, diffable and removable.

When the tooling cannot answer your question, that is a stop condition, not permission to improvise. psxrecomp says to stop, say exactly what data is missing and what command is needed, ask how to proceed, and build the tooling if approved. It also forbids the obvious workaround: no `fprintf` to stderr in source code, ever. The TCP server is the instrumentation surface, and if TCP cannot see something, TCP has to grow until it can.

## Source

- psxrecomp: [`DEBUG.md`](https://github.com/mstan/psxrecomp/blob/master/DEBUG.md), [`TCP_COMMANDS.md`](https://github.com/mstan/psxrecomp/blob/master/TCP_COMMANDS.md), [`tools/cosim.py`](https://github.com/mstan/psxrecomp/blob/master/tools/cosim.py), [`tools/debug_client.py`](https://github.com/mstan/psxrecomp/blob/master/tools/debug_client.py)
- gbarecomp: [`DEBUG.md`](https://github.com/mstan/gbarecomp/blob/main/DEBUG.md), [`docs/DEBUGGING.md`](https://github.com/mstan/gbarecomp/blob/main/docs/DEBUGGING.md), [`TCP.md`](https://github.com/mstan/gbarecomp/blob/main/TCP.md)
- segagenesisrecomp: [`DEBUG.md`](https://github.com/mstan/segagenesisrecomp/blob/master/DEBUG.md). vbrecomp: [`TCP.md`](https://github.com/mstan/vbrecomp/blob/master/TCP.md), [`DEBUG.md`](https://github.com/mstan/vbrecomp/blob/master/DEBUG.md)
- cdirecomp: [`DEBUG.md`](https://github.com/mstan/cdirecomp/blob/master/DEBUG.md), [`TCP.md`](https://github.com/mstan/cdirecomp/blob/master/TCP.md). gcnlle: [`docs/TCP_COMMANDS.md`](https://github.com/mstan/gcnlle/blob/master/docs/TCP_COMMANDS.md). ndsrecomp: [`DEBUG.md`](https://github.com/mstan/ndsrecomp/blob/main/DEBUG.md), [`TCP.md`](https://github.com/mstan/ndsrecomp/blob/main/TCP.md)
- Worked cases: [`SuperMarioWorldRecomp/docs/TROUBLESHOOTING.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/docs/TROUBLESHOOTING.md), [`PokemonStadiumRecomp/DEBUG.md`](https://github.com/mstan/PokemonStadiumRecomp/blob/main/DEBUG.md), [`YoshiNESRecomp/DEBUG.md`](https://github.com/mstan/YoshiNESRecomp/blob/master/DEBUG.md), [`nesrecomp/tools/nes_cosim.py`](https://github.com/mstan/nesrecomp/blob/master/tools/nes_cosim.py)

## Next

- [Proving it with co-simulation](/docs/concepts/co-simulation) is the theory behind this guide.
- [TCP debug protocol](/docs/reference/tcp-protocol) is the command table behind every probe here.
- [How changes go wrong here](/docs/agents/failure-modes) is the same ground for an agent.
- [Errors and exit codes](/docs/reference/errors-and-exit-codes) is what the tools return when they fail.
