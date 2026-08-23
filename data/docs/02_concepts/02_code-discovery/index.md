---
title: "Telling code from data"
summary: "A cartridge dump does not say which bytes are instructions, so a static recompiler has to work it out: a walk from the interrupt vectors, heuristic table scanners, a decode predicate that rejects data, and a runtime fallback for what it still misses."
section: "concepts"
sectionTitle: "Concepts"
pageType: "concept"
tags: ["Code discovery", "Recompiler", "NES"]
repos:
  - "https://github.com/mstan/nesrecomp"
updated: "2026-08-23"
---

A static recompiler translates a game's machine code into C before the game runs, so it must know which bytes are machine code. A cartridge dump does not say. It is one flat block of bytes: graphics, tables, text, sound data and instructions packed together, with no symbols and nothing marking where a function begins. Every later stage of a port rests on this decision, and it cannot be made perfectly. This page is how [nesrecomp](https://github.com/mstan/nesrecomp) makes it, and what happens to the code it misses.

## Why you cannot decode from the top

A linear sweep decodes an instruction, advances by its length, and repeats. Three things break it.

**Instructions are variable length.** A 6502 opcode is 1 to 3 bytes. Start on the wrong byte and you read one instruction's operand as the next one's opcode, and the sweep stays fluent, plausible and wrong until it happens to resynchronise.

**Data decodes happily.** Tile graphics disassemble as readily as a subroutine does. Zero padding is the clearest case, because `0x00` is `BRK`: unused ROM reads as a run of software interrupts. nesrecomp settles that one first, auto-marking zero-fill runs of 16 bytes or more as data regions.

**An address does not identify the bytes.** NES cartridges above 32 KB switch banks. The last 16 KB PRG bank is always mapped at `$C000-$FFFF`, the fixed bank, while `$8000-$BFFF` holds whichever bank the mapper selected, so one CPU address is different code depending on runtime state.

Discovery is a search, not a parse.

## Starting from the three addresses the hardware guarantees

`rom_parse` reads the iNES header, the mapper number and the NMI, RESET and IRQ vectors out of the last PRG bank. Those three are the only entry points the console itself will ever jump to, and they are the seeds. `function_finder_run` walks breadth first from there: decode forward, and every `JSR` target, `JMP` target and branch target becomes a new entry to visit. What the walk reaches carries the finder's strongest provenance, `FUNCTION_SOURCE_CONTROL`.

Two NES habits complicate it. A call can leave the bank being walked, so `[mapper].bank_switch` names the game's bank-switch routines and the finder propagates register values across them, resolving a bank number during the walk rather than after it. Bank switches also hide data in the instruction stream: a `JSR` to a dispatcher followed by inline bytes holding the bank and target address, which the callee reads back off the stack. A `[[trampoline]]` block declares such a site, its inline byte count and which register carries the bank. Undeclared, the walker decodes those bytes as instructions, and the documented symptom is a black screen at boot.

## What no instruction points at

Static control flow does not reach everything. NES games dispatch through tables constantly: a handler address looked up by index, named by no instruction anywhere. Several passes hunt for those.

- A pointer scan over the fixed bank, and a second for switchable-bank pointers that target it, which `[game].disable_ptr_scan` turns off where it misfires.
- The table-run scanner: four or more consecutive little-endian 16-bit values whose targets each decode as code.
- The split-table scanner, for tables kept as parallel low-byte and high-byte arrays recombined as `(hi << 8 | lo) + adjust`. There is no contiguous run of pointers to find, so this pass reads both arrays together.
- Then `[[known_table]]` and `[[split_table]]` declarations from `game.toml`, cross-bank byte-match propagation, secondary-entry classification, and explicit seeds.

The table-run scanner shows the shape of all of them. This loop runs over every switchable bank `b` at every offset `off`, and accepts a run only if every target passes a decode check.

