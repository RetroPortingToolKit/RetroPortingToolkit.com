---
title: "The recompiler and the runtime"
summary: "Every static recompilation toolchain splits into a build-time tool that writes C and a library that C links against, and this page shows the exact interface between them."
section: "concepts"
sectionTitle: "Concepts"
pageType: "concept"
tags: ["Architecture", "Recompiler", "Runtime"]
repos:
  - "https://github.com/N64Recomp/N64Recomp"
  - "https://github.com/N64Recomp/N64ModernRuntime"
  - "https://github.com/Zelda64Recomp/Zelda64Recomp"
updated: "2026-08-23"
---

A static recompilation project is two programs that are only useful together. The **recompiler** runs at build time on a developer's machine: it reads the game's machine code and writes C source. The **runtime** is a library that the generated C links against, standing in for the console's memory, operating system, saves, controllers and sound. Neither half stands alone. The recompiler emits calls it never implements, and the runtime implements calls that nothing makes until a recompiler has run. It is the first structure to learn here, because every toolchain in the fleet repeats it.

## What the recompiler produces

[N64Recomp](https://github.com/N64Recomp/N64Recomp), the upstream N64 tool, calls itself "a tool to statically recompile N64 binaries into C code that can be compiled for any platform". The output is text, one function at a time: "Every output function created by the recompiler is currently emitted into its own file."

The C backend writes the same prologue every time, so these four functions tell you the shape of every file it produces.

From [`src/cgenerator.cpp`](https://github.com/N64Recomp/N64Recomp/blob/main/src/cgenerator.cpp):

```cpp title="src/cgenerator.cpp"
void N64Recomp::CGenerator::emit_function_start(const std::string& function_name, size_t func_index) const {
    (void)func_index;
    fmt::print(output_file,
        "RECOMP_FUNC void {}(uint8_t* rdram, recomp_context* ctx) {{\n"
        // these variables shouldn't need to be preserved across function boundaries, so make them local for more efficient output
        "    uint64_t hi = 0, lo = 0, result = 0;\n"
        "    int c1cs = 0;\n", // cop1 conditional signal
        function_name);
}

void N64Recomp::CGenerator::emit_function_end() const {
    fmt::print(output_file, ";}}\n");
}

void N64Recomp::CGenerator::emit_function_call_lookup(uint32_t addr) const {
    fmt::print(output_file, "LOOKUP_FUNC(0x{:08X})(rdram, ctx);\n", addr);
}

void N64Recomp::CGenerator::emit_function_call_by_register(int reg) const {
    fmt::print(output_file, "LOOKUP_FUNC({})(rdram, ctx);\n", gpr_to_string(reg));
}
```

Two arguments, and everything the translated game can reach arrives through them: guest memory as a raw byte pointer, the guest register file as a struct. That struct has no program counter, because the game's control flow became the C program's control flow at build time. Note `LOOKUP_FUNC` too: where the original code called through a register, the output calls something the recompiler does not define.

## What crosses the boundary

The boundary is one header, `include/recomp.h`: the recompiler ships it, the runtime satisfies it. This is most of what a new runtime must provide.

From [`include/recomp.h`](https://github.com/N64Recomp/N64Recomp/blob/main/include/recomp.h):

```c title="include/recomp.h"
// The function signature for all recompiler output functions.
typedef void (recomp_func_t)(uint8_t* rdram, recomp_context* ctx);
// The function signature for special functions that need a third argument.
// These get called via generated shims to allow providing some information about the caller, such as mod id.
typedef void (recomp_func_ext_t)(uint8_t* rdram, recomp_context* ctx, uintptr_t arg);

recomp_func_t* get_function(int32_t vram);

#define LOOKUP_FUNC(val) \
    get_function((int32_t)(val))

extern int32_t* section_addresses;

#define LO16(x) \
    ((x) & 0xFFFF)

#define HI16(x) \
    (((x) >> 16) + (((x) >> 15) & 1))

#define RELOC_HI16(section_index, offset) \
    HI16(section_addresses[section_index] + (offset))

#define RELOC_LO16(section_index, offset) \
    LO16(section_addresses[section_index] + (offset))
```

Four things cross:

- **`recomp_context`**, the guest register file. The recompiler emits `ctx->r4`, `ctx->f12.u32l` and so on. The runtime allocates it and owns the thread that carries it.
- **`LOOKUP_FUNC`**, which expands to `get_function`. The recompiler emits it for jumps through a register and for calls it cannot resolve at build time. The runtime implements `get_function`.
- **`RELOC_HI16` and `RELOC_LO16`** over `section_addresses`, for code the game loads to an address chosen at run time. The recompiler emits the macros, the runtime maintains the array.
- **`rdram`**, the guest memory buffer. The load and store macros index it with a fixed bias of `0xFFFFFFFF80000000`. The runtime owns the allocation.

N64Recomp's README states the contract in one sentence: "The output is expected to be used with a runtime that can provide the necessary functionality and macro implementations to run it."

![Every arrow crosses in the same direction: the recompiler emits all four and implements none of them. That is what makes one header the whole interface between a program that runs once and a library that runs every frame.](./boundary.svg)

## What the runtime owns

[N64ModernRuntime](https://github.com/N64Recomp/N64ModernRuntime) is the upstream answer, and it is itself two libraries. `ultramodern` "is a reimplementation of much of the core functionality of libultra", covering threads, controllers, audio, message queues, timers, RSP task handling and VI timing. `librecomp` is the adapter, "a library meant to be used to bridge the gap between code generated by N64Recomp and ultramodern", and it also carries overlays, ROM reads and the save chips.

Here is the runtime holding up its end. Loading a code section at run time is two writes: the map that `LOOKUP_FUNC` reads, and the array that `RELOC_HI16` reads.

From [`librecomp/src/overlays.cpp`](https://github.com/N64Recomp/N64ModernRuntime/blob/main/librecomp/src/overlays.cpp):

```cpp title="librecomp/src/overlays.cpp"
void load_overlay(size_t section_table_index, int32_t ram) {
    const SectionTableEntry& section = sections_info.code_sections[section_table_index];

    for (size_t function_index = 0; function_index < section.num_funcs; function_index++) {
        const FuncEntry& func = section.funcs[function_index];
        func_map[ram + func.offset] = func.func;
    }

    loaded_sections.emplace_back(ram, section_table_index);
    section_addresses[section.index] = ram;
}
```

Two further edges are declared rather than assumed: input and audio are callbacks "provided by the project using ultramodern", and "ultramodern expects the user to provide and register a graphics renderer."

> **Note.** `librecomp` and `ultramodern` are GPLv3, so an executable that links them is a combined work and must be conveyed under GPL-3.0. See [licenses](/docs/fleet/licenses) before planning a build on that runtime.

## Why the split is drawn there

Timing is the obvious reason: one side runs once on a build machine and produces text, the other runs on a player's machine every frame. The better reason is that it lets both sides vary. `ultramodern` "can be used with either statically recompiled projects that use N64Recomp or direct source ports", so it does not know a recompiler exists, and `librecomp` is the piece that does. Pointing the other way, the translation walk in `recompile_function_impl` is a template over the output generator: one wrapper hands it the C backend, another hands it a caller supplied generator, which the live tier uses to emit machine code through sljit instead of C.

It also decides where a fact about the hardware is recorded. Instruction set quirks go in the recompiler's opcode table, where the `cpu_srav` entry is annotated "Hardware bug: The input is not masked to 32 bits before right shifting". Everything above the instruction set belongs to the runtime, where one fix reaches every game built against it.

## Where the seam is visible

A finished port is where the two meet. [Zelda64Recomp](https://github.com/Zelda64Recomp/Zelda64Recomp) carries `lib/N64ModernRuntime` and `lib/rt64` as submodules and supplies the configuration and symbol tables the recompiler needs. With the recompiler binaries copied next to those configs, its build guide runs three passes:

From [`BUILDING.md`](https://github.com/Zelda64Recomp/Zelda64Recomp/blob/dev/BUILDING.md):

```sh
./N64Recomp us.rev1.toml
./RSPRecomp aspMain.us.rev1.toml
./RSPRecomp njpgdspMain.us.rev1.toml
```

Only then does CMake compile the generated C against the runtime. When you are unsure which side of the line a problem sits on, ask whether re-running those commands could change it.

## The same shape across the fleet

The division shows up as directory layout. [psxrecomp](https://github.com/mstan/psxrecomp), [vbrecomp](https://github.com/mstan/vbrecomp), gbrecompiled and [gcnlle](https://github.com/mstan/gcnlle) put `recompiler/` next to `runtime/`. [snesrecomp](https://github.com/mstan/snesrecomp), [nesrecomp](https://github.com/mstan/nesrecomp), [ndsrecomp](https://github.com/mstan/ndsrecomp), segagenesisrecomp, smsggrecomp and cdirecomp put `recompiler/` next to `runner/`. Ten toolchains, CPUs ranging from the 6502 to PowerPC, the same two directories in each.

That repetition is inherited as a design, not as code: two repositories here build against forks of the upstream stack, and everywhere else the shared structure is a shared idea. [Lineage and credit](/docs/fleet/lineage-and-credit) draws that line exactly.

## Source

- [N64Recomp](https://github.com/N64Recomp/N64Recomp): [`include/recomp.h`](https://github.com/N64Recomp/N64Recomp/blob/main/include/recomp.h), [`src/cgenerator.cpp`](https://github.com/N64Recomp/N64Recomp/blob/main/src/cgenerator.cpp), [`src/recompilation.cpp`](https://github.com/N64Recomp/N64Recomp/blob/main/src/recompilation.cpp), [`src/operations.cpp`](https://github.com/N64Recomp/N64Recomp/blob/main/src/operations.cpp), and the [README](https://github.com/N64Recomp/N64Recomp/blob/main/README.md).
- [N64ModernRuntime](https://github.com/N64Recomp/N64ModernRuntime): its [README](https://github.com/N64Recomp/N64ModernRuntime/blob/main/README.md) and [`librecomp/src/overlays.cpp`](https://github.com/N64Recomp/N64ModernRuntime/blob/main/librecomp/src/overlays.cpp).
- [Zelda64Recomp](https://github.com/Zelda64Recomp/Zelda64Recomp): [`BUILDING.md`](https://github.com/Zelda64Recomp/Zelda64Recomp/blob/dev/BUILDING.md) and [`us.rev1.toml`](https://github.com/Zelda64Recomp/Zelda64Recomp/blob/dev/us.rev1.toml).

## Next

- [PlayStation](/docs/platforms/playstation), a `recompiler/` and `runtime/` toolchain that keeps an interpreter tier inside the runtime.
- [NES](/docs/platforms/nes), the `recompiler/` and `runner/` form of the split on a very different CPU.
- [Lineage and credit](/docs/fleet/lineage-and-credit), for what is inherited code and what is a shared design.
- [Glossary](/docs/concepts/glossary), for recompiler, runtime, overlay and the terms used above.
