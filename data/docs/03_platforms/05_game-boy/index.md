---
title: "Game Boy and Game Boy Color"
summary: "gbrecompiled translates SM83 ROMs into portable C, one file per bank, and backs it with the fleet's most rigorous correctness programme: three legs of verification and five gates that must pass before a divergence report is believed."
section: "platforms"
sectionTitle: "Platforms"
pageType: "project"
tags: ["Game Boy", "Game Boy Color", "SM83", "Cycle exact", "Co-simulation"]
repos:
  - "https://github.com/mstan/gbrecompiled"
  - "https://github.com/mstan/TetrisGBRecomp"
updated: "2026-08-23"
---

[gbrecompiled](https://github.com/mstan/gbrecompiled) is the fleet's Game Boy and Game Boy Color toolchain. It translates a ROM's SM83 machine code into portable C, one file per ROM bank, and links it against a shared runtime library called `gbrt`. The translation is the easy half. The proof is the interesting half: this project carries the fleet's most developed correctness programme, comparing two whole machines cycle by cycle inside one process, behind a ladder of gates that have to pass before anyone believes what the comparison says.

## Status in the project's own words

The build file calls the project a "Static recompiler for Game Boy (DMG/CGB) ROMs" at version 0.0.2. The README gives a compatibility figure with its own caveat attached: "**High Compatibility**: Successfully recompiles **98.9%** of the tested ROM library (1592/1609 ROMs). Recompilation success does not guarantee full playability." Game Boy Color support is real but unfinished: "real Game Boy Color support is implemented and working for representative games, but CGB accuracy work is still in progress."

> **Note.** This repository describes itself as a "**personal development fork**", and its README names [arcanite24/gb-recompiled](https://github.com/arcanite24/gb-recompiled) as the canonical project to use for stable work.

## SM83, one C file per bank

The guest CPU is the SM83, also called the LR35902, and unlike the [Game Boy Advance](/docs/platforms/game-boy-advance) it has one instruction set, which removes a whole class of problem before it starts. "Each ROM bank becomes a separate C file", and calls are what they look like: "**CALL = direct C function calls.** `func_00_0150(ctx)` calls `func_00_0200(ctx)` directly." Every function threads a `GBContext*`, so a whole machine is one struct. Code the analyzer missed falls through to `gb_interpret`, and `gbrecomp --harvest` feeds those addresses back as seeds for the next build. [Telling code from data](/docs/concepts/code-discovery) covers why an analyzer misses code at all.

What is not simple here is time. The programme rests on one claim: "Every remaining co-sim/accuracy divergence reduces to the SAME root: hardware (PPU LY/STAT, timer TIMA/DIV/IF) advances and is sampled/mutated at whole-instruction granularity, not at the exact sub-instruction M-cycle". So the emitter places ticks inside instructions. A read modify write on `(HL)` splits its tick so the read samples one M cycle before the write.

From [`recompiler/src/codegen/c_emitter.cpp`](https://github.com/mstan/gbrecompiled/blob/master/recompiler/src/codegen/c_emitter.cpp):

```cpp title="recompiler/src/codegen/c_emitter.cpp"
    // (HL) read-modify-write emitter. When `split` (cycle-accurate RMW timing),
    // the read and write are separated by a gb_tick so the read samples one
    // M-cycle (4 T) before the write (Gekkio SM83; runtime/include/gb_timing.h);
    // otherwise it stays a single nested statement. `transform` is the modify
    // applied to gb_read8(ctx, ctx->hl).
    auto emit_hl_rmw = [&out](const std::string& transform, bool split) {
        if (split) {
            out << "{ uint8_t __rmw = " << transform
                << "; gb_tick(ctx, 4); gb_write8(ctx, ctx->hl, __rmw); }\n";
        } else {
            out << "gb_write8(ctx, ctx->hl, " << transform << ");\n";
        }
    };
```

The fallback interpreter carries the same policy in its own code, and keeping the two in step is a rule rather than a courtesy: "**Both backends atomically** each phase (interpreter + `c_emitter.cpp`), or the A-vs-B gate splits." [Timing models](/docs/concepts/timing-models) sets this against the fleet's coarser models.

## The cycle exact verification programme

[Co-simulation](/docs/concepts/co-simulation) explains the technique in general. What is specific here is the discipline around it: three legs of evidence, and five gates that qualify the tool before its output counts.

### Three legs

**Coverage ground truth.** Static analysis cannot follow computed control flow, so a mature emulator supplies proof of executability: "By using a mature emulator (PyBoy) to record an execution trace, we can 'seed' our static recompiler with a list of proven entry points, effectively bridging the gap between static and dynamic analysis." `tools/run_ground_truth.py` wraps capture, recompile and verify; the target is "**>99% coverage**", and the residue is expected to be RAM resident code the interpreter handles.

```sh
python3 tools/capture_ground_truth.py roms/pokeblue.gb -o pokeblue_ground.trace --frames 18000 --random
./build/bin/gbrecomp roms/pokeblue.gb -o pokeblue_output --use-trace pokeblue_ground.trace
python3 tools/compare_ground_truth.py --trace pokeblue_ground.trace pokeblue_output
```

**Full state co-simulation.** Two backends step on a shared clock, `ctx->cycles` in T cycles, checkpointed every 456 by default, one scanline. Pairing 1 runs the generated code against the in project interpreter inside one process, which works because both thread a `GBContext*`. Pairing 2 runs it against an embedded SameBoy core. The program counter is left out of the cross backend hash, since the recompiled side only keeps it current at block boundaries, and a control flow split shows up anyway as a differing register or RAM byte. The purpose is not bug hunting but [ratcheting](/docs/concepts/glossary): "the GBC co-sim is a **regression ratchet / correctness guard**", and "A 'no divergence' result here is a **feature, not a null result**".

The hashed surface is split into fourteen named sub hashes, so a mismatch names the guilty subsystem before anyone diffs a byte. Trimming it is forbidden: hashing only the PPU "because we know the CPU is correct" re-creates the blind spot the method exists to remove.

From [`runtime/include/cosim_state.h`](https://github.com/mstan/gbrecompiled/blob/master/runtime/include/cosim_state.h):

```c title="runtime/include/cosim_state.h"
typedef struct {
    uint64_t cpu;      /* GPRs + flags + IME/HALT/STOP/HALT-bug/double-speed latches (NOT pc) */
    uint64_t timer;    /* div_counter + tima_reload_pending */
    uint64_t dma;      /* OAM DMA + CGB HDMA transfer + scheduling micro-state */
    uint64_t serial;   /* serial_transfer struct + serial_cycles_remaining */
    uint64_t mbc;      /* mapper regs + banks + MBC3 RTC registers */
    uint64_t ppu;      /* all GBPPU regs/latches/mode/fetcher/palette RAM (NOT framebuffers) */
    uint64_t apu;      /* all 4 channels' guest internals + NR50/51/52 + frame sequencer */
    uint64_t wram;     /* 8 x 4 KB work RAM */
    uint64_t vram;     /* 2 x 8 KB video RAM */
    uint64_t oam;      /* object attribute memory */
    uint64_t hram;     /* high RAM */
    uint64_t io;       /* I/O register page */
    uint64_t eram;     /* cartridge (battery) RAM */
    uint64_t clock;    /* ctx->cycles — the shared alignment ruler */
} CosimSubHashes;
```

**The fixture scorecard.** Two hang proof harnesses read third party test ROM verdicts. `tools/gate5_sweep.sh` dumps a Blargg style ROM's final frame as a PNG and reads the screen; `tools/mooneye_sweep.sh` reads mooneye's pass signal, "the Fibonacci register magic (PASS = B C D E H L = 03 05 08 0D 15 22)", from a register dump.

### The five gates, in order

| gate | what it proves | status in the repo |
|---|---|---|
| 1 | recomp against recomp is zero: the coordinator is deterministic, host only state excluded | PASS on Tetris |
| 2 | interpreter against interpreter is zero: the second backend is deterministic too | PASS on Tetris |
| 3 | an injected fault halts at the right checkpoint and names the subsystem | PASS on Tetris, all five targets |
| 4 | a full byte compare every N checkpoints agrees with the hash | PASS on Tetris |
| 5 | an independent fixture sweep exposes a ROM whose verdict is PASS but whose state hash splits mid run | STARTED |

The ordering is the point: "Only after 1 to 4 pass do you run **recomp-vs-interp** (pairing 1) and believe its first-divergence report."

Gate 3 is the one to understand. If the comparator quietly stops comparing anything, gates 1, 2 and 4 still report green, so a blind tool looks healthy. Gate 3 corrupts one field in one backend after a chosen checkpoint and requires the tool to halt there and name the owning subsystem: "This is the ONLY gate that catches a silently-blind compare (a parse bug or `None == None` compare passes Gate 1 trivially while catching nothing)... **Never skip it.**"

From [`runtime/include/gbrt.h`](https://github.com/mstan/gbrecompiled/blob/master/runtime/include/gbrt.h):

```c title="runtime/include/gbrt.h"
/* Gate-3 fault-injection target: after checkpoint `inject_at_checkpoint`, one
 * field in context A is perturbed so the tool MUST halt at ~that checkpoint and
 * name the owning subsystem. Proves the tool is not silently blind. */
typedef enum {
    GB_COSIM_INJECT_NONE = 0,
    GB_COSIM_INJECT_WRAM = 1,  /* flip one WRAM byte */
    GB_COSIM_INJECT_PPU  = 2,  /* bump PPU mode_cycles */
    GB_COSIM_INJECT_APU  = 3,  /* flip ch4 LFSR bit */
    GB_COSIM_INJECT_CPU  = 4,  /* flip a bit in register B */
    GB_COSIM_INJECT_TIMER = 5, /* bump div_counter */
} GBCosimInjectTarget;
```

The stance behind all of it is worth stating, because projects rarely write it down: "**'We know subsystem X is correct' is a HYPOTHESIS the co-sim tests.**"

### What the programme found

The first divergence against the SameBoy oracle was not a race and not a subtle sampling offset. Phase 0 extended the oracle to expose its internal 16 bit divider, measured, and found "a **constant +8 DIV-counter phase offset**". Phase 1a traced that to instruction 1, cycle 0: "The entire offset is the **power-on internal divider value**, the divider has advanced 8 T-cycles before the CPU begins the boot ROM." The fix was one line in the power on path, and Phase 1b found CGB the same, so the value was set unconditionally.

Every phase lands the interpreter and the emitter together, then runs one fixed gate set, quoted here verbatim. Its last two entries name procedures rather than single commands.

```sh
# oracle (DMG + CGB) — first-divergence must advance, never regress
tetris.exe    --cosim-oracle --boot-rom dmg_boot.bin --cosim-checkpoints 6000000
megaman_xtreme2.exe --cosim-oracle --boot-rom cgb_boot.bin --cosim-checkpoints 6000000
# pairing + boot gates
python tools/gbc_cosim.py --exe tetris.exe --checkpoints 300      # 8/8, chain 1CB1212F869F05F6
tetris.exe --boot-gate --boot-rom dmg_boot.bin                    # 0 diffs
# A-vs-B baselines (re-pin only on intended behavior change)
python tools/gbc_cosim.py --exe tetris.exe --ab-frames 700 --expect-chain E92927C083145FD7
python tools/gbc_cosim.py --exe megaman_xtreme2.exe --ab-frames 1000 --expect-chain B02E9D35794D298E
# blargg (TRIPWIRE: mem_timing must stay >= current; 03 must stay ok)
build+run mem_timing / mem_timing-2 / instr_timing   (read screens)
# mooneye timer + interrupt subsets (tools/mooneye_sweep.sh)
```

## The game file you supply

You supply the ROM. A per game `valid_crcs` list covers multi version releases, and a title such as [TetrisGBRecomp](https://github.com/mstan/TetrisGBRecomp) gates the file at run time before it will start. [The game file you supply](/docs/concepts/the-game-file-you-supply) is the canonical page for that contract.

> **You provide this.** No ROM is embedded in a generated project. TetrisGBRecomp states it plainly: "The ROM is **not** embedded. On first run the launcher asks for one and gates it against `game_get_expected_crc32()` in `extras.c`".

## The commands

Build the recompiler, then generate a project from a ROM, build it and run it. A ROM needing manual entry points, HRAM overlays or data ranges takes a TOML config, passed with `--config`.

```bash
git clone https://github.com/mstan/gbrecompiled.git
cd gbrecompiled
cmake -G Ninja -B build .
ninja -C build
```

```bash
# Generate C code from a ROM
./build/bin/gbrecomp path/to/game.gb -o output/game

# Build the generated project
cmake -G Ninja -S output/game -B output/game/build
ninja -C output/game/build

# Run
./output/game/build/game
```

The generated executable carries the verification surface: `--cosim` runs the co-simulation and `--cosim-pair` selects the pairing, `--cosim-stride` sets the checkpoint interval, `--cosim-inject` and `--cosim-inject-at` drive Gate 3, `--cosim-audit` drives Gate 4, and `--cosim-oracle` runs against SameBoy.

## What runs today

Gates 1 to 4 pass on Tetris DMG attract, demo gameplay included, with the injected fault halting at the exact checkpoint and naming each subsystem, the APU among them. Performance: "**Tetris 700 frames / 109,671 checkpoints in ~13 s; MMX2 (CGB) 1000 frames / 156,918 checkpoints in ~23 s**", both matched. The caveat is recorded alongside and is the one to carry away: any residual divergence from real hardware that both backends share, such as a bug in a shared timing table, "is invisible to pairing 1 by construction". That is why the SameBoy pairing exists.

On the fixture scorecard of 2026-07-02, every Blargg CPU, interrupt and HALT behavioural test passes, `cpu_instrs` 1 to 11 included, while `mem_timing`, `mem_timing-2` and `oam_bug` still fail subtests. The mooneye timer subset stands at 9 of 13, all four failures clustered on the TIMA overflow to TMA reload window, which localises the remaining timer work to one piece of logic. Two game repositories in the fleet are built on the engine: TetrisGBRecomp and PokemonRedAndBlueRecomp.

## Known limits

- There is no LICENSE file at the repository root, so this page states no license for the project; the only license file in the tree covers a vendored copy of Dear ImGui.
- There is no `tests/` directory, though the build guards one behind a `BUILD_TESTS` option that defaults off. The regression surface is the gate set and the fixture sweeps above.
- `COMPATIBILITY.md` is linked from the README and absent from the tree, so the 98.9% figure has no accompanying report. `ACCURACY.md` is dated 2026-03-17 and disagrees with the July scorecard, listing tests as failing that now pass. Prefer the scorecard.
- `IO_TRACING.md` describes code an engineer is expected to add rather than a shipped feature: the `GB_IO_TRACE` variable and `--io-trace` flag it names could not be found implemented. Treat it as a recipe.
- The remaining memory timing work is parked as "diminishing returns, do NOT resume without a real-game need". The coordinate is recorded anyway, a clean 4 T cycle gap with all divider, PPU and interrupt state matching, and the remaining phases are expected to fix test ROM scores with "~zero player-visible impact".

## Source

Written from [mstan/gbrecompiled](https://github.com/mstan/gbrecompiled):

- [`COSIM_ORACLE.md`](https://github.com/mstan/gbrecompiled/blob/master/COSIM_ORACLE.md), [`CYCLE_EXACT_INITIATIVE.md`](https://github.com/mstan/gbrecompiled/blob/master/CYCLE_EXACT_INITIATIVE.md), the gates, the phase log and the fixed gate set.
- [`GROUND_TRUTH_WORKFLOW.md`](https://github.com/mstan/gbrecompiled/blob/master/GROUND_TRUTH_WORKFLOW.md), [`GATE5_SCORECARD.md`](https://github.com/mstan/gbrecompiled/blob/master/GATE5_SCORECARD.md), the other two legs.
- [`runtime/include/cosim_state.h`](https://github.com/mstan/gbrecompiled/blob/master/runtime/include/cosim_state.h), [`runtime/include/gbrt.h`](https://github.com/mstan/gbrecompiled/blob/master/runtime/include/gbrt.h), the hashed surface and injection targets.
- [`recompiler/src/codegen/c_emitter.cpp`](https://github.com/mstan/gbrecompiled/blob/master/recompiler/src/codegen/c_emitter.cpp), [`runtime/src/interpreter.c`](https://github.com/mstan/gbrecompiled/blob/master/runtime/src/interpreter.c), the two halves of the timing policy.
- [`README.md`](https://github.com/mstan/gbrecompiled/blob/master/README.md), [`GBC.md`](https://github.com/mstan/gbrecompiled/blob/master/GBC.md), [`ISSUES.md`](https://github.com/mstan/gbrecompiled/blob/master/ISSUES.md), status and current disposition.

## Next

- [Game Boy](/hardware/game-boy), the catalogue entry for this console.
- [Proving it with co-simulation](/docs/concepts/co-simulation), the technique this page is one implementation of.
- [Port a game](/docs/guides/port-a-game), the walk from a game file to a running port.
- [Game Boy Advance](/docs/platforms/game-boy-advance), the other half of the family, and a different CPU problem entirely.