From [`recompiler/src/function_finder.c`](https://github.com/mstan/nesrecomp/blob/master/recompiler/src/function_finder.c):

```c
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

## The predicate that says no

Every weak candidate passes through one function. It accepts an address if the seven instructions there decode cleanly, or if it reaches a clean terminator sooner. `TABLE_RUN_MIN_VALID` is 7 and `TABLE_RUN_MIN_RUN` is 4.

From [`recompiler/src/function_finder.c`](https://github.com/mstan/nesrecomp/blob/master/recompiler/src/function_finder.c):

```c
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

## Two kinds of wrong, and only one of them matters

From [`README.md`](https://github.com/mstan/nesrecomp/blob/master/README.md):

> The deep-decode check eliminates 'harmful' false positives (data misidentified as code, which would generate invalid C). 'Harmless' false positives (valid code in another bank's context) are accepted.

A harmful false positive is data accepted as code: the recompiler emits a function built from a misread of tile data, which fails to compile or, worse, compiles. A harmless one is genuine code found under the wrong bank's assumptions. It translates, nothing calls it, and it costs some dead bytes. A pass eliminating both would have to be perfect. One eliminating only the harmful kind can afford to guess.

Guessing is safe only while a guess stays labelled as one. Every entry carries a source bitmask, `FUNCTION_SOURCE_CONTROL`, `PTR_SCAN`, `TABLE_RUN`, `SPLIT_TABLE`, `KNOWN_TABLE`, `XBANK` or `MANUAL`, plus an evidence count, and `propagated_discovery_source` refuses to promote a weak source into strong control-flow evidence when the walk fans out from it. A guessed entry never launders itself into proof for what it calls. The audit trail is `<prefix>_finder_audit.csv` and `<prefix>_auto_entries.csv`, which carries `evidence_count` and `source_flags` per entry.

## What is still missing when the build finishes

No scanner finds an address that exists only as a value computed at runtime. Handed one with no recompiled function behind it, the generated dispatcher does not fail.

From [`recompiler/src/code_generator.c`](https://github.com/mstan/nesrecomp/blob/master/recompiler/src/code_generator.c):

```c
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

Discovery is a build-time best effort with a runtime safety net, and the two together set what a port can do. The NES is the easy case for the ahead-of-time half, because the whole ROM is present when the recompiler runs. That is how the repository explains not adopting psxrecomp's multi-tier design:

> psxrecomp's multi-tier system exists to solve a problem NES does not have ... On NES there is no hot code that arrives at runtime — the entire ROM is present at build time.

Where code arrives while the game is playing, the answer differs. And nothing here shows that the code found was translated correctly, which is a separate question with its own machinery.

## Source

From [nesrecomp](https://github.com/mstan/nesrecomp): [`function_finder.c`](https://github.com/mstan/nesrecomp/blob/master/recompiler/src/function_finder.c) and [`function_finder.h`](https://github.com/mstan/nesrecomp/blob/master/recompiler/src/function_finder.h) for the walk, the scanners, the validator and the source flags; [`rom_parser.c`](https://github.com/mstan/nesrecomp/blob/master/recompiler/src/rom_parser.c) for vectors; [`game_config.c`](https://github.com/mstan/nesrecomp/blob/master/recompiler/src/game_config.c) for `game.toml`; [`code_generator.c`](https://github.com/mstan/nesrecomp/blob/master/recompiler/src/code_generator.c) for dispatch; [`PATTERNS.md`](https://github.com/mstan/nesrecomp/blob/master/PATTERNS.md), [`EXTRACTION.md`](https://github.com/mstan/nesrecomp/blob/master/EXTRACTION.md) and [`README.md`](https://github.com/mstan/nesrecomp/blob/master/README.md).

## Next

- [What static recompilation is](/docs/start/what-is-static-recompilation), if the translation step is new.
- [The recompiler and the runtime](/docs/concepts/recompiler-and-runtime), where the interpreter fallback lives.
- [Code you cannot see ahead of time](/docs/concepts/code-you-cannot-see-ahead-of-time), when code arrives during play.
- [Proving it with co-simulation](/docs/concepts/co-simulation), then [NES](/docs/platforms/nes), [Port a game](/docs/guides/port-a-game) and the [glossary](/docs/concepts/glossary).
