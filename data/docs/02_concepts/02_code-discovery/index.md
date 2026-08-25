---
title: "Telling code from data"
summary: "A game's binary does not say which bytes are instructions. Every toolchain here starts from addresses the hardware guarantees, follows what those reach, guesses at the rest, checks the guesses, and catches the misses while the game runs."
pageType: "concept"
tags: ["Code discovery", "Recompiler", "NES", "SNES", "Game Boy Advance", "PlayStation", "Sega"]
repos:
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/smsggrecomp"
updated: "2026-08-25"
---

The recompiler translates a game's machine code before the game runs, so it has to know which bytes are machine code. A game dump does not say. A cartridge image or a disc executable is one flat block of bytes: graphics, text, sound and instructions, with nothing marking where a function starts. Every toolchain here answers that in the same five steps, and fills those steps differently.

## Why you cannot just read it from the top

Decode one instruction, step forward by its length, repeat. Three things break that.

**Instructions are not all the same length.** On the 6502, the 65816, the Z80 and the 68000 they vary. Start one byte late and you read the tail of one instruction as the start of the next. The output stays plausible and wrong until it happens to line up again. Fixed length sets remove that trap and no other: MIPS and ARM instructions are always four bytes, and a decoder can still walk off the end of a function into a table of numbers and translate that too.

**Data decodes fine.** Tile graphics disassemble as neatly as a real subroutine. On the NES the byte `0x00` means `BRK`, so empty ROM reads as a run of software interrupts, and nesrecomp marks zero runs of 16 bytes or more as data. Another console needs its own rule for its own filler byte.

**An address is not enough.** On four of these consoles, for four different reasons, the same address holds different code at different moments. The next section takes them one at a time.

So discovery is a search, not a straight read.

