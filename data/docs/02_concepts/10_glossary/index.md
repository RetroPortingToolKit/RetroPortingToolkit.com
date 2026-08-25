---
title: "Glossary"
summary: "Forty-three terms this fleet uses as if they were common knowledge, each defined the way the repositories actually use it, with the console-specific ones named as such and the places the fleet contradicts itself marked rather than smoothed over."
pageType: "reference"
tags: ["Glossary", "Vocabulary", "Reference"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/gbrecompiled"
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/smsggrecomp"
  - "https://github.com/mstan/ndsrecomp"
  - "https://github.com/mstan/vbrecomp"
  - "https://github.com/mstan/cdirecomp"
  - "https://github.com/mstan/gcnlle"
  - "https://github.com/mstan/xboxlle-probe"
updated: "2026-08-23"
---

The repositories in this fleet use the forty-three terms below as though everyone already knows them, and define almost none of them anywhere a newcomer would look. This page is that missing definition list. Each entry is the meaning the repositories actually attach to the word, not a textbook meaning, with a link to the page or the repository that treats it properly. Where the fleet uses one word for two things, the entry says so, because a reader who has spotted the inconsistency is reading correctly.

Some of these words describe hardware only one console has. Those entries name the console, because a term appearing here does not make it fleet-wide.

Terms are alphabetical and every one has its own anchor, so a page can link straight to a definition.

## The terms

### Always-on ring

A bounded buffer that records continuously from process start and is queried backwards after the fact. Every toolchain with a debug server has several: a store ring, a function-entry ring, a dispatch-miss ring. segagenesisrecomp's [`PRINCIPLES.md`](https://github.com/mstan/segagenesisrecomp/blob/master/PRINCIPLES.md) gives the reason: by the time an agent has finished arming a trace, the workload has usually already run the thing it wanted to see. See [Machine-readable surfaces](/docs/agents/machine-surfaces).

### AOT (ahead of time)

A statically compiled C body for one exact guest entry point, produced before the program runs. snesrecomp uses the term in explicit contrast to its interpreter: AOT bodies are "optional materializations selected only after analysis stabilizes", and are not allowed to define what the game means. [Static recompilation](#static-recompilation) is the technique, AOT is the status of one emitted function.

### Arm-then-record

The named anti-pattern: connect a debugger, arm a filter, run the workload, dump the result. segagenesisrecomp, ndsrecomp and cdirecomp all forbid it by name, on the grounds that a conclusion of "I observed no events" drawn from an armed trace is a lie of omission. The replacement is the [always-on ring](#always-on-ring).

### Bank

Two different things, depending on which repository you are reading, and this is the fleet's most confusing collision.

In [ndsrecomp](https://github.com/mstan/ndsrecomp) a bank is a unit of statically recompiled output: one `generated/<bank>.c` plus a header and a dispatch table, with named banks such as `arm9_bios` and `fw_arm7`. In [nesrecomp](https://github.com/mstan/nesrecomp) and the Sega toolchains a bank is a unit of the guest cartridge's own address space, selected by hardware. See [bank switching](#bank-switching).

### Bank switching

Guest hardware mapping different parts of a cartridge into the same CPU address range at different times, so one address does not identify one piece of code. The hardware that does it is a [mapper](#mapper). On banked NES cartridges the last 16 KB of program ROM is permanently mapped at `$C000` to `$FFFF` while `$8000` to `$BFFF` holds whichever bank the mapper last selected, which nesrecomp records in [`EXTRACTION.md`](https://github.com/mstan/nesrecomp/blob/master/EXTRACTION.md). Those are NES addresses and another banked console has its own windows. It is one of the reasons [code discovery](#code-discovery) is hard: the recompiler has to know which bank was live to know what an address meant.

### Baserom

The user's own dump of the original cartridge, which the project does not ship and the runner verifies by hash before it will start. MinishCapRecomp's [`baserom.md`](https://github.com/mstan/MinishCapRecomp/blob/main/baserom.md) is the canonical statement: "We do **not** ship the ROM or the BIOS. You must provide your own dumps of both". Ten cartridge ports carry a file with that name. The disc equivalent is a [disc image](#disc-image). See [The game file you supply](/docs/concepts/the-game-file-you-supply).

### Burndown

A living per-console accuracy scorecard, kept as a markdown file in the toolchain repository, listing fixed axes and giving each one a status, an external comparison and a validation method. Six repositories carry one, all modelled on psxrecomp's template. It is a tracking method, not a claim: an axis does not count as done until it passes its [gate](#gate). See [What correct enough means](/docs/concepts/accuracy-and-burndowns).

### Canon path

The faithful output, the one that stays shipped and also acts as the verification oracle for any optional enhancement running beside it. segagenesisrecomp, vbrecomp and gcnlle all use the phrase in the same way. See [shadow](#shadow).

### Chain hash

A cumulative fold of every checkpoint's state hash across a whole [co-simulation](#co-simulation) run. Because it accumulates, any divergence anywhere sticks in the final value, which makes that value a pinnable regression baseline. gbrecompiled commits its baselines to `tools/cosim_baselines.tsv` and asserts them by hand or in CI, which the project calls a ratchet.

### Code discovery

The static analysis that decides which bytes of a game binary are executable code and where each function starts, also called the function finder. The five step shape is fleet-wide: seed, walk, guess, validate, catch the rest at run time. What a seed is, and what makes one address ambiguous, is not. In nesrecomp it is a walk from the interrupt vectors plus heuristic scanners, in `recompiler/src/function_finder.c`; on SNES an entry is keyed by address and [mode flags](#mode-flags) together; on Game Boy Advance by address and instruction set, see [interworking](#interworking); on PlayStation the seeds come off the disc. Discovery that misses code produces a [dispatch miss](#dispatch-miss) at run time. See [Telling code from data](/docs/concepts/code-discovery).

### Combined work

A licensing term this fleet needs because a runner can link code under a stronger license than the project's own. ndsrecomp is MIT, but its runner links vendored melonDS sources, so the shipped `nds_runner` executable is a combined work that must be distributed under GPL-3.0-or-later while the recompiler, the generated banks and the oracle-independent tooling stay MIT. See [Licenses](/docs/fleet/licenses).

### Co-simulation

Running two complete implementations of the same machine from the same reset, checkpointed on a shared guest clock, comparing full architectural state at each checkpoint and halting at the first difference. psxrecomp's and nesrecomp's own documents are emphatic that this is a decision procedure and not a probe: it either agrees or it names the exact checkpoint where it stopped agreeing. See [Co-simulation](/docs/concepts/co-simulation) and [Set up co-simulation](/docs/guides/set-up-co-simulation).

### Coverage

Two senses, both in daily use, and the fleet does not disambiguate them.

**Recompiler coverage** is how much of the game binary [code discovery](#code-discovery) found and emitted, measured as [dispatch misses](#dispatch-miss) and against a [ground truth](#ground-truth) trace. **Test coverage** is how much of the decoder and code generator the synthetic harnesses exercise, which segagenesisrecomp's `COVERAGE.md` describes as important classes and regressions rather than the full opcode matrix. gbarecomp adds a rule it calls coverage honesty: a build may not be described as fully native while any guest program counter was interpreted, unless that is reported.

### Cycle exact

Hardware being advanced and sampled at the exact sub-instruction cycle rather than at whole-instruction granularity. In [gbrecompiled](https://github.com/mstan/gbrecompiled) it is the name of a phased programme, not a claimed state, and the project distinguishes it from the coarser verdicts it uses elsewhere. Do not read the phrase as a status. See [Timing models](/docs/concepts/timing-models).

### Disc image

The disc equivalent of a [baserom](#baserom), and on PlayStation the sector format matters. MegaManX6Recomp's [`DISC.md`](https://github.com/mstan/MegaManX6Recomp/blob/master/DISC.md) requires a "Redump-verified clean dump" in "**bin/cue, single track, MODE2/2352, NTSC-U**" and warns against converting to ISO because a 2048-byte cooked image discards the Mode-2 Form-2 sectors the console uses for streamed audio and video. Eight PlayStation ports carry a file with that name.

### Dispatch miss

The runtime jumping to a guest address for which no function was generated. Every toolchain treats it as a failure of [code discovery](#code-discovery) or code generation rather than something to patch around: cdirecomp glosses a miss as a skipped subroutine and therefore a silent game-breaking bug, and segagenesisrecomp's [`PRINCIPLES.md`](https://github.com/mstan/segagenesisrecomp/blob/master/PRINCIPLES.md) says a game with dispatch misses is fundamentally broken. gcnlle calls the same event a native miss. What happens next differs: some projects interpret and log, gbarecomp recompiles on the fly and caches, and strict modes abort. See [How changes go wrong here](/docs/agents/failure-modes).

### Divergence

A state difference between two implementations under [co-simulation](#co-simulation). See also [first divergence](#first-divergence), which is the only one worth debugging.

### First divergence

The earliest checkpoint at which the two implementations differ. Every debugging protocol in the fleet mandates finding it rather than investigating the visible symptom, because everything after it is consequence. psxrecomp's [`PRINCIPLES.md`](https://github.com/mstan/psxrecomp/blob/master/PRINCIPLES.md) puts it as "Never debug the final symptom." See [Debug a divergence](/docs/guides/debug-a-divergence).

### Flat step

An emission mode that produces one host function executing exactly one decoded guest instruction from an explicit program counter and returning, so the host scheduler regains control at every instruction boundary. smsggrecomp's `--flat-step` exists so a Z80 recompiled by one toolchain can run as the sound coprocessor inside another toolchain's scheduler, segagenesisrecomp's being the one it was built for. It is the slowest and most preemptible point on the [timing model](/docs/concepts/timing-models) spectrum. See [Master System and Game Gear](/docs/platforms/master-system-game-gear).

### Gate

A pass or fail precondition that must hold before a measurement is believed. The word covers three different ladders here, so check which one a document means. gbrecompiled's co-simulation gates are five validation conditions, starting with two determinism checks and an injected-fault localisation, under the instruction to trust nothing until they pass. The burndown dual gate is the two conditions an accuracy axis must satisfy to count as done: cross-referenced against an external reference, and runtime-validated against an accurate oracle. ndsrecomp's G1, G2 and G3 are standing regression gates every work item has to end at.

### Ground truth

Behaviour recorded from a mature emulator and fed back into static analysis as seeds. In gbrecompiled it is a trace of every executed bank and address pair, captured with PyBoy and used as recompiler roots. It improves [coverage](#coverage) and proves nothing about correctness, which is what separates it from [co-simulation](#co-simulation).

### GTE (geometry transformation engine)

The PlayStation's COP2: the fixed point geometry coprocessor a PS1 game uses for vertex transformation and perspective projection. It has no counterpart on any other console here, so a sentence about the GTE is never a sentence about the fleet. psxrecomp emits each GTE command as one runtime call, `gte_execute(cpu, cmd)`, and its registers cross the recompiler and runtime boundary as `cpu->gte_data[]` and `cpu->gte_ctrl[]`. See [PlayStation](/docs/platforms/playstation).

### HLE (high level emulation)

Reimplementing what a piece of guest code would have done, so the result comes from host code instead of from the guest's own instructions. Every toolchain here treats [LLE](#lle-low-level-emulation) as the baseline and permits HLE only as a deliberate subsystem replacement above a proven low level floor. The word does not mean the same thing in every repository, which is the subject of [High level and low level](/docs/concepts/hle-and-lle): in psxrecomp it names a swappable BIOS tier that is now the shipping default, and in ndsrecomp it names a performance replacement that may never delete the faithful body beneath it.

### Interworking

An ARM7TDMI switching between the 32-bit ARM and 16-bit Thumb instruction sets while it runs, encoded in bit 0 of a branch target. gbarecomp's rule is "Treat it as one CPU, not two." It is the defining difficulty of the Game Boy Advance toolchain, because the recompiler has to know which instruction set was live at every address. See [Game Boy Advance](/docs/platforms/game-boy-advance).

### LLE (low level emulation)

Executing the console's own instructions, including its firmware or BIOS where the platform allows it, over a model of the hardware underneath. gcnlle's [`PRINCIPLES.md`](https://github.com/mstan/gcnlle/blob/master/PRINCIPLES.md) states it as an ordering rather than a preference: low level emulation, static recompilation and native execution are the baseline, and as much of the system as possible is architected that way. In snesrecomp the interpreter is called the correctness floor and the authority, not a fallback of last resort.

### Mapper

Cartridge hardware that swaps which part of the game ROM appears in the CPU's address window, so one address does not name one piece of code. It is what performs [bank switching](#bank-switching). The word is used here mostly about the NES, where the iNES header carries a mapper number and nesrecomp's runner implements NROM, MMC1, UxROM, MMC3, mapper 40 and GxROM. That numbering is the NES's and means nothing elsewhere: smsggrecomp models the Sega and Codemasters mappers, and the SNES equivalent is the LoROM, HiROM and FastROM mapping snesrecomp detects automatically. See [NES](/docs/platforms/nes).

### Mod manifest

The `manifest.toml` at the root of a mod package, which declares the package identity, the version, the features it contributes and the exact game dump it targets by hash. Package, feature and operation are three separate concepts: a package is an installation and trust boundary, a feature is what a player toggles, and an operation is the runtime primitive an enabled feature produces. See [Mod manifest](/docs/reference/mod-manifest) and [Write a mod](/docs/guides/write-a-mod).

### Mode flags

The 65816 processor status bits M and X, which select 8-bit or 16-bit width for the accumulator and for the index registers. Because the same instruction bytes mean different things under different flag settings, snesrecomp cannot translate a function once: it emits one variant per entry combination, with the flags in the symbol name. This is the reason a SNES port has several C functions where a NES port has one. See [SNES](/docs/platforms/snes).

### Oracle

The reference implementation a recompiled build is compared against. Three senses are in use.

A **pairing 1** oracle is the project's own interpreter backend, which proves the recompiler agrees with the project's own understanding and is blind to bugs in the runner. A **pairing 2** oracle is an independently authored emulator, and is the only instrument that can see runner bugs. psxrecomp also uses the word for static truth, naming Ghidra for what the code is supposed to do and a separate emulator process for what the hardware does. See [Co-simulation](/docs/concepts/co-simulation).

### Overlay

On PlayStation, a chunk of game code streamed from disc into a fixed RAM window at run time and later overwritten by the next one. Because it does not exist in the executable at build time, an ahead-of-time recompiler cannot see it, which is what [runtime recompilation](#runtime-recompilation) exists to solve. Two other consoles borrow the word: ndsrecomp for RAM-resident code holding several generations at one address, gbarecomp for the runtime healed native cache between its static table and its interpreter bridge. Check the console before reading the word. See [Code you cannot see ahead of time](/docs/concepts/code-you-cannot-see-ahead-of-time).

### Pairing

Which two implementations one [co-simulation](#co-simulation) run compares. Pairing 1 is the recompiled build against the project's own interpreter. Pairing 2 is the recompiled build against an independent emulator. The distinction matters because the two answer different questions, and segagenesisrecomp's `COSIM.md` is where the fleet writes it down.

### Probe

Two senses, and the second is the one that surprises people.

A probe is a read-only query against a running process's [always-on ring](#always-on-ring) buffers, issued over the debug server. Separately, a project named `probe` is an instrument rather than a port: [xboxlle-probe](https://github.com/mstan/xboxlle-probe) produces no native executable of any guest program at all, and exists so that emulator behaviour can be compared against measurements taken from real silicon. See [Xbox](/docs/platforms/xbox).

### Provenance

Two senses, one narrow and one broad.

Narrowly, in nesrecomp, a per-entry bitmask recording how a function was discovered, so a weak discovery source is never promoted to a strong one. Broadly, the discipline of recording where every line of device code came from. cdirecomp's `PROVENANCE.md` is the fleet's only document that sets this out as a rule, and its central distinction is between an implementation input, which you may write code from, and a validation tool, which you may only compare against: "test evidence, not implementation authority". See [Provenance](/docs/fleet/provenance).

### Recompiler

The build-time program that reads the guest's machine code and writes C. It runs on a developer's machine, produces text, and never runs while the game does. It is one half of the split every project in this fleet repeats. See [The recompiler and the runtime](/docs/concepts/recompiler-and-runtime).

### Ruler

The guest quantity both sides of a [co-simulation](#co-simulation) advance identically, used as the checkpoint key. Different projects use a cycle counter, a master clock or a derived video-frame index. Also called the alignment clock. Choosing a ruler that only one side can compute is the classic way to build a comparison harness that reports nonsense.

### Runtime

The library the generated C links against, standing in for the console's memory, peripherals, operating system, saves, controllers and sound. The other half of the split, and the half that keeps running for as long as the game does. Note the collision with the ordinary adjective: "at run time" means during execution, and "the runtime" means this library. See [The recompiler and the runtime](/docs/concepts/recompiler-and-runtime).

### Runtime recompilation

Translating guest code to native code while the program is running, because it did not exist to be translated earlier. psxrecomp has no single name for it and describes the mechanism instead: it captures each [overlay](#overlay) the moment it loads, recompiles it to native code, and caches that result so it is reused forever after.

Ahead-of-time is not the dividing line between this fleet and its upstream inspiration: N64Recomp ships a runtime recompilation backend of its own. The real difference is purpose, disc-streamed game code here against mod support there. See [Code you cannot see ahead of time](/docs/concepts/code-you-cannot-see-ahead-of-time) and [Lineage and credit](/docs/fleet/lineage-and-credit).

### Self-healing

Bridging a [dispatch miss](#dispatch-miss) at run time by recompiling the missing code into a persistent cache, then feeding the address back into a reviewed proposal file so the next static build finds it properly. gbarecomp permits it only when it is loudly logged, because a silent bridge would let a discovery bug ship as a performance problem.

### Shadow

An optional, higher-fidelity reimplementation of a subsystem that runs beside the [canon path](#canon-path), is continuously diffed against it, substitutes only after a proven agreement window, reverts loudly, and is off by default. segagenesisrecomp, gbarecomp, vbrecomp and gcnlle all define it in these terms. It is the one form of [HLE](#hle-high-level-emulation) that vbrecomp permits.

### Splitgen

The emitter mode that writes the recompiled game as one shared declarations header plus a fixed number of numbered C files, instead of one enormous translation unit, so the build can compile them in parallel. psxrecomp names it `splitgen` and the Genesis profile of `m68k-recomp-core` always writes exactly 32 parts so that CMake knows every filename before generation runs.

### Static recompilation

Translating a game's machine code into C ahead of time and compiling that C into a native program, which is then linked against a [runtime](#runtime) standing in for the original hardware. It is a translation technique, and it is not a claim about how much of the console is simulated: every toolchain here still models peripherals, and several keep an interpreter for code the ahead-of-time pass could not reach. See [What static recompilation is](/docs/start/what-is-static-recompilation) and [Is this emulation](/docs/start/is-this-emulation).

### Stub

Simulated behaviour standing in for real guest code. Forbidden in every toolchain that mentions it, and psxrecomp's [`PRINCIPLES.md`](https://github.com/mstan/psxrecomp/blob/master/PRINCIPLES.md) gives the procedure instead: stop, identify the target, fix discovery or code generation, never simulate the behaviour. vbrecomp's definition is the widest in the fleet and is worth quoting because it catches things people do not think of as stubs: code that returns a fabricated value, silently swallows an unmapped access, prints instead of completing the work, or carries a `// TODO` marker next to control flow.

### Tier

A dispatch level, and one of the least portable words on this page. The ladder the phrase usually describes is psxrecomp's: tier 1 is statically recompiled native code, tier 2 is code compiled at run time and cached, tier 3 is an interpreter. It does not hold on SNES, where snesrecomp deliberately did not port the runtime-compiled tiers, so tier 2 is an interpreter fallback plus a manifest feedback loop and nothing sits between native code and the interpreter. Read the project's own table before reading a tier number. A transfer down a tier is evidence, not noise: snesrecomp records every one in a gap manifest and splits them into clean hits, safe to promote, and bail hits, which are bug leads.

## Where the fleet's own words disagree

A reader who notices these is not misreading anything. They are real, and this wiki maps them rather than smoothing them out.

**The repository suffixes do not track the technique.** A name ending in `recomp`, `lle` or `probe` looks like it encodes what the project does, and two of the three do not. [cdirecomp](https://github.com/mstan/cdirecomp) is named `recomp` and its README describes its philosophy as low level emulation and static, native-first. [gcnlle](https://github.com/mstan/gcnlle) is named `lle`, but the title line of its own README is "# gcnrecomp" and it is a static recompiler by construction. The categories were never exclusive: static recompilation is a translation technique, low level emulation is a statement about whose code runs, and most of this fleet is both. The suffix records what a target was for and when it was started. Only `probe` reliably means something different, and what it means is an instrument rather than a port.

**One word, two scopes.** [Bank](#bank) is a unit of emitted output in ndsrecomp and a unit of guest address space in nesrecomp and the Sega toolchains. [Coverage](#coverage) is either how much of the ROM was discovered or how much of the decoder is tested. [Probe](#probe) is either a debug query or a class of repository. [Provenance](#provenance) is either a discovery-source bitmask or an engineering-ethics practice.

**One word, three ladders.** [Gate](#gate) names gbrecompiled's five co-simulation validation conditions, the burndown's two-condition accuracy test, and ndsrecomp's three standing regression gates. None of these is the others.

**One word, opposite architectures.** [HLE](#hle-high-level-emulation) in psxrecomp names a swappable BIOS tier that has become the shipping default, and in ndsrecomp names a performance replacement forbidden from ever deleting the faithful implementation beneath it. Both projects are low level first, they disagree about what the high level tier may be, and neither has conceded.

**One mechanism, one console.** Several entries describe hardware only one machine here has, and reading them as fleet-wide is the commonest way to be wrong about this material. [Mode flags](#mode-flags) are a 65816 property. [Interworking](#interworking) is an ARM7TDMI property. A [mapper](#mapper) number is an NES number. The [GTE](#gte-geometry-transformation-engine) is a PlayStation coprocessor. Even the ladder behind [tier](#tier) is one project's. Each of those names its console; a definition that names none is meant to hold everywhere.

**A term this wiki coined and withdrew.** Deferred recompilation was our phrase, not the fleet's, and appears nowhere in any repository here or upstream. The mechanism is [runtime recompilation](#runtime-recompilation).

## Source

Every definition above comes from a repository that uses the word seriously.
These are the files to open.

- psxrecomp: [`PRINCIPLES.md`](https://github.com/mstan/psxrecomp/blob/master/PRINCIPLES.md), [`docs/EXECUTION_MODEL.md`](https://github.com/mstan/psxrecomp/blob/master/docs/EXECUTION_MODEL.md), [`SPLITGEN_MIGRATION.md`](https://github.com/mstan/psxrecomp/blob/master/SPLITGEN_MIGRATION.md), [`runtime/src/gte.cpp`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/gte.cpp) for the GTE
- nesrecomp: [`EXTRACTION.md`](https://github.com/mstan/nesrecomp/blob/master/EXTRACTION.md), [`COSIM.md`](https://github.com/mstan/nesrecomp/blob/master/COSIM.md), [`runner/src/mapper.c`](https://github.com/mstan/nesrecomp/blob/master/runner/src/mapper.c) for the mapper list, `recompiler/src/function_finder.c`
- snesrecomp: [`docs/LLE_FIRST_ANALYSIS.md`](https://github.com/mstan/snesrecomp/blob/main/docs/LLE_FIRST_ANALYSIS.md), [`docs/MULTI_TIER.md`](https://github.com/mstan/snesrecomp/blob/main/docs/MULTI_TIER.md), `runner/src/cpu_state.h`
- gbarecomp: [`PRINCIPLES.md`](https://github.com/mstan/gbarecomp/blob/main/PRINCIPLES.md)
- gbrecompiled: [`COSIM_ORACLE.md`](https://github.com/mstan/gbrecompiled/blob/master/COSIM_ORACLE.md), [`GROUND_TRUTH_WORKFLOW.md`](https://github.com/mstan/gbrecompiled/blob/master/GROUND_TRUTH_WORKFLOW.md), [`CYCLE_EXACT_INITIATIVE.md`](https://github.com/mstan/gbrecompiled/blob/master/CYCLE_EXACT_INITIATIVE.md)
- segagenesisrecomp: [`PRINCIPLES.md`](https://github.com/mstan/segagenesisrecomp/blob/master/PRINCIPLES.md), [`COSIM.md`](https://github.com/mstan/segagenesisrecomp/blob/master/COSIM.md), [`COVERAGE.md`](https://github.com/mstan/segagenesisrecomp/blob/master/COVERAGE.md)
- smsggrecomp: [`FLAT_STEP.md`](https://github.com/mstan/smsggrecomp/blob/main/FLAT_STEP.md), [`ACCURACY.md`](https://github.com/mstan/smsggrecomp/blob/main/ACCURACY.md)
- ndsrecomp: [`PRINCIPLES.md`](https://github.com/mstan/ndsrecomp/blob/main/PRINCIPLES.md), [`HLE_ARCHITECTURE.md`](https://github.com/mstan/ndsrecomp/blob/main/HLE_ARCHITECTURE.md), [`THIRD_PARTY_ATTRIBUTION.md`](https://github.com/mstan/ndsrecomp/blob/main/THIRD_PARTY_ATTRIBUTION.md)
- vbrecomp: [`STUBS_TO_FIX.md`](https://github.com/mstan/vbrecomp/blob/master/STUBS_TO_FIX.md), [`docs/SHADOW_ENHANCEMENTS.md`](https://github.com/mstan/vbrecomp/blob/master/docs/SHADOW_ENHANCEMENTS.md)
- cdirecomp: [`PROVENANCE.md`](https://github.com/mstan/cdirecomp/blob/master/PROVENANCE.md), [`DEBUG.md`](https://github.com/mstan/cdirecomp/blob/master/DEBUG.md), [`README.md`](https://github.com/mstan/cdirecomp/blob/master/README.md)
- gcnlle: [`PRINCIPLES.md`](https://github.com/mstan/gcnlle/blob/master/PRINCIPLES.md), [`README.md`](https://github.com/mstan/gcnlle/blob/master/README.md)
- xboxlle-probe: [`README.md`](https://github.com/mstan/xboxlle-probe/blob/main/README.md)
- Ports, for the file contract: [`baserom.md`](https://github.com/mstan/MinishCapRecomp/blob/main/baserom.md) and [`DISC.md`](https://github.com/mstan/MegaManX6Recomp/blob/master/DISC.md)

## Next

- [What static recompilation is](/docs/start/what-is-static-recompilation) if you arrived here from a search result and want the idea before the vocabulary.
- [Co-simulation](/docs/concepts/co-simulation) and [High level and low level](/docs/concepts/hle-and-lle) are where a third of these terms are actually defined at length.
- [Every repository](/docs/fleet/repositories) for which project to open when a term's definition depends on which repository you are in.
- [If you are an agent, start here](/docs/agents/start-here) if you are about to work in one of these repositories and needed the vocabulary first.
