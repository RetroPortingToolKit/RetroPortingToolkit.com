---
title: "Virtual Boy"
summary: "vbrecomp recompiles a cartridge's NEC V810 machine code to C under a rule set that allows no interpreter, no HLE layer and no stubs, with one narrow exception."
pageType: "project"
tags: ["Virtual Boy", "V810", "Stereoscopy", "Oracle"]
repos:
  - "https://github.com/mstan/vbrecomp"
  - "https://github.com/mstan/MarioTennisVirtualBoyRecomp"
updated: "2026-08-25"
---

[vbrecomp](https://github.com/mstan/vbrecomp) is a static NEC V810 to C recompiler, a runtime, and a Beetle VB oracle harness for the Nintendo Virtual Boy. A cartridge's machine code is decoded once at codegen time and emitted as C functions, one per cart function, compiled into the native binary.

Its rule set is the strictest here: no interpreter, no high level emulation layer, and no stubs. There is one narrow exception, and it has to keep proving itself. The games are on [/hardware/virtual-boy](/hardware/virtual-boy).

## Status, in the project's own words

The framework README carries no status banner. It states scope instead: the repository holds the Python recompiler, the runtime skeleton, the TCP debug server, the ring buffers, the hardware simulation and the Beetle VB oracle binary, and "It does NOT contain any game ROM or game-specific generated C."

The shipped claim lives downstream, in [MarioTennisVirtualBoyRecomp](https://github.com/mstan/MarioTennisVirtualBoyRecomp):

> "**Status: Playable.** A full match against the CPU completes without
> crashes. Audio, video, and input are all wired. Pixel-perfect on the
> title/warning screen versus the Beetle VB reference (0 / 86 016 pixels
> differ at zero tolerance)."

> **You provide this.** You supply your own cartridge image. The game repository "does not include or distribute any copyrighted ROM content." The Virtual Boy has no system ROM, so unlike most consoles here there is no BIOS dump to find. The recompiler bakes the expected CRC32 into `vb_game_expected_crc32()` and the runtime refuses to launch on a mismatch.

## The NEC V810

The CPU is the NEC V810 in its NVC variant, a 32-bit RISC part at 20 MHz. [`docs/HARDWARE_NOTES.md`](https://github.com/mstan/vbrecomp/blob/master/docs/HARDWARE_NOTES.md) lists what the recompiler has to encode. There are 32 general registers, with `r0` hardwired to zero, `r29` as the stack pointer and `r31` as the link register. There are 32 system registers, reached only through `LDSR` and `STSR`. PSW carries Z, S, OV and CY plus the floating point flags. And, helpfully for a recompiler, there is **no branch delay slot**. The memory map decodes 27 bits with the high bits mirroring, so the reset vector at `0xFFFFFFF0` folds to `0x07FFFFF0` in cartridge ROM.

Two of those facts show up in generated code. Every Format I arithmetic op sets four flags, and a write to `r0` has to be suppressed or the hardwired zero stops being zero.

From [`recompiler/v810/emitter.py`](https://github.com/mstan/vbrecomp/blob/master/recompiler/v810/emitter.py):

```python title="recompiler/v810/emitter.py"
    if op == 0x01:  # ADD
        body = (f"uint32_t _a=cpu->gpr[{r2}], _b=cpu->gpr[{r1}]; "
                f"uint32_t _r=_a+_b; "
                + (f"cpu->gpr[{r2}]=_r; " if write_dest else "")
                + "cpu->psw_z=(_r==0); cpu->psw_s=(_r>>31)&1; "
                  "cpu->psw_cy=(_r<_a); "
                  "cpu->psw_ov=(((~(_a^_b))&(_a^_r))>>31)&1;")
        return "{ " + body + " }"
```

Generated functions all have the signature `void vb_fn_<va>(CPUState* cpu);`, and what crosses the boundary is the `CPUState` fields plus the bus accessors. That is the fleet's usual split, described in [the recompiler and the runtime](/docs/concepts/recompiler-and-runtime). Dispatch is a loop rather than nested calls. It matches an address to a function, enters that function's leader-routing switch so a resumed dispatch can land on any basic-block leader, and runs until the address returns to the saved link register or the step budget runs out.

## No interpreter, no HLE layer, no stubs

[`CLAUDE.md`](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md) calls itself "the constitution for the Virtual Boy / NEC V810 static recompiler". Three of its rules are flat prohibitions:

> "There is **no V810 interpreter** in this project. Not as a fallback."

> "There is **no HLE layer**. No `bios.c` synthesising what a routine
> "would have produced"."

> "There are **no stubs**. A function is either fully implemented or it
> aborts with a fatal error via `vb_stub_abort(...)`."

That is stricter than its closest siblings. [The PlayStation](/docs/platforms/playstation) and [the Nintendo DS](/docs/platforms/nintendo-ds) toolchains both keep a small interpreter as a fallback for code the guest writes into RAM at run time. vbrecomp refuses even to build one: "Pre-built interpreters become safety blankets and erode the no-interpreter rule." Where the fleet disagrees is [high level and low level](/docs/concepts/hle-and-lle).

The single exception is a **verified-enhancement shadow**, backported from `gbarecomp`. A shadow implementation runs alongside the faithful path, is continuously compared against it, substitutes only after a proven window, reverts loudly when the comparison breaks, and is off by default. The same instinct governs what the project refuses to build: it will not synthesize LED persistence "because we have not measured the decay constant; doing so would be guessing hardware behavior". Two more lines from the constitution: "Unknown is acceptable. Guessing is not." and "Do NOT infer correctness from two broken implementations agreeing."

## What a stub means here

[`STUBS_TO_FIX.md`](https://github.com/mstan/vbrecomp/blob/master/STUBS_TO_FIX.md) defines the word precisely. A stub is any code that returns a made-up value, silently swallows an unmapped access, prints instead of doing the work, or carries a `// TODO` next to control flow. Anything matching that must be listed with a plan to retire it. With no interpreter to fall back to, an unresolved indirect target is fatal.

From [`runtime/src/stub_abort.c`](https://github.com/mstan/vbrecomp/blob/master/runtime/src/stub_abort.c):

```c title="runtime/src/stub_abort.c"
void vb_stub_abort(const char* what, uint32_t pc, uint32_t addr) {
    vb_print_banner(what, pc, addr);
    /* Dump rings if the crash module is linked. The Phase 1 skeleton's
     * weak stub is a no-op; Phase 2 implements the JSON dump. */
    vb_crash_trace_dump_json("vb_last_run_report.json");
    abort();
}
```

That banner is the only sanctioned `fprintf` in the project, and `vb_last_run_report.json` is where you start reading. `debug.ini` carries a `stub_abort_fatal` switch whose own comment says making it non-fatal "violates the no-stubs rule and should never be set false in a committed run". A fatal abort with a ring dump turns a silent wrong-output bug into a filename and an address. See [how changes go wrong here](/docs/agents/failure-modes).

One caution if you are auditing coverage. `STUBS_TO_FIX.md` lists no stubs, but `ISSUES.md` records several deliberate aborting paths, including CAXI and all twelve BSU sub-operations. Those are fatal aborts, not silent stubs, which is why they live in a different document. Read both.

## The stereoscopic display, and what reaches your screen

The Virtual Boy's VIP renders 384 x 224 pixels **per eye** at 50.27 Hz, "stereo via fast-switching mirrors", at 2 bits per pixel. The runtime's `vip.c` is a port of Beetle VB's drawing code, and both eyes are drawn separately with per-object parallax.

So the stereoscopy is real inside the simulated hardware. What it is not is a 3D viewing experience, and the project says so under a heading reading "Out of scope (documented, NOT faked: never guess hardware)":

> "**Stereoscopic dual-eye fusion.** The runtime already renders both eyes
> (`--stereo` stacks them); a true stereoscopic present (anaglyph / per-eye
> HMD / parallax) is a separate present-time feature, not modeled here."

The window defaults to one eye, the left. `--stereo` renders the other eye into the lower half of the same texture. There is no anaglyph and no headset path. Colour is red only, because the hardware is a red-LED scanned-mirror unit and the oracle outputs the same thing. `VBRECOMP_SCREEN` selects `raw`, `led` or `led_warm`, and `raw` is the default so oracle comparisons stay byte-identical.

## The commands

You need Python 3.10 or newer, CMake 3.20 or newer, MSVC 2022 or MinGW-w64, and SDL2. The framework alone builds and runs with no game:

```sh
python -m unittest discover recompiler/tests
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --target vb-runtime
./build/runtime/vb-runtime --port 4390
python tools/_ping.py --port 4390
```

That produces a runtime linked against `no_game_linked.c`: it starts and answers on TCP, "but no cart code is present." With a cartridge image, codegen comes first:

```sh
python -m recompiler.cli.vbrecomp_codegen \
    --rom ../roms/marios_tennis.vb \
    --module marios_tennis \
    --out ../generated/ \
    --seeds-toml ../marios_tennis.toml
```

That writes `<module>_full.c`, `<module>_dispatch.c` and `<module>.h`. `--limit N` recompiles only the first N functions, with anything outside that set aborting at run time.

For correctness work, run the oracle beside the runtime and compare them. That is this project's form of [co-simulation](/docs/concepts/co-simulation):

```powershell
.\build\vbrecomp\runtime\vb-runtime.exe --rom roms\marios_tennis.vb --port 4390 --headless
.\build\vbrecomp\runtime\vb-beetle.exe  --rom roms\marios_tennis.vb --port 4391 --headless
python vbrecomp\tools\_framebuf_diff.py --tolerance 0
```

The runtime serves line-based commands on port 4390 and the oracle serves the matching names on 4391, so a tool switches between implementations by changing a port. Ring buffers are always on: the frame ring holds 36,000 entries, about twelve minutes.

[`TCP.md`](https://github.com/mstan/vbrecomp/blob/master/TCP.md) documents roughly two dozen commands with no handler in `runtime/src/debug_server.c`, among them `first_divergence`, `framebuf_diff` and `step`. Some of that exists as Python tools in `tools/` instead. Trust `debug_server.c`, and see [the TCP debug protocol](/docs/reference/tcp-protocol).

## Known limits

The framework's accuracy work is a seven-axis burndown against the Beetle VB oracle. Terms are in the [glossary](/docs/concepts/glossary).

- The oracle is instruction-accurate, not cycle accurate, so the project states its cycle axis "cannot be GREEN against the oracle *alone*".
- Floating point uses host `float` and the FP exception flags are unmodeled, so V810 floating point is not oracle-exact.
- `docs/INSTRUCTION_STATUS.md` is regenerated from a pipeline stage that was never built, so every row reads `lifted | no` and `emitted | no`. The emitter demonstrably emits C for formats I through VI. Do not read that column as coverage.
- The architecture document still diagrams an SSA IR stage between decode and emission. `recompiler/v810/lifter.py` raises `NotImplementedError`; the emitter consumes decoded instructions directly. `PLAN.md` marks itself historical.
- `LICENSE` is the MIT License, Copyright (c) 2026 Matthew Stanley. The oracle is a separate executable: "The shipped binary contains **none** of beetle-vb's code."

## Source

Written from [vbrecomp](https://github.com/mstan/vbrecomp):

- Rules: [`README.md`](https://github.com/mstan/vbrecomp/blob/master/README.md), [`CLAUDE.md`](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md), [`STUBS_TO_FIX.md`](https://github.com/mstan/vbrecomp/blob/master/STUBS_TO_FIX.md), [`ISSUES.md`](https://github.com/mstan/vbrecomp/blob/master/ISSUES.md).
- Hardware and accuracy: [`VB_ACCURACY_BURNDOWN.md`](https://github.com/mstan/vbrecomp/blob/master/VB_ACCURACY_BURNDOWN.md), [`docs/HARDWARE_NOTES.md`](https://github.com/mstan/vbrecomp/blob/master/docs/HARDWARE_NOTES.md), [`docs/ARCHITECTURE.md`](https://github.com/mstan/vbrecomp/blob/master/docs/ARCHITECTURE.md), [`docs/SHADOW_ENHANCEMENTS.md`](https://github.com/mstan/vbrecomp/blob/master/docs/SHADOW_ENHANCEMENTS.md), [`TCP.md`](https://github.com/mstan/vbrecomp/blob/master/TCP.md).
- Code: [`recompiler/v810/emitter.py`](https://github.com/mstan/vbrecomp/blob/master/recompiler/v810/emitter.py), [`recompiler/v810/lifter.py`](https://github.com/mstan/vbrecomp/blob/master/recompiler/v810/lifter.py), [`recompiler/cli/vbrecomp_codegen.py`](https://github.com/mstan/vbrecomp/blob/master/recompiler/cli/vbrecomp_codegen.py), [`runtime/src/vip.c`](https://github.com/mstan/vbrecomp/blob/master/runtime/src/vip.c), [`runtime/src/stub_abort.c`](https://github.com/mstan/vbrecomp/blob/master/runtime/src/stub_abort.c).
- Downstream: [`README.md`](https://github.com/mstan/MarioTennisVirtualBoyRecomp/blob/master/README.md).

## Next

- [Virtual Boy on the hardware catalogue](/hardware/virtual-boy), for the games.
- [High level and low level](/docs/concepts/hle-and-lle), the argument this project takes the hardest line in.
- [Nintendo DS](/docs/platforms/nintendo-ds), which draws a different line on the same questions.
- [Proving it with co-simulation](/docs/concepts/co-simulation), the oracle discipline behind the claims above.
