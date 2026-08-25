---
title: "GameCube"
summary: "gcnlle statically recompiles the GameCube boot ROM and models the hardware under it. It calls itself research software that is not ready for ordinary game use."
pageType: "project"
tags: ["GameCube", "Early development", "LLE"]
repos:
  - "https://github.com/mstan/gcnlle"
updated: "2026-08-25"
---

[gcnlle](https://github.com/mstan/gcnlle) recompiles the GameCube's boot ROM, not a game. It is early development by its own description, it is not a general GameCube emulator, and you should not arrive expecting to play anything. It takes the IPL, the mask ROM holding the console's boot stages and system menu, runs it through a static recompiler, and executes the result on top of hand-written device models for the hardware that firmware talks to. Its design document states the aim plainly: "The near-term goal is **not to run games**." The catalogue entry is [/hardware/gamecube](/hardware/gamecube).

## Status, in the project's own words

From the README:

> **Early development:** this is research software, not a general GameCube
> emulator and not ready for ordinary game use. Interfaces, build steps, and
> behavior can change without notice.

Its "Current state" list gives two results, the second carrying its own limit:

> The recompiled IPL reaches and runs its native menu on Windows.

> The real IPL/DI/apploader path reaches the Wind Waker title sailing sequence
> through content-validated native code plus loud interpreter fallback. This
> is an engineering acceptance route, not a whole-game or release claim.

Take the second quote at exactly its stated weight: one route through one title, offered as evidence that the boot chain works end to end, and disclaimed in the same breath. Note also that `docs/DESIGN.md` is stale by its own header, and its status section says nothing boots the IPL yet, which the README contradicts. Read status from the README.

## What recomp, lle and probe mean in this fleet

Three suffixes turn up in repository names across the fleet, and they are not decorative.

A `recomp` project is a static recompiler: guest machine code is translated into ordinary source code ahead of time, then compiled into a native binary. The projects in this fleet emit C. That is the fleet's default shape, and [what static recompilation is](/docs/start/what-is-static-recompilation) explains it from scratch.

An `lle` in the name is a claim about firmware, not about the translation technique. `PRINCIPLES.md` here puts the two in a strict order: "**LLE / static recompilation / native execution is the baseline.** Architect as much of the system that way as you can, and on platforms that recompile their own firmware/BIOS, run that recompiled firmware." High level emulation is permitted only as a deliberate subsystem replacement on top of a proven low-level baseline; as "the **starting point / sole implementation**" it is called "the historical failure mode: it leaves *half an ecosystem*". So a project can be both a static recompiler and low-level throughout, and both of these are. gcnlle recompiles by construction, and [cdirecomp](/docs/platforms/cd-i), named `recomp`, describes its own philosophy as "**LLE (low-level emulation) and static / native-first**".

A `probe` is not a port at all. It is an instrument. It produces no native executable of any guest program, and exists to measure hardware, so an emulator can be checked against silicon instead of against another emulator. [xboxlle-probe](/docs/platforms/xbox) is that.

One caution about names. This repository is `gcnlle` on GitHub, calls itself gcnrecomp in every document it ships, and its design document names its own remote a third way. Use the repository URL for identity. [High level and low level](/docs/concepts/hle-and-lle) argues the distinction in depth.

## The Gekko, and its paired singles

The CPU is an IBM PowerPC 750CXe derivative called Gekko, running at 485 MHz, big-endian. Two things make it not a stock 750: a locked cache, and paired-single floating point. Paired singles are one instruction working on two floats at once. They add a family of `ps_*` arithmetic operations, plus quantized load and store instructions that convert to and from integer formats in flight. The GPU is the fixed-function TEV part, Flipper. The vocabulary used below is in the [glossary](/docs/concepts/glossary).

The recompiler's decoder covers the documented family and nothing beyond it. Primary opcode 4 dispatches on the secondary field, and what is not in this table decodes to `PPC_OP_UNKNOWN`.

From [`recompiler/src/frontend/decoder.c`](https://github.com/mstan/gcnlle/blob/master/recompiler/src/frontend/decoder.c):

```c title="recompiler/src/frontend/decoder.c"
        default: {
            u32 psxo = xo & 0x3Fu;
            switch (psxo) {
            case 6:  decode_psq_x_rt_ra_rb_norc(&inst, PPC_OP_PSQ_LX, raw); break;
            case 7:  decode_psq_x_rs_ra_rb_norc(&inst, PPC_OP_PSQ_STX, raw); break;
            case 38: decode_psq_x_rt_ra_rb_update(&inst, PPC_OP_PSQ_LUX, raw); break;
            case 39: decode_psq_x_rs_ra_rb_update(&inst, PPC_OP_PSQ_STUX, raw); break;
            default: {
                switch (PPC_A_XO(raw)) {
                case 10: decode_a_frt_fra_frb_frc(&inst, PPC_OP_PS_SUM0, raw); break;
                case 11: decode_a_frt_fra_frb_frc(&inst, PPC_OP_PS_SUM1, raw); break;
                case 12: decode_a_frt_fra_frb_frc(&inst, PPC_OP_PS_MULS0, raw); break;
                case 13: decode_a_frt_fra_frb_frc(&inst, PPC_OP_PS_MULS1, raw); break;
                case 14: decode_a_frt_fra_frb_frc(&inst, PPC_OP_PS_MADDS0, raw); break;
                case 15: decode_a_frt_fra_frb_frc(&inst, PPC_OP_PS_MADDS1, raw); break;
                case 23: decode_a_frt_fra_frb_frc(&inst, PPC_OP_PS_SEL, raw); break;
                case 25: decode_a_frt_fra_frb_frc(&inst, PPC_OP_PS_MUL, raw); break;
                case 28: decode_a_frt_fra_frb_frc(&inst, PPC_OP_PS_MSUB, raw); break;
                case 29: decode_a_frt_fra_frb_frc(&inst, PPC_OP_PS_MADD, raw); break;
                case 30: decode_a_frt_fra_frb_frc(&inst, PPC_OP_PS_NMSUB, raw); break;
                case 31: decode_a_frt_fra_frb_frc(&inst, PPC_OP_PS_NMADD, raw); break;
                default: inst.op = PPC_OP_UNKNOWN; break;
```

The runtime implements the quantized loads rather than treating them as plain float loads. Such a load reads one of eight graphics quantization registers, which carries a storage type and a scale exponent, and dequantizes through `ldexp`. Five storage types are supported. A type outside that set raises a program exception and a misaligned float pair raises an alignment exception, so a wrong quantizer is loud instead of quietly wrong.

From [`runtime/src/cpu_glue.c`](https://github.com/mstan/gcnlle/blob/master/runtime/src/cpu_glue.c):

```c title="runtime/src/cpu_glue.c"
static bool psq_access_is_valid(CPUState* cpu, u8 type, u32 ea, u32 cia) {
    if (psq_type_size(type) == 0) {
        ppc_program_exception(cpu, PPC_PROGRAM_ILLEGAL, cia);
        return false;
    }
    if (type == 0 && (ea & 3u) != 0) {
        ppc_alignment_exception(cpu, ea, cia);
        return false;
    }
    return true;
}

static f64 psq_load_value(CPUState* cpu, u32 ea, u8 type, s32 scale) {
    switch (type) {
    case 0: return (f64)f32_value(mem_read32(cpu, ea));
    case 4: return (f64)(f32)ldexp((f64)mem_read8(cpu, ea), -scale);
    case 5: return (f64)(f32)ldexp((f64)mem_read16(cpu, ea), -scale);
    case 6: return (f64)(f32)ldexp((f64)(s8)mem_read8(cpu, ea), -scale);
    case 7: return (f64)(f32)ldexp((f64)(s16)mem_read16(cpu, ea), -scale);
    default: return 0.0;
    }
}
```

So the coverage claim is: the documented paired-single set decodes, and the quantized paths are modelled including their exceptions. The claim that cannot be made is numerical fidelity. The test trees carry a decode-level opcode table and no differential paired-single test against hardware or against the Dolphin oracle.

## The boot chain it targets

The IPL is roughly 2 MB of mask ROM holding both boot stages, the apploader reader, the boot animation, the fonts and the menu, stored scrambled. BS1 runs from mask ROM at `0xFFF00100`, descrambles and hash-verifies BS2 into main memory, and jumps to it. BS2 brings up hardware and shows the menu. `tools/ipl_descramble` produces the plaintext payload the recompiler consumes.

The reason for aiming there is a survey. `docs/DESIGN.md` records checking the other GameCube recompilation projects:

> **Headline finding: none does LLE, and none targets the IPL.** Every one that "boots" does so by *faking* the post-BS2 low-memory state and jumping straight into a **game DOL**, or by reimplementing the SDK. That is precisely the HLE-first shape our principles forbid as a foundation

## The commands

The default build and tests need no firmware, which is the honest place to start.

```sh
./build.sh
ctest --test-dir recompiler/build --output-on-failure
ctest --test-dir runtime/build --output-on-failure
ctest --test-dir tools/ipl_descramble/build --output-on-failure
```

> **You provide this.** Everything past this point needs your own GameCube IPL dump at `bios/ipl.bin`, and the full low-level boot also needs your own DSP IROM and coefficient dumps. The repository ships no firmware. See [the game file you supply](/docs/concepts/the-game-file-you-supply).

With firmware present, `runtime/generate.sh` descrambles the IPL, slices BS2 and drives the recompiler over it. A second configure with `-DGCN_WITH_GENERATED=ON` builds the runtime against the generated C:

```sh
./build.sh
./runtime/generate.sh
cmake -S runtime -B runtime/build-boot -G Ninja \
  -DCMAKE_BUILD_TYPE=RelWithDebInfo -DGCN_WITH_GENERATED=ON
cmake --build runtime/build-boot
GCN_DEBUG_PORT=4380 GCN_WINDOW=1 ./runtime/build-boot/gcn_boot bios/ipl.bin
```

There is no configuration file. The switches are environment variables read by `runtime/src/boot.c` and documented in its header comment: `GCN_GX_BACKEND` picks the renderer, `GCN_DSP_ROM` and `GCN_DSP_COEF` point at the DSP dumps, `GCN_SRAM_FILE` backs the RTC and SRAM, `GCN_BOOT_BS1` selects the true-reset path from the raw scrambled ROM. Two carry warnings: `GCN_RTC_HOST` samples host time at boot and its documentation says "Never set it for oracle-diff runs", and leaving `GCN_BS1_REFERENCE` unset means the BS1 output check "is skipped with a loud notice (never silently assumed to pass)".

## What runs today

The recompiled IPL reaches and runs the console's own menu on Windows. The Wind Waker route reaches the title sailing sequence, on the terms quoted above. What makes a title route legitimate under an LLE-first rule is a strict condition: an ahead-of-time compiled title module may only run once the live bytes in memory match its immutable input, so the accelerator never loads anything itself. From `runtime/include/cpu/title_module.h`:

> The LLE boot path remains the sole authority for loading bytes into guest RAM; this layer only accelerates a PC after those live bytes match the module's immutable input.

Correctness work runs against a patched local Dolphin build as an oracle, for event order and state targets rather than implementation, and the runtime suite is documented as 14 tests. Those pass claims are the repository's own records, not re-tested here. [Co-simulation](/docs/concepts/co-simulation) covers the method.

## Known limits

- No games. This is not a general emulator, and the README says so.
- Paired-single numerical fidelity is unverified, as above.
- Forcing the interpreter floor is not a user-selectable mode: `ISSUES.md` records CPU force-interpreter control as confirmed absent.
- Audio PCM fidelity remains unvalidated, with no capture knob and no reference comparison done.
- The tested host is 64-bit Windows on an AVX2-capable CPU with MSYS2 MinGW64. Treat other hosts as unsupported.
- Two rendering bugs are open: magenta noise on a second attract transition, and the Wind Waker ocean rendering flat solid blue.
- `GXSetDrawDone` throughput is "an unthrottled emulation-capacity proxy, not a measurement of distinct host-presented frames". It is not a frame rate.

## Source

- [mstan/gcnlle](https://github.com/mstan/gcnlle), GPL-3.0.
- [`README.md`](https://github.com/mstan/gcnlle/blob/master/README.md) for status, prerequisites and the build sequence.
- [`PRINCIPLES.md`](https://github.com/mstan/gcnlle/blob/master/PRINCIPLES.md) for the LLE baseline rule quoted above, and [`docs/DESIGN.md`](https://github.com/mstan/gcnlle/blob/master/docs/DESIGN.md) for the Gekko notes, the boot stages and the survey, staleness warning attached.
- [`runtime/src/boot.c`](https://github.com/mstan/gcnlle/blob/master/runtime/src/boot.c) for the environment variables, [`docs/TCP_COMMANDS.md`](https://github.com/mstan/gcnlle/blob/master/docs/TCP_COMMANDS.md) for the debug surface.
- [`ISSUES.md`](https://github.com/mstan/gcnlle/blob/master/ISSUES.md) for open bugs, and [`THIRD_PARTY_NOTICES.md`](https://github.com/mstan/gcnlle/blob/master/THIRD_PARTY_NOTICES.md) for what is borrowed and from whom, a different strategy from cdirecomp's clean-room route that [provenance](/docs/fleet/provenance) sets side by side.

## Next

- [GameCube in the hardware catalogue](/hardware/gamecube), the shorter entry for this console.
- [High level and low level](/docs/concepts/hle-and-lle), the argument this project is a position in.
- [CD-i](/docs/platforms/cd-i), the other firmware-first target.
- [Xbox](/docs/platforms/xbox), the probe, for what the third category looks like.
