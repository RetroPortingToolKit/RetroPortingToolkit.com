---
title: "Virtual Boy"
summary: "vbrecomp recompiles NEC V810 cartridge code to C under a constitution that permits no interpreter, no HLE layer and no stubs, and this page covers the V810, the two eyes it renders but does not fuse, and what happens when a stub aborts."
section: "platforms"
sectionTitle: "Platforms"
pageType: "project"
tags: ["Virtual Boy", "V810", "Stereoscopy", "Oracle"]
repos:
  - "https://github.com/mstan/vbrecomp"
  - "https://github.com/mstan/MarioTennisVirtualBoyRecomp"
updated: "2026-08-23"
---

[vbrecomp](https://github.com/mstan/vbrecomp) is a static NEC V810 to C recompiler, a C and C++ runtime, and a Beetle VB oracle harness for the Nintendo Virtual Boy. A cartridge's machine code is decoded once at codegen time and emitted as C functions, one per cart function, which are compiled into the native binary. What makes this toolchain worth reading even if you never touch a Virtual Boy is its constitution: no interpreter, no high level emulation layer, and no stubs, with one narrow carve-out that has to prove itself continuously. This page covers the V810, that constitution and its escape hatch, the display it renders both eyes of without fusing them, the commands, and the limits. The catalogue entry, with the games, is [/hardware/virtual-boy](/hardware/virtual-boy).

## Status, in the project's own words

The framework README carries no status banner. It states scope instead:

> "This repo holds the **framework**: the Python recompiler, the C/C++
> runtime skeleton, the TCP debug server, the always-on ring buffers
> (wtrace / fntrace / frame ring), the VIP / VSU / IRQ / timer hardware
> simulation, and the Beetle VB libretro-driven oracle binary. It does
> NOT contain any game ROM or game-specific generated C."

The shipped claim lives downstream instead, in [MarioTennisVirtualBoyRecomp](https://github.com/mstan/MarioTennisVirtualBoyRecomp):

> "**Status: Playable.** A full match against the CPU completes without
> crashes. Audio, video, and input are all wired. Pixel-perfect on the
> title/warning screen versus the Beetle VB reference (0 / 86 016 pixels
> differ at zero tolerance)."

> **You provide this.** You supply your own cartridge image. The framework ships no ROM and no game-specific generated C, and the game repository states that it "does not include or distribute any copyrighted ROM content." The Virtual Boy has no system ROM, so unlike most consoles in this fleet there is no BIOS dump to find. The recompiler bakes the expected CRC32 into `vb_game_expected_crc32()` and the runtime refuses to launch on a mismatch.

## The NEC V810

The CPU is the NEC V810 in its NVC variant, a 32-bit RISC part at 20 MHz. From [`docs/HARDWARE_NOTES.md`](https://github.com/mstan/vbrecomp/blob/master/docs/HARDWARE_NOTES.md), the facts the recompiler has to encode: 32 general registers with `r0` hardwired to zero, `r29` as the stack pointer and `r31` as the link register written by `JAL`; 32 system registers including EIPC, EIPSW, FEPC, FEPSW, ECR, PSW, PIR, TKCW, CHCW and ADTRE, reached only through `LDSR` and `STSR`; PSW carrying Z, S, OV and CY, the floating point flags, then ID, AE, EP, NP and a four-bit interrupt level field at bits 16 to 19; six instruction formats, I through VI, plus format VII for floating point and bit-string work; and, helpfully for a recompiler, **no branch delay slot**. Bit-string instructions consume `r26` through `r30` implicitly and are interrupt-restartable. The memory map decodes 27 bits with the high bits mirroring, so the reset vector at `0xFFFFFFF0` folds to `0x07FFFFF0` in cartridge ROM.

Two of those facts show up directly in generated code. Every Format I arithmetic op sets four flags, and a write to `r0` has to be suppressed or the hardwired zero stops being zero.

From [`recompiler/v810/emitter.py`](https://github.com/mstan/vbrecomp/blob/master/recompiler/v810/emitter.py):

```python
    if op == 0x01:  # ADD
        body = (f"uint32_t _a=cpu->gpr[{r2}], _b=cpu->gpr[{r1}]; "
                f"uint32_t _r=_a+_b; "
                + (f"cpu->gpr[{r2}]=_r; " if write_dest else "")
                + "cpu->psw_z=(_r==0); cpu->psw_s=(_r>>31)&1; "
                  "cpu->psw_cy=(_r<_a); "
                  "cpu->psw_ov=(((~(_a^_b))&(_a^_r))>>31)&1;")
        return "{ " + body + " }"
```

The generated functions all have the signature `void vb_fn_<va>(CPUState* cpu);`, and what crosses the recompiler and runtime boundary is `cpu->gpr[N]`, the exploded PSW fields, `cpu->sysreg`, the bus accessors, `cpu->pc`, `cpu->step_budget`, `cpu->halted` and `cpu->yielded`. That is the fleet's usual split, described in [the recompiler and the runtime](/docs/concepts/recompiler-and-runtime). Dispatch is a loop rather than nested calls: it range-matches a PC to a function, enters that function's leader-routing switch so a resumed dispatch can land on any basic-block leader, and runs until the PC returns to the saved link register, the CPU halts, or the step budget is exhausted and the function yields. Instruction cycle costs are tabulated per opcode with the oracle line each constant came from written next to it.

## No interpreter, no HLE layer, no stubs

[`CLAUDE.md`](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md) calls itself "the constitution for the Virtual Boy / NEC V810 static recompiler", to be read "at the start of every session before doing any work". Three of its rules are flat prohibitions:

> "There is **no V810 interpreter** in this project. Not as a fallback."

> "There is **no HLE layer**. No `bios.c` synthesising what a routine
> "would have produced"."

> "There are **no stubs**. A function is either fully implemented or it
> aborts with a fatal error via `vb_stub_abort(...)`."

That is stricter than the closest siblings. [The PlayStation](/docs/platforms/playstation) and [the Nintendo DS](/docs/platforms/nintendo-ds) toolchains both keep a bounded interpreter for code the guest writes into RAM at runtime; vbrecomp refuses even to build one in advance, on the grounds that "Pre-built interpreters become safety blankets and erode the no-interpreter rule." Where the fleet disagrees about all this, and why, is [high level and low level](/docs/concepts/hle-and-lle).

The single carve-out is a **verified-enhancement shadow**, backported from the sibling `gbarecomp`. A shadow implementation runs alongside the faithful path, is continuously diffed against it, substitutes only after a proven window, reverts loudly when the diff breaks, and is off by default: the faithful output stays the canon path and doubles as the shadow's own verify oracle. Two related present-time experiments, a world-index-keyed recolor pack and captured-asset replacement, are similarly opt-in behind `VBRECOMP_OVERRIDES`, and a malformed pack falls back to faithful rather than aborting. The same instinct governs what the project refuses to build: it will not synthesize LED persistence or motion smear "because we have not measured the decay constant; doing so would be guessing hardware behavior". Two more lines from the constitution are worth carrying off this page: "Unknown is acceptable. Guessing is not." and "Do NOT infer correctness from two broken implementations agreeing."

## What a stub means here, and what happens when one fires

The project defines the word precisely, in [`STUBS_TO_FIX.md`](https://github.com/mstan/vbrecomp/blob/master/STUBS_TO_FIX.md): a stub is any code that returns a fabricated value, silently swallows an unmapped access, prints instead of completing the work, or carries a `// TODO`, `// FIXME` or `// for now` comment next to control flow. Anything matching that must be listed in the document with a retiring phase. The dispatch loop's unknown-target arm is the clearest consequence: with no interpreter to tier down to, an unresolved indirect target is fatal.

From [`runtime/src/stub_abort.c`](https://github.com/mstan/vbrecomp/blob/master/runtime/src/stub_abort.c):

```c
void vb_stub_abort(const char* what, uint32_t pc, uint32_t addr) {
    vb_print_banner(what, pc, addr);
    /* Dump rings if the crash module is linked. The Phase 1 skeleton's
     * weak stub is a no-op; Phase 2 implements the JSON dump. */
    vb_crash_trace_dump_json("vb_last_run_report.json");
    abort();
}
```

That banner is the only sanctioned `fprintf` in the whole project, and `vb_last_run_report.json` is where you start reading. `debug.ini` carries a `stub_abort_fatal` switch whose own comment says making it non-fatal "violates the no-stubs rule and should never be set false in a committed run". This is a working honesty mechanism rather than a slogan: a fatal abort with a ring dump converts a silent wrong-output bug into a filename and a PC, which is the failure class [how changes go wrong here](/docs/agents/failure-modes) is about.

One caveat if you are auditing completeness. `STUBS_TO_FIX.md` currently lists no stubs, but `ISSUES.md` records several deliberate aborting paths, including CAXI, all twelve BSU sub-operations, cartridge RAM region 6, cartridge expansion region 4 and reserved region 3. Those are fatal aborts rather than silent stubs, which is why they live in a different document, but read both or you will overestimate coverage.

## The stereoscopic display, and what actually reaches your screen

The Virtual Boy's VIP renders 384 x 224 pixels **per eye** at 50.27 Hz, "stereo via fast-switching mirrors", at 2 bits per pixel with 4 brightness levels. Rendering is column-major, with XPSTTS reporting drawing status and DPSTTS display status, both polled by software; memory holds left and right framebuffers, character RAM, up to 14 background segments, a 32-entry WORLDS table and object groups. The runtime's `vip.c` is a port of Beetle VB's drawing code: a column and block state machine draws 28 eight-row blocks per frame into a 2bpp back framebuffer by walking the 32 world descriptors from 31 down to 0, then flips. Both eyes are drawn separately with per-object parallax, into distinct VRAM bases.

So the stereoscopy is real inside the simulated hardware. What it is not is a 3D viewing experience, and the project says so under a heading reading "Out of scope (documented, NOT faked: never guess hardware)":

> "**Stereoscopic dual-eye fusion.** The runtime already renders both eyes
> (`--stereo` stacks them); a true stereoscopic present (anaglyph / per-eye
> HMD / parallax) is a separate present-time feature, not modeled here."

Concretely: the window defaults to one eye, eye 0, the left. Passing `--stereo` renders eye 1 into the lower half of the same texture, so you get "Show both eyes stacked vertically (L top / R bottom) instead of the single-eye default". There is no anaglyph, no headset path, no side-by-side fusion.

From [`runtime/src/main.cpp`](https://github.com/mstan/vbrecomp/blob/master/runtime/src/main.cpp):

```cpp
            const bool recolor = vb_recolor_active();
            if (recolor) {
                vb_vip_render_framebuffer_recolored(0, &tex_pixels[0]);
                if (stereo) {
                    vb_vip_render_framebuffer_recolored(1,
                        &tex_pixels[VB_RT_EYE_H * VB_RT_EYE_W]);
                }
            } else {
                vb_vip_render_framebuffer(0, &tex_pixels[0]);
                if (stereo) {
                    vb_vip_render_framebuffer(1,
                        &tex_pixels[VB_RT_EYE_H * VB_RT_EYE_W]);
                }
            }
```

Colour is red only, with green and blue forced to zero, because the hardware is a red-LED scanned-mirror unit and the oracle outputs the same thing. The 2bpp value passes through a brightness cache and a gamma table mirroring the oracle's. An opt-in `VBRECOMP_SCREEN` selects `raw`, `led` or `led_warm`, and `raw` is the default precisely so oracle comparisons stay byte-identical.

## The commands

Prerequisites are Python 3.10 or newer, CMake 3.20 or newer, MSVC 2022 or MinGW-w64, and an SDL2 development package. The framework alone builds and runs with no game:

```sh
python -m unittest discover recompiler/tests
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --target vb-runtime
./build/runtime/vb-runtime --port 4390
python tools/_ping.py --port 4390
```

That produces a runtime linked against `no_game_linked.c`: "the runtime starts, the TCP debug server responds, but no cart code is present." With a cartridge image, codegen comes first:

```sh
python -m recompiler.cli.vbrecomp_codegen \
    --rom ../roms/marios_tennis.vb \
    --module marios_tennis \
    --out ../generated/ \
    --seeds-toml ../marios_tennis.toml
```

That writes `<module>_full.c`, `<module>_dispatch.c` and `<module>.h`. `--seeds-toml` supplies extra discovery seeds from `[functions].seeds`, and `--limit N` recompiles only the first N functions in breadth-first order, with anything outside that set aborting at runtime. Two more tools are worth knowing: `vbrecomp-coverage` prints an opcode histogram over a ROM and regenerates `docs/INSTRUCTION_STATUS.md` under `--regen-status`, and `vbrecomp-inspect` disassembles a window at a given PC. The runtime takes `--rom`, `--port`, `--headless`, `--stereo` and `--help`.

For correctness work, run the oracle beside the runtime and diff them, which is this project's form of [co-simulation](/docs/concepts/co-simulation):

```powershell
.\build\vbrecomp\runtime\vb-runtime.exe --rom roms\marios_tennis.vb --port 4390 --headless
.\build\vbrecomp\runtime\vb-beetle.exe  --rom roms\marios_tennis.vb --port 4391 --headless
python vbrecomp\tools\_framebuf_diff.py --tolerance 0
```

## The debug protocol, and where TCP.md runs ahead of the code

The runtime serves line-based commands on localhost port 4390, one command per line, JSON preferred, answering `{"ok":true,...}` or `{"ok":false,"error":"..."}` on a single line, with an 8192 byte command limit and one client at a time. The oracle serves the matching names on 4391, so a tool switches between implementations by changing a port. Ring buffers are always on: the frame ring holds 36,000 entries, about twelve minutes at 50.27 Hz, each with the full register file, VIP, VSU, pad, interrupt and timer state, plus the last executed function name.

Document and code disagree here as they do on the Nintendo DS, but in the opposite direction. [`TCP.md`](https://github.com/mstan/vbrecomp/blob/master/TCP.md) documents roughly two dozen commands that have no handler in `runtime/src/debug_server.c`, among them `first_divergence`, `framebuf_diff`, `memory_diff`, `step`, `run_to_frame`, `write_ram`, `disasm` and `opcode_coverage`, while the Nintendo DS runner answers commands its document omits. Some of the functionality named above exists as Python tools in `tools/` instead. Trust `debug_server.c` for what will answer, and see [the TCP debug protocol](/docs/reference/tcp-protocol) for the shared wire format across the fleet.

## What runs today, and the limits

The public result is the one game repository quoted above; the framework's own accuracy work is organised as a seven-axis burndown against the Beetle VB oracle. Terms used here are defined in the [glossary](/docs/concepts/glossary). The limits worth knowing before you plan work:

- The oracle is instruction-accurate, not cycle or pipeline accurate, so the project states its cycle axis "cannot be GREEN against the oracle *alone*".
- Floating point uses host `float` and the FP exception flags are unmodeled, so V810 floating point is not oracle-exact.
- `docs/INSTRUCTION_STATUS.md` is regenerated from a pipeline stage that was never built, so every row reads `lifted | no` and `emitted | no`. The emitter demonstrably emits C for formats I through VI. Do not read that column as coverage.
- The architecture document still diagrams an SSA IR stage between decode and emission. `recompiler/v810/lifter.py` raises `NotImplementedError`; the emitter consumes decoded instructions directly, with "No IR in-between".
- `PLAN.md` marks itself historical and points at the burndown for maintained status.
- `LICENSE` is the MIT License, Copyright (c) 2026 Matthew Stanley. Unlike the Nintendo DS runner, the oracle stays outside the shipped binary: it is a separate executable built only when its source archive is present, and "The shipped binary contains **none** of beetle-vb's code." The runtime does vendor `Blip_Buffer` from Mednafen for audio output.

## Source

Written from [vbrecomp](https://github.com/mstan/vbrecomp):
[`README.md`](https://github.com/mstan/vbrecomp/blob/master/README.md),
[`CLAUDE.md`](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md),
[`STUBS_TO_FIX.md`](https://github.com/mstan/vbrecomp/blob/master/STUBS_TO_FIX.md),
[`ISSUES.md`](https://github.com/mstan/vbrecomp/blob/master/ISSUES.md),
[`PLAN.md`](https://github.com/mstan/vbrecomp/blob/master/PLAN.md),
[`TCP.md`](https://github.com/mstan/vbrecomp/blob/master/TCP.md),
[`VB_ACCURACY_BURNDOWN.md`](https://github.com/mstan/vbrecomp/blob/master/VB_ACCURACY_BURNDOWN.md),
[`docs/HARDWARE_NOTES.md`](https://github.com/mstan/vbrecomp/blob/master/docs/HARDWARE_NOTES.md),
[`docs/ARCHITECTURE.md`](https://github.com/mstan/vbrecomp/blob/master/docs/ARCHITECTURE.md),
[`docs/SHADOW_ENHANCEMENTS.md`](https://github.com/mstan/vbrecomp/blob/master/docs/SHADOW_ENHANCEMENTS.md),
[`docs/ASSET_CAPTURE.md`](https://github.com/mstan/vbrecomp/blob/master/docs/ASSET_CAPTURE.md),
[`docs/BRINGUP.md`](https://github.com/mstan/vbrecomp/blob/master/docs/BRINGUP.md),
[`docs/INSTRUCTION_STATUS.md`](https://github.com/mstan/vbrecomp/blob/master/docs/INSTRUCTION_STATUS.md),
[`recompiler/v810/emitter.py`](https://github.com/mstan/vbrecomp/blob/master/recompiler/v810/emitter.py),
[`recompiler/v810/lifter.py`](https://github.com/mstan/vbrecomp/blob/master/recompiler/v810/lifter.py),
[`recompiler/cli/vbrecomp_codegen.py`](https://github.com/mstan/vbrecomp/blob/master/recompiler/cli/vbrecomp_codegen.py),
[`runtime/src/vip.c`](https://github.com/mstan/vbrecomp/blob/master/runtime/src/vip.c),
[`runtime/src/main.cpp`](https://github.com/mstan/vbrecomp/blob/master/runtime/src/main.cpp),
[`runtime/src/stub_abort.c`](https://github.com/mstan/vbrecomp/blob/master/runtime/src/stub_abort.c),
and, downstream, [`README.md`](https://github.com/mstan/MarioTennisVirtualBoyRecomp/blob/master/README.md) in MarioTennisVirtualBoyRecomp.

## Next

- [Virtual Boy on the hardware catalogue](/hardware/virtual-boy), for the games and what the ports add.
- [High level and low level](/docs/concepts/hle-and-lle), for the fleet-wide argument this project takes the hardest line in.
- [Nintendo DS](/docs/platforms/nintendo-ds), the other console from the same research pass, drawing a different line on the same questions.
- [Proving it with co-simulation](/docs/concepts/co-simulation), the oracle discipline every claim above rests on.
