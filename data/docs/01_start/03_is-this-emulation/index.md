---
title: "Is this emulation"
summary: "The honest answer, project by project: the game's own instructions are translated ahead of time, the console around them is modelled at run time, and almost every toolchain here keeps an interpreter for what it could not translate."
section: "start"
sectionTitle: "Start here"
pageType: "concept"
tags: ["Emulation", "Execution model", "Honesty"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/vbrecomp"
updated: "2026-08-23"
---

Partly, and which parts is the interesting question. In every project on this site the game's own machine code is translated to C ahead of time and executed as native code, which is not what an emulator does. In every project the console around that code, its picture processor, sound hardware, cartridge mapper, timers and controllers, is modelled by a runtime while the game plays, which is exactly what an emulator does. Most of them also keep an interpreter for code the ahead of time pass could not reach, and several link a third-party emulator into development builds to check their work. So the useful question is not whether the word applies. It is which piece of the machine is translated, which is simulated, and which is interpreted, and that split differs per project.

## What the projects say about themselves

The claims are strong and they are all about the CPU.

[nesrecomp](https://github.com/mstan/nesrecomp) puts both halves in one paragraph of its [`README.md`](https://github.com/mstan/nesrecomp/blob/master/README.md), which is the most useful sentence in this whole argument:

> **This is NOT an emulator.** Each 6502 instruction is translated to equivalent C code at build time. JSR becomes a direct C function call, branches become gotos, and the NES hardware (PPU, APU, mapper) is simulated by the runner library.

[psxrecomp](https://github.com/mstan/psxrecomp) opens its [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md) the same way:

> **A general-purpose static recompiler for the PlayStation 1.** It turns a PS1 disc into a native executable — MIPS R3000A translated to C, compiled to x64, linked against a hardware-accurate runtime. Not an emulator: the game becomes a program your CPU runs directly.

[snesrecomp](https://github.com/mstan/snesrecomp) is the most precise of the three, because it says what the runtime does in the same breath, in its [`README.md`](https://github.com/mstan/snesrecomp/blob/main/README.md):

> The game CPU runs as native code instead of inside a full-system emulator.
> The runtime models the hardware around it—including the PPU, APU, DSP, DMA,
> cartridge mapping, and supported enhancement chips—and provides a safe
> interpreter tier for code that cannot yet be resolved statically.

Upstream, [Zelda64Recomp](https://github.com/Zelda64Recomp/Zelda64Recomp) uses the phrase for a different property entirely, in its [`README.md`](https://github.com/Zelda64Recomp/Zelda64Recomp/blob/dev/README.md): "**It is not an emulator and it cannot run any arbitrary ROM.**" That is a claim about scope, and it is worth separating from the others. A recompiled port accepts one game, in one revision. An emulator accepts a library.

## Translated ahead of time, or simulated at run time

That is the line that actually divides the two. Ahead of time means a program read those bytes on a build machine and wrote C that does what they do. At run time means host code is deciding, while the game plays, what the hardware would have done. Here is where each toolchain draws it.

| Toolchain | Translated ahead of time | Modelled by the runtime | Interpreted at run time |
|---|---|---|---|
| [psxrecomp](https://github.com/mstan/psxrecomp) | the game's MIPS R3000A code and a whole PS1 BIOS image | GPU, SPU, CD-ROM, MDEC and XA, interrupts, COP0, timers, the GTE, controllers, memory cards | one basic block at a time, only for addresses on pages written since boot |
| [nesrecomp](https://github.com/mstan/nesrecomp) | the cartridge's 6502 code | PPU, APU, mapper, input | a fallback tier that shares the recompiler's own decode table, entered on a dispatch miss |
| [snesrecomp](https://github.com/mstan/snesrecomp) | 65816 code that whole-program analysis could resolve | PPU, APU, DSP, DMA, cartridge mapping, enhancement chips | `interp816`, which must stay available for every reachable address |
| [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp) | 68000 code, and optionally the sound Z80 | VDP, mixer, Z80 scheduling | a clean-room interpreter capsule, per missed instruction |
| [gbrecompiled](https://github.com/mstan/gbrecompiled) | the cartridge's LR35902 code | the console hardware around the CPU | `gb_interpret`, logged to `interp_fallbacks.log` |
| [vbrecomp](https://github.com/mstan/vbrecomp) | the cart's V810 code | VIP renderer, VSU audio, interrupt controller, timer, input, MMIO bus | nothing. There is no V810 interpreter in the project |

## The interpreter almost everybody keeps

An interpreter tier is not an admission of defeat here. It is how a discovery gap becomes a slow path instead of a crash, which is why psxrecomp can state its failure direction as one-sided in its [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md): "**The worst case is always performance, never correctness** — anything not yet native simply runs interpreted, correctly."

What that costs is worth seeing. This is segagenesisrecomp handing the machine to an interpreter for exactly one Z80 instruction and taking it straight back, counting the event so the fallback rate stays visible.

From [`runner/z80_recomp.c`](https://github.com/mstan/segagenesisrecomp/blob/master/runner/z80_recomp.c):

```c
void sms_dispatch_miss(uint16_t addr)
{
    z80 *fallback = &g_machine.z80;
    z80_recomp_mirror_to_interpreter(fallback);
    /* z80_step() also services the interpreter's interrupt latches. Interrupt
     * acceptance belongs to accept_interrupts() after this generated/fallback
     * instruction boundary, so suppress it for the one-instruction capsule
     * without losing a pending level asserted by the Genesis scheduler. */
    int int_pending = fallback->int_pending;
    int nmi_pending = fallback->nmi_pending;
    fallback->int_pending = 0;
    fallback->nmi_pending = 0;
    z80_step(fallback);
    z80_recomp_restore_from_interpreter(fallback);
    fallback->int_pending = int_pending;
    fallback->nmi_pending = nmi_pending;
    s_fallback_steps++;
    unsigned byte = addr >> 3;
    uint8_t bit = (uint8_t)(1u << (addr & 7));
    if (!(s_fallback_seen[byte] & bit)) {
        s_fallback_seen[byte] |= bit;
        s_fallback_unique_pcs++;
    }
}
```

Registers are mirrored into an interpreter, one instruction is stepped, the result is mirrored back. For that instruction, this is an emulator. The counters exist because the projects treat interpreted execution as a measurable quantity to drive toward zero, not as a permanent design.

psxrecomp's interpreter is the narrowest in the fleet and the reasoning is worth borrowing. It runs only for program counters on pages that have been written since boot, which means code installed while the console is running, and never on the BIOS or the main executable path. [`CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md) separates it from the thing people assume it is:

> "**This is not HLE.** HLE means 'the program would have produced result X, so
> we synthesize X ourselves and skip the program's code.' This rule is the
> opposite: we run the program's code, exactly as the BIOS author wrote it."

[vbrecomp](https://github.com/mstan/vbrecomp) is the one project with no interpreted surface at all. Its [`CLAUDE.md`](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md) says "There is **no V810 interpreter** in this project. Not as a fallback." The hardware around the CPU is still modelled, so this is not a project without emulation in it. It is a project where every guest instruction that executes was translated ahead of time.

## The firmware question

Consoles with a BIOS force a second decision, and this is where the fleet openly disagrees with itself. The options are to recompile the firmware like any other code, or to reimplement what it would have done in host code, which is high level emulation.

Most of these projects recompile it. psxrecomp's [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md) calls the recompiled BIOS "the foundation and the correctness oracle", [gbarecomp](https://github.com/mstan/gbarecomp) boots every game through a recompiled BIOS, and [cdirecomp](https://github.com/mstan/cdirecomp) recompiles the CD-i's entire CD-RTOS system ROM rather than hand-writing OS-9 stubs, giving the reason in its [`PRINCIPLES.md`](https://github.com/mstan/cdirecomp/blob/master/PRINCIPLES.md): "psxrecomp proved that path fails (faked syscall outputs + drifting C-side kernel state)".

But psxrecomp also ships a high level tier above its recompiled BIOS, it is on by default, and it services six kernel calls in the event family with everything else falling through to the recompiled code. gbarecomp offers an opt-in high level BIOS backend, with the BIOS dump still required. So a reader who wants to know whether the firmware on their machine is being executed or reimplemented has to check a configuration key, not a philosophy. [High level and low level](/docs/concepts/hle-and-lle) is that argument in full, with both sides quoted and no winner declared.

## The emulator in the development build

There is one more emulator in this story, and it is not in the shipped program. To prove a recompiled build is correct, these projects run an independently written emulator beside it and compare state at every checkpoint: Beetle PSX on PlayStation, Mesen on NES, SameBoy on Game Boy, bsnes on SNES, Beetle VB on Virtual Boy. That comparison is the fleet's main correctness instrument, and it is dev-build only. snesrecomp's [`SNES_COSIM.md`](https://github.com/mstan/snesrecomp/blob/main/SNES_COSIM.md) states the rule for everyone: "It is NEVER in the shipping Production config — zero bytes in released exes." [Proving it with co-simulation](/docs/concepts/co-simulation) is how it works.

## How to describe this accurately

If you are writing about these projects, or answering for them, these statements hold across the fleet:

- The game's own machine code is translated to C ahead of time and compiled, so it executes natively rather than being decoded instruction by instruction as the game runs.
- The console's hardware is modelled by a runtime library while the game plays.
- Most toolchains keep an interpreter for code the ahead of time pass could not resolve, and report how often it is used.
- A port accepts one game, in one revision, verified by hash. It is not a general machine for running that console's library.
- Whether firmware is executed or reimplemented depends on the project, and sometimes on a setting.

And one that does not hold: that no emulation is involved. Every project here ships hardware models, most ship an interpreter tier, and several link a third-party emulator core into development builds. The projects' own claims are about the CPU, and they are worth repeating as they are written, attributed, and not stretched further.

## Source

- [nesrecomp](https://github.com/mstan/nesrecomp): [`README.md`](https://github.com/mstan/nesrecomp/blob/master/README.md).
- [psxrecomp](https://github.com/mstan/psxrecomp): [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md), [`CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md), [`docs/EXECUTION_MODEL.md`](https://github.com/mstan/psxrecomp/blob/master/docs/EXECUTION_MODEL.md), [`runtime/src/dirty_ram_interp.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/dirty_ram_interp.c), [`runtime/src/bios_hle.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/bios_hle.c).
- [snesrecomp](https://github.com/mstan/snesrecomp): [`README.md`](https://github.com/mstan/snesrecomp/blob/main/README.md), [`SNES_COSIM.md`](https://github.com/mstan/snesrecomp/blob/main/SNES_COSIM.md).
- [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp): [`runner/z80_recomp.c`](https://github.com/mstan/segagenesisrecomp/blob/master/runner/z80_recomp.c).
- [vbrecomp](https://github.com/mstan/vbrecomp): [`CLAUDE.md`](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md). [gbrecompiled](https://github.com/mstan/gbrecompiled): [`README.md`](https://github.com/mstan/gbrecompiled/blob/master/README.md). [cdirecomp](https://github.com/mstan/cdirecomp): [`PRINCIPLES.md`](https://github.com/mstan/cdirecomp/blob/master/PRINCIPLES.md). [gbarecomp](https://github.com/mstan/gbarecomp): [`ENHANCEMENTS.md`](https://github.com/mstan/gbarecomp/blob/main/ENHANCEMENTS.md). [Zelda64Recomp](https://github.com/Zelda64Recomp/Zelda64Recomp): [`README.md`](https://github.com/Zelda64Recomp/Zelda64Recomp/blob/dev/README.md).

## Next

- [High level and low level](/docs/concepts/hle-and-lle) is where the firmware disagreement is argued properly.
- [Proving it with co-simulation](/docs/concepts/co-simulation) is the emulator that runs beside the port in development.
- [Code you cannot see ahead of time](/docs/concepts/code-you-cannot-see-ahead-of-time) explains the code psxrecomp's interpreter exists for.
- [What static recompilation is](/docs/start/what-is-static-recompilation) if you arrived here first, and [the glossary](/docs/concepts/glossary) for LLE, HLE, oracle and dispatch miss.
