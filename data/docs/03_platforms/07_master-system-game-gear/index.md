---
title: "Master System and Game Gear"
summary: "One Z80 toolchain covers both Sega 8-bit machines, and its flat step emission mode is what lets a Z80 be recompiled as somebody else's coprocessor."
section: "platforms"
sectionTitle: "Platforms"
pageType: "project"
tags: ["Sega", "Z80", "Flat step", "Accuracy"]
repos:
  - "https://github.com/mstan/smsggrecomp"
  - "https://github.com/mstan/segagenesisrecomp"
updated: "2026-08-23"
---

[smsggrecomp](https://github.com/mstan/smsggrecomp) translates the Z80 code in a
Master System or Game Gear cartridge into C ahead of time, compiles it as a
native binary, and models the rest of the machine in a runner: the VDP, the
SN76489 sound chip, the system ports and the mapper. Its README states the goal
as "One engine, both platforms", the Game Gear being "the Master System with a
cropped viewport, a wider palette, and stereo sound". Here the Z80 owns the whole
machine, and this is where the emission mode the Genesis sound CPU depends on was
written. Catalogue entry:
[/hardware/master-system-game-gear](/hardware/master-system-game-gear).

> **You provide this.** You supply your own cartridge image, and neither it nor
> the C generated from it is ever committed: "ROMs are **never** committed
> (`.gitignore`d), and neither is the generated C (it is a derivative of the
> ROM)."

## Status, in the project's own words

The README is direct: "**Status: early (v0.0.2) pre-release, expect bugs.** Two
games are in bring-up: **Sonic the Hedgehog (SMS)** and **Sonic Blast (Game
Gear)**. Across the title + attract-demo path exercised so far (~40-60s), both
run with no interpreter-fallback dispatch miss (100% static) and have been
validated across **7 accuracy axes** against **two independent accurate
emulators** (Mesen 2 and Genesis Plus GX)". The same paragraph adds the limit:
"Neither game has been played end to end, so full-gameplay coverage is
unverified."

There is no declared license: `README.md` says "Not yet declared", noting the
code is original except the vendored MIT `superzazu/z80.c` and the clean-room
SN76489.

## One CPU that owns the machine

`SmsRecomp` loads `game.toml`, parses the cartridge, seeds discovery from the
reset, IRQ and NMI vectors, resolves jump tables out of ROM, ingests a runtime
dispatch manifest, discovers functions, then emits. The frontend is in this
repository: `z80_decoder.c` handles "full Z80 ISA decode incl. the
`CB`/`ED`/`DD`/`FD`/`DDCB`/`FDCB` prefix groups", and `function_finder.c` does
"static reachability from the reset/IRQ/NMI/RST vectors plus `[functions].extra`
seeds and jump tables".

The boundary is a short ABI: generated code calls `sms_read8`, `sms_write8`,
`sms_io_in`, `sms_io_out`, `sms_tick`, `sms_sync`, `call_by_address` and
`sms_dispatch_miss`, and `runner/glue.c` implements them with the mappers, the
VDP advance and interrupt acceptance. That is
[/docs/concepts/recompiler-and-runtime](/docs/concepts/recompiler-and-runtime)
here. Two hardware facts shape it: a separate I/O port space reached by `IN` and
`OUT`, and code in ROM paged through a mapper rather than in RAM.

Because the Z80 owns time, generated code can run until a video event is due. The
subtlety is interrupts: while the VDP interrupt line is asserted the sync deadline
shortens to the next instruction, so the recompiled path samples interrupts where
an interpreter would.

From [`runner/glue.c`](https://github.com/mstan/smsggrecomp/blob/main/runner/glue.c):

```c title="runner/glue.c"
void sms_set_sync_deadline(void){
    g_sync_deadline = vdp_irq_asserted() ? g_z80.cyc + 1 : g_next_line_cyc;
}

void sms_sync(void){
    if (++g_sync_depth > g_sync_maxdepth) g_sync_maxdepth = g_sync_depth;
    advance_vdp(g_z80.cyc);
    if (vdp_irq_asserted() && g_z80.iff1 && !g_z80.ei_block)
        take_irq();
    sms_set_sync_deadline();
    g_sync_depth--;
}
```

Its doc comment calls this "the one fix that unifies the interrupt-sampling
contract across all three CPU modes; the hot path stays a single compare while no
IRQ is pending." The modes are recompiled, hybrid interpreter and oracle
interpreter. Compare
[/docs/concepts/timing-models](/docs/concepts/timing-models).

## Flat step: one instruction per call

`SmsRecomp --flat-step` is a second emission mode from the same code generator,
and the most consequential design decision in the repository. `FLAT_STEP.md`
describes it as a "scheduler-friendly static Z80 backend for a flat binary image.
It is intended for a Z80 used as a coprocessor, where the host machine must
regain control after every instruction to interleave CPUs, devices, reset, bus
ownership, and interrupts."

The default form cannot do that job, and the generator says why: "Function-form
recompilation is ideal when the Z80 owns the whole machine: generated calls/gotos
can run until sms_tick reaches a video event. A coprocessor host instead needs
instruction-boundary control to interleave another CPU and shared devices. This
emitter keeps the verified decoder, timing table, and semantic helpers above, but
makes PC and the guest stack explicit and returns after exactly one instruction."

The output is one function containing a `switch (s->pc)` with a case per byte
offset in the image: "Every byte in the flat image is a legal dispatch entry.
That deliberately trades generated-code size for correctness with computed jumps:
no profile manifest or guessed function boundary is needed, and runtime performs
no opcode fetch/decode." Each case updates PC, the refresh register and cycles
explicitly.

From [`recompiler/src/code_generator.c`](https://github.com/mstan/smsggrecomp/blob/main/recompiler/src/code_generator.c):

```c title="recompiler/src/code_generator.c"
static void emit_flat_body(FILE *o, const Z80Insn *in, uint16_t addr)
{
    uint16_t next = (uint16_t)(addr + in->length);
    fprintf(o, "        s->r = (uint8_t)((s->r & 0x80) | ((s->r + %d) & 0x7f));\n",
            in->prefix == Z80_PFX_NONE ? 1 : 2);
    fprintf(o, "        s->pc = 0x%04X;\n", next);

    if (flat_is_repeat_block(in)) {
        emit_flat_repeat(o, in, addr, next);
    } else {
        int base = cyc_base(in);
        if (base > 0) fprintf(o, "        s->cyc += %d;\n", base);
```

Repeating instructions like `LDIR` do one iteration per call and set `s->pc` back
to themselves if the loop continues, so the host keeps control inside a long
block move.

The second consequence is a guard on every case. The image lives in RAM another
processor uploaded, so it may not be what is in memory now. Each case checks the
live bytes first.

From [`recompiler/src/code_generator.c`](https://github.com/mstan/smsggrecomp/blob/main/recompiler/src/code_generator.c):

```c title="recompiler/src/code_generator.c"
static void emit_flat_match(FILE *o, const Z80Insn *in, uint16_t addr)
{
    fprintf(o, "        if (");
    for (unsigned bi = 0; bi < in->length; ++bi) {
        if (bi) fprintf(o, " && ");
        fprintf(o, "sms_read8(0x%04X) == 0x%02X", (uint16_t)(addr + bi),
                in->raw[bi]);
    }
    fprintf(o, ") {\n");
    emit_flat_body(o, in, addr);
    fprintf(o, "            return;\n        }\n");
}
```

The rationale is recorded inline: "Genesis uploads its sound program into RAM
while the Z80 is reset, and some carts briefly run bootstrap/partial images
before the final driver is present. Guard every compiled alternative against the
live bytes. A different revision, incomplete upload, or uncaptured self-modified
instruction takes the host's explicit interpreter fallback." Self-modified
operands avoid that fallback: a separate emitter keeps the opcode statically
decoded and reads only the mutable byte live. Up to eight captured images compile
into one case with `--flat-step-variant`.

The default function form turns each discovered subroutine into a C function,
with a guest `CALL` becoming a C call and a guest `RET` a C return, so the two
stacks unwind together. Fast, but not preemptible mid-routine. This runner uses
that form; flat step exists for a host that needs the other property.

## The same Z80, two different jobs

In [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp), documented at
[/docs/platforms/sega-genesis](/docs/platforms/sega-genesis), this processor is a
sound coprocessor beside a 68000. Here the code is in ROM behind a mapper; there
the 68K uploads it into 8 KB of Z80 RAM at boot. Here the Z80 owns time; there a
scheduler hands it 228 cycles per line. Here a dispatch miss interprets "until
the routine returns to its caller"; there the identically named
`sms_dispatch_miss` interprets exactly one instruction, because the host owns the
next boundary.

Code is genuinely shared, three ways. The Genesis repository contains no Z80
recompiler and invokes this one: "The generator lives in
[`smsggrecomp`](https://github.com/mstan/smsggrecomp) and reuses its Z80 decoder
and emitter." The `z80-recomp-core` submodule is pinned by both, described here
as "also consumed by Sega Genesis Recomp's sound-CPU backend". And the Genesis
adapter implements this project's ABI names verbatim.

What is not shared should be said as plainly. The superzazu interpreter is
vendored twice. The two clean-room SN76489 implementations are separate files
with different clocking assumptions: one at master divided by 240, the other at
the Z80 clock with a divide by 16. The Genesis adapter also carries flag
marshalling that exists only because the two state representations differ. Read
this as a shared generator and a shared semantic core, not as one system.

## The commands

Build the recompiler in the framework:

```sh
git submodule update --init --recursive
cd recompiler
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release && ninja -C build
```

Then regenerate, build and run from the game directory:

```sh
../smsggrecomp/recompiler/build/SmsRecomp.exe sonicthehedgehog.sms --game game.toml
powershell -File build.ps1 -Rom sonicthehedgehog.sms
SonicTheHedgehogSMSRecomp.exe sonicthehedgehog.sms --window 3
```

`--game` is required and its absence exits 2. Inside it, `[game].rom` and
`[game].output_prefix` are required, `[game].platform` selects `gg` or `sms`, and
a `crc32` mismatch warns and continues. Beside it, `dispatch_manifest.txt`
carries runtime-observed entries as `addr b0 b1 b2 crc` lines, each re-verified
against the current cartridge before being accepted as a discovery seed, so a
stale manifest is rejected rather than trusted.

The decoder, ops and frontend self-tests are standalone C files with no CMake
target, reported as passing in `STATUS.md`. The runtime check is an oracle diff:

```sh
SonicTheHedgehogSMSRecomp.exe sonicthehedgehog.sms --frames 600 --dump-frame 500 --dump-out x.png --audio-wav r.wav
smsref.exe sonicthehedgehog.sms --frames 610 --dump "500" --out g
python tools/oracle/vdp_diff.py x.png.vram x.png.cram g_500.vram g_500.cram
python tools/audio/audio_diff.py g.wav r.wav
```

`--interp` runs the superzazu reference interpreter instead of the recompiled
code, which is how self-agreement is checked. After every run, read
`dispatch_misses.log` beside the executable.

## What runs today, and what is verified

Over "the **exercised path**, power-on + the self-running attract/demo, ~40 s",
both titles match reference emulators on all seven axes, and "It is **NOT**
whole-game, played-to-completion validation." An axis counts as validated only
when it is both cross-referenced against a reference and runtime-diffed against
an accurate oracle, because "`compiled == our-interp` is **necessary, not
sufficient**": that is
[/docs/concepts/co-simulation](/docs/concepts/co-simulation) with external
oracles.

| Axis | Verdict | Oracle |
|---|---|---|
| 1 Instruction semantics | validated | Mesen + GPGX |
| 2 Cycle / timing | validated | Mesen |
| 3 Interrupt timing | validated | Mesen |
| 4 Memory / MMIO | validated | Mesen + GPGX |
| 5 Peripherals / audio | validated | GPGX |
| 6 Static-vs-dynamic | validated | intrinsic + GPGX |
| 7 Determinism | validated | intrinsic |

One measurement carries most of that weight: "the VDP memory is produced entirely
by the CPU executing the game. If any instruction, flag, cycle-driven upload, or
MMIO write were wrong, the game's logic would diverge and VRAM would differ. It
does not, byte for byte, vs **two independent emulators**". Those two are Mesen 2
headless and `smsref`, a headless Genesis Plus GX harness never linked into the
shipped runner.

## Known limits

- Whole-game validation is not done, and the repository calls it "The biggest
  honest gap".
- A residual IRQ-accept jitter of about 8.6 cycles per frame is deliberately not
  chased: "Reducing it would be emulator-matching (rejected by PRINCIPLES)."
- The renderer is a full-frame snapshot, so "a game with mid-frame raster effects
  would need a per-scanline renderer". The H-counter is "a clean-room sub-line
  approximation", the `$3E`/`$3F` ports are unmodelled, and zexall has not been
  run.
- The TCP debug surface in `DEBUG.md` is a contract, not an implementation: the
  file calls the rings and server "the *intended* surface", and the runner parses
  no port flag.

## Building a port on top of this

A game repository here is small: a `README.md`, a `build.ps1`, `game.toml`, a
`dispatch_manifest.txt`, screenshots, and the framework as a submodule. Two
exist: [Sonic the Hedgehog (Master System)](/games/sonic-the-hedgehog-sms) and
[Sonic Blast](/games/sonic-blast), the "Primary Game Gear bring-up target
(exercises the GG VDP/palette/stereo path)". Both READMEs carry the clearest
one-line statement of the model in the fleet: the machine code "is translated
**ahead of time** into C and compiled to a native binary, it is not interpreted
at runtime", while "Computed jumps the static analysis can't resolve fall back to
a bundled Z80 interpreter."

## Source

- [mstan/smsggrecomp](https://github.com/mstan/smsggrecomp):
  [`README.md`](https://github.com/mstan/smsggrecomp/blob/main/README.md),
  [`FLAT_STEP.md`](https://github.com/mstan/smsggrecomp/blob/main/FLAT_STEP.md),
  [`ACCURACY.md`](https://github.com/mstan/smsggrecomp/blob/main/ACCURACY.md),
  [`SMS_GG_ACCURACY_BURNDOWN.md`](https://github.com/mstan/smsggrecomp/blob/main/SMS_GG_ACCURACY_BURNDOWN.md),
  [`DEBUG.md`](https://github.com/mstan/smsggrecomp/blob/main/DEBUG.md).
- The emitters and the frontend:
  [`recompiler/src/code_generator.c`](https://github.com/mstan/smsggrecomp/blob/main/recompiler/src/code_generator.c),
  [`recompiler/src/z80_decoder.c`](https://github.com/mstan/smsggrecomp/blob/main/recompiler/src/z80_decoder.c),
  [`recompiler/src/function_finder.c`](https://github.com/mstan/smsggrecomp/blob/main/recompiler/src/function_finder.c),
  [`recompiler/src/main_sms.c`](https://github.com/mstan/smsggrecomp/blob/main/recompiler/src/main_sms.c).
- The runner:
  [`runner/glue.c`](https://github.com/mstan/smsggrecomp/blob/main/runner/glue.c),
  [`runner/video/sms_vdp.c`](https://github.com/mstan/smsggrecomp/blob/main/runner/video/sms_vdp.c),
  [`runner/audio/sn76489.c`](https://github.com/mstan/smsggrecomp/blob/main/runner/audio/sn76489.c).
- The consumer of `--flat-step`:
  [`docs/Z80_STATIC_RECOMP.md`](https://github.com/mstan/segagenesisrecomp/blob/master/docs/Z80_STATIC_RECOMP.md)
  in [mstan/segagenesisrecomp](https://github.com/mstan/segagenesisrecomp).

## Next

- [/docs/platforms/sega-genesis](/docs/platforms/sega-genesis), where this Z80 is
  a coprocessor and flat step output is what it optionally runs.
- [/docs/concepts/timing-models](/docs/concepts/timing-models), for what flat step
  costs.
- [/docs/guides/add-widescreen](/docs/guides/add-widescreen), the enhancement path
  the Genesis sibling documents in detail.
- [/docs/concepts/glossary](/docs/concepts/glossary), for flat step, function
  form, dispatch miss and the exercised path.
