---
title: "CD-i"
summary: "cdirecomp recompiles the Philips CD-i system ROM and runs CD-RTOS itself as native code instead of stubbing it. Its README says gameplay is not yet reachable."
pageType: "project"
tags: ["CD-i", "Early development", "Provenance"]
repos:
  - "https://github.com/mstan/cdirecomp"
updated: "2026-08-26"
---

[cdirecomp](https://github.com/mstan/cdirecomp) is the fleet's Philips CD-i toolchain, and it is an early research project. It boots the console's system software as native code, and its README says in bold that gameplay is not yet reachable. You cannot use it to play a CD-i game.

One decision makes it different from every other target here. A CD-i title is not a cartridge image. It is a set of relocatable modules that the console's operating system loads from a disc while it runs. So cdirecomp recompiles that entire operating system, CD-RTOS, and runs it, instead of writing host-side stand-ins for the calls a game makes into it. The catalogue entry is [/hardware/cd-i](/hardware/cd-i).

## Status, in the project's own words

The README opens with a warning banner. Quoted exactly:

> Very early development

> This project boots the real Philips CD-i **system ROM** as native code and can
> perform a **very basic boot of a CD-i title**

> **Gameplay is not yet reachable.** Expect rough edges, missing
> features, incomplete hardware coverage, and breaking changes. This is a
> research project shared in the open, not a finished product

Its "What is **not** done yet" list names the two open pieces of work:

> **Gameplay is not reachable.** Static native promotion of relocated game
> modules, and full-playthrough certification, are open work.

> Broader title compatibility beyond the current Hotel Mario bring-up.

The same README describes the project as "a static recompiler, **not an emulator**". That is the project's framing of its technique. Alongside it, a clean-room 68000 interpreter stays in the runner as a fallback for code not yet promoted to native, and every peripheral is a modelled device. So a missed address becomes a slow moment, not a wrong result. [Is this emulation](/docs/start/is-this-emulation) untangles that properly.

## The SCC68070 and the CD-i machine

The CPU is a Philips SCC68070, a member of the Motorola 68000 family, so the front half of the toolchain is a 68000 recompiler. Around it the runner models the machine the CD-i actually is: the MCD212 video decoder, the CDIC and CIAP CD and XA audio path, and the SLAVE and IKAT input controllers. Discs are Green Book Mode-2 images.

The 68000 frontend is no longer stored in this repository. Every frontend source file under `recompiler/src/` is a two-line forwarding shim into a git submodule, `external/m68k-recomp-core`. That is the shared 68000 module: the frontend was copied from [segagenesisrecomp](/docs/platforms/sega-genesis) in May 2026, the two diverged, and they were then reunified through this submodule.

## Why the operating system comes first

`PRINCIPLES.md` states the platform difference and the decision that follows:

> A CD-i title runs on **CD-RTOS / OS-9**. Code arrives as relocatable OS-9 modules loaded at run time; the program talks to the system through `TRAP #0` OS-9 calls (F$Load, F$Link, I$Read, …).

> We recompile the CD-RTOS system ROM itself (kernel + file managers + drivers + player shell) and run the real OS as native C. We do **NOT** hand-write OS-9 HLE stubs

The reason is a failure inside the fleet, not a preference. The same file continues: "psxrecomp proved that path fails (faked syscall outputs + drifting C-side kernel state)", and the README puts it as "psxrecomp showed that stubbing the BIOS leads to silent failure; CD-i takes the opposite, faithful route." The [PlayStation page](/docs/platforms/playstation) covers that project, and [high level and low level](/docs/concepts/hle-and-lle) covers the argument.

Two consequences run through the code. Unimplemented things stop the world rather than return something plausible: an unknown opcode is a "loud failure, never a stub", and an unmapped bus access is a loud abort. And an indirect call landing on an address with no generated function is the most serious class of bug here, because a skipped subroutine is silent. The runtime counts those dispatch misses and prints every new one.

From [`runner/src/runtime.c`](https://github.com/mstan/cdirecomp/blob/master/runner/src/runtime.c):

```c title="runner/src/runtime.c"
void genesis_log_dispatch_miss(uint32_t addr) {
    g_miss_count_any++;
    g_miss_last_addr  = addr;
    g_miss_last_frame = g_frame_count;
    for (int i = 0; i < g_miss_unique_count; i++)
        if (g_miss_unique_addrs[i] == addr) return;
    if (g_miss_unique_count < CDI_MAX_MISS_UNIQUE)
        g_miss_unique_addrs[g_miss_unique_count++] = addr;
    fprintf(stderr, "[dispatch-miss] no generated function at $%08X (frame %llu)\n",
            addr, (unsigned long long)g_frame_count);
}
```

The exported symbol is still called `genesis_log_dispatch_miss`, inherited from the segagenesisrecomp frontend the project grew out of.

## The commands

There are three binaries, an oracle and a checker. `CdiRecompBios` recompiles the system ROM to C, `CdiRecomp` inventories a disc, `CdiRuntime` runs the result, and `CdiOracle` wraps a separately authored CD-i emulator, CeDImu, serving the same debug surface one port up so the two can be compared. The build order is not optional.

> **You provide this.** cdirecomp ships no system ROM and no disc images. Its license note says the license "covers the cdirecomp source only. It grants no rights to any Philips, Nintendo, or other third-party intellectual property; you must supply your own legally obtained system ROM and disc images." See [the game file you supply](/docs/concepts/the-game-file-you-supply).

```sh
cmake -S recompiler -B build/recompiler -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build/recompiler -j
build/recompiler/CdiRecompBios.exe bios/cdi490a.rom --emit
cmake -S runner -B build/runner-release -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build/runner-release -j
build/runner-release/CdiRuntime.exe bios/cdi490a.rom --disc "path/to/Game.cue"
```

`--emit` writes `bios/generated/cdrtos_full.c` and `cdrtos_dispatch.c`. `--disc` inserts a single-track Mode-2 image at power-on, and `--headless`, `--hold`, `--stop-frame N` and `--input-script` exist for automated runs. The debug server listens on `127.0.0.1:4380`, the oracle one port higher. After a run, the checks the project names are the unit tests, the dispatch-miss gate, and a set of smoke scripts driven over that debug port:

```sh
ctest --test-dir build/runner-release --output-on-failure
python tools/check_dispatch_misses.py --port 4380
python tools/shell_idle_smoke.py
```

The middle one is the gate that comes first. It documents its own exit codes: "Exit codes: 0 = no misses, 1 = misses recorded, 2 = server unreachable."

## What runs today

The firmware milestone is the one that closed. `BIOS-CLOSEOUT.md` records the BIOS and player-shell closeout on 2026-07-14, with runner tests and co-simulation self-tests passing at the time it was written. Those are the repository's own records. Beyond the shell, the README's claim is a very basic boot of a CD-i title, with Hotel Mario as the single bring-up and no compatibility story past it.

## How the BIOS provenance was handled

This is the part of cdirecomp worth copying. Because it recompiles firmware and models hardware that other people have already emulated, it documents where every implementation came from. `PROVENANCE.md` gives each major component an independent implementation basis and the evidence for it. SCC68070 exception frames, timers and UART come from the SCC68070 User Manual. The DS1216 phantom clock comes from the Analog Devices data sheet. MCD212 video comes from the CD-i Full Functional Specification. Every source is listed by URL, and the device sources say the same at the top of the file.

From [`runner/src/mcd212_video.c`](https://github.com/mstan/cdirecomp/blob/master/runner/src/mcd212_video.c):

```c title="runner/src/mcd212_video.c"
/*
 * MCD212 scanline decoder and compositor.
 *
 * Implemented from the CD-i Full Functional Specification video rules:
 * CLUT/RGB555/DYUV/run-length image coding, mosaic and pixel hold, two-plane
 * transparency/matte/ICF composition, and the hardware cursor.  The module is
 * deterministic and communicates with the host only through published ARGB
 * frames; all source bytes come from emulated MCD212 DRAM.
 */
```

`PROVENANCE.md` then records an audit of that claim, a rule that any future implementation must cite a hardware specification or a project-owned experiment, and the removal of a previously vendored third-party 68000 core, including a history rewrite so that source is in no commit. The optional CeDImu oracle is git-ignored, never packaged, and treated as test evidence rather than implementation authority. `bios/README.md` calls the system ROM "**copyrighted Philips player firmware**", says it is not shipped, and asks you to dump it from a player you own. [Provenance](/docs/fleet/provenance) gives the full account.

## Known limits

- Gameplay is not reachable. Static native promotion of relocated game modules is open work.
- Four defects are open in `ISSUES.md`: intro backgrounds that lag and then stop, a stage entry that never completes, a random black-screen wedge after starting a title, and a random wild jump during shell boot. The last two are the same timing-race family.
- `external/m68k-recomp-core` is a submodule and the recompiler will not configure without it. The README's build steps do not mention initialising it.
- The 24-bit CRC residue check on OS-9 modules is not verified yet, and `CLAUDE.md` tells you not to trust its `crc_ok` result.
- The packaged runtime checkpoint numbered 0.0.1 predates the current source. Do not read it as a current release.

## What recomp, lle and probe mean here

cdirecomp is named `recomp`, meaning it is a [static recompiler](/docs/start/what-is-static-recompilation), yet its README describes its philosophy as "**LLE (low-level emulation) and static / native-first**". That is not a contradiction. An `lle` in a repository name records what the project does with the machine's firmware, not which translation technique it uses, and a project can be both, as this one is. The full three-way distinction, including what a `probe` is, is on the [Xbox page](/docs/platforms/xbox).

## Source

- [mstan/cdirecomp](https://github.com/mstan/cdirecomp), PolyForm Noncommercial License 1.0.0.
- [`README.md`](https://github.com/mstan/cdirecomp/blob/master/README.md) for status and build steps, [`bios/README.md`](https://github.com/mstan/cdirecomp/blob/master/bios/README.md) for what you supply.
- [`PRINCIPLES.md`](https://github.com/mstan/cdirecomp/blob/master/PRINCIPLES.md) for the no-stub rule and the CD-RTOS decision, [`docs/ARCHITECTURE.md`](https://github.com/mstan/cdirecomp/blob/master/docs/ARCHITECTURE.md) for the recompiler, runner and oracle split.
- [`PROVENANCE.md`](https://github.com/mstan/cdirecomp/blob/master/PROVENANCE.md) and [`BIOS-CLOSEOUT.md`](https://github.com/mstan/cdirecomp/blob/master/BIOS-CLOSEOUT.md) for the implementation-basis table and the closeout evidence.
- [`ISSUES.md`](https://github.com/mstan/cdirecomp/blob/master/ISSUES.md) for the open defects, [`TCP.md`](https://github.com/mstan/cdirecomp/blob/master/TCP.md) for the debug protocol.

## Next

- [CD-i in the hardware catalogue](/hardware/cd-i), the shorter entry for this console.
- [Provenance](/docs/fleet/provenance), the full account of the discipline summarised above.
- [High level and low level](/docs/concepts/hle-and-lle), for why stubbing an OS is the thing this project refuses to do.
- [Glossary](/docs/concepts/glossary), for dispatch miss, oracle, first divergence and the rest.