![The same seven bytes of 6502 code, read from a real entry point and one byte later: a load and a store, or two subroutine calls. Below, nesrecomp's pipeline, where the walk is evidence and every guess has to pass the check.](./discovery.svg)

## The five steps every project here repeats

1. **Seed from what the hardware guarantees.** Every console gives you at least one address it will certainly execute: an interrupt vector, a header entry point, a boot handoff. Facts, not guesses.
2. **Follow what those reach.** Decode forward from each seed and add every call, jump and branch target. That is evidence, because an instruction named the address.
3. **Guess at the rest.** A jump through a table names no target in any instruction, so the walk will never find it. Scanners go over what the walk never entered, looking for the shape a table of addresses makes.
4. **Check every guess.** A guess accepted as a function turns data into code, so each candidate is decoded a short way and dropped if it reads as nonsense.
5. **Catch the misses while the game runs.** No build-time pass can find an address the game only works out mid-play. Every runtime here has an answer when handed one: emulate that code, log it, or compile it there and then.

Steps 1 and 2 produce evidence. Step 3 produces guesses, and step 4 keeps the two apart.

## What each console has to work with

The NES is the worked example below. Here are the other four.

### SNES

The 65816 changes the width of its own instructions as it runs. Two status bits, M and X, pick 8-bit or 16-bit registers, and twelve opcodes are two bytes under one setting and three under the other. So an instruction is an address plus a mode, and [snesrecomp](https://github.com/mstan/snesrecomp) keys its decoder on both.

From [`recompiler/v2/decoder.py`](https://github.com/mstan/snesrecomp/blob/main/recompiler/v2/decoder.py):

```text title="recompiler/v2/decoder.py"
In v2, every instruction is identified by `DecodeKey(pc, m, x)`. Two
predecessors with different mode states produce two distinct
DecodedInsn records at the same PC — both are preserved. Downstream
(v2 cfg / IR / codegen) treats them as two separate blocks.
```

[SNES](/docs/platforms/snes) has the full account, including what went wrong in version 1, which kept one mode per address.

### Game Boy Advance

The ARM7TDMI runs two instruction sets in one address space and switches between them as it goes, so one address can hold an ARM function or a Thumb one. [gbarecomp](https://github.com/mstan/gbarecomp)'s rule for the finder is that "Block discovery must follow both states." See [Game Boy Advance](/docs/platforms/game-boy-advance).

### PlayStation

There is no vector table to start from, so [psxrecomp](https://github.com/mstan/psxrecomp) takes its seeds off the disc. Its own tool says plainly that "it does not statically resolve 100% of the game's execution paths (such as dynamic function tables or indirect register dispatches)". A disc also holds more code than fits in memory, so a block of RAM holds whichever chunk arrived last. That half of the problem is [code you cannot see ahead of time](/docs/concepts/code-you-cannot-see-ahead-of-time).

### Genesis and Master System

[segagenesisrecomp](https://github.com/mstan/segagenesisrecomp) and [smsggrecomp](https://github.com/mstan/smsggrecomp) start from the cartridge vectors and take labels, annotations and declared jump tables as evidence rather than guessing.

One mode drops discovery on purpose. A Z80 used as a sound chip runs a program the main CPU uploads into RAM while the game plays, so there is no fixed image to search. smsggrecomp's `--flat-step` answers that by treating every byte as a legal entry point. See [Master System and Game Gear](/docs/platforms/master-system-game-gear).

## The NES pipeline, worked through

The five steps are easier to trust filled in. These are [nesrecomp](https://github.com/mstan/nesrecomp)'s.

The seeds are the NMI, RESET and IRQ vectors. The finder walks out from them, marking everything it reaches with its strongest source flag, `FUNCTION_SOURCE_CONTROL`. Scanners then look for what no instruction points at: runs of four or more addresses that each decode as code, and tables kept as split low-byte and high-byte arrays. Every candidate goes through one check, which accepts an address if the next seven instructions decode cleanly, or if it reaches a clean ending sooner.

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

The check is stricter than the translator on purpose: the code generator implements many unofficial 6502 opcodes, and the check still counts them illegal, because implementing an opcode must not change which functions get found.

The project is clear about which mistakes matter, in [`README.md`](https://github.com/mstan/nesrecomp/blob/master/README.md):

> The deep-decode check eliminates 'harmful' false positives (data misidentified as code, which would generate invalid C). 'Harmless' false positives (valid code in another bank's context) are accepted.

Data read as code is harmful: the recompiler writes a function out of misread graphics. Genuine instructions found under the wrong bank are harmless, because nothing calls them. A pass that had to prevent both kinds would have to be perfect. One that only has to prevent the harmful kind can afford to guess.

Whatever is still missing shows up as a jump to an address with no generated function. That is not a crash. The address goes to the interpreter, a small emulator inside the port that reads those instructions and acts them out one at a time, more slowly. Misses are logged.

```sh
GameRecomp.exe "rom.nes" --smoke 6000 --smoke-output smoke.json
```

Closing the gap is a loop: run, read the misses, add them to `[functions]`, build again. [NES](/docs/platforms/nes) has the rest of this toolchain.

## What the NES case does not tell you

What is unusual here is how little that safety net has to do. The whole cartridge is present when the recompiler runs, which nesrecomp gives as its reason for not copying psxrecomp's design: on the NES, no hot code arrives at run time.

Where code does arrive during play, step 5 becomes a second discovery pass with its own machinery. And none of this shows that what was found got translated correctly. That is a separate question.

## Source

- nesrecomp: [`function_finder.c`](https://github.com/mstan/nesrecomp/blob/master/recompiler/src/function_finder.c), [`code_generator.c`](https://github.com/mstan/nesrecomp/blob/master/recompiler/src/code_generator.c), [`README.md`](https://github.com/mstan/nesrecomp/blob/master/README.md)
- snesrecomp: [`recompiler/v2/decoder.py`](https://github.com/mstan/snesrecomp/blob/main/recompiler/v2/decoder.py). gbarecomp: [`PRINCIPLES.md`](https://github.com/mstan/gbarecomp/blob/main/PRINCIPLES.md)
- psxrecomp: [`psxrecomp-toml-readme.md`](https://github.com/mstan/psxrecomp/blob/master/psxrecomp-toml-readme.md). segagenesisrecomp: [`COVERAGE.md`](https://github.com/mstan/segagenesisrecomp/blob/master/COVERAGE.md). smsggrecomp: [`FLAT_STEP.md`](https://github.com/mstan/smsggrecomp/blob/main/FLAT_STEP.md)

## Next

- [Code you cannot see ahead of time](/docs/concepts/code-you-cannot-see-ahead-of-time), when code arrives during play.
- [Co-simulation](/docs/concepts/co-simulation), which checks the translation itself.
- The platform pages: [NES](/docs/platforms/nes), [SNES](/docs/platforms/snes), [Game Boy Advance](/docs/platforms/game-boy-advance), [PlayStation](/docs/platforms/playstation), [Sega Genesis](/docs/platforms/sega-genesis).
