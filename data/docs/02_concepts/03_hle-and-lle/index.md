---
title: "High level and low level"
summary: "LLE is the floor: every toolchain here runs the console's own firmware as its baseline. HLE is allowed above that floor for convenience and speed, and only because the floor is what proves it correct."
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

Two abbreviations turn up in every repository here.

**LLE** means low level emulation. It runs the console's own code: the firmware the machine actually shipped with, and the game's code on top of it. That code is either recompiled ahead of time or acted out one instruction at a time.

**HLE** means high level emulation. It skips the console's code and runs a native reimplementation written to do the same job.

Say a game asks the console to open a file. Under LLE, the console's own file code runs and does the work. Under HLE, native code hands back an answer, and the console's code never runs.

## The rule

LLE is the floor. Every toolchain here runs the console's own firmware as its baseline. HLE is allowed only for convenience and performance, and it must have the LLE floor underneath it to assert correctness against.

That is the fleet's position. [gcnlle](https://github.com/mstan/gcnlle) writes it as an order of work:

> "**LLE / static recompilation / native execution is the baseline.** Architect as much of the system that way as you can, and on platforms that recompile their own firmware/BIOS, run that recompiled firmware."

The same document names the one banned shape: "load-bearing HLE that fakes the answer". That means making up a result so a milestone looks done, with no faithful version under it and nothing checking it.

[cdirecomp](https://github.com/mstan/cdirecomp) is the plainest case. It recompiles the CD-i's whole system ROM and runs the real operating system as native code, instead of hand writing stubs for its system calls. Some consoles have no firmware to recompile. On a cartridge machine the floor is the console's own instructions, run faithfully. The rest of the rule is the same.

A project's name does not tell you its position. cdirecomp is named `recomp` and calls its philosophy "**LLE (low-level emulation) and static / native-first**". The [glossary](/docs/concepts/glossary) records the other name collisions.

## Why the floor is required

A reimplementation can only be proven correct by comparing it against the real thing. Take the console's own code away and a wrong replacement looks exactly like a right one. The game runs either way, and nobody can tell which one they have. A fake answer also hides bugs in the recompiler, because the code that would have exposed them no longer runs.

So the floor is not there for purity. It is there to make every shortcut checkable. gcnlle puts the reason in one line:

> "Both are safe for the same reason the fake-the-answer kind is not: an independent thing is always diffing them, so they cannot silently mask a bug."

The comparing is [co-simulation](/docs/concepts/co-simulation). Two versions of the console run the same game from the same reset, both stop at the same point in game time, and the run halts at the first difference. That needs a faithful version to be the other side of the comparison. Remove the floor and there is nothing left to check against.

[snesrecomp](https://github.com/mstan/snesrecomp) says the same thing about meaning. The ROM and the live processor state are its correctness model, and an HLE handler is never allowed to define what the game does.

## What HLE is allowed to be

Two reasons are accepted. Both keep the floor linked and runnable.

**Convenience.** [psxrecomp](https://github.com/mstan/psxrecomp) lays a layer over the PlayStation BIOS so a player can skip the boot animation. Its rule for that layer:

> "**LLE remains the reference implementation and the oracle.** It stays fully
> linked, load-bearing, and selectable; every BIOS call the HLE layer does
> not implement transparently falls through to the recompiled BIOS, so HLE is
> never load-bearing beyond what it covers and never becomes the verification
> oracle."

The mechanism is one function pointer, checked before the recompiled BIOS runs. A nonzero return means the call was handled against the game's own memory. Zero falls through to the console's own code.

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

The layer costs nothing when it is off: "With HLE off the build is byte-identical to a build without the tier." Timing through it is approximate, so "LLE remains the timing oracle."

**Performance.** [ndsrecomp](https://github.com/mstan/ndsrecomp) allows a measured replacement, and only after the floor has passed its own checks:

> "The boot, BIOS, firmware, recompiled CPU, and software-renderer paths above are
> the accuracy floor. Once that floor passes the independent-oracle gates, a
> measured subsystem or title routine may receive an optimized/HLE replacement.
> That replacement may become the normal path, but the original implementation
> stays linked, forceable, and authoritative for differential verification and
> fallback."

A replacement starts off by default. It has to be forced on and proven against the floor. It earns default-on status one item at a time.

A layer is permitted, not required. [vbrecomp](https://github.com/mstan/vbrecomp) allows one shape only, a shadow. A higher fidelity version runs beside the faithful one and is compared against it continuously. It takes over only after a proven run of agreement. It reverts loudly the moment it stops matching. It is off by default, and with it off the output is byte identical.

![The floor is the same in all three: the console's own instructions, recompiled or interpreted. What differs is how high above it a replacement may sit. psxrecomp hooks the BIOS entry vector. ndsrecomp allows a hook only at an exact function start. vbrecomp allows only a shadow that runs beside the floor and is diffed against it.](./layering.svg)

## Older documents in the repositories

Some documents inside these repositories phrase this differently. A few still read as a flat ban on HLE of any kind. Those are older than the position above, and they have not all been updated yet. The rule at the top of this page is the current one.

## Source

- [gcnlle](https://github.com/mstan/gcnlle): [`PRINCIPLES.md`](https://github.com/mstan/gcnlle/blob/master/PRINCIPLES.md) for the baseline rule, the banned shape, and the test to apply before adding any HLE.
- [cdirecomp](https://github.com/mstan/cdirecomp): [`PRINCIPLES.md`](https://github.com/mstan/cdirecomp/blob/master/PRINCIPLES.md) and [`README.md`](https://github.com/mstan/cdirecomp/blob/master/README.md).
- [psxrecomp](https://github.com/mstan/psxrecomp): [`CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md) for the oracle rule, [`runtime/include/bios_hle.h`](https://github.com/mstan/psxrecomp/blob/master/runtime/include/bios_hle.h) and [`runtime/src/bios_hle.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/bios_hle.c) for the layer.
- [ndsrecomp](https://github.com/mstan/ndsrecomp): [`PRINCIPLES.md`](https://github.com/mstan/ndsrecomp/blob/main/PRINCIPLES.md), [`HLE_ARCHITECTURE.md`](https://github.com/mstan/ndsrecomp/blob/main/HLE_ARCHITECTURE.md).
- [vbrecomp](https://github.com/mstan/vbrecomp): [`CLAUDE.md`](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md), [`docs/SHADOW_ENHANCEMENTS.md`](https://github.com/mstan/vbrecomp/blob/master/docs/SHADOW_ENHANCEMENTS.md).
- [snesrecomp](https://github.com/mstan/snesrecomp): [`docs/LLE_FIRST_ANALYSIS.md`](https://github.com/mstan/snesrecomp/blob/main/docs/LLE_FIRST_ANALYSIS.md).

## Next

- [Co-simulation](/docs/concepts/co-simulation) is how anything above the floor gets checked.
- [PlayStation](/docs/platforms/playstation) is the convenience layer in place.
- [Nintendo DS](/docs/platforms/nintendo-ds) is the performance path.
- [CD-i](/docs/platforms/cd-i) recompiles its console's whole system ROM.
