---
title: "Game Boy Advance"
summary: "gbarecomp turns a cartridge's ARM7TDMI machine code into C++, and the hard part is interworking: a GBA game switches between two instruction sets while it runs."
pageType: "project"
tags: ["Game Boy Advance", "ARM7TDMI", "Interworking", "Recompiler"]
repos:
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/MinishCapRecomp"
  - "https://github.com/Shy/BoktaiRecomp"
updated: "2026-08-25"
---

[gbarecomp](https://github.com/mstan/gbarecomp) is this fleet's Game Boy Advance toolchain. It reads a cartridge image you supply, finds the functions in its compiled machine code, and writes them out as C++ split across many files. That compiles into a native SDL2 program, linked against a GBA hardware runtime. The games are on the catalogue page, [/hardware/game-boy-advance](/hardware/game-boy-advance).

The GBA is harder than most targets here because of its processor. The ARM7TDMI runs two instruction sets, 32 bit ARM and 16 bit Thumb, and a game switches between them while it runs. A static recompiler has to know which set it is looking at before it can translate a byte, and it has to preserve every switch in generated code that has no program counter of its own.

## Status in the project's own words

The README opens with the scope: "**A general-purpose static recompiler for the Game Boy Advance.** GBARecomp translates ARM7TDMI ARM and Thumb machine code into C++, compiles it into a native application, and links it against a shared GBA hardware runtime."

It is equally direct about the titles built on it: "These projects are experimental previews and byproducts of developing the framework. The games are the proving ground; the reusable recompiler and hardware runtime are the larger goal."

The framework is licensed under the PolyForm Noncommercial License 1.0.0.

## One CPU, two instruction sets

`PRINCIPLES.md` states the rule the rest of the design follows: "The ARM7TDMI is a single CPU that switches between ARM (32-bit) and THUMB (16-bit) instruction sets at runtime via `BX`, `BLX`, mode changes, and exception entry. Treat it as one CPU, not two." It also rules out the shortcut: "Do **not** assume THUMB-only. Real GBA games (including Minish Cap) use ARM for IWRAM hot paths and IRQ handlers."

### A function is an address and a mode

Both instruction sets share one address space, so an address alone does not name a function. Discovery keys functions on the pair `(addr, mode)` "so ARM and THUMB can coexist at the same address", and the generated name carries the mode: `afunc_AAAAAAAA` for ARM, `tfunc_AAAAAAAA` for Thumb. The dispatch table carries the same bit, so the lookup matches on two fields, not one.

From [`src/armv4t/runtime_arm.cpp`](https://github.com/mstan/gbarecomp/blob/main/src/armv4t/runtime_arm.cpp#L781-L784):

```cpp title="src/armv4t/runtime_arm.cpp"
    for (unsigned i = lo; i < len && table[i].addr == pc; ++i) {
        if ((table[i].thumb != 0) == thumb) return &table[i];
    }
    return nullptr;
```

The entry point that reaches that lookup after a branch and exchange is short enough to read whole. Bit 0 of the target picks the instruction set.

From [`src/armv4t/runtime_arm.cpp`](https://github.com/mstan/gbarecomp/blob/main/src/armv4t/runtime_arm.cpp#L836-L842):

```cpp title="src/armv4t/runtime_arm.cpp"
extern "C" void runtime_dispatch_with_exchange(uint32_t target_pc) {
    // Bit 0 of target indicates THUMB.
    if (target_pc & 1u) g_cpu.cpsr |= CPSR_T_BIT;
    else                g_cpu.cpsr &= ~CPSR_T_BIT;
    runtime_trace_event(RUNTIME_TRACE_EXCHANGE, target_pc & ~1u, target_pc, 0, 0);
    runtime_dispatch(target_pc);
}
```

### The order of the mode flag and the tick

Emitting a `BX` means doing three things: writing the target to the program counter with bit 0 cleared, setting or clearing the CPSR T bit from bit 0, and charging the instruction's cycle cost to the clock.

gbarecomp charges a whole instruction with one `runtime_tick` at the instruction boundary, the coarse end of the fleet's [timing models](/docs/concepts/timing-models). That tick is where interrupts are delivered, so the order matters. Suppose the tick ran between the new program counter and the new mode flag. An interrupt taken inside it would save a return address from one instruction set next to a mode bit from the other. The machine would then resume decoding at the wrong width. So the generator commits both halves of the state first, and says why.

From [`src/armv4t/arm_codegen.cpp`](https://github.com/mstan/gbarecomp/blob/main/src/armv4t/arm_codegen.cpp#L708-L741):

```cpp title="src/armv4t/arm_codegen.cpp"
        case IrOp::BX: {
            std::string sfx = uniq_suffix(ins);
            std::string target_var = "_bxt" + sfx;
            body << indent << "uint32_t " << target_var << " = "
                 << read_reg_expr(ins.rm, ins) << ";\n";
            body << indent << "g_cpu.R[15] = " << target_var << " & ~1u;\n";
            // Commit the complete architectural branch state before ticking.
            // runtime_tick may deliver an IRQ, whose SPSR/return PC snapshot
            // must never observe the BX destination paired with the old
            // instruction-set mode.
            body << indent << "if (" << target_var
                 << " & 1u) g_cpu.cpsr |= CPSR_T_BIT; else g_cpu.cpsr &= ~CPSR_T_BIT;\n";
            // BX always transfers; tick its cost before either the C-return
            // or the dispatch path (both exit the function).
            body << indent << "runtime_tick(" << cyc_var_for(ins) << ");\n";
            // [snip] the rest of the case splits `bx lr`, a plain C return in
            // the direct-call model, from every other BX, which leaves through
            // runtime_dispatch_with_exchange.
```

Not every write to the program counter exchanges. An `LDM` or `POP` into it forces bit 0 clear on ARMv4T, and a plain `MOV pc, Rn` keeps the current mode, so discovery reads a computed target's mode from bit 0 for `BX` alone.

### Jump tables get a verdict per table

Discovery meets the same problem one level up. A table of code pointers may hold ARM targets, Thumb targets or both, and nothing in the table says which. So the finder reaches a verdict per table.

An indexed load only becomes a jump table once a later instruction actually branches through it, and how it branches sets the rule. A `BX` means interwork on bit 0 of each entry. A `MOV pc, dest` means every entry keeps the current mode. Even then the finder wants evidence: it calls a table interworking only when at least two entries have bit 0 set and those cover half the unique targets or more. A table that meets neither test is left alone rather than guessed at.

Where the machine cannot decide, a person writes the verdict into the game's TOML. A `[[jump_table]]` record takes `addr`, `stride`, `count`, a `format` of `abs32`, `abs16`, `pcrel_thumb` or `pcrel_arm`, and an `entries_mode` of `"arm"`, `"thumb"` or `"auto"`. Auto is the interworking case.

## The rest of the hardware, and the BIOS rule

`src/gba/` models everything around the CPU: bus, PPU, audio, DMA, timers, IRQ, save chips, GPIO, gyro, solar sensor and real time clock. The BIOS is not modelled at all. It is recompiled and dispatched like any other code, "not stubbed, not HLE'd", and adding new SWI behaviour to the runtime is forbidden because "The behavior is in the recompiled BIOS bytes."

An address with no generated body is a [dispatch miss](/docs/concepts/glossary). It is served by a healed native overlay cache, or by a logged interpreter bridge, so a missed address becomes a slow moment and a log entry rather than a crash. Both count against the run's fully static verdict. [Telling code from data](/docs/concepts/code-discovery) explains why misses happen.

## The game file you supply

You provide the cartridge image and, for a playable build, your own GBA BIOS dump. Generated code is keyed to exact opcodes at exact addresses, so a patched or trimmed image is a different program and is rejected. See [the game file you supply](/docs/concepts/the-game-file-you-supply).

> **You provide this.** `MinishCapRecomp/baserom.md` puts it plainly: "We do **not** ship the ROM or the BIOS. You must provide your own dumps of both", and "The runner refuses to launch unless **both** verify."

[BoktaiRecomp](https://github.com/Shy/BoktaiRecomp) shows why it has to be the exact file. Sensor patched dumps of Boktai circulate, and they "replace the cartridge photodiode reads with a constant, so the game no longer talks to the hardware this project emulates". The solar sensor the port exists to model goes inert. Such a dump fails the hash gate, "which is the intended behaviour."

## The commands

Build the framework from source and run its tests:

```sh
git clone --recurse-submodules https://github.com/mstan/gbarecomp.git
cd gbarecomp
cmake -S . -B build
cmake --build build
ctest --test-dir build
```

`gba_scan` reports a ROM's header and save chip as one `key=value` per line. `gba_recompile` then has two mutually exclusive modes, cart and BIOS, and cart output is never one file: "Monolithic cart output is prohibited."

```sh
gba_scan roms/game.gba
gba_recompile --rom roms/game.gba --config game.toml --symbols symbols/game_symbols.tsv --out generated --codegen-shards 32
gba_recompile --bios bios/gba_bios.bin --config bios/gba_bios.toml --out src/runtime/generated_bios
```

The released Python CLI wraps that core and writes a buildable project in one step:

```powershell
.\gbarecomp.exe build `
  --rom "C:\Games\MyGame.gba" `
  --output "C:\Projects\MyGameRecomp"
```

A generated title is an SDL2 program, and the BIOS acceptance gate is a frame differ driven over TCP against an oracle emulator:

```sh
./MinishCapRecomp --bios bios/gba_bios.bin --rom roms/minish_cap.gba --view-width 320 --screen frontlit
python oracle/diff_frame.py --scan 1 240 1
```

## What runs today

Ten GBA title repositories carry a `baserom.md` identity document: Minish Cap, Mega Man Zero, Mario Kart Super Circuit, Super Mario Advance 2 and 4, Shrek GBA Video, three Dragon Ball Z titles and Boktai. Four more are named by the framework README: WarioWare: Twisted!, FireRed and LeafGreen, Ruby and Sapphire, and Emerald.

Adaptive widescreen here is "a genuinely wider logical view, not a stretch, crop, or zoom". It grows the logical width from 240 toward a per game validated maximum, keeping the authentic 160 lines. It is opt in three times over: by the engine, the game and the launcher. The default in every build is the faithful 240 by 160 view. The project's measure of done for a title is the coverage banner reading `self_heal_coverage=FULLY_STATIC`.

## Known limits

- The game builds are "experimental preservation and research previews, not finished commercial ports". Generating source is not a port: a playable integration "still needs verified function coverage, a host application, cartridge configuration, and game-specific validation."
- [Co-simulation](/docs/concepts/co-simulation) here is a design document, not a built tool. `COSIM_ORACLE.md` is a plan with "no engine code yet". The [Game Boy toolchain](/docs/platforms/game-boy) has a built version of the same idea.
- Two documents disagree with the tree. `docs/ARCHITECTURE.md` still calls the BIOS interpreted and `gba_recompile` a stub, and `TCP.md` documents a `--reverse-debug` flag the argument parser does not accept.
- The Pokémon FireRed widescreen sidecar in `docs/WIDESCREEN_STEPC_PLAN.md` does not arm unless `GBARECOMP_WS_WIP=1` is set. It is not shipped.

## Source

Written from [mstan/gbarecomp](https://github.com/mstan/gbarecomp):

- [`README.md`](https://github.com/mstan/gbarecomp/blob/main/README.md) and [`PRINCIPLES.md`](https://github.com/mstan/gbarecomp/blob/main/PRINCIPLES.md), status and the interworking, BIOS and coverage rules.
- [`src/armv4t/arm_codegen.cpp`](https://github.com/mstan/gbarecomp/blob/main/src/armv4t/arm_codegen.cpp), [`src/armv4t/runtime_arm.cpp`](https://github.com/mstan/gbarecomp/blob/main/src/armv4t/runtime_arm.cpp), [`src/recompile/function_finder.cpp`](https://github.com/mstan/gbarecomp/blob/main/src/recompile/function_finder.cpp), interworking and the jump table verdict.
- [`docs/TOML_SCHEMA.md`](https://github.com/mstan/gbarecomp/blob/main/docs/TOML_SCHEMA.md) and [`tools/gba_recompile/main.cpp`](https://github.com/mstan/gbarecomp/blob/main/tools/gba_recompile/main.cpp), configuration and the CLI; [`TCP.md`](https://github.com/mstan/gbarecomp/blob/main/TCP.md) and [`DEBUG.md`](https://github.com/mstan/gbarecomp/blob/main/DEBUG.md), the debug transport.
- [`MinishCapRecomp/baserom.md`](https://github.com/mstan/MinishCapRecomp/blob/main/baserom.md) and [`BoktaiRecomp/baserom.md`](https://github.com/Shy/BoktaiRecomp/blob/main/baserom.md), the game file contract.

## Next

- [Game Boy Advance](/hardware/game-boy-advance), the catalogue entry for this console.
- [Telling code from data](/docs/concepts/code-discovery), the problem behind jump table verdicts and dispatch misses.
- [Port a game](/docs/guides/port-a-game), the walk from a game file to a running port.
- [Game Boy and Game Boy Color](/docs/platforms/game-boy), the other half of the family.
