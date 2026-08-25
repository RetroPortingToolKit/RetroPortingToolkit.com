---
title: "Nintendo DS"
summary: "ndsrecomp translates both DS processors to C ahead of time and interleaves them on one scheduler. Its performance HLE design is mostly still on paper."
pageType: "project"
tags: ["Nintendo DS", "ARM", "Dual CPU", "HLE"]
repos:
  - "https://github.com/mstan/ndsrecomp"
  - "https://github.com/mstan/MetroidPrimeHuntersRecomp"
updated: "2026-08-25"
---

[ndsrecomp](https://github.com/mstan/ndsrecomp) translates Nintendo DS guest ARM machine code, both the ARM9 and the ARM7 sides, into C ahead of time. That C runs natively on a runtime supplying the memory bus, two-CPU scheduling, hardware models and optional SDL presentation. Its README calls it "very early pre-alpha (v0.0.1)" and says plainly that "This is **not** a general-purpose emulator." The games are on the catalogue page, [/hardware/nintendo-ds](/hardware/nintendo-ds).

## Status, in the project's own words

From [`README.md`](https://github.com/mstan/ndsrecomp/blob/main/README.md), under a heading reading "Status: very early pre-alpha (v0.0.1)":

> This is an experimental developer snapshot, not a ready-to-use emulator or
> a stable framework. It has demonstrated one specific, hash-verified Nintendo
> DS firmware path, early title bring-up across multiple games, experimental
> online play through Wiimmfi, and same-machine local wireless multiplayer. It
> has no compatibility promise, no stable API, and no turnkey clean-clone game
> build yet. Internals and instructions may change without notice.

[`PRINCIPLES.md`](https://github.com/mstan/ndsrecomp/blob/main/PRINCIPLES.md) sets a hard gate on the order of work: "No cartridge, no commercial game, no "load a ROM real quick" happens until the console boots to the **interactive firmware menu** and matches the melonDS oracle".

> **You provide this.** The runner needs your own hash-verified dumps in `bios/`: `biosnds9.rom`, `biosnds7.rom` and `firmware.bin`, plus your own cartridge image. An opt-in path substitutes the recompiled FreeBIOS (BSD-2-Clause), but "The retail dumps remain the default and the oracle-diffed source of truth."

## Two ARM cores, one event scheduler

| | core | ISA | clock | role |
|---|---|---|---|---|
| **ARM9** | ARM946E-S | ARMv5TE | ~67 MHz | main; caches, MPU, TCM, CP15; runs the menu GUI |
| **ARM7** | ARM7TDMI | ARMv4T | ~33 MHz | sub; touch/SPI, sound, RTC, Wi-Fi |

The README adds: "They share 4 MB of main RAM and communicate through IPC FIFO and IPCSYNC. The runtime interleaves both CPUs on one event scheduler."

Each round runs the ARM9 first, up to a target in ARM9 cycles, and does not clamp it. An instruction runs to completion, so the ARM9 usually finishes slightly past its target. Only then does the ARM7 move, and the number it chases is what makes this event-aligned.

From [`runner/src/scheduler.cpp`](https://github.com/mstan/ndsrecomp/blob/main/runner/src/scheduler.cpp):

```cpp title="runner/src/scheduler.cpp"
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

Two rules follow. [`CLAUDE.md`](https://github.com/mstan/ndsrecomp/blob/main/CLAUDE.md) forbids you to "free-run one CPU past a cross-CPU sync point (IPC / shared WRAM / observed I/O), or pause/step the two CPUs to "compare" them". And comparisons against the oracle never sync by frame index. They sync on counted hardware events: VBlank-IRQ counts, IPCSYNC writes, FIFO traffic, DMA completions, timer overflows. That is the DS shape of [co-simulation](/docs/concepts/co-simulation), against melonDS pinned at tag `1.0rc`.

## Banks, dispatch, and the one interpreter

The recompiler emits `generated/<bank>.c`, a header and a per-CPU dispatch table. The runner links the banks and resolves every computed jump by binary search over that map. See [the recompiler and the runtime](/docs/concepts/recompiler-and-runtime). Lookup checks content as it goes: an entry whose recorded bytes no longer match the live guest bytes is skipped, which is how several generations of one overlay coexist at one address.

From [`docs/dispatch_architecture.md`](https://github.com/mstan/ndsrecomp/blob/main/docs/dispatch_architecture.md):

```text title="docs/dispatch_architecture.md"
Tier 1  recompiled native C    — statically recompiled banks (BIOSes, fw parts)
   │ (miss: no static fn for this PC)
Tier 2  dirty-RAM JIT shard    — code copied into RAM at boot, JIT-compiled on miss
   │ (JIT declines an opcode, or a write invalidates the shard)
Tier 3  dirty-RAM interpreter  — the always-correct floor (the guest's own bytes)
```

Tier 2 is not built; `PLAN.md` calls it deferred. Tier 3 is enforced structurally. A miss drops to it only when the target is mapped writable RAM **and** the runtime holds write provenance for those bytes. Anything else is fatal, and lands in `dispatch_misses.log` as a paste-ready `[[entry_point]]` block. Regenerate, rebuild and rerun until that log is empty. The DS needs any of this because the firmware decompresses code into RAM and runs it, which is [code you cannot see ahead of time](/docs/concepts/code-you-cannot-see-ahead-of-time).

## Two screens, and a touchscreen on the ARM7

Two 2D engines, A and B, each produce a 256x192 framebuffer, and a register decides which engine reaches which panel. The runtime keeps physical top and bottom buffers, and applies that routing while each scanline is drawn. Reading the register later would be cheaper and wrong for any title that reassigns panels mid-frame, which the README notes is real behaviour in shipped games.

Widening is not a stretch of either buffer: "Adaptive widescreen is a title capability, not framebuffer stretching: unsupported screen choices are rejected".

Touch is an ARM7 concern, because the touchscreen is a TSC on SPI device 2. The host maps the mouse to a bottom-screen pixel and hands it to one function, in [`runner/src/io.cpp`](https://github.com/mstan/ndsrecomp/blob/main/runner/src/io.cpp):

```cpp title="runner/src/io.cpp"
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

Pen-up is a distinct state, not the coordinate 0,0. The frontend holds a touch for at least two frames, "long enough for the ARM7 touchscreen polling path to observe it".

## Where the HLE line sits today

The floor is settled. Both BIOSes and the firmware boot and menu code are recompiled and run through the dispatch tables. SWIs land at the BIOS SWI vector and the recompiled BIOS handles them: "There is no `if (swi == X) hle_...()`."

Above that floor, [`HLE_ARCHITECTURE.md`](https://github.com/mstan/ndsrecomp/blob/main/HLE_ARCHITECTURE.md) defines what HLE is allowed to mean here:

> "The recompiled/LLE implementation is the accuracy floor and remains linked,
> runnable, and forceable. Performance HLE is a set of measured replacements
> above that floor. A replacement may become the default path after promotion;
> it never deletes its LLE body or changes a miss into a Tier-3 interpreter call."

Two pieces of that exist. The first is a measurement seam: `nds_recompile --hle-manifest <toml>` takes a strict manifest naming routines by id, address, end address and mode. Unknown keys and duplicate ids fail closed, "so a stale or misspelled selector cannot silently instrument a different guest routine".

The second is the renderer seam. The melonDS `ComputeRenderer` became the automatic default on 2026-08-01, and the project reports it with its divergences rather than as a clean win, in [`ISSUES.md`](https://github.com/mstan/ndsrecomp/blob/main/ISSUES.md):

> "framebuffer output is not parity-safe: early title samples differed on the 3D screen by 54--56 pixels, and castle-route samples differed by 1,144--7,311 3D-screen pixels with maximum channel deltas up to 243; the bottom screen remained exact in those samples"

The rest is a plan. The same document specifies a generated wrapper that keeps the LLE body and consults a selector only on an exact function-start address. None of that is implemented at the commit this page was written from. So ndsrecomp has a written performance HLE architecture, a working measurement seam and one promoted renderer replacement, and no shipped CPU-routine HLE handler. Where projects draw this line is [high level and low level](/docs/concepts/hle-and-lle).

## The commands

Build the recompiler and run its tests. CMake 3.20 or newer, and a C++20 compiler:

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

`--audit` reports the decode histogram and codegen gaps without emitting. Firmware banks are captures of runtime-materialized memory rather than a file, and the README says this part "still assumes an active developer setup". Then configure a title build:

```sh
cmake -G Ninja -S runner -B runner/build-title \
  -DNDS_BOOTSTRAP_FIRMWARE=ON \
  -DNDS_TITLE_BANK_DIR=/path/to/game/generated/recomp \
  -DNDS_TITLE_ROM_SHA1=40-lowercase-hex-digits
cmake --build runner/build-title
```

Tables are found at configure time and registered only when the loaded cartridge matches that SHA-1. Run it by passing the BIOS directory:

```sh
nds_runner.exe "F:\Projects\ndsrecomp\ndsrecomp\bios" --interactive
```

`--interactive` is SDL play mode, `--serve` the headless surface. Three standing gates decide whether work is done. G1 replays eight scenarios against a fresh oracle pair, requiring sample-exact audio and zero Tier-3 instructions. G2 is a 2400-frame soak with no audio underruns and an unchanged frame hash pair. The third is a per-title parity gate.

Runtime and oracle both speak line-delimited JSON on `127.0.0.1:19842` and `19843`. [`TCP.md`](https://github.com/mstan/ndsrecomp/blob/main/TCP.md) is behind the implementation: `runner/src/debug_server.cpp` answers roughly thirty commands it does not list. See [the TCP debug protocol](/docs/reference/tcp-protocol).

## What runs today, and the limits

The firmware path is the demonstrated result. The one public game consumer is [MetroidPrimeHuntersRecomp](https://github.com/mstan/MetroidPrimeHuntersRecomp), gated to a single cartridge revision and describing itself as "**Public alpha - bugs are expected.**"

- No compatibility promise, and no turnkey build from a clean clone.
- Whole-machine save states do not exist; only the vendored 3D device serializes.
- Tier 2 is deferred, so anything the static banks miss either interprets under the Tier 3 rule or fails loudly.
- Local wireless is same-machine only: "LAN/across-machine play is not validated or claimed".
- Performance numbers are machine-local. The project warns its wall clock "drifts ~2x" across sessions.
- `PLAN.md` and `ISSUES.md` carry items dated weeks before HEAD.

## How this repository is licensed

[`LICENSE`](https://github.com/mstan/ndsrecomp/blob/main/LICENSE) is the MIT License, Copyright (c) 2026 Matthew Stanley, and it covers the project's own code. The distributable runner is a separate question, because it links vendored melonDS sources. [`THIRD_PARTY_ATTRIBUTION.md`](https://github.com/mstan/ndsrecomp/blob/main/THIRD_PARTY_ATTRIBUTION.md) is unambiguous: "the native runner links vendored melonDS sources, so the `nds_runner` **executable** is a combined work whose distribution must comply with GPL-3.0-or-later", while "The recompiler, the generated banks, and all `ndsref`-independent tooling remain outside this boundary and do not compile or link melonDS code."

So MIT for the recompiler, the generated banks and the tooling, and GPL-3.0-or-later for the binary a player runs.

## Source

Written from [ndsrecomp](https://github.com/mstan/ndsrecomp):

- Status and rules: [`README.md`](https://github.com/mstan/ndsrecomp/blob/main/README.md), [`PRINCIPLES.md`](https://github.com/mstan/ndsrecomp/blob/main/PRINCIPLES.md), [`CLAUDE.md`](https://github.com/mstan/ndsrecomp/blob/main/CLAUDE.md).
- Design and gaps: [`HLE_ARCHITECTURE.md`](https://github.com/mstan/ndsrecomp/blob/main/HLE_ARCHITECTURE.md), [`PLAN.md`](https://github.com/mstan/ndsrecomp/blob/main/PLAN.md), [`ISSUES.md`](https://github.com/mstan/ndsrecomp/blob/main/ISSUES.md).
- Machinery: [`docs/dispatch_architecture.md`](https://github.com/mstan/ndsrecomp/blob/main/docs/dispatch_architecture.md), [`runner/src/scheduler.cpp`](https://github.com/mstan/ndsrecomp/blob/main/runner/src/scheduler.cpp), [`runner/src/gpu2d.cpp`](https://github.com/mstan/ndsrecomp/blob/main/runner/src/gpu2d.cpp), [`runner/src/io.cpp`](https://github.com/mstan/ndsrecomp/blob/main/runner/src/io.cpp).
- [`TCP.md`](https://github.com/mstan/ndsrecomp/blob/main/TCP.md), [`THIRD_PARTY_ATTRIBUTION.md`](https://github.com/mstan/ndsrecomp/blob/main/THIRD_PARTY_ATTRIBUTION.md), and [`README.md`](https://github.com/mstan/MetroidPrimeHuntersRecomp/blob/main/README.md) in MetroidPrimeHuntersRecomp.

## Next

- [Nintendo DS on the hardware catalogue](/hardware/nintendo-ds), for the games.
- [High level and low level](/docs/concepts/hle-and-lle), the argument this project takes a strict position in.
- [Virtual Boy](/docs/platforms/virtual-boy), the other console from the same research pass.
- [Proving it with co-simulation](/docs/concepts/co-simulation) and [the TCP debug protocol](/docs/reference/tcp-protocol).
