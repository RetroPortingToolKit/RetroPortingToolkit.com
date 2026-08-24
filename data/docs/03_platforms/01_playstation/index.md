---
title: "PlayStation"
summary: "psxrecomp translates a PS1 game's MIPS R3000A code and a full PS1 BIOS into C, then resolves each control transfer through three tiers, statically compiled code first and a dirty-RAM interpreter last: this page covers its status, the GTE, the renderers, the commands, its limits, and where its documents have fallen behind its code."
section: "platforms"
sectionTitle: "Platforms"
pageType: "project"
tags: ["PlayStation", "MIPS R3000A", "GTE", "Overlays"]
repos:
  - "https://github.com/mstan/psxrecomp"
updated: "2026-08-23"
---

[psxrecomp](https://github.com/mstan/psxrecomp) translates the MIPS R3000A machine code of a PlayStation 1 game, and of a PS1 BIOS image, into C at build time, compiles that C natively, and links it against a runtime that simulates the console's hardware around it. Code the disc streams into RAM while the game is running cannot be seen at build time, so it is captured as it arrives, compiled in the background, and cached. You supply the disc image. This page is the toolchain: the project's state in its own words, what the R3000A and the GTE demand of it, how it decides which tier runs a given address, the commands, and where its documents and its code have drifted apart. The catalogue entry, with the games and the player-facing features, is [/hardware/playstation](/hardware/playstation).

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

The same README states the goal as an absolute, that a PS1 game should run as native code and not be emulated, and describes the result this way: "Not an emulator: the game becomes a program your CPU runs directly". Read that as the project's own framing, alongside the execution model below: the same runtime ships a MIPS interpreter, simulates the console's peripherals, and can run an optional high level BIOS tier. [Is this emulation](/docs/start/is-this-emulation) takes the question head on.

The framework is under the [PolyForm Noncommercial License 1.0.0](https://github.com/mstan/psxrecomp/blob/master/LICENSE), Copyright (c) 2026 Matthew Stan. Bundled components keep their own terms: OpenBIOS is MIT, and the vendored TinyCC is LGPL-2.1, invoked as a separate subprocess rather than linked.

> **You provide this.** You supply your own disc image, and your own BIOS dump if you want a retail kernel rather than the bundled OpenBIOS. The repository states that generated game and retail BIOS source "is derived from your files, so do not redistribute it", and asks players not to share their overlay capture files, because those contain verbatim game code. [The game file you supply](/docs/concepts/the-game-file-you-supply) is the canonical statement of that contract, and [provenance](/docs/fleet/provenance) covers how the fleet keeps the boundary clean.

## The CPU, and what one instruction costs

The guest CPU is the MIPS R3000A with COP0, the system control coprocessor, and COP2, the GTE geometry engine. The host target is x64. The repository is two CMake projects built and run separately: `recompiler/` is C++20 and emits C into `generated/`, and `runtime/` is C99 plus C++17 and is the engine that loads assets into a simulated PS1 address space, links the generated C as native functions, and simulates the hardware around them. That split is the fleet-wide pattern in [the recompiler and the runtime](/docs/concepts/recompiler-and-runtime).

One structure is the whole boundary. Generated C never touches host memory. It reads and writes guest registers through `cpu->gpr[]`, `cpu->cop0[]`, `cpu->gte_data[]` and `cpu->gte_ctrl[]` on a `CPUState*`, and reaches guest memory only through the function pointers on that struct or through the `psx_cyc_*` timing wrappers. That is why the same emitted C is valid in the main binary, in a compiled overlay library, and under the interpreter.

A single load shows what translation costs. From [`recompiler/src/strict_translator.cpp`](https://github.com/mstan/psxrecomp/blob/master/recompiler/src/strict_translator.cpp):

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

One guest `lw` becomes an address computation, an alignment trap and a cycle-charged load. The lines cut at the `// [snip]` marker are a second, deferred emission of the same thing that writes into a function-scope temporary rather than into the register, because the R3000A does not commit a load's value until after the following instruction has run. A write to `$zero` is emitted as a comment, since it is a silent no-op on hardware.

Two emitter decisions shape everything downstream. The game is written as a shared declarations header plus numbered function-body shards rather than one translation unit, so the build compiles them in parallel: [`SPLITGEN_MIGRATION.md`](https://github.com/mstan/psxrecomp/blob/master/SPLITGEN_MIGRATION.md) measures a Tomba build dropping from 4m35s to 51s at `-j16`, with the generated function bytes unchanged. And a guest call is a tail transfer rather than a nested host call, so host stack overflow from deep guest recursion is structurally impossible.

## Three tiers, and a one-sided failure mode

[`docs/EXECUTION_MODEL.md`](https://github.com/mstan/psxrecomp/blob/master/docs/EXECUTION_MODEL.md) names three tiers in strict priority order: statically recompiled code, then a compiled native overlay, then the interpreter. A control transfer enters the emitted trampoline, which normalizes the address and binary searches the static dispatch table. A hit runs a function compiled ahead of time. A miss, or a target in game text whose page has been written since boot, goes to `dirty_ram_dispatch`, which tries the native overlay loader first and interprets only if that fails. Only a genuinely unmapped program counter reaches the unknown handler.

From [`recompiler/src/full_function_emitter.cpp`](https://github.com/mstan/psxrecomp/blob/master/recompiler/src/full_function_emitter.cpp), the last two rungs, emitted as text into the generated dispatcher:

```cpp title="recompiler/src/full_function_emitter.cpp"
    out += "        /* Static dispatch miss.  Self-modifying / install-at-runtime RAM\n";
    out += "         * (CLAUDE.md Rule 18): the BIOS writes dispatch stubs into kernel\n";
    out += "         * RAM at runtime.  If the target page has been written-to since\n";
    out += "         * boot, interpret the basic block on cpu state.  Falls back to\n";
    out += "         * psx_unknown_dispatch for genuinely unmapped PCs. */\n";
    out += "        if (!found) {\n";
    out += "            if (dirty_ram_dispatch(cpu, addr, stop_addr)) {\n";
    out += "                found = 1;\n";
    out += "            } else {\n";
    out += "                psx_unknown_dispatch(cpu, addr, phys);\n";
    out += "            }\n";
    out += "        }\n";
```

The interpreter is deliberately narrow. It runs one basic block at a time, and only for program counters on pages written since boot, which means code installed while the console is running. It never runs the BIOS or the main executable path. It is also not a shortcut: the repository's rules draw the line explicitly, that high level emulation synthesizes a result and skips the program's code, while this runs the program's code exactly as its author wrote it.

That ordering has a property worth stating plainly. Each fallback is slower than the tier above it and none is less faithful, so the worst case is slow, never wrong. The README puts it in a line:

> "**The worst case is always performance, never correctness** — anything not yet
> native simply runs interpreted, correctly."

The overlay tier carries the same bias: compiled code is dispatched only when live RAM still matches the bytes it was compiled from, so code that might be compiled wrong is never run. [Code you cannot see ahead of time](/docs/concepts/code-you-cannot-see-ahead-of-time) covers that mechanism in full, and [telling code from data](/docs/concepts/code-discovery) covers the build-time discovery problem under it.

## The BIOS, and the layer that can sit above it

A build links every recompiled BIOS it ships and selects one at launch. From the README:

> "Whichever one the player selects runs as the kernel; that **low-level (LLE)
> recompiled BIOS is the foundation and the correctness oracle.** Everything is
> architected LLE-first: accuracy comes first, and convenience is layered on top,
> opt-in, never underneath."

Above it sits an opt-out high level tier that is one function pointer returning a boolean. The generated trampoline consults it first; a nonzero return means the service completed against guest state and execution resumes at `$ra`, and a zero return falls through to the recompiled BIOS. It implements six B0 kernel calls in the event family and nothing else, so threads, pads, the card and CD stacks, and all of A0 and C0 fall through. [`CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md) records the structural consequence: "With HLE off the build is byte-identical to a build without the tier." The tier's own source records its cost, that its cycle charges approximate the kernel routine's dynamic instruction count and "LLE remains the timing oracle." This is the fleet's sharpest architectural disagreement and it has its own page: [high level and low level](/docs/concepts/hle-and-lle) has both sides and the reasoning.

Two practical notes. The bundled OpenBIOS comes from PCSX-Redux and is redistributable, so a build boots without a dump, while a title whose config sets `openbios = false` requires a retail dump, and that key is not overridable by a player. Savestates are BIOS specific and refuse to load across images, because kernel RAM layout differs; memory cards are unaffected.

## What the PlayStation adds

### The GTE

COP2 is the geometry transform engine, and the recompiler funnels every GTE command through one runtime call carrying the full 25-bit command word.

From [`recompiler/src/strict_translator.cpp`](https://github.com/mstan/psxrecomp/blob/master/recompiler/src/strict_translator.cpp):

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

Preserving the whole word matters because two flags live in it. [`GTE_LM_FIX.md`](https://github.com/mstan/psxrecomp/blob/master/GTE_LM_FIX.md) records what happened when the runtime ignored them: the shared lighting and depth-cue helpers hardcoded `lm = 1`, clamping results to a non-negative range, while hardware takes `lm` from bit 10 of the instruction word, where `lm = 0` preserves negative values. Crash Bash tweens keyframe vertex animation with `INTPL` and `lm = 0`, an off-label signed-vector use of a colour interpolation op, so negative components clamped to zero and character meshes collapsed onto their anchor on tween frames. Because there was one funnel and the command word had survived, the fix was to read `lm` and `sf` from the instruction and rewrite the depth-cue tail to the hardware formula, gated on validating every supported title, "No subset, no sampling."

### The renderers

Three backends sit behind one interface.

| Backend | Source | Status, in the repository's words |
|---|---|---|
| Software | `runtime/src/gpu_sw_renderer.c` | CPU rasterizer, "the reference look, and the most portable fallback" |
| OpenGL | `runtime/src/gpu_gl_renderer.c` | "**Default.** GPU-authoritative VRAM/FBO renderer", falling back to software if GL initialisation fails |
| Vulkan | `runtime/src/gpu_vk_renderer.c` | "**Experimental.** Built when the SDK is present, opt-in at runtime; falls back to OpenGL if unavailable." |

The compiled-in default is OpenGL. The build option that compiles Vulkan defaults on, but selecting it at run time additionally requires the game to offer it and the user to ask.

### Widescreen, and what the 4:3 claim says

Widescreen lives in psxrecomp's own GTE and GPU rather than in a renderer, so it covers generated code, the interpreter and compiled overlays uniformly. The projection squash is computed once as `(4*den)/(3*num)`, reduced by gcd.

From [`runtime/src/gte.cpp`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/gte.cpp):

```cpp title="runtime/src/gte.cpp"
extern "C" void gte_set_display_aspect(int num, int den) {
    if (num <= 0 || den <= 0) { s_ws_xnum = s_ws_xden = 1; return; }
    // squash = (4/3) / (num/den) = (4*den) / (3*num); identity for 4:3.
    int32_t n = 4 * den, d = 3 * num;
    int32_t a = n, b = d;
    while (b) { int32_t t = a % b; a = b; b = t; }   // gcd
    s_ws_xnum = n / a;
    s_ws_xden = d / a;
}
```

[`WIDESCREEN.md`](https://github.com/mstan/psxrecomp/blob/master/WIDESCREEN.md) calls the default `aspect_ratio` of `4:3` "a mathematical identity". That claim is real and it is specific, so state it the way the code does. At 4:3 the squash factor reduces to exactly 1 and the multiply is short-circuited before it is reached, and `psx_ws_x_margin()`, the runtime term the recompiler emits at configured cull sites, returns exactly 0, so every widened comparison gives the original result. It is an output-identity claim, not a claim that the generated C is textually identical: with cull sites configured, the emitted expression still contains the `psx_ws_x_margin()` call, and that call returns 0. The boot path holds the squash off until the game entry PC fires, so BIOS logos and the shell always present 4:3.

A second strategy exists in the tree. Native-wide rendering, which renders the wider field into a wider buffer instead of squashing, ships narrowly as an experimental 16:9 launcher toggle on the software renderer only. 21:9 through that path is intentionally stubbed and hidden, because the parallax and far-backdrop pipeline generates only about 16:9 of coverage. [Add widescreen](/docs/guides/add-widescreen) covers the per-game work.

## The commands

The end-user tool generates a whole project from a disc image plus a BIOS dump. All three flags are required, and `--disc` accepts `.cue`, `.bin`, `.iso` or `.chd`:

```sh
psxrecomp build --disc /games/mygame.cue --bios /bios/SCPH1001.BIN --output /projects/MyGameRecomp
```

The output holds generated C for the game and the retail BIOS backend, a `game.toml`, a `CMakeLists.txt`, build scripts and a local copy of the runtime source. The repository calls this "a practical starting point, not a promise that every game works without game-specific fixes". The prebuilt CLI release is 64-bit Windows only.

Building the framework from source is four steps, and step 2 is the one people miss:

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

Always pass an explicit `-DCMAKE_BUILD_TYPE`: the generated C compiles unusably slowly at `-O0`. Release turns the debug TCP server off, and RelWithDebInfo and Debug turn it on. `docs/TESTING.md` and `CONTRIBUTING.md` describe step 4 as 38 tests in under five seconds with no BIOS dump or disc image required, and call it the check to run before opening a pull request.

Generating and running one title:

```sh
recompiler/build/psxrecomp-game --config game.toml
./build/psx-runtime --game game.toml --disc tomba/tomba.cue
```

`psxrecomp-toml` derives a first `game.toml` and a seed list from a PS-X EXE, and `psxrecomp_cli.py` is the headless driver, with `verify-disc`, `generate`, `rebuild`, `pgo-train`, `ensure-toolchain` and `ensure-emitters` subcommands. Every flag is in the [command line reference](/docs/reference/cli) and every key in the [configuration reference](/docs/reference/configuration).

Debugging goes over TCP rather than through print statements, which the repository's rules make absolute. The native runtime serves port 4370 and the Beetle PSX oracle process serves 4380, both speaking newline-delimited JSON, with 292 commands registered across the two. The [TCP debug protocol](/docs/reference/tcp-protocol) is the specification.

## What runs today

Eight game repositories build on psxrecomp: [TombaRecomp](https://github.com/mstan/TombaRecomp), [Tomba2Recomp](https://github.com/mstan/Tomba2Recomp), [ApeEscapeRecomp](https://github.com/mstan/ApeEscapeRecomp), [MegaManX4Recomp](https://github.com/mstan/MegaManX4Recomp), [MegaManX5Recomp](https://github.com/mstan/MegaManX5Recomp), [MegaManX6Recomp](https://github.com/mstan/MegaManX6Recomp), [TsumuLightRecomp](https://github.com/mstan/TsumuLightRecomp), and the community project [xenogears-recomp](https://github.com/OpokXeno/xenogears-recomp). Tomba is the reference for mod packaging and MegaMan X6 for large patcher conversion.

Each game pins an exact framework commit as a submodule, so a game moves to a newer framework only when someone deliberately bumps that pointer, and a codegen change additionally requires a regeneration. This repository's own release is not a game: it is a standalone BIOS runtime that boots on the bundled OpenBIOS and is useful for memory card management.

The README says titles are brought up and playable, and that "Validation scope varies by game". Nothing here has re-tested that, and this page does not upgrade it.

## Known limits

- Not all of a game is native. The README says a majority, and no coverage percentage exists in the repository, so none is published here.
- The interpreter has never been shown idle on any title. The stated goal is an idle interpreter and fully native execution, and no artefact in the repository shows that state reached.
- Cycle-exact behaviour under the optional high level BIOS tier is a documented limitation of that tier. Set `bios_hle = false` when timing is what you are measuring.
- Overlays are compiled only where a player has actually been, and a development machine with no `gcc` on `PATH` never compiles them at all, so the game stays slow.
- Continuous integration is deliberately minimal: one workflow, on manual dispatch and published releases. Per-pull-request triggers were removed in July 2026 because the Windows job failed often enough that a red check stopped carrying information, so every check above is run by hand.
- The debug server has two known faults: `fn_entry_dump` and `fn_exit_dump` freeze it on populated rings, and a slow client draining a large response throttles the emulator, so large dumps should use the `*_dump_file` variants.

## Where the documents and the code disagree

Four places had drifted when this page was written. None is a fault in the toolchain, and each will cost you time if you trust the document over the source.

**The oracle is Beetle PSX.** DuckStation was retired as the oracle on 2026-05-05 and is no longer built from this repository. [`CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md) and [`CONTRIBUTING.md`](https://github.com/mstan/psxrecomp/blob/master/CONTRIBUTING.md) name Beetle PSX, run as a separate `psx-beetle` process over the same TCP protocol. [`DEBUG.md`](https://github.com/mstan/psxrecomp/blob/master/DEBUG.md) and [`PRINCIPLES.md`](https://github.com/mstan/psxrecomp/blob/master/PRINCIPLES.md) still instruct an agent to build and query DuckStation, and were not updated. [Proving it with co-simulation](/docs/concepts/co-simulation) uses the current pairing.

**`geometry_correction` is present but not reachable.** The README lists it among opt-in geometry enhancements. [`ENHANCEMENTS.md`](https://github.com/mstan/psxrecomp/blob/master/ENHANCEMENTS.md) concludes that it must not be offered and records that as executed: the launcher control was withdrawn, the default stays false, and a standing constraint forbids adding one anywhere. The config loader source agrees. The README was not updated.

**The internal stubs list is history.** `docs/internal/STUBS_TO_FIX.md`, audited 2026-04-24, still lists the MDEC decoder, SPU audio synthesis and several DMA channels as unimplemented and blocking. The README's own status table says FMVs stream and play, the SPU works, and CD-ROM, MDEC and XA are functional. Read the status table, not the stubs document.

**`CLAUDE.md` contradicts its own opening.** Section 0 states flatly that there is no MIPS interpreter and no HLE BIOS layer in v4. Both are superseded by dated amendments later in the same file and by its Rule 18, so anyone quoting section 0 alone will state the opposite of the current architecture.

> **Note.** These are observations from one clone, not corrections filed with the project. Check them against the current tree before acting, and prefer the code.

## Source

Written from [psxrecomp](https://github.com/mstan/psxrecomp). Start with [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md) for status and releases, [`docs/ARCHITECTURE.md`](https://github.com/mstan/psxrecomp/blob/master/docs/ARCHITECTURE.md) for the two-program split, and [`docs/EXECUTION_MODEL.md`](https://github.com/mstan/psxrecomp/blob/master/docs/EXECUTION_MODEL.md) for the tier order. [`docs/BUILDING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BUILDING.md) carries the prerequisites and the build failure table, [`docs/BIOS_SELECTION.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BIOS_SELECTION.md) covers choosing a kernel, and [`docs/TESTING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/TESTING.md) the suites. The rules are four documents meant to be read together: [`CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md), [`PRINCIPLES.md`](https://github.com/mstan/psxrecomp/blob/master/PRINCIPLES.md), [`DEBUG.md`](https://github.com/mstan/psxrecomp/blob/master/DEBUG.md) and [`CONTRIBUTING.md`](https://github.com/mstan/psxrecomp/blob/master/CONTRIBUTING.md).

Code and specifics above came from [`recompiler/src/strict_translator.cpp`](https://github.com/mstan/psxrecomp/blob/master/recompiler/src/strict_translator.cpp), [`recompiler/src/full_function_emitter.cpp`](https://github.com/mstan/psxrecomp/blob/master/recompiler/src/full_function_emitter.cpp), [`recompiler/src/code_generator.cpp`](https://github.com/mstan/psxrecomp/blob/master/recompiler/src/code_generator.cpp), [`recompiler/src/config_loader.h`](https://github.com/mstan/psxrecomp/blob/master/recompiler/src/config_loader.h), [`runtime/include/cpu_state.h`](https://github.com/mstan/psxrecomp/blob/master/runtime/include/cpu_state.h), [`runtime/src/gte.cpp`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/gte.cpp), [`runtime/src/bios_hle.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/bios_hle.c), [`runtime/src/dirty_ram_interp.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/dirty_ram_interp.c), [`SPLITGEN_MIGRATION.md`](https://github.com/mstan/psxrecomp/blob/master/SPLITGEN_MIGRATION.md), [`WIDESCREEN.md`](https://github.com/mstan/psxrecomp/blob/master/WIDESCREEN.md), [`GTE_LM_FIX.md`](https://github.com/mstan/psxrecomp/blob/master/GTE_LM_FIX.md), [`ENHANCEMENTS.md`](https://github.com/mstan/psxrecomp/blob/master/ENHANCEMENTS.md) and [`TCP_COMMANDS.md`](https://github.com/mstan/psxrecomp/blob/master/TCP_COMMANDS.md).

## Next

- [PlayStation on the hardware catalogue](/hardware/playstation), for the games and what the ports add.
- [Code you cannot see ahead of time](/docs/concepts/code-you-cannot-see-ahead-of-time), the capture and compile tier this console needs and most others do not.
- [High level and low level](/docs/concepts/hle-and-lle), for why the recompiled BIOS is the foundation here and the opposite choice was made elsewhere.
- [Port a game](/docs/guides/port-a-game) for the workflow, the [configuration reference](/docs/reference/configuration) for every key, and the [glossary](/docs/concepts/glossary) for any term above.
