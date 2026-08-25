---
title: "High level and low level"
summary: "Every toolchain here runs the console's own firmware as its baseline. The live argument is whether a shortcut that skips that code may ever be what a player gets by default, and two projects answer it in opposite ways."
pageType: "concept"
tags: ["Architecture", "LLE", "HLE", "Correctness"]
repos:
  - "https://github.com/mstan/gcnlle"
  - "https://github.com/mstan/cdirecomp"
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/ndsrecomp"
  - "https://github.com/mstan/vbrecomp"
  - "https://github.com/mstan/snesrecomp"
updated: "2026-08-25"
---

Two abbreviations you will meet in every repository here. **LLE**, low level emulation, means running the console's own code: its firmware and its game code, recompiled or acted out instruction by instruction, on top of a model of the hardware. **HLE**, high level emulation, means skipping that code and having the host do the same job its own way. If a game asks the console to open a file, LLE runs the console's file code, and HLE hands back an answer without it.

Every toolchain here uses LLE as its baseline. So the argument is not which one wins. It is what HLE is allowed to be, and whether a shortcut may ever be what a player gets by default. Two projects have answered that in opposite directions and neither has moved.

## The baseline, as gcnlle writes it

[gcnlle](https://github.com/mstan/gcnlle) states it as an order of preference, not a taste:

> "**LLE / static recompilation / native execution is the baseline.** Architect as much of the system that way as you can, and on platforms that recompile their own firmware/BIOS, run that recompiled firmware."

HLE is allowed in one position only: as "a **deliberate subsystem replacement**" on top of a working low level baseline. It is banned as "the **starting point / sole implementation**", which the same document calls "the historical failure mode: it leaves *half an ecosystem*". The banned kind has a name, "load-bearing HLE that fakes the answer": making up a result so a milestone looks done, with no faithful version underneath and nothing checking it.

The clause about firmware only applies to consoles whose firmware a project can recompile. A cartridge machine with none gets a different baseline, so the positions below belong to projects rather than to one rule.

## Why the rule exists

This is a lesson, not a preference. [cdirecomp](https://github.com/mstan/cdirecomp) recompiles the CD-i's whole system ROM instead of faking its system calls, and says why in one line:

> "We do **NOT** hand-write OS-9 HLE stubs, psxrecomp proved that path fails (faked syscall outputs + drifting C-side kernel state)"

Its README repeats it: "psxrecomp showed that stubbing the BIOS leads to silent failure; CD-i takes the opposite, faithful route." [ndsrecomp](https://github.com/mstan/ndsrecomp) describes the same debt: fake system calls and skipped boots "are HLE-by-accident, and a load-bearing interpreter is the same debt in disguise: it hides every codegen bug until the day it comes out, then they all fire at once."

## Where the projects disagree

All of them are low level first. What differs is what the layer above may be.

[psxrecomp](https://github.com/mstan/psxrecomp) started with a ban. Its constitution still says, in its opening section, "There is **no HLE BIOS layer** in v4. No `bios.c` with case branches intercepting A0/B0/C0 vectors." Three later amendments changed that. The first allows a faithful HLE replacement where the low level path has a real landmine, as long as it works on the game's own data and is checked against an independent reference. The other two make HLE a swappable tier, then the default for the BIOS, turned off per game with `[runtime] bios_hle = false`. The reason is boot convenience. The document has no marker saying which passage is current, so anyone reading only the opening will state the opposite of what ships.

The mechanism is narrower than the policy language sounds, and it is shaped by this console: the PlayStation kernel is entered through three fixed addresses, so a hook has an obvious place to sit. The tier is one function pointer, checked at the top of the dispatch loop. A nonzero return means the call was handled against the game's own memory. Zero falls through to the recompiled BIOS.

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

Six kernel calls are implemented, all in the event family, working on the game's own tables in its own memory. Threads, controllers, memory cards and the CD stack all fall through to the console's own code. Turning the tier off is not a rebuild: "With HLE off the build is byte-identical to a build without the tier." And the timing numbers it reports are estimates, so "LLE remains the timing oracle."

ndsrecomp forbids exactly that shape. Faking a BIOS call, skipping the firmware boot or hand-waving a direct boot all invalidate a piece of work there: "SWIs land at the BIOS SWI vector and the recompiled BIOS handles them. There is no `if (swi == X) hle_...()`". The firmware boot runs for real, copying and relocating the game the way the console does.

The word HLE is then reserved for something else:

> "The recompiled/LLE implementation is the accuracy floor and remains linked,
> runnable, and forceable. Performance HLE is a set of measured replacements
> above that floor. A replacement may become the default path after promotion;
> it never deletes its LLE body or changes a miss into a Tier-3 interpreter call."

A replacement is chosen by the content of the code, not by its address, and that is a DS fact: one address can hold several different overlays over a session, so a table keyed by address alone "can therefore miss calls or select the wrong routine". The replacement keeps the original body and is consulted only at an exact function start. It is a design, not shipped code: the selector is not in the tracked sources yet. What is built is the measuring half.

[vbrecomp](https://github.com/mstan/vbrecomp) refuses both positions. It has no fallback interpreter, "There is **no V810 interpreter** in this project. Not as a fallback.", and no replacement layer:

> "There is **no HLE layer**. No `bios.c` synthesising what a routine
> "would have produced"."

Its one exception is a shadow: a more accurate version that runs beside the faithful one, is compared against it continuously, takes over only after a proven run of agreement, and is off by default.

![The floor is the same in all three, so the disagreement is about height, not kind: psxrecomp hooks the BIOS entry vector and ships that on by default, ndsrecomp forbids that hook and allows one only at a function start, and vbrecomp allows nothing above the floor at all.](./layering.svg)

## Three scopes to check

[snesrecomp](https://github.com/mstan/snesrecomp) puts the interpreter, not the compiled output, in charge of meaning:

> "The ROM and live 65816 architectural state are the correctness model.
> Interpreter/LLE execution must remain available for every reachable address.
> AOT bodies and HLE handlers are optional materializations selected only after
> analysis stabilizes; neither is allowed to define game semantics."

It also adds a third layer, below the console. Two settings, `hle_func` and `hle_dispatch`, let one port replace one function or one dispatch site with hand written C, under the rule that "Disabling the overlay must expose the correct underlying implementation."

So a claim about HLE here means nothing until you know all three: the fleet's baseline, one toolchain's policy, and what one game's configuration turned on. The repository names will not tell you either. cdirecomp is named `recomp` and calls its philosophy "**LLE (low-level emulation) and static / native-first**"; gcnlle is named `lle` and is a static recompiler. The [glossary](/docs/concepts/glossary) records the rest of those collisions.

## Source

- [gcnlle](https://github.com/mstan/gcnlle): [`PRINCIPLES.md`](https://github.com/mstan/gcnlle/blob/master/PRINCIPLES.md) for the baseline rule and the named failure mode.
- [cdirecomp](https://github.com/mstan/cdirecomp): [`PRINCIPLES.md`](https://github.com/mstan/cdirecomp/blob/master/PRINCIPLES.md) and [`README.md`](https://github.com/mstan/cdirecomp/blob/master/README.md).
- [psxrecomp](https://github.com/mstan/psxrecomp): [`CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md) for the ban and the three amendments, [`runtime/src/bios_hle.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/bios_hle.c) for the tier.
- [ndsrecomp](https://github.com/mstan/ndsrecomp): [`PRINCIPLES.md`](https://github.com/mstan/ndsrecomp/blob/main/PRINCIPLES.md), [`HLE_ARCHITECTURE.md`](https://github.com/mstan/ndsrecomp/blob/main/HLE_ARCHITECTURE.md).
- [vbrecomp](https://github.com/mstan/vbrecomp): [`CLAUDE.md`](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md), [`docs/SHADOW_ENHANCEMENTS.md`](https://github.com/mstan/vbrecomp/blob/master/docs/SHADOW_ENHANCEMENTS.md).
- [snesrecomp](https://github.com/mstan/snesrecomp): [`docs/LLE_FIRST_ANALYSIS.md`](https://github.com/mstan/snesrecomp/blob/main/docs/LLE_FIRST_ANALYSIS.md), [`recompiler/v2/cfg_loader.py`](https://github.com/mstan/snesrecomp/blob/main/recompiler/v2/cfg_loader.py).

## Next

- [PlayStation](/docs/platforms/playstation) is the project whose default moved, and the one the others cite.
- [Nintendo DS](/docs/platforms/nintendo-ds) answers the same question the other way.
- [CD-i](/docs/platforms/cd-i) and [GameCube](/docs/platforms/gamecube) recompile their console's firmware outright.
- [Co-simulation](/docs/concepts/co-simulation) is how a replacement gets checked.
