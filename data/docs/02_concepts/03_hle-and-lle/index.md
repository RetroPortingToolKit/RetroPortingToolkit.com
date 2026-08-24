---
title: "High level and low level"
summary: "Every toolchain in this fleet runs the real firmware as its baseline, so the live argument is not low level against high level, it is whether a high level shortcut may ever become the default, and two projects have landed on opposite answers."
section: "concepts"
sectionTitle: "Concepts"
pageType: "concept"
tags: ["Architecture", "LLE", "HLE", "Correctness"]
repos:
  - "https://github.com/mstan/gcnlle"
  - "https://github.com/mstan/cdirecomp"
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/ndsrecomp"
  - "https://github.com/mstan/vbrecomp"
  - "https://github.com/mstan/snesrecomp"
updated: "2026-08-23"
---

**Low level emulation** means executing the console's own instructions: its firmware, recompiled or interpreted, running over a model of the hardware underneath. **High level emulation** means reimplementing what that code would have done, so a routine's result comes from host code instead of from the guest's own instructions. Every toolchain in this fleet takes the low level path as its baseline, so the argument here is not which one wins. It is what the word HLE may cover, and whether a high level shortcut may ever be what a player gets by default. Two projects have answered that in opposite directions, and neither has conceded.

## The rule everybody starts from

