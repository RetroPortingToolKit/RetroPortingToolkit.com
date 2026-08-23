---
title: "Nintendo DS"
summary: "ndsrecomp lifts both DS processors to C ahead of time and interleaves them on one event scheduler, and this page separates the performance HLE architecture the project has written from the much smaller part of it that ships."
section: "platforms"
sectionTitle: "Platforms"
pageType: "project"
tags: ["Nintendo DS", "ARM", "Dual CPU", "HLE"]
repos:
  - "https://github.com/mstan/ndsrecomp"
  - "https://github.com/mstan/MetroidPrimeHuntersRecomp"
updated: "2026-08-23"
---

[ndsrecomp](https://github.com/mstan/ndsrecomp) translates Nintendo DS guest ARM code, both the ARM9 and the ARM7 sides, into C ahead of time, then runs that C natively on a runtime supplying the memory bus, two-CPU scheduling, hardware models and optional SDL presentation. Its README calls it "very early pre-alpha (v0.0.1)" and says plainly that "This is **not** a general-purpose emulator." This page covers the two cores and the scheduler that aligns them, the dual screens and the touchscreen, the commands, what its HLE architecture ships as against what it only specifies, and a license position that needs more than one word. The catalogue entry, with the games, is [/hardware/nintendo-ds](/hardware/nintendo-ds).

## Status, in the project's own words

From [`README.md`](https://github.com/mstan/ndsrecomp/blob/main/README.md), under a heading reading "Status: very early pre-alpha (v0.0.1)":

> This is an experimental developer snapshot, not a ready-to-use emulator or
> a stable framework. It has demonstrated one specific, hash-verified Nintendo
> DS firmware path, early title bring-up across multiple games, experimental
> online play through Wiimmfi, and same-machine local wireless multiplayer. It
> has no compatibility promise, no stable API, and no turnkey clean-clone game
> build yet. Internals and instructions may change without notice.

`VERSION` agrees: `0.0.1`. [`PRINCIPLES.md`](https://github.com/mstan/ndsrecomp/blob/main/PRINCIPLES.md) explains the order of work with a hard gate: "No cartridge, no commercial game, no "load a ROM real quick" happens until the console boots to the **interactive firmware menu** and matches the melonDS oracle".

> **You provide this.** The runner needs your own hash-verified dumps in `bios/`: `biosnds9.rom` (SHA-1 `bfaac75f101c135e32e2aaf541de6b1be4c8c62d`), `biosnds7.rom` (`24f67bdea115a2c847c8813a262502ee1607b7df`) and `firmware.bin` (`ae22de59fbf3f35ccfbeacaeba6fa87ac5e7b14b`), plus your own cartridge image. The repository states it distributes no ROM, BIOS, firmware, save data or generated ROM-derived source. An opt-in path substitutes the recompiled FreeBIOS (BSD-2-Clause) and a synthesized firmware, but "The retail dumps remain the default and the oracle-diffed source of truth."

## Two ARM cores, one event scheduler

| | core | ISA | clock | role |
|---|---|---|---|---|
| **ARM9** | ARM946E-S | ARMv5TE | ~67 MHz | main; caches, MPU, TCM, CP15; runs the menu GUI |
| **ARM7** | ARM7TDMI | ARMv4T | ~33 MHz | sub; touch/SPI, sound, RTC, Wi-Fi |

The README adds: "They share 4 MB of main RAM and communicate through IPC FIFO and IPCSYNC. The runtime interleaves both CPUs on one event scheduler."

Each round runs the ARM9 first, up to a target in ARM9 cycles, and deliberately does not clamp it: an instruction executes atomically, so the ARM9 usually finishes slightly past its target. If the geometry engine has stalled it through the GXFIFO, its timestamp advances by the engine's pending cycle debt, capped at the target, instead of executing. Timers then tick and the geometry engine runs to that timestamp. Only then does the ARM7 move, and the number it chases is what makes this event-aligned.

From [`runner/src/scheduler.cpp`](https://github.com/mstan/ndsrecomp/blob/main/runner/src/scheduler.cpp):

```cpp
    // Rendezvous = ARM9's ACTUAL (possibly overshot) timestamp, normalized to
    // system cycles. The ARM7 catches up to THIS, not to `planned`.
    const uint64_t rendezvous = g_slot[0].cycles >> kArm9ClockShift;

    // ARM7 catches up to the rendezvous (run-until->=; it too may overshoot its
    // final instruction). Bail if it makes no progress (terminally halted or a
    // debug/insn break is armed) to avoid a busy spin.
    if (sample) phase_start = ProfileClock::now();
    while (g_slot[1].started && !g_slot[1].halted &&
           !nds_event_break_hit() && g_slot[1].cycles < rendezvous) {
        const uint64_t before = g_slot[1].cycles;
        run_slice(1, static_cast<uint32_t>(rendezvous - g_slot[1].cycles));
        nds_tick_timers(1, g_slot[1].cycles);
        if (g_slot[1].cycles == before) break;
    }
```

Two rules follow. [`CLAUDE.md`](https://github.com/mstan/ndsrecomp/blob/main/CLAUDE.md) forbids you to "free-run one CPU past a cross-CPU sync point (IPC / shared WRAM / observed I/O), or pause/step the two CPUs to "compare" them". And comparisons against the oracle never sync by frame index: they sync on counted hardware events, meaning VBlank-IRQ counts per CPU, IPCSYNC writes, FIFO sends and receives per direction, DMA completions, timer overflows, or a named PC on a named CPU. That is the DS shape of [co-simulation](/docs/concepts/co-simulation), against melonDS pinned at tag `1.0rc`, with DeSmuME as a secondary cross-check.

## Banks, dispatch, and the one interpreter

The recompiler emits `generated/<bank>.c`, a header and a per-CPU dispatch table; the runner links the banks and resolves every computed transfer by binary search over that `{guest_pc -> function pointer}` map. Across the boundary go the guest PC plus the Thumb bit, the shared `g_cpu` register file, the C bus accessors and the cycle accumulators, which is the split described in [the recompiler and the runtime](/docs/concepts/recompiler-and-runtime). Lookup validates content as it goes: an entry whose recorded bytes no longer match the live guest bytes is skipped, which is how several generations of one overlay coexist at a single address.

From [`docs/dispatch_architecture.md`](https://github.com/mstan/ndsrecomp/blob/main/docs/dispatch_architecture.md):

```text
Tier 1  recompiled native C    — statically recompiled banks (BIOSes, fw parts)
   │ (miss: no static fn for this PC)
Tier 2  dirty-RAM JIT shard    — code copied into RAM at boot, JIT-compiled on miss
   │ (JIT declines an opcode, or a write invalidates the shard)
Tier 3  dirty-RAM interpreter  — the always-correct floor (the guest's own bytes)
```

Tier 2 is not built; `PLAN.md` calls it deferred. Tier 3 is enforced structurally rather than by convention: a miss tiers down only when the target is mapped writable RAM **and** the runtime holds write provenance for those bytes. Anything else is fatal and lands in `dispatch_misses.log` as a paste-ready `[[entry_point]]` block, because a miss is treated as a silent game-breaking bug. Regenerate, rebuild and rerun until that log is empty; [how changes go wrong here](/docs/agents/failure-modes) covers the class, and terms are in the [glossary](/docs/concepts/glossary). The DS needs any of this because the firmware decompresses code into RAM and executes it, the same problem as [code you cannot see ahead of time](/docs/concepts/code-you-cannot-see-ahead-of-time), which is where the tier model came from.

## Two screens, and a touchscreen on the ARM7

Two 2D engines, A and B, each produce a 256x192 framebuffer, and a register decides which engine reaches which panel. The runtime keeps physical top and bottom buffers rather than per-engine ones, and applies that routing while each scanline is drawn. The comment in [`runner/src/gpu2d.cpp`](https://github.com/mstan/ndsrecomp/blob/main/runner/src/gpu2d.cpp) says why:

> "Physical top/bottom buffers, matching melonDS GPU::AssignFramebuffers.
> POWCNT1 bit 15 routes engine A to the top when set and to the bottom when
> clear. Apply that routing while each scanline is rendered: consulting the
> live register only when a debug/frontend client later reads the completed
> frame can retroactively swap a frame if the guest changes POWCNT1 during
> VBlank."

Reading the register later would be cheaper and wrong for any title that reassigns panels mid-frame, which the README notes is real behaviour in shipped games.

On the host, `display.screen_layout` is `stacked`, one window at 256x384, or `separate`, which "creates independently movable top and bottom windows. Pointer input is accepted only from the physical bottom-screen window; keyboard input remains shared by the DS session." Widening is not a stretch of either buffer: "Adaptive widescreen is a title capability, not framebuffer stretching: unsupported screen choices are rejected", and declaring one requires an exact cartridge SHA-1.

Touch is an ARM7 concern, because the touchscreen is a TSC on SPI device 2 where channel `0x10` returns TouchY and `0x50` TouchX. The host maps the mouse to a bottom-screen pixel, rejects anything outside it, and hands that to one function.

From [`runner/src/io.cpp`](https://github.com/mstan/ndsrecomp/blob/main/runner/src/io.cpp):

```cpp
void nds_set_touch(uint16_t x, uint16_t y, bool down) {
    if (!down) {
        g_tsc_x = 0x000u;
        g_tsc_y = 0x0FFFu;
        g_keyinput |= 1u << 22; // EXTKEYIN bit 6: pen up
        return;
    }
    // melonDS TSC::SetTouchCoords accepts screen pixels and converts them to
    // the 12-bit ADC domain with the DS firmware's simple 16x scale.
    g_tsc_x = static_cast<uint16_t>(x << 4);
    g_tsc_y = static_cast<uint16_t>(y << 4);
    g_keyinput &= ~(1u << 22);
}
```

Pen-up is a distinct state, not the coordinate 0,0, and the frontend holds a touch for at least two frames before releasing, "long enough for the ARM7 touchscreen polling path to observe it". The same injection is a `touch` command with `x`, `y` and `down` on the debug protocol, accepted by both the native runtime and the oracle, so a script can drive both sides identically.

## Where the HLE line sits today

The floor is settled. Both BIOSes and the firmware-resident boot and menu code are recompiled and run through the dispatch tables. SWIs land at the BIOS SWI vector and the recompiled BIOS handles them: "There is no `if (swi == X) hle_...()`." IRQs land at the BIOS IRQ vector and return through the real epilogue. The firmware boot copy is executed, not synthesized: "We do not hand-wave a "direct boot" that places code and jumps." A `--boot direct` mode exists as an opt-in, documented as "Never a silent fallback: every input dump is still mandatory and verified in either mode." The vendored melonDS 3D and Wi-Fi subsystems are device models by the project's own test, because the guest still writes every register and every GXFIFO word.

Above that floor, [`HLE_ARCHITECTURE.md`](https://github.com/mstan/ndsrecomp/blob/main/HLE_ARCHITECTURE.md) defines what HLE is allowed to mean here:

> "The recompiled/LLE implementation is the accuracy floor and remains linked,
> runnable, and forceable. Performance HLE is a set of measured replacements
> above that floor. A replacement may become the default path after promotion;
> it never deletes its LLE body or changes a miss into a Tier-3 interpreter call."

Two pieces of that exist. The first is a measurement seam: `nds_recompile --hle-manifest <toml>` takes a strict observation manifest naming routines by id, address, end address and mode, and refuses to run unless you are emitting, named a `--bank`, and passed `--validate-live-bytes`; unknown keys and duplicate ids fail closed "so a stale or misspelled selector cannot silently instrument a different guest routine". The generated profiling wrapper compiles only under `#ifdef NDS_PROFILE_HLE_HEAT`, and counts are read back passively through the `hle_heat` debug command, with no arm or reset step.

The second is the renderer seam. `NDS_3D_RENDERER` is read by the runner, and the melonDS `ComputeRenderer` became the automatic default on 2026-08-01. The project reports it with its divergences rather than as a clean win, in [`ISSUES.md`](https://github.com/mstan/ndsrecomp/blob/main/ISSUES.md):

> "framebuffer output is not parity-safe: early title samples differed on the 3D screen by 54--56 pixels, and castle-route samples differed by 1,144--7,311 3D-screen pixels with maximum channel deltas up to 243; the bottom screen remained exact in those samples"

### The selector the architecture specifies, and does not ship

The same document specifies the mechanism that would let a measured replacement run: a generated wrapper that keeps the LLE body and consults a selector only on an exact function-start PC. It argues that a plain PC-keyed hook table is not enough, since generated banks call each other directly and a validated RAM bank can hold several overlay generations at one address, so "A PC-only table can therefore miss calls or select the wrong routine." It names a policy vocabulary of `off`, `on`, `force`, `verify` and `auto`, and the controls `NDS_HLE` and `NDS_HLE_MATH`.

From [`HLE_ARCHITECTURE.md`](https://github.com/mstan/ndsrecomp/blob/main/HLE_ARCHITECTURE.md), which is a design document, not a description of the build:

```c
static void title_routine_lle(void) {
    /* the existing generated body, unchanged */
}

void title_routine(void) {
    if (g_cpu.R[15] == ROUTINE_START &&
        runtime_hle_try(&title_routine_descriptor, title_routine_lle))
        return;
    title_routine_lle();
}
```

None of that is implemented at the commit this page was written from. `NDS_HLE`, `NDS_HLE_MATH` and `runtime_hle_try` appear in that document and nowhere in the tracked C, C++ or CMake sources. The accurate statement is that ndsrecomp has a written performance HLE architecture, an implemented measurement seam and one promoted renderer replacement, but no shipped CPU-routine HLE handler and no selector to reach one. Read the vocabulary above as a plan. Where different projects draw this line is [high level and low level](/docs/concepts/hle-and-lle).

## The commands

Build the recompiler and run its tests, with CMake 3.20 or newer and a C++20 compiler:

```sh
cmake -G Ninja -B recompiler/build recompiler
cmake --build recompiler/build
./recompiler/build/armv5te_decode_test
./recompiler/build/interpreter_cycle_test
```

Emit the two immutable BIOS banks, one per CPU:

```sh
./recompiler/build/nds_recompile --config bios/biosnds9.toml \
  --bin bios/biosnds9.rom --out generated --bank arm9_bios
./recompiler/build/nds_recompile --config bios/biosnds7.toml \
  --bin bios/biosnds7.rom --out generated --bank arm7_bios
```

`--audit` reports the decode histogram, codegen gaps and undefined encodings without emitting. Firmware banks are captures of runtime-materialized memory rather than a file, made with `tools/capture_firmware_images.py`, and the README says this part "still assumes an active developer setup". Build the runner with `cmake -G Ninja -B runner/build runner`, then configure a title build against its banks and exact cartridge hash:

```sh
cmake -G Ninja -S runner -B runner/build-title \
  -DNDS_BOOTSTRAP_FIRMWARE=ON \
  -DNDS_TITLE_BANK_DIR=/path/to/game/generated/recomp \
  -DNDS_TITLE_ROM_SHA1=40-lowercase-hex-digits
cmake --build runner/build-title
```

Tables are discovered at configure time, classified by `_arm9_` or `_arm7_` in the bank name, and registered only when the loaded cartridge matches that SHA-1. Run it by passing the BIOS directory:

```sh
nds_runner.exe "F:\Projects\ndsrecomp\ndsrecomp\bios" --interactive
```

`--interactive` is SDL play mode, `--serve` the headless surface where `run_to_*` drives execution. Setting precedence is TOML, then environment, then CLI. Three standing gates decide whether work is done: G1 replays the eight scenarios in `oracle/firmware_traversal.json` against a fresh oracle pair, requiring sample-exact audio and zero Tier-3 instructions on both CPUs; G2 is a 2400-frame soak with no audio underruns and an unchanged frame hash pair; the third is a per-title parity gate, byte-locked against a fresh oracle at fixed instruction counts.

## The debug protocol, and where TCP.md lags the code

Runtime and oracle both speak line-delimited JSON, one object per line and one response per request, on `127.0.0.1:19842` for the native runtime and `19843` for the melonDS oracle, "one above native". Documented commands include `ping`, `regs`, `event_counts`, `read_mem`, `read_region`, `framebuffer`, `audio_samples`, `touch` and `keys`; in play mode `run_to_*` is rejected by design, so you query the always-on rings instead. [`TCP.md`](https://github.com/mstan/ndsrecomp/blob/main/TCP.md) is behind the implementation: `runner/src/debug_server.cpp` answers roughly thirty commands the document does not list, among them `dispatch_stats`, `tier3_coverage`, `coverage_manifest`, `hle_heat`, `sched_state` and `net_state`. The project tracks the gap as a work item, so read the dispatcher when a command is missing from the document. The shared wire format is specified at [the TCP debug protocol](/docs/reference/tcp-protocol).

## What runs today, and the limits

The firmware path is the demonstrated result. The one public game consumer is [MetroidPrimeHuntersRecomp](https://github.com/mstan/MetroidPrimeHuntersRecomp), gated to a single cartridge revision and describing itself as "**Public alpha - bugs are expected.**" Titles live in their own repositories with their own gates. Beyond that:

- No compatibility promise, and no turnkey build from a clean clone.
- Whole-machine save states do not exist; only the vendored 3D device serializes.
- Tier 2 is deferred, so anything the static banks miss either interprets under the Tier 3 rule or fails loudly.
- Local wireless is same-machine only: "LAN/across-machine play is not validated or claimed", and the shipped title documents one Nintendo WFC connection per launch.
- Performance numbers are machine-local. The project warns its wall clock "drifts ~2x" across sessions, so only same-binary A/B minimum-of-N numbers are valid.
- `PLAN.md` and `ISSUES.md` carry items dated weeks before HEAD and lag the code in places.

## How this repository is licensed

Take this from the repository, not from a summary. [`LICENSE`](https://github.com/mstan/ndsrecomp/blob/main/LICENSE) is the MIT License, Copyright (c) 2026 Matthew Stanley, and it covers the project's own code. The distributable runner is a separate question, because it links vendored melonDS sources for the 3D pipeline and Wi-Fi. [`THIRD_PARTY_ATTRIBUTION.md`](https://github.com/mstan/ndsrecomp/blob/main/THIRD_PARTY_ATTRIBUTION.md) is unambiguous: "the native runner links vendored melonDS sources, so the `nds_runner` **executable** is a combined work whose distribution must comply with GPL-3.0-or-later", and "Any distribution of the runner binary must comply with GPL-3.0-or-later. The recompiler, the generated banks, and all `ndsref`-independent tooling remain outside this boundary and do not compile or link melonDS code."

So MIT for the recompiler, the generated banks and the tooling, and GPL-3.0-or-later for the binary a player runs. Changes under `runner/vendor/melonds/` require a tracked patch file as a GPLv3 section 5(a) change notice. The ARM core ported from `gbarecomp`, PolyForm Noncommercial 1.0.0 upstream, is offered here under this repository's MIT grant, because both repositories have the same copyright holder.

## Source

Written from [ndsrecomp](https://github.com/mstan/ndsrecomp):
[`README.md`](https://github.com/mstan/ndsrecomp/blob/main/README.md),
[`PRINCIPLES.md`](https://github.com/mstan/ndsrecomp/blob/main/PRINCIPLES.md),
[`HLE_ARCHITECTURE.md`](https://github.com/mstan/ndsrecomp/blob/main/HLE_ARCHITECTURE.md),
[`CLAUDE.md`](https://github.com/mstan/ndsrecomp/blob/main/CLAUDE.md),
[`PLAN.md`](https://github.com/mstan/ndsrecomp/blob/main/PLAN.md),
[`ISSUES.md`](https://github.com/mstan/ndsrecomp/blob/main/ISSUES.md),
[`ENHANCEMENTS.md`](https://github.com/mstan/ndsrecomp/blob/main/ENHANCEMENTS.md),
[`TCP.md`](https://github.com/mstan/ndsrecomp/blob/main/TCP.md),
[`THIRD_PARTY_ATTRIBUTION.md`](https://github.com/mstan/ndsrecomp/blob/main/THIRD_PARTY_ATTRIBUTION.md),
[`docs/dispatch_architecture.md`](https://github.com/mstan/ndsrecomp/blob/main/docs/dispatch_architecture.md),
[`recompiler/src/main.cpp`](https://github.com/mstan/ndsrecomp/blob/main/recompiler/src/main.cpp),
[`runner/src/scheduler.cpp`](https://github.com/mstan/ndsrecomp/blob/main/runner/src/scheduler.cpp),
[`runner/src/runtime_arm.cpp`](https://github.com/mstan/ndsrecomp/blob/main/runner/src/runtime_arm.cpp),
[`runner/src/dispatch_lookup.h`](https://github.com/mstan/ndsrecomp/blob/main/runner/src/dispatch_lookup.h),
[`runner/src/gpu2d.cpp`](https://github.com/mstan/ndsrecomp/blob/main/runner/src/gpu2d.cpp),
[`runner/src/io.cpp`](https://github.com/mstan/ndsrecomp/blob/main/runner/src/io.cpp),
[`runner/src/frontend.h`](https://github.com/mstan/ndsrecomp/blob/main/runner/src/frontend.h),
and, downstream, [`README.md`](https://github.com/mstan/MetroidPrimeHuntersRecomp/blob/main/README.md) in MetroidPrimeHuntersRecomp.

## Next

- [Nintendo DS on the hardware catalogue](/hardware/nintendo-ds), for the games and what the ports add.
- [High level and low level](/docs/concepts/hle-and-lle), the argument this project takes a strict position in.
- [Virtual Boy](/docs/platforms/virtual-boy), the other console from the same research pass.
- [Proving it with co-simulation](/docs/concepts/co-simulation) and [the TCP debug protocol](/docs/reference/tcp-protocol), which is how the claims above get checked.
