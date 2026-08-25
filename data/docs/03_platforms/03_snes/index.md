---
title: "SNES"
summary: "SNESRecomp translates a cartridge's 65816 code into C and links it against a C model of the rest of the console, and this page explains the runtime mode flags that make the 65816 unusually hard to translate ahead of time."
pageType: "project"
tags: ["SNES", "65816", "Static recompilation", "Timing"]
repos:
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/SuperMarioWorldRecomp"
  - "https://github.com/mstan/MegaManXSNESRecomp"
updated: "2026-08-23"
---

[SNESRecomp](https://github.com/mstan/snesrecomp) is a general purpose static recompiler for the Super Nintendo Entertainment System and Super Famicom. It reads a cartridge image you supply, translates the 65816 machine code it finds into C, compiles that C natively, and links it against a shared C model of the rest of the console. Only the main CPU is translated. The PPU, the audio coprocessors, DMA, cartridge mapping and every enhancement chip are modelled in C in the runtime, and a full 65816 interpreter stays live in the shipped binary underneath the compiled code as the correctness floor. The shape of the toolchain follows from one property of that CPU: the 65816 changes the width of its own instructions at runtime, so the same bytes can decode two different ways.

## Alpha software, in the project's own words

> "SNESRecomp is alpha software. Multiple games run through the same shared framework, but APIs, generated-code conventions, and internal integration points can still change."

Per-game maturity varies, and the README treats its Games table and each port's release notes as the authoritative status. The framework is licensed under the **PolyForm Noncommercial License 1.0.0**, with third party components keeping their own licenses. It is also clear about what it is not:

> "SNESRecomp is a **framework**, not a collection of ROMs. It does not include copyrighted game data, and a generated project is only the starting point for a playable port."

> **You provide this.** You supply your own `.sfc` or `.smc` image. See [the game file you supply](/docs/concepts/the-game-file-you-supply).

## The 5A22, and where the boundary is drawn

The guest CPU is the Ricoh 5A22, a 65816 core. Audio is a separate SPC700 processor with its own RAM and its own firmware, paired with the S-DSP sample engine. The split between what is translated and what is simulated is stated exactly:

> "- The runner recompiles ONLY the 65816. The APU (SPC700+S-DSP), PPU, DMA, cart are the
>   shared LakeSnes-lineage interp in `runner/src/snes/` (`apu.c dsp.c spc.c ppu.c dma.c
>   cart.c snes.c`). So A and B share the *device code* by construction"

The Super Mario World port gives the reason a static recompiler could not do otherwise: the PPU "has no instruction stream and the SPC700 is a separate processor with its own firmware that the cartridge uploads to a separate chip." This is emulation and recompilation together, not one instead of the other. Generated code does not run against an emulated bus. It mutates one shared `CpuState`, calls `WriteReg` and `ReadReg` straight into the modelled device, and enters the interpreter bridge for any control transfer the static pass could not resolve. That division is described on [the recompiler and the runtime](/docs/concepts/recompiler-and-runtime).

## The M and X flags

The 65816 carries two status bits no 6502 had. **M** selects an 8-bit or 16-bit accumulator and memory width, **X** does the same for the index registers, and 1 means 8-bit. `SEP` sets them, `REP` clears them, `PHP`, `PLP` and `RTI` save and restore them, `XCE` forces them in emulation mode. They change three things at once: the width of arithmetic and flag derivation, the number of bytes a push or pull moves, and, fatally for a static tool, the encoded length of twelve immediate-mode opcodes. Twelve entries in the opcode table therefore hold a callable instead of a constant.

From [`recompiler/snes65816.py`](https://github.com/mstan/snesrecomp/blob/main/recompiler/snes65816.py):

```python title="recompiler/snes65816.py"
    m_dep = [(0xA9,'LDA'),(0x09,'ORA'),(0x29,'AND'),(0x49,'EOR'),
             (0x69,'ADC'),(0xE9,'SBC'),(0xC9,'CMP'),(0x89,'BIT')]
    x_dep = [(0xA2,'LDX'),(0xA0,'LDY'),(0xE0,'CPX'),(0xC0,'CPY')]

    table = {}
    for op, mn, mode, length in fixed:
        if op not in table:
            table[op] = (mn, mode, length)
    for op, mn in m_dep:
        table[op] = (mn, IMM, lambda m, x, _l=None: 2 if m else 3)
    for op, mn in x_dep:
        table[op] = (mn, IMM, lambda m, x, _l=None: 2 if x else 3)
    return table

_OPCODES = _build_opcode_table()
```

`LDA #imm` is two bytes when M is 1 and three when M is 0. Guess wrong once and the decoder does not merely mistranslate one instruction: every later instruction is read from the wrong offset, and the disassembly quietly becomes fiction. Worse, the state that decides it is not a property of the address, because two callers can reach the same PC with different flags. The decoder module records that as a bug this project already shipped once.

From [`recompiler/v2/decoder.py`](https://github.com/mstan/snesrecomp/blob/main/recompiler/v2/decoder.py):

```python title="recompiler/v2/decoder.py"
Worklist-driven 65816 decoder keyed by (PC, M, X) entry state.

REPLACES THE V1 DECODE BUG: v1's `decode_func` (recomp.py:52-354) tracks
M/X as linear scalars and stores branch-target mode hints in
`pending_flags: Dict[PC, (m, x)]` with explicit last-writer-wins overwrite
(recomp.py:298-300 comment makes this explicit). When two predecessors
reach the same PC with different (m, x), one is silently dropped and that
PC ends up decoded with the wrong mode — which is invalid for 65816
because variable-length immediate operands (LDA #imm in M=1 vs M=0) are
2 bytes vs 3 bytes, so the dropped mode can corrupt every subsequent
instruction's PC offset.

In v2, every instruction is identified by `DecodeKey(pc, m, x)`. Two
predecessors with different mode states produce two distinct
DecodedInsn records at the same PC — both are preserved. Downstream
(v2 cfg / IR / codegen) treats them as two separate blocks.
```

### What the project does about it

An instruction's identity becomes its state rather than its address. The decode key is `DecodeKey(pc, m, x, p_stack)`, where `p_stack` is a shadow stack of `PHP`-pushed mode snapshots, bounded at depth 8, so a `PHP ; SEP #$30 ; ... ; PLP` bracket restores the widths the caller had. A transfer function walks that small lattice, modelling `REP`, `SEP`, `PHP` and `PLP`; the project's own gap document states that `RTI` and `XCE` are not modelled. Because a caller cannot assume a callee preserved the flags, a fixpoint infers each function's exit widths per entry variant.

Code is emitted once per surviving `(m, x)` combination with an `_M<m>X<x>` suffix on the symbol, and every call site switches on the live `cpu->m_flag` and `cpu->x_flag` rather than trusting the static claim. The linked binary carries that as a sorted table with four slots per function boundary.

From [`runner/src/cpu_state.h`](https://github.com/mstan/snesrecomp/blob/main/runner/src/cpu_state.h):

```c title="runner/src/cpu_state.h"
typedef struct DispatchEntry {
    uint32 pc24;
    /* Indexed by ((m_flag & 1) << 1) | (x_flag & 1):
     *   0 = M0X0, 1 = M0X1, 2 = M1X0, 3 = M1X1.
     * NULL = this exact architectural variant remains authoritative LLE.
     * The row itself still marks pc24 as a known function boundary. */
    RecompReturn (*variant[4])(CpuState *);
    /* Bytes embedded after a JSR/JSL and consumed by this callee.  The
     * interpreter bridge uses this to resume a bounced call at the same
     * continuation the decoder selected for compiled callers. */
    uint8 inline_arg_bytes;
} DispatchEntry;
```

A `NULL` slot is a rule, not an omission: "A runtime M/X combination without an exact AOT body dispatches to LLE at the original ROM address. It must not call the "nearest" generated sibling." An always-on tripwire checks it at runtime by reading the decoder's claimed widths back out of the symbol suffix and comparing them to the live flags at every function entry.

The cost is on the record. Width literals are confined to one module behind a lint that fails the test run if any other emitter contains one, because "four structurally-identical width bugs shipped in eight days". A per opcode differential harness, running each recompiled function against one interpreter step from identical randomized state, then found three more bugs of the same family before reaching "**0 divergences across all 239 opcodes (717k checks)**", later extended to 533 opcode variants and 1.599M checks. The machinery also scales further than it looks: with static coverage extensions and `--cfg-roots`, "MMX USA went 32 → 4,552 exact AOT variants".

## The frame and the clock

A frame is not a continuous instruction stream here. It is two sequenced host calls, one running the CPU frame and one rendering and firing the raster interrupt. The consequence is stated without hedging:

> "Real hardware interleaves these **continuously**: the CPU executes instructions
> non-stop; NMI fires at vblank start (~scanline 225) *interrupting whatever
> instruction boundary it lands on*; the raster IRQ fires at scanline `vTimer`
> mid-frame, likewise. The recomp instead runs the whole CPU frame, *then* the
> whole render/IRQ pass — so an interrupt's effects land at a different point in
> the guest's execution than on hardware."

Time is accounted per basic block: one constant add for CPU cycles, and a second, region weighted add for master clocks, which is what paces the SPC700.

From [`recompiler/v2/emit_function.py`](https://github.com/mstan/snesrecomp/blob/main/recompiler/v2/emit_function.py):

```python title="recompiler/v2/emit_function.py"
        _cyc_const = _block_cycle_const(block_per_insn_ir.get(key, []))
        if _cyc_const:
            src.append(f'    cpu->cycles += {_cyc_const};')
            _spd_expr, _spd_const = _block_speed(bank, key.pc)
            if _spd_const is not None:
                src.append(f'    cpu->master_cycles += {_cyc_const * _spd_const};')
            else:
                src.append(f'    cpu->master_cycles += {_cyc_const} * {_spd_expr};')
```

`recompiler/snes_cycles.py` is the single source of truth for those numbers and bakes a generated C header so the runtime cannot drift from the emitter. Per instruction bus cycles come from a published 65816 opcode reference, and a speed map charges 6, 8 or 12 master clocks per access by address region, off a 21.47727 MHz clock. The file is honest that the combiner joining those two layers "is a documented FIRST-CUT model". A faithful interrupt model is designed and not built: the frame model document is marked "**Status: scoped, not yet implemented.**", and the accuracy burndown grades interrupts as NMI frame-accurate and IRQ game-timed, noting that "the runner **never raises an interrupt**". See [timing models](/docs/concepts/timing-models).

## The PPU, the SPC700, and one HLE

The PPU is a scanline rasterizer of bsnes and LakeSnes lineage in `runner/src/snes/ppu.c`, covering "all modes 0-7 + windows + mosaic + sprites" with a dedicated Mode 7 path. The frame is produced in one burst by the game side draw loop, with no free-running dot clock. DMA and HDMA are functionally modelled across 8 modes including indirect HDMA, but stay timing-transparent: the DMA timer is not fed back to the scheduler. Against bsnes on the Super Mario World title screen the burndown records "**100.00% exact pixel match, ZERO of 57,344 pixels different**, sprites included", with the caveat that the attract demo is not yet bit aligned.

Audio is emulated, and it is neither recompiled nor replaced by a host implementation: the SPC700 is instruction-stepped with the canonical per opcode cycle table, and the S-DSP is sample-accurate at 32 kHz with BRR decoding, gaussian interpolation, ADSR and GAIN, echo and FIR, noise and pitch modulation. There is exactly one audio high level replacement, opt-in per game through the `hle_spc_upload` cfg directive, and the Super Mario World cfg records why: at recompiled speed the per byte upload handshake "runs orders of magnitude slower than the watchdog allows". That port's priorities file notes the recompiled upload path is still the default. [High level and low level](/docs/concepts/hle-and-lle) is the rule such exceptions are measured against.

## Enhancement chips

The README's compatibility table is the authority, and the supported coprocessors are instruction level cores rather than command level reimplementations. **Supported:** LoROM, HiROM and FastROM mapping, detected automatically; the Capcom Cx4; Super FX and GSU; DSP-1 and DSP-1B; SA-1, which runs through the same `interp816` core as the main CPU; and MSU-1, opt-in. **Not supported yet:** ExLoROM, ExHiROM and custom mappings; DSP-2, DSP-3 and DSP-4; S-DD1; SPC7110 and its RTC; OBC-1, ST010, ST011, ST018 and S-RTC; BS-X, Sufami Turbo and Super Game Boy adapters.

Super FX is validated against Star Fox, and other Super FX titles "have not yet been qualified individually". DSP-1 uses an instruction level core when firmware is supplied, and otherwise falls back to a firmware-free command model that "stops loudly on an unverified command".

## The commands

The released CLI is self contained and needs no Python or Rust. It turns a ROM into a source project, and the tool states its own expected result: "a static library named `snesrecomp_game`, not a playable executable."

From [`README.md`](https://github.com/mstan/snesrecomp/blob/main/README.md):

```powershell
.\snesrecomp.exe build `
  --rom "C:\Games\My Game\game.sfc" `
  --output "C:\Projects\MyGameRecomp"
```

Getting from there to a port is the per-game work of writing bank cfg files, which declare function boundaries, data regions, indirect dispatch shapes and any overlays. A game repository then regenerates with the manifest driven front end.

From [`tools/v2_emit.py`](https://github.com/mstan/snesrecomp/blob/main/tools/v2_emit.py):

```sh
python snesrecomp/tools/v2_emit.py --rom smw.sfc --cfg-dir recomp --out-dir src/gen \
  --cfg-roots --source-root recomp/widescreen_aot_roots.c --analysis-backend native
```

Alongside it, `tools/v2_analyze.py` and the native Rust `snesrecomp-analyze` write the same analysis manifest, and `tools/tier2_ingest.py` audits the runtime gap manifest and prints paste ready cfg directives without editing a cfg itself, being "Human-in-the-loop BY DESIGN". Verification is `python tests/run_tests.py`, `python tests/v2/run_tests.py`, `bash tests/run_c_tests.sh`, and, with a ROM and a build, `ROM=/path/smw.sfc bash cosim/gates.sh gate1` for the gates on [co-simulation](/docs/concepts/co-simulation).

## What runs today, and what does not

The framework README describes Super Mario World as "Believed playable end to end", A Link to the Past as "Playable through the early dungeon", and Mega Man X as "Fully playable". The [Super Mario World port](https://github.com/mstan/SuperMarioWorldRecomp) says "Current status: believed fully playable" and the [Mega Man X port](https://github.com/mstan/MegaManXSNESRecomp) says "Current status: fully playable". Determinism is measured: two runs produced "**identical WRAM fingerprints on all 588 overlapping attract frames**", with two further titles confirmed the same way.

The limits are equally on the record. The frame model is scoped and unimplemented, so interrupt effects land at frame boundaries and DMA timing is invisible to the scheduler. Sub-frame timing of MMIO writes, the H and V counters and joypad reads is named as the genuinely hard remaining slice. Analysis and materialization are coupled tightly enough that one bank of one title "repeatedly emitted a roughly 200 MB generated-C program" before converging, filed as an open architectural issue. And the internal co-simulation has a stated ceiling: "A clean internal co-sim is not proof that rendering or audio matches hardware because both sides intentionally share those device implementations."

## Source

[snesrecomp](https://github.com/mstan/snesrecomp): [`README.md`](https://github.com/mstan/snesrecomp/blob/main/README.md) for status, chips and the CLI; [`recompiler/v2/decoder.py`](https://github.com/mstan/snesrecomp/blob/main/recompiler/v2/decoder.py) and [`recompiler/snes65816.py`](https://github.com/mstan/snesrecomp/blob/main/recompiler/snes65816.py) for the decode; [`docs/LLE_FIRST_ANALYSIS.md`](https://github.com/mstan/snesrecomp/blob/main/docs/LLE_FIRST_ANALYSIS.md) and [`docs/ABSTRACT_INTERPRETATION_GAPS.md`](https://github.com/mstan/snesrecomp/blob/main/docs/ABSTRACT_INTERPRETATION_GAPS.md) for the contract and its gaps; [`runner/src/cpu_state.h`](https://github.com/mstan/snesrecomp/blob/main/runner/src/cpu_state.h) for dispatch; [`FRAME_MODEL_TIMING.md`](https://github.com/mstan/snesrecomp/blob/main/FRAME_MODEL_TIMING.md) and [`recompiler/snes_cycles.py`](https://github.com/mstan/snesrecomp/blob/main/recompiler/snes_cycles.py) for the clock; [`SNES_ACCURACY_BURNDOWN.md`](https://github.com/mstan/snesrecomp/blob/main/SNES_ACCURACY_BURNDOWN.md), [`SNES_COSIM.md`](https://github.com/mstan/snesrecomp/blob/main/SNES_COSIM.md) and [`ISSUES.md`](https://github.com/mstan/snesrecomp/blob/main/ISSUES.md) for measured fidelity and open problems. Ports: [`SuperMarioWorldRecomp/recomp/bank00.cfg`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/recomp/bank00.cfg) and [`MegaManXSNESRecomp/README.md`](https://github.com/mstan/MegaManXSNESRecomp/blob/main/README.md).

## Next

- [Super Nintendo](/hardware/super-nintendo) is the catalogue side of this toolchain and the ports built on it.
- [High level and low level](/docs/concepts/hle-and-lle) is the rule the interpreter floor and the overlays above are measured against.
- [Co-simulation](/docs/concepts/co-simulation) covers the gates named here and what a clean run does not prove.
- [PlayStation](/docs/platforms/playstation) is where this project's burndown and co-simulation methods come from.
- [Glossary](/docs/concepts/glossary) defines variant, tier down and oracle as this fleet uses them.
