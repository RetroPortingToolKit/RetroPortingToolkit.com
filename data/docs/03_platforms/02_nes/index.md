---
title: "NES"
summary: "nesrecomp translates a NES cartridge's 6502 machine code into C and links it against an SDL2 runner that simulates the PPU, APU and mapper."
pageType: "project"
tags: ["NES", "6502", "Mappers"]
repos:
  - "https://github.com/mstan/nesrecomp"
updated: "2026-08-25"
---

[nesrecomp](https://github.com/mstan/nesrecomp) reads the 6502 machine code in a NES cartridge dump and turns it into C at build time. That C is compiled and linked against a runner library, which simulates the console's picture processor, audio, cartridge mapper and controllers. The result is a native program. You supply the cartridge dump. The games and the player-facing features are on the catalogue page, [/hardware/nes](/hardware/nes).

## Status, in the project's own words

From [`README.md`](https://github.com/mstan/nesrecomp/blob/master/README.md):

> A static 6502 recompiler framework for NES games. Translates NES ROM machine code to C, which is then compiled to native machine code for direct execution on modern PCs.

> **This is NOT an emulator.** Each 6502 instruction is translated to equivalent C code at build time. JSR becomes a direct C function call, branches become gotos, and the NES hardware (PPU, APU, mapper) is simulated by the runner library.

That second quote is precise, and both halves are true at once. The game's own instructions are translated ahead of time. The console's hardware is simulated while you play. [What static recompilation is](/docs/start/what-is-static-recompilation) unpacks that.

The same file's platform table:

> Windows (x64, MSVC) | Primary / mature
>
> macOS (Apple Silicon + Intel) | **Experimental — newly added**
>
> Other UNIX (Linux) | Likely works via the same POSIX path; less tested

And it is clear that the framework alone is not a game:

> This builds a static library. It does not create a playable game by itself. Each game still needs game-specific configuration and runner integration.

The license is [PolyForm Noncommercial License 1.0.0](https://github.com/mstan/nesrecomp/blob/master/LICENSE), Copyright (c) 2026 Matthew Stan.

> **You provide this.** From the same README: "NESRecomp does not include game ROMs." The packaged CLI expects "a legally obtained .nes ROM" and checks the `NES\x1a` header magic first. No BIOS file is needed for this console.

## The 6502, and what comes out of the recompiler

The CPU is the MOS 6502 in its Ricoh RP2A03 form. The recompiler is pure C11 with no external dependencies; the game runners add SDL2. A run has five stages: parse the iNES header, banks and vectors; load `game.toml`; discover functions; emit C; write a coverage report.

The two halves meet at one header, [`runner/include/nes_runtime.h`](https://github.com/mstan/nesrecomp/blob/master/runner/include/nes_runtime.h), which describes itself as "Shared between runner/ and generated/ code. Generated code includes this; runner implements it." Across it go the CPU state, the RAM, SRAM, CHR, OAM, palette and nametable arrays, bus functions such as `nes_read`, the dispatch functions, and the timing hook `nes_instruction_boundary`. Every project in the fleet splits this way. See [the recompiler and the runtime](/docs/concepts/recompiler-and-runtime).

The generated C is emitted as separate translation units, which matters because the outputs are large. From [`SPLITGEN_MIGRATION.md`](https://github.com/mstan/nesrecomp/blob/master/SPLITGEN_MIGRATION.md):

> Measured on Metroid: 13 MB single TU → 18 parallel TUs (none > 1.5 MB); `-j16` compile **29.5s → 10.2s** (~2.9×).

## Mappers, which is where the NES gets specific

Almost every NES cartridge above 32 KB carries a mapper. That is hardware on the cart which swaps which chunk of ROM appears in the CPU's address window. For a static recompiler it is the defining problem on this console, because an address alone no longer says which bytes it names. It makes [code discovery](/docs/concepts/code-discovery) harder, and it makes dispatch a runtime question.

The runner's mapper source supports NROM, MMC1 (mapper 1), UxROM (mapper 2), MMC3 (mapper 4), mapper 40 and GxROM. The README's own support table does not match that list; see the divergences below.

MMC3 shows why banked dispatch cannot be settled at build time. The generated dispatcher reads the live 8 KB bank of the target's CPU window, then rebases the address into the recompiler's layout before switching on it.

From [`recompiler/src/code_generator.c`](https://github.com/mstan/nesrecomp/blob/master/recompiler/src/code_generator.c):

```c title="recompiler/src/code_generator.c"
    if (rom->mapper == 4) {
        fprintf(f,
            "    extern int g_mmc3_win_bank8k[4];\n"
            "    /* MMC3: resolve the target through the live 8KB bank of its CPU\n"
            "     * window ($8000/$A000/$C000/$E000).  g_mmc3_win_bank8k is mode-aware\n"
            "     * (PRG mode 1 fixes $8000 to the second-to-last bank and swaps $C000\n"
            "     * via R6 — e.g. SMB3), so this stays correct in both PRG modes.\n"
            "     * Rebase addr into the recompiler's layout: switchable 16KB banks are\n"
            "     * generated at $8000/$A000 offsets, the fixed pair at $C000/$E000. */\n"
            "    uint16_t _cpu_addr = addr;\n"
            "    int _w = (addr >> 13) & 3;\n"
            "    int _b8 = g_mmc3_win_bank8k[_w];\n"
            "    int _bank = _b8 >> 1;\n"
            "    (void)_caller_bank; /* window resolution is authoritative; see miss default */\n"
            "    addr = (uint16_t)(((_bank == %d) ? 0xC000 : 0x8000)\n"
            "                      + ((_b8 & 1) ? 0x2000 : 0) + (addr & 0x1FFF));\n",
            fixed_bank
        );
```

The other half of mapper handling is per-game configuration. A bank switch usually goes through one routine reached by a `JSR`, with the bank and target address stored inline right after the call. The recompiler has to be told, or it reads that data as instructions. The declaration lives in `game.toml`, next to any dispatch tables the scanners cannot find alone.

From [`game.toml`](https://github.com/mstan/FaxanaduRecomp/blob/master/game.toml) in FaxanaduRecomp, the repository's designated boilerplate:

```toml title="game.toml"
# game.toml — Faxanadu (NES, Mapper 1 / MMC1, 16 PRG banks, CHR RAM)

[game]
output_prefix = "faxanadu"
disable_ptr_scan = true
disable_secondary = true

# ── Bank-switch trampolines ──────────────────────────────────────────────────
# JSR $F859 is followed by 3 inline data bytes (bank, addr_lo, addr_hi).
# $CC1A is the MMC1 PRG bank-switch function in the fixed bank.
[[trampoline]]
addr = 0xF859
inline_bytes = 3
bs_fn_addr = 0xCC1A

# ── Known 2-byte LE dispatch tables ─────────────────────────────────────────
# Each entry is a (target-1) LE16 pair.

[[known_table]]
bank = 14
start = 0x8087
end = 0x8151   # main entity state dispatch (101 entries)
```

`game.toml` is the only recompiler config format. The older plain text `.cfg` format now fails the load outright.

## The commands

Build the recompiler, then run it against a ROM and its config:

```bash
cmake -S recompiler -B build/recompiler -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build/recompiler
```

```sh
build/recompiler/NESRecomp "Super Mario Bros.nes" --game game.toml
```

`--game` defaults to `./game.toml` if present, `--output-prefix` overrides the generated filename prefix, and `--proposal-out <path>` writes a proposed config from auto-discovery. With no config at all, the recompiler runs a proposal loop and writes a starter `game.toml`. Outputs land in `generated/`, plus two audit CSVs.

There is also a packaged Windows CLI, a Python front end around the same core:

```powershell
.\nesrecomp.exe build `
  --rom "C:\Games\MyGame.nes" `
  --output "C:\Projects\MyGameRecomp"
```

Once a game project builds, a headless smoke run is the fastest check that discovery is complete:

```sh
GameRecomp.exe "rom.nes" --smoke 6000 --smoke-output smoke.json
```

Expect `dispatch_miss_count` to be 0. Beyond that, correctness is co-simulation against Mesen through a `nesref` host binary, coordinated by `tools/nes_cosim.py`. Its gates print PASS or FAIL and exit non-zero on FAIL. There is no CI workflow here, so all of this is run by hand.

## What runs today

Ten game repositories consume nesrecomp as a submodule: SuperMarioBrosNESRecomp, DuckHuntNESRecomp, DrMarioNesRecomp, LegendOfZeldaNESRecomp, MetroidNESRecomp, [FaxanaduRecomp](https://github.com/mstan/FaxanaduRecomp), YoshiNESRecomp, YoshisCookieRecomp, Megaman3NESRecomp and GumshoeNESRecomp. The README nominates FaxanaduRecomp as the boilerplate to copy.

The README's per-game status table is the authority on how far each gets, and it hedges on purpose. Its wording runs from "Fully playable" through:

> Believed 100% playable

> Work in progress — title/menu/early stages playable

Read that table rather than a summary of it. Nothing on this site has re-tested those claims.

## Known limits

- The framework builds a static library. A playable result still needs per-game configuration and runner integration.
- Code the discovery pass misses falls through to an interpreter that shares the recompiler's decode table. That fallback is slower, and it is logged rather than silent, so a missed address becomes a slow moment and an entry in a log, not a crash. A fresh port starts with a list of addresses to chase.
- Because a `JSR` becomes a C function call, the 6502 stack page below the live stack pointer is not bit faithful against a reference emulator. The project documents that as an expected difference.
- Co-simulation needs a `nesref` host binary and `mesen_libretro.dll`. The repository ships `tools/nesref/` but no core DLL, and several documents point at absolute paths on the author's machine, so it cannot be reproduced from a clean checkout alone.
- The `lib/recomp-net` submodule was not populated in the checkout this page was written from.

## Where the documents and the code disagree

Four places had drifted when this page was written. The repository takes the same view itself, in [`TCP.md`](https://github.com/mstan/nesrecomp/blob/master/TCP.md):

> Source of truth: the `s_commands[]` table in `runner/src/debug_server.c`. If you find a discrepancy with this list, **the code wins**.

**Unofficial opcodes.** [`COVERAGE.md`](https://github.com/mstan/nesrecomp/blob/master/COVERAGE.md) and the README both list `SAX`, `DCP`, `ISC`, `SLO`, `RLA`, `SRE`, `RRA`, `ANC`, `ALR`, `ARR` and `AXS` as unimplemented. The decoder and the code generator implement them.

**The `JMP ($xxFF)` page-boundary erratum.** `COVERAGE.md` says the wrap behaviour is not modelled. It is: `nes_read16_jmpbug` exists in the runtime header, and a test pins it in both the static resolver and the emitted code.

From [`tests/codegen.test.ts`](https://github.com/mstan/nesrecomp/blob/master/tests/codegen.test.ts):

```ts title="tests/codegen.test.ts"
    const rom = new RomBuilder()
      .org(0xc000)
      .jmpInd(0xdeff)
      .poke(0xdeff, 0x50)
      .poke(0xde00, 0xe1)
      .poke(0xdf00, 0x00)
      .org(0xe150)
      .rts()
      .vectors(0xc000, 0xc000, 0xc000)
      .writeTemp("jmp_indirect_xxff_pagewrap.nes");

    const result = recompile(rom);
    // Static vector resolution must have used wrap-correct hi byte.
    expect(result.dispatchEntries).toContain("E150");
    // Codegen must use the bug-modeling helper, not plain nes_read16,
    // so JMP ($DEFF) at runtime also reads the correct page.
    expect(result.fullC).toContain("nes_read16_jmpbug(0xDEFF)");
    expect(result.fullC).not.toContain("nes_read16(0xDEFF)");
```

**UxROM and mapper 40.** The README's mapper table lists mapper 2 (UxROM) as "Not yet", while [`runner/src/mapper.c`](https://github.com/mstan/nesrecomp/blob/master/runner/src/mapper.c) supports it. Mapper 40 is implemented and is missing from the README table entirely.

**`game.cfg` in the agent instructions.** [`CLAUDE.md`](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md) still refers to `game.cfg` in four places. Write `game.toml`.

> **Note.** These are observations from one clone, not corrections filed with the project. Check them against the current tree, and prefer the code.

## Source

From [nesrecomp](https://github.com/mstan/nesrecomp).

- Start with [`README.md`](https://github.com/mstan/nesrecomp/blob/master/README.md): the per-game table, the mapper table and the build steps.
- `CLAUDE.md` is the operating manual, `PATTERNS.md` catalogues the 6502 idioms that defeat a naive walk, `COSIM.md` and `NES_ACCURACY_BURNDOWN.md` are the correctness pair, [`TCP.md`](https://github.com/mstan/nesrecomp/blob/master/TCP.md) the debug server.
- Code above: [`recompiler/src/code_generator.c`](https://github.com/mstan/nesrecomp/blob/master/recompiler/src/code_generator.c), [`runner/src/mapper.c`](https://github.com/mstan/nesrecomp/blob/master/runner/src/mapper.c), [`runner/include/nes_runtime.h`](https://github.com/mstan/nesrecomp/blob/master/runner/include/nes_runtime.h), [`tests/codegen.test.ts`](https://github.com/mstan/nesrecomp/blob/master/tests/codegen.test.ts), [`game.toml`](https://github.com/mstan/FaxanaduRecomp/blob/master/game.toml) in FaxanaduRecomp.

## Next

- [NES on the hardware catalogue](/hardware/nes), for the games and what the ports add.
- [Telling code from data](/docs/concepts/code-discovery), the discovery problem this toolchain shows clearest.
- [Port a game](/docs/guides/port-a-game), the workflow from a cartridge dump to a running build.
- [Proving it with co-simulation](/docs/concepts/co-simulation), and the [glossary](/docs/concepts/glossary) for the terms.
