---
title: "Telling code from data"
summary: "No dump says which bytes are instructions, so every toolchain here seeds from guaranteed entry points, walks what is reachable, guesses at the rest, validates the guesses and catches the misses at run time: that shape is console-agnostic, and what fills it in is not."
pageType: "concept"
tags: ["Code discovery", "Recompiler", "NES", "SNES", "Game Boy Advance", "PlayStation", "Sega"]
repos:
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/smsggrecomp"
updated: "2026-08-24"
---

A static recompiler translates a game's machine code into C before the game runs, so it must know which bytes are machine code. No dump says. A cartridge image or a disc executable is one flat block of bytes: graphics, tables, text, sound data and instructions packed together, with no symbols and nothing marking where a function begins. That is true of every console here, and every toolchain here answers it with the same five steps. What fills those steps in is not shared: the addresses the hardware guarantees, the thing that makes one address ambiguous, and the heuristics worth running differ on each machine. So this page takes the problem and the shape of the answer first, then what each console actually does.

## Why you cannot decode from the top

A linear sweep decodes an instruction, advances by its length, and repeats. Three things break it, and the first two break it everywhere.

**Instructions are variable length, on the machines where they are.** The 6502, the 65816, the Z80 and the 68000 all encode instructions of different lengths, so a sweep that starts one byte late reads one instruction's operand as the next one's opcode. It does not stop or complain. It stays fluent, plausible and wrong until it happens to resynchronise. A fixed width instruction set removes that particular trap and no more: MIPS R3000A instructions on PlayStation and ARM instructions on Game Boy Advance are always four bytes on a four byte boundary, and a decoder can still walk straight off the end of a function into a table of coordinates and translate all of it.

**Data decodes happily.** Tile graphics disassemble as readily as a subroutine does, on any instruction set. The clearest case on the NES is zero padding, because `0x00` is `BRK`: unused ROM reads as a run of software interrupts. nesrecomp settles that one first, auto-marking zero-fill runs of 16 bytes or more as data regions. Another console needs a different rule for the same problem, because a different byte is its benign filler.

**An address does not identify the bytes.** This is where the consoles stop resembling each other, and it is the reason a reader should never carry one machine's mechanism to another. On the NES, cartridges above 32 KB switch banks, so one CPU address is different code depending on runtime state. On the SNES the ambiguity is not in the address at all, it is in two processor status bits that change how wide the next instruction is. On the Game Boy Advance one address can hold an ARM function or a Thumb one. On the PlayStation a RAM window holds whichever chunk the disc delivered most recently. Four different mechanisms, one consequence: a decoder needs more than a program counter to know what it is reading.

Discovery is a search, not a parse.

