---
title: "Glossary"
summary: "Forty-eight words this fleet uses as if everyone knows them, each defined the way the repositories actually use it, with the console-specific ones named as such and the contradictions marked rather than smoothed over."
pageType: "reference"
tags: ["Glossary", "Vocabulary", "Reference"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/smsggrecomp"
  - "https://github.com/mstan/ndsrecomp"
  - "https://github.com/mstan/cdirecomp"
  - "https://github.com/mstan/gcnlle"
  - "https://github.com/mstan/xboxlle-probe"
updated: "2026-08-29"
---

The repositories here use these forty-eight words as though everyone already knows them, and define almost none of them where a newcomer would look. Each entry below is the meaning the repositories attach to the word, not a textbook meaning, with a link to the page that treats it properly.

Some of these words describe hardware only one console has. Those entries name the console. An entry that names no console is meant to hold everywhere.

Terms are alphabetical and every one has its own anchor, so a page can link straight to a definition.

## The terms

### Always-on ring

A buffer that records all the time, from the moment the program starts, and is read backwards afterwards. Every toolchain with a debug server has several. The reason: by the time you have finished setting up a trace, the thing you wanted to see has usually happened.

### AOT (ahead of time)

Compiled before the program runs. An AOT body is one guest function translated at build time. [Static recompilation](#static-recompilation) is the technique; AOT is the status of one function that came out of it.

### Arm-then-record

The named bad habit: attach a debugger, set a filter, run the game, read the result. Three projects forbid it by name, because "I saw no events" from a trace you armed late is a lie of omission. The replacement is the [always-on ring](#always-on-ring).

### Bank

Two different things, and this is the fleet's most confusing collision. In [ndsrecomp](https://github.com/mstan/ndsrecomp) a bank is a chunk of generated output: one `.c` file plus a dispatch table. In [nesrecomp](https://github.com/mstan/nesrecomp) and the Sega toolchains a bank is a chunk of the cartridge, selected by hardware. See [bank switching](#bank-switching).

### Bank switching

Hardware putting different parts of a cartridge at the same CPU address at different times, so one address does not name one piece of code. The hardware that does it is a [mapper](#mapper). It is one reason [code discovery](#code-discovery) is hard: you have to know which bank was live.

### Baserom

Your own dump of the original cartridge. The project does not ship it and the runner checks it by hash before it starts. Ten cartridge ports carry a file called `baserom.md` saying exactly what they expect. The disc version is a [disc image](#disc-image). See [The game file you supply](/docs/concepts/the-game-file-you-supply).

### Burndown

A per console accuracy scorecard, kept as a file in the toolchain repository. It lists seven fixed parts of the console and gives each a status, an outside reference and a way it was checked. It is a tracking method, not a claim. See [What correct enough means](/docs/concepts/accuracy-and-burndowns).

### Canon path

The faithful version: the one that ships, and the one any optional extra is checked against. See [shadow](#shadow).

### Chain hash

Every checkpoint's hash in a [co-simulation](#co-simulation) run, folded into one running number. Because it accumulates, any difference anywhere sticks in the final value, which makes that value something to pin as a regression baseline.

### Code discovery

Working out which bytes of a game's binary are instructions, and where each function starts. Also called the function finder. The five step shape is shared: seed, walk, guess, check, catch the rest at run time. What a seed is, and what makes an address ambiguous, is per console. See [Telling code from data](/docs/concepts/code-discovery).

### Combined work

A licensing term this fleet needs because a runner can link code under a stronger license than its own. ndsrecomp is MIT, but its runner links vendored melonDS sources, so the shipped executable goes out under GPL-3.0-or-later while the recompiler and generated banks stay MIT. See [Licenses](/docs/fleet/licenses).

### Co-simulation

Comparing the port against something that already runs the console correctly, an emulator or real hardware. Both run the same game from the same reset, both stop at the same point in guest time, the whole machine is compared, and the run halts at the first difference. See [Co-simulation](/docs/concepts/co-simulation).

### Coverage

Two senses. **Recompiler coverage** is how much of the game binary [code discovery](#code-discovery) found, measured in [dispatch misses](#dispatch-miss). **Test coverage** is how much of the decoder and code generator the tests exercise. gbarecomp adds a rule it calls coverage honesty: do not call a build fully native while any address was interpreted.

### Cycle exact

Hardware advanced and read at the exact fraction of an instruction rather than at whole instructions. Where a repository uses the phrase it can be naming a programme of work rather than a finished state, so do not read it as a status on its own. See [Timing models](/docs/concepts/timing-models).

### Decoder

The part that reads the game's binary and works out what each instruction does, then writes it as source code. Binary in, code out. Being strict, the decoder is what does the translation, not the whole [recompiler](#recompiler): in these projects that one word covers the decoder, the compiler that builds its output, and the [runtime](#runtime) that output links against. See [What static recompilation is](/docs/start/what-is-static-recompilation).

### Disc image

The disc version of a [baserom](#baserom). On PlayStation the sector format matters: the ports ask for a bin/cue pair in the console's own sector layout, and warn against converting to a plain ISO, which throws away the sectors used for streamed audio and video.

### Dispatch miss

The runtime jumping to a guest address with no generated function behind it. Every toolchain treats it as a failure of [code discovery](#code-discovery) or code generation, not something to patch around. What happens next differs: some interpret and log, gbarecomp recompiles and caches, strict modes stop. See [How changes go wrong here](/docs/agents/failure-modes).

### Divergence

A difference in state between two versions under [co-simulation](#co-simulation). See [first divergence](#first-divergence), which is the only one worth debugging.

### Emulation

Running a program by acting out its instructions in software, one at a time, on a model of the machine it was written for. Static recompilation avoids that for the game's own code. Every port here still models the console's devices, and many keep an [interpreter](#interpreter) as a fallback on the way to full static coverage. See [Is this emulation?](/docs/start/is-this-emulation).

### First divergence

The earliest checkpoint where two versions differ. Every debugging protocol here makes you find it rather than investigate the visible symptom, because everything after it is consequence. psxrecomp puts it as "Never debug the final symptom." See [Debug a divergence](/docs/guides/debug-a-divergence).

### Flat step

An output mode where one host function runs exactly one guest instruction and returns, so the host takes control back every instruction. smsggrecomp's `--flat-step` exists so a Z80 recompiled by one toolchain can run as the sound chip inside another's scheduler. It is the slowest point on the [timing model](/docs/concepts/timing-models) scale.

### Gate

A pass or fail condition that must hold before a measurement is believed. The word covers three different ladders here, so check which one a document means: the numbered co-simulation self-checks in psxrecomp and nesrecomp, the burndown's two conditions for calling an axis done, and ndsrecomp's standing regression gates.

### Ground truth

Behaviour recorded from a mature emulator and fed back into static analysis as seeds. It improves [coverage](#coverage) and proves nothing about correctness, which is what separates it from [co-simulation](#co-simulation).

### GTE (geometry transformation engine)

The PlayStation's second coprocessor: the fixed point maths unit a PS1 game uses to transform and project 3D points. No other console here has one, so a sentence about the GTE is never a sentence about the fleet. See [PlayStation](/docs/platforms/playstation).

### HLE (high level emulation)

Skipping a piece of the console's own code and having the host do that job its own way. Every toolchain here treats [LLE](#lle-low-level-emulation) as the baseline and allows HLE only above a working floor. The word means different things in different repositories: see [High level and low level](/docs/concepts/hle-and-lle).

### Interpreter

A small emulator inside a port that reads guest instructions and acts them out one at a time. It is slower than compiled code and it is correct, so a [dispatch miss](#dispatch-miss) lands there and costs speed rather than the game. Several projects also compare the compiled code against it as a self-check, which proves agreement, not correctness.

### Interworking

An ARM7TDMI switching between the 32-bit ARM and 16-bit Thumb instruction sets while it runs. gbarecomp's rule is "Treat it as one CPU, not two." It is the defining difficulty of the Game Boy Advance toolchain, because the recompiler has to know which instruction set was live at every address.

### Just in time

Work done at the moment it is needed rather than before. An [interpreter](#interpreter) reads and acts out each instruction just in time, which is why it pays the same cost every time round a loop. [Runtime recompilation](#runtime-recompilation) is also just in time, but it translates a piece once and keeps the result. The opposite is [ahead of time](#aot-ahead-of-time).

### LLE (low level emulation)

Running the console's own code, including its firmware where the machine has any, on top of a model of the hardware. cdirecomp states its philosophy as LLE and static, native first. In snesrecomp the interpreter is the correctness floor, not a last resort.

### Mapper

Cartridge hardware that swaps which part of the game ROM appears in the CPU's window. It is what performs [bank switching](#bank-switching). The word is used here mostly about the NES, where the cartridge header carries a mapper number. That numbering is the NES's and means nothing elsewhere. See [NES](/docs/platforms/nes).

### Mod manifest

The `manifest.toml` at the root of a mod package. It declares the package, its version, the features it adds and the exact game dump it targets. Package, feature and operation differ: you install a package, a player switches on a feature, and an operation is what that feature then does. See [Mod manifest](/docs/reference/mod-manifest).

### Mode flags

The 65816 status bits M and X, which pick 8-bit or 16-bit registers. The same bytes mean different things under different settings, so snesrecomp emits one version of a function per setting, with the flags in the name. That is why a SNES port has several functions where an NES port has one. See [SNES](/docs/platforms/snes).

### Native

The game's own logic running as compiled code on your processor instead of being acted out by an [interpreter](#interpreter). Wider than [static](#static-recompilation): a build is still native when some code had to be translated while the game ran, because what finally executes is compiled either way. Native says what runs, static says when the translating happened. See [What static recompilation is](/docs/start/what-is-static-recompilation).

### Oracle

The reference a recompiled build is compared against under [co-simulation](#co-simulation): a known good emulator of the console, modified so its registers and memory can be read out and compared while it runs. A project's own interpreter can stand in as a self-check, but only an independent oracle can catch a mistake both halves of one project share. See [Co-simulation](/docs/concepts/co-simulation).

### Overlay

On PlayStation, a chunk of game code pulled from disc into a fixed area of memory while the game runs, then written over by the next one. It is not in the executable, so an ahead-of-time recompiler cannot see it. Two other consoles borrow the word, so check which one you are reading. See [Code you cannot see ahead of time](/docs/concepts/code-you-cannot-see-ahead-of-time).

### Pairing

A numbering several repositories use for which two versions one [co-simulation](#co-simulation) run compares. Their pairing 1 is the recompiled build against the project's own interpreter, a self-check. Their pairing 2 is the recompiled build against an independent emulator, the comparison that can arbitrate correctness. See [oracle](#oracle).

### Probe

Two senses. A probe is a read-only query against a running process's [always-on ring](#always-on-ring) buffers. Separately, a project named `probe` is an instrument, not a port: [xboxlle-probe](https://github.com/mstan/xboxlle-probe) produces no playable program, and exists so emulator behaviour can be compared against measurements from real hardware. See [Xbox](/docs/platforms/xbox).

### Provenance

Two senses. Narrowly, in nesrecomp, a record of how each function was found, so a weak guess is never promoted to strong evidence. Broadly, the practice of recording where every line of device code came from, which cdirecomp sums up as "test evidence, not implementation authority". See [Provenance](/docs/fleet/provenance).

### Recompiler

The build-time program that reads the game's binary and writes source code. It runs on a developer's machine and never while the game does. It is one half of the split every project here repeats. Strictly the part doing the translation is a [decoder](#decoder); the word recompiler is used for the whole tool. See [The recompiler and the runtime](/docs/concepts/recompiler-and-runtime).

### Ruler

The guest quantity both sides of a [co-simulation](#co-simulation) run count the same way, used to decide when to compare. Projects use a cycle counter, a master clock or a frame number derived from cycles. Choosing one only one side can count is the classic way to build a harness that reports nonsense.

### Runtime

The library the generated code links against, standing in for the console's memory, devices, operating system, saves, controllers and sound. The half that keeps running as long as the game does. Note the collision: "at run time" means while the game runs; "the runtime" means this library.

### Runtime recompilation

Translating guest code to native code while the program runs, because it did not exist to be translated earlier. psxrecomp has no single name for it: it captures each [overlay](#overlay) as it loads, compiles it in a separate process, and caches the result. See [Code you cannot see ahead of time](/docs/concepts/code-you-cannot-see-ahead-of-time).

### Self-healing

Bridging a [dispatch miss](#dispatch-miss) at run time by recompiling the missing code into a lasting cache, then feeding the address back into a reviewed file so the next build finds it properly. gbarecomp allows it only when loudly logged, because a silent bridge lets a discovery bug ship as a performance problem.

### Shadow

An optional, more accurate version of a subsystem that runs beside the [canon path](#canon-path), is compared against it continuously, takes over only after a proven run of agreement, reverts loudly, and is off by default. Four projects define it in these terms.

### Splitgen

The output mode that writes the recompiled game as one shared header plus a fixed number of numbered source files instead of one enormous file, so the build can compile them in parallel. psxrecomp names it `splitgen`.

### Static recompilation

Translating a game's binary into source code ahead of time, then compiling that into a [native](#native) program which links against a [runtime](#runtime). The technique needs no particular language; the projects here emit C. It says nothing about how much of the console is simulated. Static is the strict half of the claim: all the translating happened before the game ran. The re is loose too, because a game written by hand in assembly was never compiled to begin with. See [What static recompilation is](/docs/start/what-is-static-recompilation) and [Is this emulation?](/docs/start/is-this-emulation).

### Stub

Made-up behaviour standing in for real guest code. Forbidden in every toolchain that mentions it. psxrecomp gives the procedure instead: stop, find the real target, fix discovery or code generation.

### Tier

A dispatch level, and one of the least portable words here. The ladder people mean is psxrecomp's: tier 1 is native code compiled at build time, tier 2 is code compiled while the game runs and cached, tier 3 is the interpreter. On SNES the middle tier was never ported, so tier 2 there is the interpreter. Read the project's own table first.

## Where the fleet's own words disagree

A reader who notices these is reading correctly. This wiki maps them rather than smoothing them out.

- **The names do not track the technique.** cdirecomp is named `recomp` and describes itself as low level and native-first. gcnlle is named `lle` and is a static recompiler. The categories were never exclusive: static recompilation is a translation technique, low level emulation is a statement about whose code runs, and most of this fleet is both. Only `probe` means something different: an instrument, not a port.
- **One word, two scopes.** [Bank](#bank), [coverage](#coverage), [probe](#probe) and [provenance](#provenance) each mean two things depending on the repository.
- **One word, three ladders.** [Gate](#gate) names three different sets of conditions.
- **One word, opposite architectures.** [HLE](#hle-high-level-emulation) in psxrecomp is a swappable BIOS tier that became the default; in ndsrecomp it is a replacement forbidden from deleting the faithful version beneath it.
- **One mechanism, one console.** [Mode flags](#mode-flags) are a 65816 thing, [interworking](#interworking) an ARM7TDMI thing, a [mapper](#mapper) number an NES number, the [GTE](#gte-geometry-transformation-engine) a PlayStation part. Even the ladder behind [tier](#tier) belongs to one project.

## Source

Every definition above comes from a repository that uses the word seriously. These are the files to open.

- psxrecomp: [`PRINCIPLES.md`](https://github.com/mstan/psxrecomp/blob/master/PRINCIPLES.md), [`docs/EXECUTION_MODEL.md`](https://github.com/mstan/psxrecomp/blob/master/docs/EXECUTION_MODEL.md), [`SPLITGEN_MIGRATION.md`](https://github.com/mstan/psxrecomp/blob/master/SPLITGEN_MIGRATION.md)
- nesrecomp: [`EXTRACTION.md`](https://github.com/mstan/nesrecomp/blob/master/EXTRACTION.md), [`COSIM.md`](https://github.com/mstan/nesrecomp/blob/master/COSIM.md). snesrecomp: [`docs/LLE_FIRST_ANALYSIS.md`](https://github.com/mstan/snesrecomp/blob/main/docs/LLE_FIRST_ANALYSIS.md), [`docs/MULTI_TIER.md`](https://github.com/mstan/snesrecomp/blob/main/docs/MULTI_TIER.md)
- gbarecomp: [`PRINCIPLES.md`](https://github.com/mstan/gbarecomp/blob/main/PRINCIPLES.md). gbrecompiled: [`COSIM_ORACLE.md`](https://github.com/mstan/gbrecompiled/blob/master/COSIM_ORACLE.md), [`GROUND_TRUTH_WORKFLOW.md`](https://github.com/mstan/gbrecompiled/blob/master/GROUND_TRUTH_WORKFLOW.md)
- segagenesisrecomp: [`PRINCIPLES.md`](https://github.com/mstan/segagenesisrecomp/blob/master/PRINCIPLES.md), [`COVERAGE.md`](https://github.com/mstan/segagenesisrecomp/blob/master/COVERAGE.md). smsggrecomp: [`FLAT_STEP.md`](https://github.com/mstan/smsggrecomp/blob/main/FLAT_STEP.md)
- ndsrecomp: [`PRINCIPLES.md`](https://github.com/mstan/ndsrecomp/blob/main/PRINCIPLES.md), [`HLE_ARCHITECTURE.md`](https://github.com/mstan/ndsrecomp/blob/main/HLE_ARCHITECTURE.md).
- cdirecomp: [`PROVENANCE.md`](https://github.com/mstan/cdirecomp/blob/master/PROVENANCE.md). gcnlle: [`PRINCIPLES.md`](https://github.com/mstan/gcnlle/blob/master/PRINCIPLES.md). xboxlle-probe: [`README.md`](https://github.com/mstan/xboxlle-probe/blob/main/README.md)
- Ports, for the file contract: [`baserom.md`](https://github.com/mstan/MinishCapRecomp/blob/main/baserom.md) and [`DISC.md`](https://github.com/mstan/MegaManX6Recomp/blob/master/DISC.md)

## Next

- [What static recompilation is](/docs/start/what-is-static-recompilation) if you want the idea before the vocabulary.
- [Co-simulation](/docs/concepts/co-simulation) and [High level and low level](/docs/concepts/hle-and-lle) define a third of these terms at length.
- [Every repository](/docs/fleet/repositories) for which project to open when a definition depends on which one you are in.
- [If you are an agent, start here](/docs/agents/start-here) if you are about to work in one of these repositories.
