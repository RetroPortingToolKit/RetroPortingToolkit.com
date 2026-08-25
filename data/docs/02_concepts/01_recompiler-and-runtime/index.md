---
title: "The recompiler and the runtime"
summary: "Every project here is two programs: a build-time tool that turns the game's binary into source code, and a library that code runs against. This is what each one does and what passes between them."
pageType: "concept"
tags: ["Architecture", "Recompiler", "Runtime"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
updated: "2026-08-25"
---

A static recompilation project is two programs. The **recompiler** runs on a developer's machine, before anyone plays anything. It reads the game's binary, which is the compiled machine code the console itself ran, and writes source code. The **runtime** is a library. The generated code is compiled and linked against it, and it stands in for the console: memory, controllers, sound, saves, video. Neither half is useful alone. Learn this split first, because every toolchain in the fleet has it.

## What the recompiler does

It runs once and then it is done. [psxrecomp](https://github.com/mstan/psxrecomp) states the shape in [`docs/ARCHITECTURE.md`](https://github.com/mstan/psxrecomp/blob/master/docs/ARCHITECTURE.md): "PSXRecomp is split into two CMake projects that are built and run separately". Its `recompiler/` reads MIPS machine code and writes C files. Its `runtime/` loads the game into an emulated PlayStation address space, links that C in as native functions, and models the hardware around it.

The output is source code in an ordinary programming language. That is the technique. It does not have to be C: C is what the projects in this fleet emit, because C compiles everywhere and links against anything.

The recompiler writes one function per function it found in the game, plus a table that maps guest addresses to those functions. It never runs while you play.

## What crosses between the two halves

A small, fixed interface. On NES, [nesrecomp](https://github.com/mstan/nesrecomp) puts it in one header, `runner/include/nes_runtime.h`, whose first lines say who owes what: "Shared between runner/ and generated/ code. Generated code includes this; runner implements it." Every generated file includes it.

On PlayStation the interface is a struct. The generated C never touches the host machine's memory. It reads and writes the guest's registers here, and reaches guest memory only through the function pointers on the same struct.

From [`runtime/include/cpu_state.h`](https://github.com/mstan/psxrecomp/blob/master/runtime/include/cpu_state.h):

```c title="runtime/include/cpu_state.h"
typedef struct CPUState {
    uint32_t gpr[32];   /* $0..$31; gpr[0] is hardwired zero, never written */
    uint32_t pc;        /* program counter */
    uint32_t hi, lo;    /* mult/div result registers */
    uint32_t cop0[32];  /* COP0 system control registers (SR, Cause, EPC, ...) */
    uint32_t gte_data[32]; /* COP2 (GTE) data registers */
    uint32_t gte_ctrl[32]; /* COP2 (GTE) control registers */

    /* Memory access function pointers -- wired at init to psx_read/psx_write. */
    uint32_t (*read_word)(uint32_t addr);
    void     (*write_word)(uint32_t addr, uint32_t value);
    uint16_t (*read_half)(uint32_t addr);
    void     (*write_half)(uint32_t addr, uint16_t value);
    uint8_t  (*read_byte)(uint32_t addr);
    void     (*write_byte)(uint32_t addr, uint8_t value);
```

That is why the same emitted C works in the main program, in a library compiled later, and under the interpreter. It only ever talks to this struct.

Jumps and calls cross the same way. In psxrecomp every guest control transfer goes through two runtime functions, `psx_dispatch(cpu, addr)` and `psx_dispatch_call(cpu, addr, return_addr)`. The recompiler emits the calls. The runtime decides what runs.

## What the runtime owns

Everything the game is not: guest memory, the devices, video, sound, input, save files, and the clock the game thinks it is running on. It also owns the fallback. When a jump lands on an address with no generated function behind it, the runtime interprets that code instead, which is slower and still correct.

The split also decides where a fact about the hardware gets written down. Instruction quirks belong to the recompiler, because they change what C comes out: psxrecomp turns any write to register zero into a comment, since "LUI/ORI/ADDIU/SLL with rd/rt == 0 are silent NOPs on real hardware", and it emits the R3000A load delay as a second, deferred form of every load. Anything above the instruction set belongs to the runtime, where one fix reaches every game built against it.

## Where the seam is visible

A port's build order draws the line better than any diagram. A psxrecomp game repository carries the framework as a submodule at `psxrecomp/` and supplies its own `game.toml`, seeds and generated C.

From [`docs/BUILDING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BUILDING.md):

```sh
# Extract the game's PS-X EXE from your disc (helper included in the game repo):
python3 tools/extract_psx_exe.py tomba/tomba.bin SCUS_942.36 tomba/SCUS_942.36

# Regenerate the game's C from the disc/EXE. The framework is a submodule at
# psxrecomp/ inside the game repo, so build its recompiler once, then run it.
# [snip] the guide also names the regen.sh and regen.ps1 wrappers here
cmake -S psxrecomp/recompiler -B psxrecomp/recompiler/build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build psxrecomp/recompiler/build
psxrecomp/recompiler/build/psxrecomp-game --config game.toml

# Configure + build the game runtime:
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build --target psx-runtime
./build/psx-runtime --game game.toml --disc tomba/tomba.cue
```

The first group builds the recompiler and runs it once. The second group compiles what it wrote and starts the game. When you are not sure which half a bug belongs to, ask whether re-running the first group could change it.

## The same shape across the fleet

You can see the split in the directory names. [psxrecomp](https://github.com/mstan/psxrecomp), [vbrecomp](https://github.com/mstan/vbrecomp), gbrecompiled and [gcnlle](https://github.com/mstan/gcnlle) put `recompiler/` next to `runtime/`. [snesrecomp](https://github.com/mstan/snesrecomp), [nesrecomp](https://github.com/mstan/nesrecomp), [ndsrecomp](https://github.com/mstan/ndsrecomp), segagenesisrecomp, smsggrecomp and cdirecomp put `recompiler/` next to `runner/`. Ten toolchains, CPUs from the 6502 to PowerPC, the same two directories.

The projects share the design, not the code. [Lineage and credit](/docs/fleet/lineage-and-credit) says which is which.

## Source

- [psxrecomp](https://github.com/mstan/psxrecomp): [`docs/ARCHITECTURE.md`](https://github.com/mstan/psxrecomp/blob/master/docs/ARCHITECTURE.md) for the two programs, [`runtime/include/cpu_state.h`](https://github.com/mstan/psxrecomp/blob/master/runtime/include/cpu_state.h) for the boundary struct, [`recompiler/src/strict_translator.cpp`](https://github.com/mstan/psxrecomp/blob/master/recompiler/src/strict_translator.cpp) for the instruction quirks, [`docs/BUILDING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BUILDING.md) and [`runtime/runtime.cmake`](https://github.com/mstan/psxrecomp/blob/master/runtime/runtime.cmake) for the build order.
- [nesrecomp](https://github.com/mstan/nesrecomp): [`runner/include/nes_runtime.h`](https://github.com/mstan/nesrecomp/blob/master/runner/include/nes_runtime.h) for the shared header, [`runner/runner.cmake`](https://github.com/mstan/nesrecomp/blob/master/runner/runner.cmake) for what the runner links.

## Next

- [PlayStation](/docs/platforms/playstation), a `recompiler/` and `runtime/` toolchain with an interpreter inside the runtime.
- [NES](/docs/platforms/nes), the same split on a very different CPU.
- [Telling code from data](/docs/concepts/code-discovery), the hard part of the recompiler's job.
- [Glossary](/docs/concepts/glossary), for recompiler, runtime, overlay and the rest of the vocabulary.
