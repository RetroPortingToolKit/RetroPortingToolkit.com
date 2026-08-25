---
title: "Sega Genesis"
summary: "segagenesisrecomp translates a cartridge's 68000 code to C, and this page explains how the console's second processor, the Z80 sound CPU, keeps running beside it."
pageType: "project"
tags: ["Sega", "68000", "Dual CPU", "Audio", "Widescreen"]
repos:
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/smsggrecomp"
updated: "2026-08-23"
---

[segagenesisrecomp](https://github.com/mstan/segagenesisrecomp) translates the
68000 code inside a Genesis cartridge into C ahead of time, compiles it as a
native program, and links it against a runner standing in for the rest of the
machine: the VDP, the buses, the sound chips, and the console's second processor.
Its README calls it "a static-recompilation framework that translates Sega
Genesis (Mega Drive) 68000 ROM code into native C". The hardware runs a 68000 and
a Z80 concurrently over shared buses, and most of what is unusual about this
toolchain follows from that. Catalogue entry:
[/hardware/sega-genesis](/hardware/sega-genesis).

> **You provide this.** No cartridge image and no prebuilt game binary is
> distributed. The Sonic 1 port README says it plainly: "**No prebuilt binaries
> are distributed, build from source below and supply your own ROM.**"

## Status, in the project's own words

The README tracks status per feature, not as one line. The 68K frontend is
"Active", using a "Shared decoder, validator, discovery, and emitter from
`m68k-recomp-core`". The runtime fallback is "Active": a "Clean-room Tier-3
interpreter handles supported static-dispatch misses". Function discovery is
"Evidence-driven". Static recompilation of the sound Z80 is "Experimental", an
"Optional backend". Widescreen injection is "Per game". The license is PolyForm
Noncommercial 1.0.0.

## The 68000 half

`COVERAGE.md` states the target exactly: "The CPU target is the
MC68000-compatible main processor in the Sega Genesis." `GenesisRecomp` parses
the cartridge and its vectors, loads `game.toml` and a labels CSV, walks the call
graph, then emits C across 32 balanced translation units plus dispatch, RAM
layout and cycle-cost files. Discovered routines become C functions over a shared
`M68KState` and the runtime bus. Most of the frontend is elsewhere: the decoder,
validator, discovery policy and emitter live in a pinned submodule,
`m68k-recomp-core`, reached through two-line forwarding files.

The generated code links against one header, described at its own head as the
"Genesis/Mega Drive runtime interface. Shared between runner/ and generated/
code. Generated code includes this; runner implements it." That is
[/docs/concepts/recompiler-and-runtime](/docs/concepts/recompiler-and-runtime) in
local dialect. Per-game facts never reach shared runner code; they cross through
`g_game_spec` and `g_game_layout`.

## Two CPUs, one scheduler

A static recompiler translates one instruction stream ahead of time. This machine
has two, sharing buses. The first part of the answer is a scope decision: by
default only the 68K is statically recompiled, and the Z80 is a runner subsystem
running the vendored MIT superzazu interpreter. The two are interleaved per
scanline by one cooperative scheduler, no threads.
`runner/video/genesis_machine.c` calls itself a "clean-room own-backend scheduler
... Per-scanline frame loop driving the recompiled 68K (glue fiber), the
superzazu Z80, and our VDP, delivering V/H interrupts." Its budgets are NTSC
raster constants.

From [`runner/video/genesis_machine.c`](https://github.com/mstan/segagenesisrecomp/blob/master/runner/video/genesis_machine.c):

```c title="runner/video/genesis_machine.c"
/* NTSC raster timing. */
#define LINES_TOTAL     262
#define MASTER_PER_LINE 3420u
#define M68K_PER_LINE   488u
#define Z80_PER_LINE    228u
#define MASTER_PER_Z80  (MASTER_PER_LINE / Z80_PER_LINE)   /* 3420/228 = 15 master/Z80 cyc */
```

Each line gives the 68K its cycles, then the Z80 its own, then delivers
interrupts and renders. That is the whole interleave.

From [`runner/video/genesis_machine.c`](https://github.com/mstan/segagenesisrecomp/blob/master/runner/video/genesis_machine.c):

```c title="runner/video/genesis_machine.c"
    for (int line = 0; line < LINES_TOTAL; line++) {
        unsigned irq = gvdp_begin_scanline(&m->vdp, line);
        g_snd_line = (unsigned)line;   /* [SND-TRACE] */
        s_line_base = (uint32_t)line * MASTER_PER_LINE;
        s_z80_off   = 0;   /* 68K writes during the chunk below land at the line start */

        /* Advance the recompiled 68K ~one scanline (it parks at WaitForVBlank). */
        glue_run_game_chunk(M68K_PER_LINE);

        /* If a prior V-int was latched while the 68K had IRQs masked (e.g. a
         * move #$2700,sr screen transition), deliver it now that the chunk above
         * may have dropped the mask */
        glue_own_vint_service_latched(&m->vdp);

        /* Step the Z80 (SMPS driver) for its share of the line. */
        step_z80(m, Z80_PER_LINE);
```

The 68K is preemptible mid-function only because it runs on a fiber: generated
code drains a cycle budget as it touches the bus, and switches back to the
scheduler when that budget hits zero. `runner/glue.c` sums the model up as "No
threads, no semaphores, no races." A Z80 instruction can overshoot its 228
cycles, so the overshoot carries across lines as `z80_cycle_debt`. Compare
[/docs/concepts/timing-models](/docs/concepts/timing-models).

The shared bus is modelled in one file. The Z80 sees 8 KB of RAM, the FM chip, a
bank register, the PSG, and a 32 KB window onto the 68K bus.

From [`runner/video/genesis_bus.c`](https://github.com/mstan/segagenesisrecomp/blob/master/runner/video/genesis_bus.c):

```c title="runner/video/genesis_bus.c"
uint8_t gbus_z80_read(GenesisBus *b, uint16_t addr)
{
    if (addr < 0x4000u) return b->z80_ram[addr & 0x1FFFu];         /* RAM+mirror */
    /* YM2612 status: BUSY is clear; timer flags advance on scheduler time. */
    if (addr < 0x6000u) {
        ym_timer_update(b, ym_abs_z80_stamp());
        return b->ym_status;
    }
    if (addr < 0x8000u) return 0xFFu;                               /* bank/PSG   */
    /* $8000-$FFFF: banked window into the 68K bus. */
    uint32_t a68 = ((uint32_t)b->z80_bank << 15) + (uint32_t)(addr - 0x8000u);
    return gbus_read8(b, a68);
}
```

Running an interrupt handler as one lump also means chip writes reach the mixer
out of true time order, so FM and PSG register writes are not applied where they
happen: they go onto a cycle-stamped event queue, and the mixer sorts them.

## What the sound chips actually are

The chips themselves are emulated, not recompiled: FM synthesis is ymfm
(BSD-3-Clause), and the PSG is a clean-room in-tree file written "from public
hardware documentation, NO emulator-core code". The ymfm wrapper calls itself "a
*shadow synth* driven purely by the register-write event stream". The sound
driver program is the other case: SMPS, part 68K code inside the V-int handler
and part Z80 code uploaded into Z80 RAM, and that program is recompiled, always
on the 68K side and optionally on the Z80 side.

`GENESIS_AUDIO_FIDELITY.md` scores eight items, from determinism through command
loss at the chip-write surface to chip-level synthesis proofs. Sonic 1 recorded
"**79,152 consecutive FM writes bit-identical**" and a full-run log-spectral
distance of "**1.52 dB**". Read that with its date: it was measured against a
clownmdemu oracle since retired from the tree, with no re-measurement in the
repository.

## Why widescreen is harder here

The strategy is "**post-patch injection**": recompile the original unmodified ROM
and widen through declarative `[[widescreen_site]]` entries reading a runtime
margin, `g_ws_margin`. The disassembly and the ROM are never edited.

It is hard here because the game's own 68K code decides what to draw, cull and
clamp, from constants baked into the cartridge. Widening the viewport alone just
reveals plane memory the game never filled. So the recompiler rewrites specific
instructions at emission time, through site kinds named `mask10`, `addreg`,
`subreg`, `addimm`, `subimm`, `cull_left`, `cull_window_left`, `call_widen` and
`addmem`. All are no-ops at margin zero, so authentic 4:3 output stays
byte-identical.

`WIDESCREEN_ISSUES.md` records what broke: plane B never redrawn by the arm path,
the 512 pixel plane wrapping so the left of the view showed content from 512
pixels to the right, sprite X masked to ten bits so widened positions wrapped to
the opposite edge, and camera bounds turning out to be game logic rather than
view logic. The camera minimum is widened and the maximum deliberately is not,
because level event triggers wait for the camera to reach it and shrinking it
"risks softlocks".

From [`sonicthehedgehog2/game.toml`](https://github.com/mstan/segagenesisrecomp/blob/master/sonicthehedgehog2/game.toml):

```toml title="sonicthehedgehog2/game.toml"
addr = 0x1C56A            # Tails_LevelBound: move.w (Tails Min copy).w,d0
kind = "addmem"
base = 2
gate = 0xFFF7AA
```

[/docs/guides/add-widescreen](/docs/guides/add-widescreen) covers the general
case.

## The same Z80, two different jobs

The Z80 is a sound coprocessor here and the only CPU in
[smsggrecomp](https://github.com/mstan/smsggrecomp), documented at
[/docs/platforms/master-system-game-gear](/docs/platforms/master-system-game-gear).
Code is shared in three specific ways. The generator is shared by invocation:
this repository contains no Z80 recompiler, and `docs/Z80_STATIC_RECOMP.md` says
"The generator lives in [`smsggrecomp`](https://github.com/mstan/smsggrecomp) and
reuses its Z80 decoder and emitter." The semantics are shared by submodule,
`z80-recomp-core`, pinned by both. The host ABI is shared by name: the Genesis
adapter implements `sms_read8`, `sms_write8`, `sms_io_in`, `sms_io_out` and
`sms_dispatch_miss` verbatim.

What is not shared is equally concrete, and worth saying so nobody reads more
integration into this than exists. The superzazu interpreter is vendored twice.
The two clean-room SN76489 files are separate, with different clocking
assumptions. And `runner/z80_recomp.c` carries flag marshalling that exists only
because the two Z80 state representations differ.

The optional backend is off by default, gated on `GENESIS_Z80_RECOMP`, and the
Genesis scheduler stays authoritative for reset, BUSREQ, interrupt delivery,
cycle slices and save states. Reported results include Sonic 1 at 1,800 frames
with byte-identical WAV output.

## The commands

Clone recursively, which pulls the shared 68000, Z80 and netplay submodules, then
build the recompiler and regenerate a game.

```sh
git clone --recursive https://github.com/mstan/segagenesisrecomp.git
cd recompiler
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
ninja -C build
cd ../sonicthehedgehog
../recompiler/build/Release/GenesisRecomp.exe sonic.bin --game game.toml --output-dir generated
```

Generation is normally automatic: the game's CMake registers `game.toml`, the
files beside it and the cartridge image as freshness dependencies, because that
"prevents a runner from silently compiling C generated from some older or
different ROM image". `--fail-on-unsupported` turns a non-zero diagnostic count
into exit code 2.

```sh
ctest --test-dir build/tests -C Release --output-on-failure
python tools/boot_smoke.py --game sonic1 --port 4380
python tools/zone_smoke.py --game sonic2 --input ../../SonicTheHedgehog2Recomp/tools/smoke_enter_level_run_right.input --hash-frames 60
python tools/divergence_report.py --frames 600 --cycles 2000000
python tools/audit_runner_purity.py
```

The first line runs the ROM-independent framework tests. The four Python tools
check state at a target frame, framebuffer hashes through a scripted run, the
co-simulation harness of
[/docs/concepts/co-simulation](/docs/concepts/co-simulation), and the shared
runner for per-game literals. The TCP debug server starts only when a `debug.ini`
file sits beside the executable, and its port differs per build. After every run,
read `dispatch_misses.toml`: a dispatch miss is a jump to an address no function
was generated for, treated as a graph failure rather than a warning.

## What runs today

Three ports exist. [Sonic the Hedgehog](/games/sonic-the-hedgehog) reports "Green
Hill Zone is fully playable, all 3 acts including the Robotnik boss fight", with
later zones "Partial". [Sonic the Hedgehog 2](/games/sonic-the-hedgehog-2) adds
delay-sync netplay and split-screen. [Sonic 3 & Knuckles](/games/sonic-3-and-knuckles)
holds three build modes in one repository, because the lock-on cartridge is the
two games combined, and marks them "**Playable bring-up**", "Bring-up" and
"Scaffold / early bring-up".

## Known limits

- Widescreen conversion is per game. Sonic 1, Sonic 2 and Sonic 3 alone use the
  injection path; Sonic & Knuckles alone and the combined Sonic 3 & Knuckles are
  "NOT converted", still on the older patched-disassembly route.
- A live mid-level 16:9 toggle "still reveals stale plane-B margins in strip
  zones; they heal as each strip's seam next advances over them (one scroll)".
- One audio defect is open: a "premature full-volume PSG note-on at SFX
  transition ticks", localised to driver execution rather than the synth or
  mixer, origin recorded as "UNDETERMINED".
- There is no cloud CI: "the build needs a ROM that can't be checked in
  upstream. Discipline here is local."
- `Sonic3AndKnucklesRecomp/FEATURES.md` is stale. Read it for its statement of
  the Z80 problem, not for current architecture.

## Building a port on top of this

A game repository consumes the framework as a submodule, adds a `CMakeLists.txt`,
per-game tooling, box art, release scripts and the shared `recomp-ui` launcher,
and commits neither the cartridge image nor the generated C. Releases go through
`tools/package_release.py`, which builds from an allowlist and refuses if a ROM
or dump is present.

## Source

- [mstan/segagenesisrecomp](https://github.com/mstan/segagenesisrecomp):
  [`README.md`](https://github.com/mstan/segagenesisrecomp/blob/master/README.md),
  [`COVERAGE.md`](https://github.com/mstan/segagenesisrecomp/blob/master/COVERAGE.md),
  [`PRINCIPLES.md`](https://github.com/mstan/segagenesisrecomp/blob/master/PRINCIPLES.md),
  [`RELEASING.md`](https://github.com/mstan/segagenesisrecomp/blob/master/RELEASING.md).
- Dual-CPU machinery:
  [`runner/video/genesis_machine.c`](https://github.com/mstan/segagenesisrecomp/blob/master/runner/video/genesis_machine.c),
  [`runner/video/genesis_bus.c`](https://github.com/mstan/segagenesisrecomp/blob/master/runner/video/genesis_bus.c),
  [`runner/glue.c`](https://github.com/mstan/segagenesisrecomp/blob/master/runner/glue.c),
  [`runner/include/genesis_runtime.h`](https://github.com/mstan/segagenesisrecomp/blob/master/runner/include/genesis_runtime.h).
- Audio and widescreen:
  [`runner/audio/sn76489.c`](https://github.com/mstan/segagenesisrecomp/blob/master/runner/audio/sn76489.c),
  [`GENESIS_AUDIO_FIDELITY.md`](https://github.com/mstan/segagenesisrecomp/blob/master/GENESIS_AUDIO_FIDELITY.md),
  [`WIDESCREEN_ISSUES.md`](https://github.com/mstan/segagenesisrecomp/blob/master/WIDESCREEN_ISSUES.md).
- Optional Z80 backend:
  [`docs/Z80_STATIC_RECOMP.md`](https://github.com/mstan/segagenesisrecomp/blob/master/docs/Z80_STATIC_RECOMP.md),
  [`runner/z80_recomp.c`](https://github.com/mstan/segagenesisrecomp/blob/master/runner/z80_recomp.c),
  generator in [mstan/smsggrecomp](https://github.com/mstan/smsggrecomp).

## Next

- [/docs/platforms/master-system-game-gear](/docs/platforms/master-system-game-gear),
  where that same Z80 is the whole machine and flat step is explained properly.
- [/docs/concepts/co-simulation](/docs/concepts/co-simulation), the technique
  behind `divergence_report.py`.
- [/docs/guides/add-widescreen](/docs/guides/add-widescreen), for what widening a
  2D game costs in general.
- [/docs/concepts/glossary](/docs/concepts/glossary), for dispatch miss, flat
  step, canon path and the rest of the local vocabulary.