[gcnlle](https://github.com/mstan/gcnlle) states it as an ordering rather than a preference:

> "**LLE / static recompilation / native execution is the baseline.** Architect as much of the system that way as you can, and on platforms that recompile their own firmware/BIOS, run that recompiled firmware."

High level emulation is then permitted in exactly one position: as "a **deliberate subsystem replacement**" sitting on a proven low level baseline. It is forbidden as "the **starting point / sole implementation**", which the same document calls "the historical failure mode: it leaves *half an ecosystem*". The banned form has a name, "load-bearing HLE that fakes the answer", glossed as "synthesizing a specific result so a milestone *looks* done ("deliver this event so the screen unlocks"), with no faithful path beneath it and no oracle check."

## Why the rule exists

This is a retrospective, not a taste argument. [cdirecomp](https://github.com/mstan/cdirecomp) recompiles the CD-i's entire CD-RTOS system ROM instead of stubbing its system calls, and its principles document gives the reason in one line:

> "We do **NOT** hand-write OS-9 HLE stubs, psxrecomp proved that path fails (faked syscall outputs + drifting C-side kernel state)"

Its README repeats it: "psxrecomp showed that stubbing the BIOS leads to silent failure; CD-i takes the opposite, faithful route." [ndsrecomp](https://github.com/mstan/ndsrecomp) describes the same failure as a debt that comes due all at once: "stubbed SWIs / skipped boots are HLE-by-accident, and a load-bearing interpreter is the same debt in disguise: it hides every codegen bug until the day it comes out, then they all fire at once."

## Where the projects actually disagree

All of them are low level first by constitution. What differs is what the high level tier is allowed to be.

[psxrecomp](https://github.com/mstan/psxrecomp) started with a ban. Its constitution document still says, in its opening section, "There is **no HLE BIOS layer** in v4. No `bios.c` with case branches intercepting A0/B0/C0 vectors." That text was then amended three times. An amendment dated 2026-06-29 permits a faithful HLE subsystem replacement where the low level path has a genuine landmine, provided it is general, operates on real guest structures, and is continuously validated against an independent oracle. Amendments dated 2026-07-02 and 2026-07-06 go further: HLE becomes "a standing, swappable TIER", and as of the later date it is **the default** for the BIOS, opted out per game with `[runtime] bios_hle = false` or per launch with `PSX_BIOS_HLE=0`. The justification is boot convenience: "HLE boot is THE boot-skip mechanism", and "HLE-default is the shipping convenience". The document carries no version marker saying which passage is current, so anyone reading the opening section alone will state the opposite of the shipped architecture.

The mechanism is narrower than the policy language suggests. The tier is one nullable function pointer consulted at the top of the emitted dispatch loop, where a nonzero return means the service completed against guest state and zero falls through to the recompiled BIOS.

From [`runtime/src/bios_hle.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/bios_hle.c):

```c title="runtime/src/bios_hle.c"
static int bios_hle_dispatch(struct CPUState* cpu, uint32_t phys)
{
    if (phys == 0xB0u) {
        uint32_t fn = cpu->gpr[9]; /* $t1 — the PSY-Q thunk's function number */
        int handled = s_call_hle_on ? hle_service_b0(cpu, fn) : 0;
        hle_record(0xB0u, fn, cpu, handled ? cpu->gpr[2] : 0u,
                   handled ? PSX_HLE_ROUTE_HLE : PSX_HLE_ROUTE_LLE);
        return handled;
    }
    if (phys == 0xA0u || phys == 0xC0u) {
        /* No A0/C0 services implemented in v1 — observe + fall through. */
        hle_record(phys, cpu->gpr[9], cpu, 0u, PSX_HLE_ROUTE_LLE);
        return 0;
    }
    if (psx_bios_image.shell_entry_phys != 0 &&
        phys == psx_bios_image.shell_entry_phys)
        return hle_boot_shell_skip(cpu);
    return 0;
}
```

Six kernel calls are implemented, all in the event family, operating on the real guest tables in guest RAM. Everything else, including threads, pads, the card and CD stack, falls through. Turning the tier off is not a rebuild: "With HLE off the build is byte-identical to a build without the tier." The cost is stated too, since HLE cycle costs are approximations and "LLE remains the timing oracle."

ndsrecomp forbids precisely that shape. Stubbing a BIOS SWI, skipping the firmware boot or hand-waving a direct boot are named as failures that invalidate a piece of work: "SWIs land at the BIOS SWI vector and the recompiled BIOS handles them. There is no `if (swi == X) hle_...()`", and "The firmware boot copy is **LLE**: we execute the BIOS code that parses the header and copies/relocates the parts. We do not hand-wave a "direct boot" that places code and jumps." A direct boot mode exists, as an opt-in that never becomes a silent fallback.

The word HLE is then reserved for something else entirely:

> "The recompiled/LLE implementation is the accuracy floor and remains linked,
> runnable, and forceable. Performance HLE is a set of measured replacements
> above that floor. A replacement may become the default path after promotion;
> it never deletes its LLE body or changes a miss into a Tier-3 interpreter call."

A replacement is keyed by content and bank identity rather than by address, because generated banks call each other directly and one address can hold several overlay generations, so a table keyed by program counter alone "can therefore miss calls or select the wrong routine". The specified shape keeps the original body and consults a selector only at an exact function start.

From [`HLE_ARCHITECTURE.md`](https://github.com/mstan/ndsrecomp/blob/main/HLE_ARCHITECTURE.md):

```c title="HLE_ARCHITECTURE.md"
static void title_routine_lle(void) {
    /* the existing generated body, unchanged */
}

void title_routine(void) {
    if (g_cpu.R[15] == ROUTINE_START &&
        runtime_hle_try(&title_routine_descriptor, title_routine_lle))
        return;
    title_routine_lle();
}
```

That wrapper is a specification, not shipped code. The selector `runtime_hle_try` and the environment controls named alongside it do not appear in the tracked sources. What is implemented is the measurement seam that would justify a replacement: a strict observation manifest on the recompiler, a profiling wrapper behind a build option, and an `hle_heat` query over the debug server. It is a design with its evidence-gathering half built.

[vbrecomp](https://github.com/mstan/vbrecomp) refuses both positions. It has no fallback interpreter, "There is **no V810 interpreter** in this project. Not as a fallback.", and no replacement layer at all:

> "There is **no HLE layer**. No `bios.c` synthesising what a routine
> "would have produced"."

Its one carve-out is a verified-enhancement shadow, a higher fidelity implementation that runs beside the faithful path, is continuously diffed against it, substitutes only after a proven window, reverts loudly, and is off by default.

None of the three has conceded, and this page is not going to award the point.

## What a permitted replacement looks like in practice

[snesrecomp](https://github.com/mstan/snesrecomp) shows the shape at cartridge scale. Its analysis contract puts the interpreter, not the compiled output, in charge of meaning:

> "The ROM and live 65816 architectural state are the correctness model.
> Interpreter/LLE execution must remain available for every reachable address.
> AOT bodies and HLE handlers are optional materializations selected only after
> analysis stabilizes; neither is allowed to define game semantics."

Two cfg directives, `hle_func` and `hle_dispatch`, let a port replace one recompiled function or one dispatch site with hand written C, under the rule that "Disabling the overlay must expose the correct underlying implementation." The project also has a case study in why the ordering matters. Its Cx4 coprocessor began as a command level model taken from an existing emulator and was replaced the same day by an instruction level core, which revealed that a register everyone had treated as a command port "is not a command register", it is the chip's program counter, and that the earlier source "has no data ROM at all, so it was fabricating every one of those values". The notes file tells anyone tempted to redo the shortcut to "do not author a future Cx4 HLE from it", and to work from the low level core's observed behaviour instead. See [SNES](/docs/platforms/snes) for how that floor is wired into dispatch.

## The names do not track the distinction

Repository names in this fleet look like they encode the technique. They do not, and a reader who notices the mismatch is not misreading anything.

- cdirecomp is named `recomp`, and its README describes its philosophy as "**LLE (low-level emulation) and static / native-first**".
- gcnlle is named `lle`, but the title line of its own README is "# gcnrecomp", its documents call it gcnrecomp throughout, and it is a static recompiler by construction.
- snesrecomp is named `recomp`, and the port built on it describes execution as "**LLE-first**", with the interpreter as the correctness floor.

The names cannot separate these because the categories were never exclusive. Static recompilation is a translation technique, low level emulation is a statement about whose code runs, and a project can be both. Most of this fleet is. The suffix records what a target was for and when it was started, not what it does.

One suffix does mean something different. A `probe` is an instrument, not a port: [xboxlle-probe](https://github.com/mstan/xboxlle-probe) produces no native executable of any guest program at all, and exists so that "emulator behavior could be compared with measurements from actual silicon instead of assumptions or another emulator". To place a project, read its own execution model statement in `PRINCIPLES.md`, `CLAUDE.md` or its README, and check the amendment dates while you are there.

## Source

- [gcnlle](https://github.com/mstan/gcnlle): [`PRINCIPLES.md`](https://github.com/mstan/gcnlle/blob/master/PRINCIPLES.md) for the baseline rule and the named failure mode; [`docs/DESIGN.md`](https://github.com/mstan/gcnlle/blob/master/docs/DESIGN.md) for the survey that motivated it.
- [cdirecomp](https://github.com/mstan/cdirecomp): [`PRINCIPLES.md`](https://github.com/mstan/cdirecomp/blob/master/PRINCIPLES.md) and [`README.md`](https://github.com/mstan/cdirecomp/blob/master/README.md) for the OS-9 stub decision.
- [psxrecomp](https://github.com/mstan/psxrecomp): [`CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md) for the ban, the three amendments and rule 18; [`runtime/src/bios_hle.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/bios_hle.c) and [`runtime/include/bios_hle_plan.h`](https://github.com/mstan/psxrecomp/blob/master/runtime/include/bios_hle_plan.h) for the tier itself.
- [ndsrecomp](https://github.com/mstan/ndsrecomp): [`PRINCIPLES.md`](https://github.com/mstan/ndsrecomp/blob/main/PRINCIPLES.md) for the floor, [`HLE_ARCHITECTURE.md`](https://github.com/mstan/ndsrecomp/blob/main/HLE_ARCHITECTURE.md) for the contract and the unimplemented selector.
- [vbrecomp](https://github.com/mstan/vbrecomp): [`CLAUDE.md`](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md) and [`docs/SHADOW_ENHANCEMENTS.md`](https://github.com/mstan/vbrecomp/blob/master/docs/SHADOW_ENHANCEMENTS.md).
- [snesrecomp](https://github.com/mstan/snesrecomp): [`docs/LLE_FIRST_ANALYSIS.md`](https://github.com/mstan/snesrecomp/blob/main/docs/LLE_FIRST_ANALYSIS.md), [`recompiler/v2/cfg_loader.py`](https://github.com/mstan/snesrecomp/blob/main/recompiler/v2/cfg_loader.py) and [`runner/src/snes/CX4_NOTES.md`](https://github.com/mstan/snesrecomp/blob/main/runner/src/snes/CX4_NOTES.md).

## Next

- [SNES](/docs/platforms/snes) shows an interpreter floor and two named overlays in one toolchain.
- [PlayStation](/docs/platforms/playstation) is the project whose default moved, and the one the others cite.
- [Nintendo DS](/docs/platforms/nintendo-ds) is the same question answered the other way, with the firmware boot as the proving ground.
- [CD-i](/docs/platforms/cd-i) and [GameCube](/docs/platforms/gamecube) are the two targets that recompile their console's firmware outright.
- [Glossary](/docs/concepts/glossary) defines LLE, HLE, oracle and probe as this fleet uses them, and [co-simulation](/docs/concepts/co-simulation) is how a replacement gets validated.
