---
title: "What static recompilation is"
summary: "The idea the rest of this site rests on: a game's own machine code is translated into C before it ever runs, compiled into a native program, and linked against a runtime that stands in for the console, with the per-game cost that buys."
section: "start"
sectionTitle: "Start here"
pageType: "concept"
tags: ["Static recompilation", "Recompiler", "Runtime"]
repos:
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/vbrecomp"
updated: "2026-08-23"
---

A console game is a block of machine code written for a processor nobody makes any more. Static recompilation reads that machine code before the game runs, translates it into C source, and compiles the C for the machine you actually own. What comes out is an ordinary native program, and your CPU executes the game's own logic directly instead of running a second program that reads the game's instructions and acts them out. The word static means the translation happens ahead of time, once, on a developer's machine. None of this is automatic: the translated code is linked against a runtime library that stands in for the console's hardware, and bringing one game from a dump to a working program is months of work on that one game.

## What the recompiler writes

The tool that does the translating is called the recompiler, and its output is text. It reads the guest binary, works out where each function starts, and writes one C function per function it found, plus a table that maps guest addresses to those C functions. Guest registers become fields in a state struct. Guest memory reads and writes become calls into the runtime. Nothing about the output is exotic: a stock C compiler builds it.

[nesrecomp](https://github.com/mstan/nesrecomp) is the smallest example to read, because a 6502 instruction is small. This is its emitter deciding what one instruction becomes. Read the strings inside the `fprintf` calls, because that text is what lands in the generated file.

From [`recompiler/src/code_generator.c`](https://github.com/mstan/nesrecomp/blob/master/recompiler/src/code_generator.c):

```c
    /* Label for branch targets.
     * Emit maybe_trigger_vblank(2) at every instruction boundary — on real
     * 6502, NMI is only sampled between instructions, never mid-instruction.
     * nes_read/nes_write now only increment the bus-op counter (bus_tick),
     * so VBlank can only fire here at the instruction boundary. */
    fprintf(f, "    /* $%04X: %02X */ nes_instruction_boundary(0x%04X, %d); ",
            pc, opcode, pc, e->cycles);

    if (e->mnemonic == MN_ILLEGAL) {
        fprintf(f, "/* ILLEGAL $%02X — skip %d */\n", opcode, e->size);
        return e->size;
    }

    switch (e->mnemonic) {
        /* Load/Store */
        case MN_LDA: emit_load(f, 'A', e->addr_mode, op1, op2, pc, abs16, cfg); break;
        case MN_LDX: emit_load(f, 'X', e->addr_mode, op1, op2, pc, abs16, cfg); break;
        case MN_LDY: emit_load(f, 'Y', e->addr_mode, op1, op2, pc, abs16, cfg); break;
        case MN_LAX:
            if (e->addr_mode == AM_IMM)
                fprintf(f, "g_cpu.A = g_cpu.X = 0x%02X; FLAG_NZ(g_cpu.A);\n", op1);
            else
                fprintf(f, "g_cpu.A = g_cpu.X = nes_read(%s); FLAG_NZ(g_cpu.A);\n",
                        operand_addr_expr(e->addr_mode, op1, op2));
            break;
```

One guest load becomes an assignment to `g_cpu.A`, a call to `nes_read` for the address, and a flag update, with the instruction's address and opcode left in a comment so the output can be read against a disassembly. Multiply that by every instruction in the cartridge and you have the program. [The recompiler and the runtime](/docs/concepts/recompiler-and-runtime) covers the other half, the library that implements `nes_read` and everything like it, and [NES](/docs/platforms/nes) is this toolchain in full.

A Virtual Boy port states the whole technique in four sentences, from a player-facing README.

From [`README.md`](https://github.com/mstan/MarioTennisVirtualBoyRecomp/blob/master/README.md) in MarioTennisVirtualBoyRecomp:

> This is a **static recompiler**, not an emulator. The V810 machine code in the cart ROM is decoded once at codegen time and translated to C functions, one per cart function. Those C functions are compiled by gcc into native x86-64. At runtime there is no V810 fetch/decode/execute loop — each cart function is a native call.

## Why not just interpret it

An interpreter is the classic emulator CPU core. It holds the guest program counter, fetches the instruction there, decodes it, does what it says, and repeats, for every instruction, every time that instruction executes. An inner loop the game runs a million times pays the fetch and decode cost a million times.

Static recompilation moves that work to build time. Each instruction in the ROM is decoded once, ever, and what it does is written down as C. At run time there is no fetch and no decode, only compiled code. [nesrecomp](https://github.com/mstan/nesrecomp) puts it in one line in its [`CLAUDE.md`](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md): "**Static recompiler.** 6502 binary → C → native x64. No interpreter loop."

## Why not translate while the game runs

The other familiar answer is dynamic translation, or just-in-time compilation: translate a block of guest code the first time control reaches it, keep the result in memory, and reuse it. The difference is when the work happens and what survives it. A just-in-time translator works during play, on the player's machine, and normally discards the result when the process exits. A static recompiler works once on a build machine, and its result is C source a person can read, review and check into a repository.

The boundary is less tidy in practice, and this site would rather say so. [psxrecomp](https://github.com/mstan/psxrecomp) has to deal with code a PlayStation game streams off the disc, which is not in the executable when the recompiler runs. It captures those bytes as they arrive, runs the same recompiler on them, and compiles the result with a C compiler it launches as a separate process, caching the library so it is still there next session. Its [`docs/ARCHITECTURE.md`](https://github.com/mstan/psxrecomp/blob/master/docs/ARCHITECTURE.md) draws the line carefully: "When an overlay needs compiling, the runtime spawns a C compiler on the recompiler-emitted C and loads the resulting DLL — it does not JIT in-process." [Code you cannot see ahead of time](/docs/concepts/code-you-cannot-see-ahead-of-time) is that mechanism in full. Pointing the other way, [N64Recomp](https://github.com/N64Recomp/N64Recomp) upstream ships a runtime recompilation backend alongside its C backend, so ahead of time is a choice these projects make, not a limit of the idea.

## What it buys

**Headroom.** The game runs as a native program on a machine far faster than the console, and everything the runtime does around it is host code you can improve. psxrecomp ships software, OpenGL and experimental Vulkan renderers behind one interface, with supersampling and perspective-correct texturing at that layer. No project here publishes a frame rate claim, and this page does not invent one.

**Extensibility.** Because the output is compiled and linked, features can be added at the seams instead of by patching a ROM. That is where widescreen, [mod packages](/docs/guides/write-a-mod), [live translation tables](/docs/guides/translate-a-game), tile and texture replacement and controller remapping live. One shared rule keeps it honest, stated most plainly in cdirecomp's [`ENHANCEMENTS.md`](https://github.com/mstan/cdirecomp/blob/master/ENHANCEMENTS.md): "Every enhancement is **opt-in**, **off by default**, and **byte-identical to the faithful path when off**."

**Features that need exact repeatability.** Save states, rewind and rollback netplay are one requirement three times over: snapshot the machine, restore it, re-run from it identically. [Determinism](/docs/concepts/determinism) is the concept page.

## What it costs

**Per game work, measured in months.** Every framework in this fleet is consumed by per-game repositories that supply configuration the recompiler could not work out on its own. The banner on the mstan-family game READMEs says it directly, here from [SuperMarioWorldRecomp](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/README.md): "**These are in-development previews, not finished ports — expect rough edges**, and depth will keep landing over months, not days."

**Telling code from data.** A cartridge dump is one flat block of bytes with no symbols and nothing marking where a function begins. Getting that wrong is the central difficulty of the whole technique, and it has its own page: [telling code from data](/docs/concepts/code-discovery).

**No guarantee for any particular game.** psxrecomp's own README calls a generated project "a practical starting point, not a promise that every game works without game-specific fixes", and nesrecomp says of its output "This builds a static library. It does not create a playable game by itself." Whether a given title works is a question about that title, and the hedged words the projects answer it with are unpacked in the [status vocabulary](/docs/reference/status-vocabulary).

> **You provide this.** Nothing here ships a game. Every port needs a cartridge dump, disc image or system ROM that you supply from your own media, and the runtime checks it before it starts. [The game file you supply](/docs/concepts/the-game-file-you-supply) is the full contract.

## Where the word emulation comes in

Two things are true at once. The game's instructions are translated ahead of time and run as native code. The console around those instructions, its picture processor, sound, cartridge mapper, timers and controllers, is modelled in the runtime while the game plays, and most of these projects also keep an interpreter for code the ahead of time pass could not reach. [snesrecomp](https://github.com/mstan/snesrecomp) states both halves in one paragraph of its [`README.md`](https://github.com/mstan/snesrecomp/blob/main/README.md): "The game CPU runs as native code instead of inside a full-system emulator. The runtime models the hardware around it—including the PPU, APU, DSP, DMA, cartridge mapping, and supported enhancement chips—and provides a safe interpreter tier for code that cannot yet be resolved statically."

That is a real question with a real answer, and it differs per project. [Is this emulation](/docs/start/is-this-emulation) answers it properly, which is why this page does not.

## Source

- [nesrecomp](https://github.com/mstan/nesrecomp): [`recompiler/src/code_generator.c`](https://github.com/mstan/nesrecomp/blob/master/recompiler/src/code_generator.c), [`README.md`](https://github.com/mstan/nesrecomp/blob/master/README.md), [`CLAUDE.md`](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md).
- [psxrecomp](https://github.com/mstan/psxrecomp): [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md), [`docs/ARCHITECTURE.md`](https://github.com/mstan/psxrecomp/blob/master/docs/ARCHITECTURE.md), [`docs/EXECUTION_MODEL.md`](https://github.com/mstan/psxrecomp/blob/master/docs/EXECUTION_MODEL.md).
- [snesrecomp](https://github.com/mstan/snesrecomp): [`README.md`](https://github.com/mstan/snesrecomp/blob/main/README.md).
- [MarioTennisVirtualBoyRecomp](https://github.com/mstan/MarioTennisVirtualBoyRecomp): [`README.md`](https://github.com/mstan/MarioTennisVirtualBoyRecomp/blob/master/README.md), built on [vbrecomp](https://github.com/mstan/vbrecomp).
- [cdirecomp](https://github.com/mstan/cdirecomp): [`ENHANCEMENTS.md`](https://github.com/mstan/cdirecomp/blob/master/ENHANCEMENTS.md). [SuperMarioWorldRecomp](https://github.com/mstan/SuperMarioWorldRecomp): [`README.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/README.md).

## Next

- [How a port is made](/docs/start/how-a-port-is-made) is the same idea as a pipeline, stage by stage, and names the vocabulary the rest of this site uses.
- [Is this emulation](/docs/start/is-this-emulation) is the honest answer to the question this page deliberately left open.
- [Telling code from data](/docs/concepts/code-discovery) is the hard part, explained on one console.
- [Quickstart](/docs/start/quickstart) has you run a recompiler over a real binary, and [the glossary](/docs/concepts/glossary) defines every term above.