![Above: the same seven bytes of 6502, decoded from a real entry and from one byte later, turn a load and a store into two plausible subroutine calls, and nothing in the byte stream says which reading is right. Below: nesrecomp's pipeline, where the walk out of the vectors is its own evidence and everything the scanners guess has to survive the predicate before it counts as a function.](./discovery.svg)

The bytes above are 6502 because seven of them fit on a page, and the failure they show is not a 6502 failure. Neither is the pipeline below them: the walk-and-scanners shape is what every toolchain here does. What differs per console is which addresses seed the walk and which scanners are worth running.

## The five steps every discovery pass here repeats

This much is fleet-wide. Every toolchain in this fleet does all five, in this order, whatever its CPU.

1. **Seed from what the hardware guarantees.** Every console hands a recompiler at least one address it is certain the machine will execute: an interrupt vector table, a header entry point, a boot handoff. Those seeds are not heuristics, and they carry the strongest provenance any entry point can have.
2. **Walk what is statically reachable.** From each seed, decode forward and add every direct call, jump and branch target as a new entry to visit. What the walk reaches is evidence rather than a guess, because an instruction in the game named it.
3. **Add heuristics for what the walk cannot reach.** Indirect dispatch through a table names no target in any instruction, so nothing the walk does will find it. Every project therefore runs scanners over the parts of the image the walk never entered, looking for the shapes a table of code pointers makes.
4. **Validate a candidate before accepting it.** A scanner produces guesses, and a guess accepted as a function turns data into C. So each candidate is decoded a short distance and rejected if it reads as nonsense, and the surviving entries keep a record of how weakly they were found.
5. **Catch what discovery missed at run time.** No static pass finds an address that only exists as a value computed while the game plays. Every runtime here therefore has something to do when it is handed one: interpret it, log it, or compile it on the spot. That log is the next build's seed list.

The order matters as much as the list. Steps 1 and 2 produce evidence, step 3 produces guesses, and step 4 exists so the two never get confused: a guessed entry that laundered itself into proof would leave a project unable to say how much of its output to trust.

## What each console has to work with

One subsection per console family, each linking to the platform page that carries the depth. Read this as five machines answering the same five questions, not as variations on one design.

### NES

The seeds are the NMI, RESET and IRQ vectors out of the last program ROM bank, and the walk out of them is breadth first. Bank switching complicates it twice over: a call can leave the bank being walked, and bank-switch sites hide data in the instruction stream. Table scanners then hunt the dispatch tables NES games use constantly. This is the console the diagram above draws and the one worked in full at the end of this page, so the short version stops here. [NES](/docs/platforms/nes) has the toolchain around it.

### SNES

The 65816 changes the width of its own instructions while it runs. Two processor status bits, M and X, select an 8-bit or 16-bit accumulator and index registers, and twelve immediate-mode opcodes are two bytes under one setting and three under the other. So an address is not enough to decode from: the identity of an instruction is the pair of address and mode, and [snesrecomp](https://github.com/mstan/snesrecomp)'s decoder is keyed on `DecodeKey(pc, m, x)` for that reason.

From [`recompiler/v2/decoder.py`](https://github.com/mstan/snesrecomp/blob/main/recompiler/v2/decoder.py):

```text title="recompiler/v2/decoder.py"
In v2, every instruction is identified by `DecodeKey(pc, m, x)`. Two
predecessors with different mode states produce two distinct
DecodedInsn records at the same PC — both are preserved. Downstream
(v2 cfg / IR / codegen) treats them as two separate blocks.
```

The same file records what the first version did instead, which was to keep one mode hint per address and let the last writer win: "one is silently dropped and that PC ends up decoded with the wrong mode", after which every subsequent instruction is read from the wrong offset. This is the hardest thing about the console and none of it exists on the NES. [SNES](/docs/platforms/snes) has the full account, including the shadow stack that models save and restore of the flags.

### Game Boy Advance

The ARM7TDMI runs two instruction sets in one address space. [gbarecomp](https://github.com/mstan/gbarecomp)'s `PRINCIPLES.md` states the rule and its consequence for discovery together: "The ARM7TDMI is a single CPU that switches between ARM (32-bit) and THUMB (16-bit) instruction sets at runtime via `BX`, `BLX`, mode changes, and exception entry. Treat it as one CPU, not two", and, of interworking, "Block discovery must follow both states." So a function is identified by an address and a mode here too, for a completely different reason than on the SNES, and the finder pops `(addr, mode)` pairs off its worklist rather than addresses. The same problem reappears at a jump table, which may hold ARM targets, Thumb targets or both with nothing saying which. [Game Boy Advance](/docs/platforms/game-boy-advance) covers the verdict the finder reaches per table.

### PlayStation

There is no vector table to seed from. [psxrecomp](https://github.com/mstan/psxrecomp) derives its starting point from the disc: `psxrecomp-toml` reads a PS-X EXE and writes a `game.toml` plus a seed list of direct jump-and-link targets, `probe_disc.py` fills identity and a first-pass seed list from the boot executable during scaffolding, and function starts are seeded from a Ghidra export in the project's `seeds/` directory. A `discovery` key then chooses how far to go: `whole-image` keeps the sweep and pointer-table heuristics, `reachable` follows direct `jal` targets only and fails closed to interpretation for anything indirect. The seeding tool says plainly, in [`psxrecomp-toml-readme.md`](https://github.com/mstan/psxrecomp/blob/master/psxrecomp-toml-readme.md), that "it does not statically resolve 100% of the game's execution paths (such as dynamic function tables or indirect register dispatches)".

A PS1 disc also holds more code than can be resident at once, so much of this console's discovery is not static at all. That half is [code you cannot see ahead of time](/docs/concepts/code-you-cannot-see-ahead-of-time), and [PlayStation](/docs/platforms/playstation) is the toolchain.

### Genesis and Master System

On Genesis, [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp) walks the call graph from the cartridge's vectors and calls its policy evidence-driven, taking labels, annotations and a runtime dispatch manifest as further evidence rather than guessing. On the 8-bit machines, [smsggrecomp](https://github.com/mstan/smsggrecomp)'s `function_finder.c` is described in its README as "static reachability from the reset/IRQ/NMI/RST vectors plus `[functions].extra` seeds and jump tables". Both are recognisable versions of steps 1 through 3.

The interesting case is the one where discovery is abandoned on purpose. A Z80 used as a coprocessor runs a program the other CPU uploads into RAM at run time, so there is no fixed image to find functions in and a computed jump can land anywhere. smsggrecomp's `--flat-step` mode answers that by treating the whole image as entry points.

From [`recompiler/src/code_generator.c`](https://github.com/mstan/smsggrecomp/blob/main/recompiler/src/code_generator.c):

```c title="recompiler/src/code_generator.c"
 * Every byte in the flat image is a legal dispatch entry. That deliberately
 * trades generated-code size for correctness with computed jumps: no profile
 * manifest or guessed function boundary is needed, and runtime performs no
 * opcode fetch/decode. The host should validate the uploaded image CRC before
 * enabling this backend and retain an interpreter fallback for a different or
 * self-modified driver image. */
```

Making every byte offset a legal entry deletes steps 3 and 4, at the cost of generated code size and of the speed static recompilation exists for. The five steps are a response to a constraint rather than a law: remove the constraint and the middle of the pipeline goes with it. [Sega Genesis](/docs/platforms/sega-genesis) and [Master System and Game Gear](/docs/platforms/master-system-game-gear) carry both halves, and [timing models](/docs/concepts/timing-models) covers what flat step costs.

## The NES pipeline, worked in full

One implementation end to end, because a five step shape is easier to trust once you have seen one filled in. It is [nesrecomp](https://github.com/mstan/nesrecomp)'s, it is what the diagram above draws, and none of it transfers unchanged. Read the structure, not the constants.

### Starting from the three addresses the hardware guarantees

`rom_parse` reads the iNES header, the mapper number and the NMI, RESET and IRQ vectors out of the last PRG bank. Those three are the only entry points the console itself will ever jump to, and they are the seeds. `function_finder_run` walks breadth first from there: decode forward, and every `JSR` target, `JMP` target and branch target becomes a new entry to visit. What the walk reaches carries the finder's strongest provenance, `FUNCTION_SOURCE_CONTROL`.

Two NES habits complicate it. A call can leave the bank being walked, so `[mapper].bank_switch` names the game's bank-switch routines and the finder propagates register values across them, resolving a bank number during the walk rather than after it. Bank switches also hide data in the instruction stream: a `JSR` to a dispatcher followed by inline bytes holding the bank and target address, which the callee reads back off the stack. A `[[trampoline]]` block declares such a site, its inline byte count and which register carries the bank. Undeclared, the walker decodes those bytes as instructions, and the documented symptom is a black screen at boot.

### What no instruction points at

Static control flow does not reach everything. NES games dispatch through tables constantly: a handler address looked up by index, named by no instruction anywhere. Several passes hunt for those.

- A pointer scan over the fixed bank, and a second for switchable-bank pointers that target it, which `[game].disable_ptr_scan` turns off where it misfires.
- The table-run scanner: four or more consecutive little-endian 16-bit values whose targets each decode as code.
- The split-table scanner, for tables kept as parallel low-byte and high-byte arrays recombined as `(hi << 8 | lo) + adjust`. There is no contiguous run of pointers to find, so this pass reads both arrays together.
- Then `[[known_table]]` and `[[split_table]]` declarations from `game.toml`, cross-bank byte-match propagation, secondary-entry classification, and explicit seeds.

The table-run scanner shows the shape of all of them. This loop runs over every switchable bank `b` at every offset `off`, and accepts a run only if every target passes a decode check.

From [`recompiler/src/function_finder.c`](https://github.com/mstan/nesrecomp/blob/master/recompiler/src/function_finder.c):

```c title="recompiler/src/function_finder.c"
            while (off <= 0x3FFD && run_len < 256) {
                uint16_t a = 0x8000 + off;
                if (is_data_region(cfg, b, a)) break;
                uint8_t lo = rom_read(rom, b, a);
                uint8_t hi = rom_read(rom, b, a + 1);
                uint16_t candidate = lo | ((uint16_t)hi << 8);
                if (candidate < 0x8000 || candidate > 0xBFFD) break;
                if (is_data_region(cfg, b, candidate)) break;
                if (!validate_code_target(rom, b, candidate, TABLE_RUN_MIN_VALID)) break;
                run_targets[run_len++] = candidate;
                off += 2;
            }
            if (run_len >= TABLE_RUN_MIN_RUN) {
                for (int r = 0; r < run_len; r++) {
                    if (!function_list_contains(out, run_targets[r], b))
                        add_function_with_source(out, run_targets[r], b, FUNCTION_SOURCE_TABLE_RUN);
                }
            } else {
                off = run_start + 1;
            }
```

A candidate outside `$8000-$BFFD` breaks the run before it is decoded at all, and so does a declared data region. A short run restarts one byte later, not two, because nothing says a table begins on an even offset.

### The predicate that says no

Every weak candidate passes through one function. It accepts an address if the seven instructions there decode cleanly, or if it reaches a clean terminator sooner. `TABLE_RUN_MIN_VALID` is 7 and `TABLE_RUN_MIN_RUN` is 4.

From [`recompiler/src/function_finder.c`](https://github.com/mstan/nesrecomp/blob/master/recompiler/src/function_finder.c):

```c title="recompiler/src/function_finder.c"
static bool validate_code_target(const NESRom *rom, int bank,
                                 uint16_t addr, int min_valid) {
    uint8_t first = rom_read(rom, bank, addr);
    /* [snip] an illegal first opcode, or BRK at the entry, is rejected here */
    if (first == 0x60) return true;   /* RTS = null handler */
    int count = 0;
    uint16_t pc = addr;
    for (int i = 0; i < min_valid; i++) {
        uint8_t op = rom_read(rom, bank, pc);
        if (mn_finder_illegal(g_opcode_table[op].mnemonic)) {
            coverage_record_rejected_target_illegal(bank, addr);
            return false;
        }
        int sz = g_opcode_table[op].size;
        if (sz == 0) sz = 1;
        pc += sz;
        count++;
        if (op == 0x40)
            return false;
        if (op == 0x60 || op == 0x4C || op == 0x6C)
            return true;  /* clean terminator */
    }
    return true;
}
```

The cut lines reject two entry bytes outright: an opcode `mn_finder_illegal` calls illegal, and `0x00`, because `BRK` at an entry is suspicious. A bare `RTS` passes at once, since handler tables routinely hold a do-nothing entry. The loop then steps by each decoded size, returns true at `RTS`, `JMP` or `JMP` indirect, false at `RTI`, and records every rejection for the per-ROM coverage report.

One conservatism is deliberate. The code generator implements many unofficial 6502 opcodes, but `mn_finder_illegal` still counts them illegal, because implementing an opcode must not change which functions are discovered. The predicate may be stricter than the translator.

### Two kinds of wrong, and only one of them matters

From [`README.md`](https://github.com/mstan/nesrecomp/blob/master/README.md):

> The deep-decode check eliminates 'harmful' false positives (data misidentified as code, which would generate invalid C). 'Harmless' false positives (valid code in another bank's context) are accepted.

A harmful false positive is data accepted as code: the recompiler emits a function built from a misread of tile data, which fails to compile or, worse, compiles. A harmless one is genuine code found under the wrong bank's assumptions. It translates, nothing calls it, and it costs some dead bytes. A pass eliminating both would have to be perfect. One eliminating only the harmful kind can afford to guess. That trade is not specific to this console, but the two categories are: the harmless class here exists because of bank switching, which is the NES form of step 4's problem.

Guessing is safe only while a guess stays labelled as one. Every entry carries a source bitmask, `FUNCTION_SOURCE_CONTROL`, `PTR_SCAN`, `TABLE_RUN`, `SPLIT_TABLE`, `KNOWN_TABLE`, `XBANK` or `MANUAL`, plus an evidence count, and `propagated_discovery_source` refuses to promote a weak source into strong control-flow evidence when the walk fans out from it. A guessed entry never launders itself into proof for what it calls. The audit trail is `<prefix>_finder_audit.csv` and `<prefix>_auto_entries.csv`, which carries `evidence_count` and `source_flags` per entry.

### What is still missing when the build finishes

No scanner finds an address that exists only as a value computed at runtime. Handed one with no recompiled function behind it, the generated dispatcher does not fail.

From [`recompiler/src/code_generator.c`](https://github.com/mstan/nesrecomp/blob/master/recompiler/src/code_generator.c):

```c title="recompiler/src/code_generator.c"
    /* Extra_label secondary entries — add dispatch cases for their ROM addresses */
    if (rom->mapper == 4 || rom->mapper == 40)
        fprintf(f,
            "        default:\n"
            "            return nes_interp_dispatch_bank(_cpu_addr, addr, _bank);\n"
        );
    else if (rom->mapper == 66)
        fprintf(f,
            "        default:\n"
            "            return nes_interp_dispatch_bank(addr, addr, _bank);\n"
        );
    else
        fprintf(f,
            "        default:\n"
            "            return nes_interp_dispatch(addr);\n"
        );
    fprintf(f,
        "    }\n"
        "    return 1;\n"
        "}\n\n"
        "/* Legacy entry: no caller-bank hint (JMP-indirect, interp, debug server).\n"
        " * Depth-counted so deferred JMP-tail targets get driven (see runtime.c). */\n"
        "int call_by_address(uint16_t addr) { return nes_dispatch_call(addr, -1); }\n"
    );
```

Every miss lands in an interpreter that shares the CPU state and the decode table with the recompiler, because the runner compiles the recompiler's own decoder. A gap becomes a slower path rather than a crash, and a logged one: each first-seen miss is appended to `dispatch_misses.log` as a paste-ready `extra_func` line. A headless run counts them.

```sh
GameRecomp.exe "rom.nes" --smoke 6000 --smoke-output smoke.json
```

That JSON reports `dispatch_miss_count` and the misses. Coverage in this sense means zero over a run, and closing the gap is a loop: run, read the misses, seed them in `[functions]`, regenerate.

## What the NES case does not tell you

Discovery is a build-time best effort with a runtime safety net everywhere in this fleet. Where the NES is unusual is how small the safety net's job is, because the whole ROM is present when the recompiler runs. That is how the repository explains not adopting psxrecomp's multi-tier design:

> psxrecomp's multi-tier system exists to solve a problem NES does not have ... On NES there is no hot code that arrives at runtime — the entire ROM is present at build time.

Read that as the boundary of everything above. Where code arrives while the game is playing, step 5 is not a safety net but a second discovery pass with its own capture, compilation and cache. And nothing here shows that the code found was translated correctly, which is a separate question with its own machinery.

## Source

From [nesrecomp](https://github.com/mstan/nesrecomp): [`function_finder.c`](https://github.com/mstan/nesrecomp/blob/master/recompiler/src/function_finder.c) and [`function_finder.h`](https://github.com/mstan/nesrecomp/blob/master/recompiler/src/function_finder.h) for the walk, the scanners, the validator and the source flags; [`rom_parser.c`](https://github.com/mstan/nesrecomp/blob/master/recompiler/src/rom_parser.c) for vectors; [`game_config.c`](https://github.com/mstan/nesrecomp/blob/master/recompiler/src/game_config.c) for `game.toml`; [`code_generator.c`](https://github.com/mstan/nesrecomp/blob/master/recompiler/src/code_generator.c) for dispatch; [`PATTERNS.md`](https://github.com/mstan/nesrecomp/blob/master/PATTERNS.md), [`EXTRACTION.md`](https://github.com/mstan/nesrecomp/blob/master/EXTRACTION.md) and [`README.md`](https://github.com/mstan/nesrecomp/blob/master/README.md).

Per-system, for the sections above:

- snesrecomp: [`recompiler/v2/decoder.py`](https://github.com/mstan/snesrecomp/blob/main/recompiler/v2/decoder.py) for the decode key and the v1 bug, [`recompiler/snes65816.py`](https://github.com/mstan/snesrecomp/blob/main/recompiler/snes65816.py) for the mode-dependent opcode lengths.
- gbarecomp: [`PRINCIPLES.md`](https://github.com/mstan/gbarecomp/blob/main/PRINCIPLES.md) for the interworking rule, [`src/recompile/function_finder.cpp`](https://github.com/mstan/gbarecomp/blob/main/src/recompile/function_finder.cpp) for the `(addr, mode)` worklist and the jump table verdict.
- psxrecomp: [`recompiler/src/main_toml.cpp`](https://github.com/mstan/psxrecomp/blob/master/recompiler/src/main_toml.cpp) and [`psxrecomp-toml-readme.md`](https://github.com/mstan/psxrecomp/blob/master/psxrecomp-toml-readme.md) for seed derivation, [`recompiler/src/function_discovery.cpp`](https://github.com/mstan/psxrecomp/blob/master/recompiler/src/function_discovery.cpp) for the pass, [`docs/config_schema.md`](https://github.com/mstan/psxrecomp/blob/master/docs/config_schema.md) for the `whole-image` and `reachable` modes.
- segagenesisrecomp: [`COVERAGE.md`](https://github.com/mstan/segagenesisrecomp/blob/master/COVERAGE.md) for where the discovery policy lives.
- smsggrecomp: [`README.md`](https://github.com/mstan/smsggrecomp/blob/main/README.md) for the vector seeding, [`recompiler/src/code_generator.c`](https://github.com/mstan/smsggrecomp/blob/main/recompiler/src/code_generator.c) and [`FLAT_STEP.md`](https://github.com/mstan/smsggrecomp/blob/main/FLAT_STEP.md) for flat step.

## Next

- [What static recompilation is](/docs/start/what-is-static-recompilation), if the translation step is new.
- [The recompiler and the runtime](/docs/concepts/recompiler-and-runtime), where the interpreter fallback lives.
- [Code you cannot see ahead of time](/docs/concepts/code-you-cannot-see-ahead-of-time), when code arrives during play.
- The platform pages that carry each console's depth: [NES](/docs/platforms/nes), [SNES](/docs/platforms/snes), [Game Boy Advance](/docs/platforms/game-boy-advance), [PlayStation](/docs/platforms/playstation), [Sega Genesis](/docs/platforms/sega-genesis) and [Master System and Game Gear](/docs/platforms/master-system-game-gear).
- [Proving it with co-simulation](/docs/concepts/co-simulation), then [Port a game](/docs/guides/port-a-game) and the [glossary](/docs/concepts/glossary).
