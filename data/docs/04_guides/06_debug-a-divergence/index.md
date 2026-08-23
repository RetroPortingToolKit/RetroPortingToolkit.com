---
title: "Debug a divergence"
summary: "A co-simulation run has halted, or a port looks wrong: how to read the halt report, prove the comparator is not blind, and localise the fault to one write and one function, organised by the symptom you actually have."
section: "guides"
sectionTitle: "Guides"
pageType: "guide"
tags: ["Debugging", "Co-simulation", "Correctness"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/vbrecomp"
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/cdirecomp"
  - "https://github.com/mstan/gcnlle"
  - "https://github.com/mstan/SuperMarioWorldRecomp"
  - "https://github.com/mstan/PokemonStadiumRecomp"
updated: "2026-08-23"
---

Something is wrong with a port: a comparison halted at a checkpoint, or the screen is black, or the sound is a click. This guide is the localisation work that follows, from the first differing checkpoint down to the one write and the one function that caused it. What co-simulation is and why it halts where it does is [proving it with co-simulation](/docs/concepts/co-simulation); this page assumes you have read that and starts at the report it printed.

## Read the halt report before touching anything

On a chain mismatch the coordinator prints the checkpoint number and the guest cycle, both chain hashes, both sub-hash lines annotated with a reminder that the first subsystem hash that differs is where it split, CPU and device field dumps, and the last 16 ring rows from each side. Three fields do most of the work.

The **first differing sub-hash names the subsystem**, which is the difference between reading a CPU emitter and reading a VDP model. The **checkpoint and cycle** give you a window to re-run inside with a smaller stride. And the **cycle skew warning** is not a divergence at all: if the two sides parked at different cycles, the coordinator says so and tells you it is harness nondeterminism rather than a guest bug. Investigate that before anything else, because every comparison after it is meaningless. Oracle, chain hash, sub-hash and dispatch miss are defined in [the glossary](/docs/concepts/glossary).

## Do not trust a green run you have not gated

A comparator can go blind and keep reporting agreement. This is not hypothetical. In psxrecomp a stride-2 parser misaligned on the leading status word of a reply and returned `chain=None` for both sides, so every comparison was `None == None`, which is to say equal, forever. Nothing looked wrong. The run was clean and it was measuring nothing.

That is why fault injection is a gate and not an optional extra. The gate set is four checks: recompiled against recompiled must be zero, interpreter against interpreter must be zero, an **injected fault must halt at the right place and name the right subsystem**, and a hash versus byte audit forces a full compare even when the hashes agree. Only the third catches a silently blind compare, because a broken comparator passes the first two trivially. gbrecompiled writes it plainly, and the emphasis is theirs: never skip it.

The same class of bug hides in the hasher, and the guard against it is five lines.

From [`tools/nes_cosim.py`](https://github.com/mstan/nesrecomp/blob/master/tools/nes_cosim.py):

```python
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

The psxrecomp coordinator now refuses to continue when it cannot parse a chain: it prints that the tool is blind and aborts, rather than reporting agreement. Read your gate output first, then your run output. A green run whose gates were not run is a piece of paper, not a result.

> **Warning.** Trust the gates before you trust the run. If gate 3 has not been run on this build of the comparator, run it before you spend a day reading generated C.

## The loop every repository runs

Before symptom-specific work, all the DEBUG documents run one loop. psxrecomp's is the terse original, from [`DEBUG.md`](https://github.com/mstan/psxrecomp/blob/master/DEBUG.md):

```text
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

Three rules inside it are stated in nearly every repository and are the ones people break.

**Sync on hardware events, not frame numbers.** Frames drift after a single timing glitch. ndsrecomp is blunt about why it cannot work at all there: the DS has two CPUs at different clocks, so comparing native against oracle by frame N is meaningless across engines. The acceptable sync points gbarecomp lists are VBlank IRQ count, DMA completion count per channel, timer overflow count per timer, SWI count, BIOS IRQ return count, and a specific PC at a specific function entry.

**Query the always-on ring, never arm and re-run.** From gbarecomp's [`DEBUG.md`](https://github.com/mstan/gbarecomp/blob/main/DEBUG.md): probes query the always-on ring buffer for the window of interest and never arm, record, then run. If the event you need is not in the ring, extend the ring. ndsrecomp gives the reason: process startup and tool round-trips take real wall-clock time, and by the time you armed a trace and ran, the interesting event already happened.

**Never pause and step two observers to synchronise them.** Pause-and-step is a control-plane primitive for a human at a debugger, not a way to synchronise two processes. Two-observer synchronisation is free-run plus ring query plus diff. Co-simulation is the one exception, and only because its park is at a fixed guest cycle boundary rather than at a wall-time notice.

## By symptom

### The game silently skips whole subroutines

Check this before anything else, every run, in every toolchain that has it. From gbarecomp's [`DEBUG.md`](https://github.com/mstan/gbarecomp/blob/main/DEBUG.md):

```text
# RULE 0a — DISPATCH MISS CHECK (every run, before any debugging)

Before anything else, read `dispatch_misses.log` next to the game
executable.

- If non-empty: add the listed functions (with detected mode: ARM or
  THUMB) to `game.toml [functions]`, regenerate, rebuild, re-run.
- Repeat until `dispatch_misses.log` is empty.

A game with dispatch misses is FUNDAMENTALLY BROKEN. Do not debug
anything else until resolved.
```

vbrecomp, smsggrecomp and cdirecomp state the same rule for their own dispatchers, and all of them call it a silent game-breaking bug. The live equivalent over TCP is `dispatch_miss_info`. psxrecomp goes further and attaches the counters to `ping`, so every heartbeat carries `dispatch_miss_total` and `dispatch_miss_unique` and the number cannot go unnoticed across sessions. gbrecompiled logs the same idea to `interp_fallbacks.log` and can fold it into a seed manifest with `gbrecomp --harvest <log> --manifest dispatch_misses.toml`, where `<log>` is that file.

### It boots to a black screen

A black screen is almost never a renderer bug. From PokemonStadiumRecomp's [`DEBUG.md`](https://github.com/mstan/PokemonStadiumRecomp/blob/main/DEBUG.md):

```text
## First-divergence rule

Always find the **first** divergence, not a downstream symptom.

- A black screen ten frames after boot is rarely a renderer bug.
  It's usually an earlier state divergence whose only visible
  manifestation is the blank frame.
- Walk back: latest known-good frame → first divergent frame →
  first divergent function call → first divergent register / mem
  store within that function.
```

Two platform-specific traps sit under this symptom. On gcnlle an all-black screenshot can be the correct output: until the GX command processor is modelled the menu never draws, and the response's `mean_luma` field near 16 is how you tell a correct black frame from a broken one. On psxrecomp, plain `screenshot` and `screenshot_file` capture native 15-bit VRAM and are blind to anything that exists only in the hi-res mirror, so they can show a clean frame while the player sees a broken one; use `screenshot_hires` to check those. cdirecomp, which boots through CD-RTOS, publishes an ordered ladder instead: OS-9 loader and `TRAP #0` HLE first, then the memory model and MMU, then device programming, then timing and interrupts.

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

```text
## TITLE SCREEN TRIAGE

Before deep debugging, classify the corruption:

- Wrong tile SHAPES → CHR / mapper issue
- Correct shapes, wrong tiles → nametable issue
- Wrong colors → palette issue

This determines which memory region to inspect first.
```

gbarecomp adds the render-versus-data split: if VRAM, OAM and palette writes match but the framebuffer differs, it is almost certainly a render bug, and `ppu_state` plus `framebuf_diff` are the two commands to compare.

The best worked example in the fleet is SuperMarioWorldRecomp's, which walks a visible Layer 3 corruption down to a one-line emitter bug in six steps: query the always-on VRAM write differ for the first divergent byte, then move to the block trace rather than reading the generated C, then find the matching call on each side, then diff those calls block by block to the first register disagreement, then read the four lines of emitter code that produce that register, then regenerate and verify visually. Two of its warnings generalise. Do not just stare at the generated C, because a 500 line emitted function will not show you a state-tracking bug that depends on a value flowing in from before function entry. And any first-call comparison without filtering lands on a degenerate early exit on both sides and tells you nothing.

### It desyncs from the oracle

This is the main loop applied literally, with two additions. Walk backwards to the **first** divergence, because later differences are consequences and only the first has a root cause. Then switch surfaces: use the frame ring to find the first frame where the byte diverges, and the write ring to find the write that produced it. gbarecomp's sequence for "which store produced this byte":

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

For a cheap first cut, gbarecomp's `state_hash` is a single read-only call over IWRAM, EWRAM, VRAM, palette and OAM plus the cycle counter, which doubles as a run-twice determinism probe and localises by region. gcnlle's pair is `cosim_state` and `cosim_pages`, the latter returning hashes for up to 256 four-kilobyte pages so you can narrow a memory mismatch before fetching bytes. cdirecomp can go further because both of its sides record one trace entry per executed instruction, so the PC streams are index-alignable and `tools/first_divergence.py` pages both from sequence 0 to find the first mismatch. On Genesis, `python tools/boot_smoke.py --game sonic1 --port 4380 --dump-on-diff` dumps the full 64KB of work RAM next to the game directory when the run differs from its baseline.

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

psxrecomp writes three artefacts: `psx_crash.txt`, `psx_last_run_report.json` and `psx_freeze_heartbeat.json`. The heartbeat carries the call-contract counters that separate a guest bug from a runtime bug. `bail_first` counts detected contract violations, meaning wild control transfers, and a small count with the game continuing normally is the fix working. `bail_resolved` and `bail_flattened` count how those unwinds were recovered. `bail_anomaly` must stay zero; anything else is a runtime bug.

For a freeze inside interpreted code there are two complementary tripwires: `s3_smear_watch` latches the first interpreted instruction in a PC window that clobbers a callee-saved register and names the callee that came back smeared, and `callret_watch` records the return path that let it come back. Elsewhere the equivalents are `crash_status`, `freeze_status` and `watchdog_status` on vbrecomp, and on segagenesisrecomp a dump of the last 64 M68K bus accesses plus the last 64 function entries on watchdog timeout or fatal trap. One rule applies everywhere, from PokemonStadiumRecomp: do not disable a watchdog assertion. If the watchdog fires, the state is wrong, so fix the state.

### Audio is wrong

Two failure classes need different tools. If the **generated stream** is wrong, use the register-write taps: `fm_state`, `psg_state`, `fm_trace`, `audio_stats` and `audio_wav` on Genesis, `audio_state` and `audio_cap` on GBA, the SPU family on PlayStation. If the stream is right but the **speaker got something else**, a WAV capture cannot see it, because the WAV taps the generated stream. Genesis built rings for exactly that case: `dropped_flushes` and `underrun_flushes` on `audio_stats` are splices the speaker heard that the WAV never shows, and `audio_delivery_dump {"path":"x.txt"}` is the post-hoc probe for "I just heard a click". One caution from gbarecomp: audio can be a correctness bug rather than a comfort bug, because some games drive game logic timing off audio DMA.

### It is slow

Check for observer interference first. The debug server is pumped on the main thread, so every millisecond spent sending a response is a millisecond the emulator does not run. On 2026-06-10 two apparent idle-loop degradations in psxrecomp turned out to be a TCP client trickle-draining large dumps and throttling the main loop to 6 fps. The discriminator is a large `tcp_send_stall_ms` delta over the same window in `psx_freeze_heartbeat.json`, alongside `tcp_clients_dropped`. Responses too big for the 15 second budget belong in the `*_dump_file` variants.

Then check whether the code is actually native. In psxrecomp the interpreter is a fallback tier and areas that never compiled stay slow, which in development usually means `gcc` is not on `PATH` for the `gcc` tier. Query `overlay_loader_status`, `autocompile_status` and `dispatch_stats`, then profile with the rings rather than a stopwatch: `frame_perf`, `phase_profile`, `phase_hot`, `stack_profile`.

## Write the finding down in the shape they expect

Three repositories require the same nine things of a divergence report, and an analysis missing one gets rejected: the target behaviour, the oracle used, the sync point as a hardware-event count rather than a bare frame, the diff with subsystem and address and expected and actual, the first divergence as a measured index rather than an eyeballed one, the writer with function and PC and call path and mode, the classification, a minimal fix proposal in the recompiler or the runtime or the config and never in generated code, and a re-test plan.

## What never happens

gbarecomp lists the forbidden moves, and the whole fleet repeats them:

```text
- Editing `generated/*.c` by hand.
- Adding `if (game == "minish_cap")` to the GBA core.
- Stubbing an SWI to "return what the game expects."
- Silencing an unmapped IO read because it's noisy.
- Pausing both native and oracle and stepping in lockstep.
```

PokemonStadiumRecomp adds: do not stub in C, stub in `game.toml` so the stub is declared, diffable and removable.

And when the tooling cannot answer the question, every repository makes that a stop condition rather than a licence to improvise. psxrecomp says to stop immediately, tell the user exactly what data is missing and what command is needed, ask how to proceed, and build the tooling if approved. It also forbids the obvious workaround outright: no `fprintf` to stderr in source code, ever, because the TCP server is the canonical instrumentation surface and if TCP cannot see it, TCP needs to grow until it can.

## Source

- psxrecomp: [`DEBUG.md`](https://github.com/mstan/psxrecomp/blob/master/DEBUG.md), [`TCP_COMMANDS.md`](https://github.com/mstan/psxrecomp/blob/master/TCP_COMMANDS.md), [`tools/cosim.py`](https://github.com/mstan/psxrecomp/blob/master/tools/cosim.py), [`tools/debug_client.py`](https://github.com/mstan/psxrecomp/blob/master/tools/debug_client.py)
- gbarecomp: [`DEBUG.md`](https://github.com/mstan/gbarecomp/blob/main/DEBUG.md), [`docs/DEBUGGING.md`](https://github.com/mstan/gbarecomp/blob/main/docs/DEBUGGING.md), [`TCP.md`](https://github.com/mstan/gbarecomp/blob/main/TCP.md)
- segagenesisrecomp: [`DEBUG.md`](https://github.com/mstan/segagenesisrecomp/blob/master/DEBUG.md). vbrecomp: [`TCP.md`](https://github.com/mstan/vbrecomp/blob/master/TCP.md), [`DEBUG.md`](https://github.com/mstan/vbrecomp/blob/master/DEBUG.md)
- cdirecomp: [`DEBUG.md`](https://github.com/mstan/cdirecomp/blob/master/DEBUG.md), [`TCP.md`](https://github.com/mstan/cdirecomp/blob/master/TCP.md). gcnlle: [`docs/TCP_COMMANDS.md`](https://github.com/mstan/gcnlle/blob/master/docs/TCP_COMMANDS.md). ndsrecomp: [`DEBUG.md`](https://github.com/mstan/ndsrecomp/blob/main/DEBUG.md), [`TCP.md`](https://github.com/mstan/ndsrecomp/blob/main/TCP.md)
- Worked cases: [`SuperMarioWorldRecomp/docs/TROUBLESHOOTING.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/docs/TROUBLESHOOTING.md), [`PokemonStadiumRecomp/DEBUG.md`](https://github.com/mstan/PokemonStadiumRecomp/blob/main/DEBUG.md), [`YoshiNESRecomp/DEBUG.md`](https://github.com/mstan/YoshiNESRecomp/blob/master/DEBUG.md), [`nesrecomp/tools/nes_cosim.py`](https://github.com/mstan/nesrecomp/blob/master/tools/nes_cosim.py)

## Next

- [Proving it with co-simulation](/docs/concepts/co-simulation) is the theory this guide acts on.
- [TCP debug protocol](/docs/reference/tcp-protocol) is the wire format and command table behind every probe named here.
- [How changes go wrong here](/docs/agents/failure-modes) is the same ground for an agent making a change.
- [Errors and exit codes](/docs/reference/errors-and-exit-codes) is what the tools return when they fail.
