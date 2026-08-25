---
title: "SNES"
summary: "SNESRecomp translates a cartridge's 65816 machine code into C, and the hard part is that the 65816 changes the width of its own instructions while it runs."
pageType: "project"
tags: ["SNES", "65816", "Static recompilation", "Timing"]
repos:
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/SuperMarioWorldRecomp"
  - "https://github.com/mstan/MegaManXSNESRecomp"
updated: "2026-08-25"
---

[SNESRecomp](https://github.com/mstan/snesrecomp) is a static recompiler for the Super Nintendo and Super Famicom. It reads a cartridge image you supply, translates the 65816 machine code it finds into C, compiles that C natively, and links it against a C model of the rest of the console. Only the main CPU is translated. The PPU, the audio coprocessors, DMA, cartridge mapping and every enhancement chip are modelled in C in the runtime. A full 65816 interpreter also stays in the shipped binary, underneath the compiled code, as the correctness floor.

The shape of the toolchain follows from one property of that CPU. The 65816 changes the width of its own instructions while it runs, so the same bytes can decode two different ways.

## Alpha software, in the project's own words

> "SNESRecomp is alpha software. Multiple games run through the same shared framework, but APIs, generated-code conventions, and internal integration points can still change."

Per-game maturity varies, and the README treats its Games table and each port's release notes as the status. The licence is **PolyForm Noncommercial 1.0.0**. The README is also clear about what the project is not:

> "SNESRecomp is a **framework**, not a collection of ROMs. It does not include copyrighted game data, and a generated project is only the starting point for a playable port."

> **You provide this.** You supply your own `.sfc` or `.smc` image. See [the game file you supply](/docs/concepts/the-game-file-you-supply).

## The 5A22, and where the boundary is drawn

The guest CPU is the Ricoh 5A22, a 65816 core. Audio is a separate SPC700 processor with its own RAM and firmware, paired with the S-DSP sample engine. The split between what is translated and what is simulated is stated exactly:

> "- The runner recompiles ONLY the 65816. The APU (SPC700+S-DSP), PPU, DMA, cart are the
>   shared LakeSnes-lineage interp in `runner/src/snes/` (`apu.c dsp.c spc.c ppu.c dma.c
>   cart.c snes.c`). So A and B share the *device code* by construction"

The Super Mario World port gives the reason: the PPU "has no instruction stream and the SPC700 is a separate processor with its own firmware that the cartridge uploads to a separate chip." So this is emulation and recompilation together, not one instead of the other. Generated code changes one shared `CpuState`, calls `WriteReg` and `ReadReg` straight into the modelled device, and enters the interpreter for any jump the static pass could not resolve. See [the recompiler and the runtime](/docs/concepts/recompiler-and-runtime).

## The M and X flags

The 65816 carries two status bits no 6502 had. **M** picks an 8-bit or 16-bit accumulator and memory width. **X** does the same for the index registers. A 1 means 8-bit. `SEP` sets them and `REP` clears them; `PHP`, `PLP` and `RTI` save and restore them.

They change three things at once: the width of arithmetic, the number of bytes a push or pull moves, and, fatally for a static tool, the encoded length of twelve immediate-mode opcodes. So twelve entries in the opcode table hold a function instead of a constant.

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

`LDA #imm` is two bytes when M is 1 and three when M is 0. Guess wrong once and every later instruction is read from the wrong offset. Worse, the state that decides it is not a property of the address: two callers can reach the same address with different flags. The decoder module records that as a bug this project already shipped once.

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

An instruction's identity becomes its state, not just its address. The decode key is `DecodeKey(pc, m, x, p_stack)`, where `p_stack` is a small shadow stack of `PHP`-pushed mode snapshots, so a `PHP ; SEP #$30 ; ... ; PLP` bracket restores the widths the caller had. The project's own gap document says `RTI` and `XCE` are not modelled.

Code is emitted once per surviving `(m, x)` combination, with an `_M<m>X<x>` suffix on the symbol. Every call site switches on the live `cpu->m_flag` and `cpu->x_flag` rather than trusting the static claim.

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

A `NULL` slot is a rule, not an omission: "A runtime M/X combination without an exact AOT body dispatches to LLE at the original ROM address. It must not call the "nearest" generated sibling."

The cost is on the record. Width literals are confined to one module behind a lint, because "four structurally-identical width bugs shipped in eight days". A per opcode differential harness then found three more of the same family before reaching "**0 divergences across all 239 opcodes (717k checks)**", later extended to 1.599M checks.

## The frame and the clock

A frame here is two host calls in sequence: one runs the whole CPU frame, the other renders and fires the raster interrupt. Real hardware does not work that way. On hardware the CPU never stops, and an interrupt lands on whatever instruction boundary it hits. The project says so plainly in `FRAME_MODEL_TIMING.md`: an interrupt's effects land at a different point in the guest's execution than they would on the console.

Time is counted per basic block: one constant add for CPU cycles, and a second, region-weighted add for master clocks, which is what paces the SPC700.

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

`recompiler/snes_cycles.py` is the single source of truth for those numbers, and it bakes a generated C header so the runtime cannot drift from the emitter. A faithful interrupt model is designed and not built: the frame model document is marked "**Status: scoped, not yet implemented.**", and the accuracy burndown notes that "the runner **never raises an interrupt**". See [timing models](/docs/concepts/timing-models).

## The PPU, the SPC700, and one HLE

The PPU is a scanline rasterizer of bsnes and LakeSnes lineage in `runner/src/snes/ppu.c`, covering "all modes 0-7 + windows + mosaic + sprites". Against bsnes on the Super Mario World title screen the burndown records "**100.00% exact pixel match, ZERO of 57,344 pixels different**, sprites included", with the attract demo not yet bit aligned.

Audio is emulated, and it is neither recompiled nor replaced. The SPC700 is stepped instruction by instruction with the canonical cycle table, and the S-DSP is sample-accurate at 32 kHz. There is exactly one audio high level replacement, opt-in per game through `hle_spc_upload`. The Super Mario World config says why: at recompiled speed the per byte upload handshake "runs orders of magnitude slower than the watchdog allows". [High level and low level](/docs/concepts/hle-and-lle) is the rule such exceptions are measured against.

## Enhancement chips

The README's compatibility table is the authority, and the supported coprocessors are instruction level cores rather than command level rewrites. **Supported:** LoROM, HiROM and FastROM mapping; the Capcom Cx4; Super FX and GSU; DSP-1 and DSP-1B; SA-1; and MSU-1, opt-in. **Not supported yet:** ExLoROM, ExHiROM and custom mappings; DSP-2, DSP-3 and DSP-4; S-DD1; SPC7110; OBC-1, ST010, ST011, ST018 and S-RTC; BS-X, Sufami Turbo and Super Game Boy adapters. Super FX is validated against Star Fox, and other Super FX titles "have not yet been qualified individually".

## The commands

The released CLI is self contained. It turns a ROM into a source project, and states its own expected result: "a static library named `snesrecomp_game`, not a playable executable."

From [`README.md`](https://github.com/mstan/snesrecomp/blob/main/README.md):

```powershell
.\snesrecomp.exe build `
  --rom "C:\Games\My Game\game.sfc" `
  --output "C:\Projects\MyGameRecomp"
```

Getting from there to a port is the per-game work of writing bank cfg files, which declare function boundaries, data regions and indirect dispatch shapes. A game repository then regenerates with [`tools/v2_emit.py`](https://github.com/mstan/snesrecomp/blob/main/tools/v2_emit.py):

```sh
python snesrecomp/tools/v2_emit.py --rom smw.sfc --cfg-dir recomp --out-dir src/gen \
  --cfg-roots --source-root recomp/widescreen_aot_roots.c --analysis-backend native
```

Verification is `python tests/run_tests.py`, `python tests/v2/run_tests.py`, `bash tests/run_c_tests.sh`, and, with a ROM and a build, `ROM=/path/smw.sfc bash cosim/gates.sh gate1` for the gates on [co-simulation](/docs/concepts/co-simulation).

## What runs today, and what does not

The framework README describes Super Mario World as "Believed playable end to end", A Link to the Past as "Playable through the early dungeon", and Mega Man X as "Fully playable". The [Super Mario World port](https://github.com/mstan/SuperMarioWorldRecomp) says "Current status: believed fully playable" and the [Mega Man X port](https://github.com/mstan/MegaManXSNESRecomp) says "Current status: fully playable". Determinism is measured: two runs produced "**identical WRAM fingerprints on all 588 overlapping attract frames**", with two further titles confirmed the same way.

The limits are recorded too. The frame model is unimplemented, so interrupt effects land at frame boundaries. Sub-frame timing of MMIO writes and joypad reads is the hard remaining slice. And the internal co-simulation has a stated ceiling: "A clean internal co-sim is not proof that rendering or audio matches hardware because both sides intentionally share those device implementations."

## Source

[snesrecomp](https://github.com/mstan/snesrecomp):

- Status, chips and the CLI: [`README.md`](https://github.com/mstan/snesrecomp/blob/main/README.md).
- Decode and dispatch: [`recompiler/v2/decoder.py`](https://github.com/mstan/snesrecomp/blob/main/recompiler/v2/decoder.py), [`recompiler/snes65816.py`](https://github.com/mstan/snesrecomp/blob/main/recompiler/snes65816.py), [`runner/src/cpu_state.h`](https://github.com/mstan/snesrecomp/blob/main/runner/src/cpu_state.h), [`docs/ABSTRACT_INTERPRETATION_GAPS.md`](https://github.com/mstan/snesrecomp/blob/main/docs/ABSTRACT_INTERPRETATION_GAPS.md).
- The clock: [`FRAME_MODEL_TIMING.md`](https://github.com/mstan/snesrecomp/blob/main/FRAME_MODEL_TIMING.md), [`recompiler/snes_cycles.py`](https://github.com/mstan/snesrecomp/blob/main/recompiler/snes_cycles.py).
- Measured fidelity and open problems: [`SNES_ACCURACY_BURNDOWN.md`](https://github.com/mstan/snesrecomp/blob/main/SNES_ACCURACY_BURNDOWN.md), [`SNES_COSIM.md`](https://github.com/mstan/snesrecomp/blob/main/SNES_COSIM.md), [`ISSUES.md`](https://github.com/mstan/snesrecomp/blob/main/ISSUES.md).
- Ports: [`SuperMarioWorldRecomp/recomp/bank00.cfg`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/recomp/bank00.cfg), [`MegaManXSNESRecomp/README.md`](https://github.com/mstan/MegaManXSNESRecomp/blob/main/README.md).

## Next

- [Super Nintendo](/hardware/super-nintendo), the catalogue side of this toolchain.
- [High level and low level](/docs/concepts/hle-and-lle), the rule the interpreter floor is measured against.
- [Co-simulation](/docs/concepts/co-simulation), for the gates named here and what a clean run does not prove.
- [Glossary](/docs/concepts/glossary), for variant, tier down and oracle.
