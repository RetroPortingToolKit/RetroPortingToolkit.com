---
title: "PlayStation"
summary: "psxrecomp translates a PS1 game's compiled MIPS code, and a whole PS1 BIOS, into C, then picks between three tiers at every jump: compiled code first, an interpreter last."
pageType: "project"
tags: ["PlayStation", "MIPS R3000A", "GTE", "Overlays"]
repos:
  - "https://github.com/mstan/psxrecomp"
updated: "2026-08-25"
---

[psxrecomp](https://github.com/mstan/psxrecomp) reads the compiled MIPS R3000A machine code inside a PlayStation 1 game, and inside a PS1 BIOS image, and translates it into C at build time. That C compiles into a native program, linked against a runtime that models the console's hardware. Some PS1 code is not visible at build time, because the game streams it off the disc while you play. psxrecomp catches that code as it arrives, compiles it in the background, and caches it. You supply the disc image. The games are on [/hardware/playstation](/hardware/playstation).

## Status, in the project's own words

From [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md):

> "The LLE recompiled BIOS — either bundled OpenBIOS or the compatible retail
> backend — boots and hands off to the game across supported projects. Games
> run as majority-native code, with the capture-and-compile pipeline filling
> overlays as they're reached. The breadth-first push is essentially done; work
> now is depth and optimization."

And on how much of a game is native:

> "Today a *majority* of a supported game runs as statically recompiled native
> code, but **not yet 100%.**"

The README also says: "Not an emulator: the game becomes a program your CPU runs directly". That is the project's own wording and the goal it aims at. The picture is a little wider. The same runtime ships a small MIPS interpreter and can run an optional high level BIOS layer. So static recompilation is not emulation, but this port does embed a small emulator as a fallback. [Is this emulation](/docs/start/is-this-emulation) works through the question.

The framework is under the [PolyForm Noncommercial License 1.0.0](https://github.com/mstan/psxrecomp/blob/master/LICENSE), Copyright (c) 2026 Matthew Stan. OpenBIOS is MIT, the vendored TinyCC LGPL-2.1.

> **You provide this.** You supply the disc image, and a BIOS dump if you want a retail kernel instead of the bundled OpenBIOS. Generated source "is derived from your files, so do not redistribute it". See [the game file you supply](/docs/concepts/the-game-file-you-supply).

## The CPU, and what one instruction costs

The guest CPU is the MIPS R3000A, with COP0, the system control coprocessor, and COP2, the GTE geometry engine. The host target is x64. The repository holds two CMake projects: `recompiler/` writes C into `generated/`, and `runtime/` models the hardware and links that C as native functions. See [the recompiler and the runtime](/docs/concepts/recompiler-and-runtime).

One load shows what translation costs. From [`recompiler/src/strict_translator.cpp`](https://github.com/mstan/psxrecomp/blob/master/recompiler/src/strict_translator.cpp):

```cpp title="recompiler/src/strict_translator.cpp"
    // LW rt, simm16(rs) -- 32-bit word load (addr must be 4-aligned)
    if (opcode == 0x23) {
        const uint8_t rs = (d.raw >> 21) & 0x1F;
        const uint8_t rt = (d.raw >> 16) & 0x1F;
        const int32_t simm = static_cast<int32_t>(static_cast<int16_t>(d.raw & 0xFFFF));
        const uint32_t mask = 1u << rs;
        r.supported = true;
        const std::string body = (rt == 0)
            ? fmt::format("(void)psx_cyc_load_word(cpu, psx_addr, 0, 0x{:X}u);", mask)
            : fmt::format("cpu->gpr[{}] = psx_cyc_load_word(cpu, psx_addr, {}, 0x{:X}u);",
                          static_cast<int>(rt), static_cast<int>(rt), mask);
        r.c_code = fmt::format(
            "{{ uint32_t psx_addr = (uint32_t)((int32_t)cpu->gpr[{}] + ({})); "
            "if (psx_addr & 3u) {{ psx_unaligned_access(cpu, psx_addr, 0x{:08X}u); return; }} "
            "{} }}",
            static_cast<int>(rs), simm, d.address, body);
        // [snip]
        r.comment = fmt::format("lw {}, {}({})", gpr_name(rt), simm, gpr_name(rs));
```

One guest `lw` becomes an address computation, an alignment trap and a cycle-charged load. The lines cut at `// [snip]` emit the same load again into a local variable, because the R3000A does not commit a load's value until the next instruction has run. A write to `$zero` becomes a comment, since it does nothing on hardware.

Generated C never touches host memory. It reads guest registers on a `CPUState*` and reaches guest memory only through function pointers on that struct, which is why the same C works in the main binary, in a compiled overlay, and under the interpreter.

## Three tiers, and a fallback that is slow, not wrong

[`docs/EXECUTION_MODEL.md`](https://github.com/mstan/psxrecomp/blob/master/docs/EXECUTION_MODEL.md) names three tiers in strict order: statically recompiled code, then a compiled native overlay, then the interpreter.

A jump enters the emitted trampoline, which searches the static dispatch table. A hit runs a function compiled ahead of time. A miss goes to `dirty_ram_dispatch`, which tries the overlay loader first and interprets only if that fails.

The interpreter is narrow on purpose. It runs one basic block at a time, and only for code installed while the console is running. It never runs the BIOS or the main game path, and it runs the game's own instructions, so nothing is faked.

Each tier below the first is slower than the one above it, and none is less faithful. A missed instruction becomes a slow moment, not a crash. The README says it in one line:

> "**The worst case is always performance, never correctness** — anything not yet
> native simply runs interpreted, correctly."

The overlay tier follows the same rule: compiled code runs only while the live bytes in RAM still match the bytes it was compiled from. [Code you cannot see ahead of time](/docs/concepts/code-you-cannot-see-ahead-of-time) covers that mechanism.

## The BIOS, and the layer above it

A build links every recompiled BIOS it ships and picks one at launch. From the README:

> "Whichever one the player selects runs as the kernel; that **low-level (LLE)
> recompiled BIOS is the foundation and the correctness oracle.** Everything is
> architected LLE-first: accuracy comes first, and convenience is layered on top,
> opt-in, never underneath."

Above it sits an opt-out high level tier: one function pointer returning a boolean. The trampoline asks it first. A nonzero return means the service is done; a zero return falls through to the recompiled BIOS. It covers six B0 kernel calls and nothing else, so threads, pads and the card and CD stacks all fall through. [`CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md) records the result: "With HLE off the build is byte-identical to a build without the tier." [High level and low level](/docs/concepts/hle-and-lle) has both sides of the argument.

## What the PlayStation adds

### The GTE

COP2 is the geometry transform engine. Every GTE command goes through one runtime call, carrying the full 25-bit command word. From [`recompiler/src/strict_translator.cpp`](https://github.com/mstan/psxrecomp/blob/master/recompiler/src/strict_translator.cpp):

```cpp title="recompiler/src/strict_translator.cpp"
        if (cop_op & 0x10) { // GTE command (bit 25 set)
            uint32_t gte_cmd = d.raw & 0x1FFFFFF;
            r.supported = true;
            r.c_code = fmt::format(
                "gte_execute(cpu, 0x{:07X});",
                gte_cmd);
            r.comment = fmt::format("gte cmd 0x{:02X}", gte_cmd & 0x3F);
            return r;
        }
```

Keeping the whole word matters, because two flags live inside it. [`GTE_LM_FIX.md`](https://github.com/mstan/psxrecomp/blob/master/GTE_LM_FIX.md) records what happened when the runtime ignored them. The helpers hardcoded `lm = 1`, which clamps results to zero or above. Hardware reads `lm` from bit 10, and `lm = 0` keeps negative values. Crash Bash animates vertices with `INTPL` and `lm = 0`, so character models collapsed. One funnel meant one fix.

### The renderers

Three backends sit behind one interface.

| Backend | Source | Status, in the repository's words |
|---|---|---|
| Software | `runtime/src/gpu_sw_renderer.c` | CPU rasterizer, "the reference look, and the most portable fallback" |
| OpenGL | `runtime/src/gpu_gl_renderer.c` | "**Default.** GPU-authoritative VRAM/FBO renderer", falling back to software if GL initialisation fails |
| Vulkan | `runtime/src/gpu_vk_renderer.c` | "**Experimental.** Built when the SDK is present, opt-in at runtime; falls back to OpenGL if unavailable." |

### Widescreen

Widescreen lives in psxrecomp's own GTE and GPU, not in a renderer, so it covers generated code, the interpreter and compiled overlays the same way. [`WIDESCREEN.md`](https://github.com/mstan/psxrecomp/blob/master/WIDESCREEN.md) calls the default `aspect_ratio` of `4:3` "a mathematical identity", and that is exact: the squash factor is 1, the multiply is skipped, and `psx_ws_x_margin()` returns 0. [Add widescreen](/docs/guides/add-widescreen) covers the per-game work.

## The commands

The end-user tool generates a whole project from a disc image plus a BIOS dump. All three flags are required, and `--disc` takes `.cue`, `.bin`, `.iso` or `.chd`:

```sh
psxrecomp build --disc /games/mygame.cue --bios /bios/SCPH1001.BIN --output /projects/MyGameRecomp
```

The repository calls the result "a practical starting point, not a promise that every game works without game-specific fixes". Building from source takes four steps. Step 2 is the one people miss:

```sh
git clone https://github.com/mstan/psxrecomp.git && cd psxrecomp

# 1. Recompiler tool -> psxrecomp-bios and psxrecomp-game
cmake -S recompiler -B recompiler/build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build recompiler/build

# 2. REQUIRED before the first runtime build. Recompiled BIOS C is build output
#    and is not tracked, so a fresh clone has none.
bash tools/regen_bios.sh --config bios/OpenBIOS.toml
bash tools/regen_bios.sh --config bios/SCPH1001.toml   # optional, needs your own dump

# 3. Runtime -> psx-runtime
cmake -S runtime -B runtime/build -G Ninja -DCMAKE_BUILD_TYPE=Release -DPSX_RECOMP_UI=OFF
cmake --build runtime/build --target psx-runtime

# 4. Check the tree (no BIOS or disc needed)
cd recompiler/build && ctest --output-on-failure
```

Always pass an explicit `-DCMAKE_BUILD_TYPE`, because the generated C compiles unusably slowly at `-O0`. Step 4 is 38 tests in under five seconds, and it is the check to run before opening a pull request.

Generating and running one title:

```sh
recompiler/build/psxrecomp-game --config game.toml
./build/psx-runtime --game game.toml --disc tomba/tomba.cue
```

Every flag is in the [command line reference](/docs/reference/cli), every key in the [configuration reference](/docs/reference/configuration). Debugging goes over TCP rather than print statements: the runtime serves port 4370, the Beetle PSX oracle 4380. See [the TCP debug protocol](/docs/reference/tcp-protocol).

## What runs today

Eight game repositories build on psxrecomp: [TombaRecomp](https://github.com/mstan/TombaRecomp), [Tomba2Recomp](https://github.com/mstan/Tomba2Recomp), [ApeEscapeRecomp](https://github.com/mstan/ApeEscapeRecomp), [MegaManX4Recomp](https://github.com/mstan/MegaManX4Recomp), [MegaManX5Recomp](https://github.com/mstan/MegaManX5Recomp), [MegaManX6Recomp](https://github.com/mstan/MegaManX6Recomp), [TsumuLightRecomp](https://github.com/mstan/TsumuLightRecomp), and the community project [xenogears-recomp](https://github.com/OpokXeno/xenogears-recomp).

Each game pins an exact framework commit as a submodule. The README says titles are brought up and playable, and that "Validation scope varies by game".

## Known limits

- Not all of a game is native. The README says a majority, and publishes no coverage percentage.
- The interpreter has never been shown idle on any title.
- Set `bios_hle = false` when timing is what you measure. Cycle-exact behaviour is a documented limit of that tier.
- Overlays are compiled only where a player has been. A machine with no `gcc` on `PATH` never compiles them, so the game stays slow.
- Continuous integration is minimal: one workflow, on manual dispatch and releases.
- `fn_entry_dump` and `fn_exit_dump` freeze the debug server on populated rings. Use the `*_dump_file` variants.

## Where the documents and the code disagree

Prefer the code. Three places had drifted when this page was written.

- **The oracle is Beetle PSX.** DuckStation was retired on 2026-05-05. [`DEBUG.md`](https://github.com/mstan/psxrecomp/blob/master/DEBUG.md) and [`PRINCIPLES.md`](https://github.com/mstan/psxrecomp/blob/master/PRINCIPLES.md) still name it.
- **The internal stubs list is history.** `docs/internal/STUBS_TO_FIX.md` lists the MDEC decoder, SPU synthesis and several DMA channels as blocking. The README's status table says they work.
- **`CLAUDE.md` contradicts its own opening.** Section 0 says there is no MIPS interpreter and no HLE BIOS layer. Later amendments and its Rule 18 supersede both.

## Source

Written from [psxrecomp](https://github.com/mstan/psxrecomp).

- Status and design: [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md), [`docs/ARCHITECTURE.md`](https://github.com/mstan/psxrecomp/blob/master/docs/ARCHITECTURE.md), [`docs/EXECUTION_MODEL.md`](https://github.com/mstan/psxrecomp/blob/master/docs/EXECUTION_MODEL.md).
- Building and testing: [`docs/BUILDING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BUILDING.md), [`docs/BIOS_SELECTION.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BIOS_SELECTION.md), [`docs/TESTING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/TESTING.md).
- The rules, read together: [`CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md), [`PRINCIPLES.md`](https://github.com/mstan/psxrecomp/blob/master/PRINCIPLES.md), [`DEBUG.md`](https://github.com/mstan/psxrecomp/blob/master/DEBUG.md), [`CONTRIBUTING.md`](https://github.com/mstan/psxrecomp/blob/master/CONTRIBUTING.md).
- Code and details: [`recompiler/src/strict_translator.cpp`](https://github.com/mstan/psxrecomp/blob/master/recompiler/src/strict_translator.cpp), [`runtime/src/gte.cpp`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/gte.cpp), [`runtime/src/dirty_ram_interp.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/dirty_ram_interp.c), [`WIDESCREEN.md`](https://github.com/mstan/psxrecomp/blob/master/WIDESCREEN.md), [`GTE_LM_FIX.md`](https://github.com/mstan/psxrecomp/blob/master/GTE_LM_FIX.md).

## Next

- [PlayStation on the hardware catalogue](/hardware/playstation), for the games.
- [Code you cannot see ahead of time](/docs/concepts/code-you-cannot-see-ahead-of-time), the tier this console needs.
- [High level and low level](/docs/concepts/hle-and-lle), for why the recompiled BIOS is the foundation.
- [Port a game](/docs/guides/port-a-game), and the [glossary](/docs/concepts/glossary) for any term above.
