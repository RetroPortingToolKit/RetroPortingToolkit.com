---
title: "Port a game"
summary: "How a game file you supply becomes a running native port: the repository shape 64 ports share, the commands that drive the recompiler, and why a game-specific fix belongs in configuration rather than in generated code."
pageType: "guide"
tags: ["Porting", "Recompiler", "Configuration"]
repos:
  - "https://github.com/mstan/FaxanaduRecomp"
  - "https://github.com/mstan/SuperMarioBrosNESRecomp"
  - "https://github.com/mstan/SuperMarioWorldRecomp"
  - "https://github.com/mstan/MegaManX6Recomp"
  - "https://github.com/mstan/MinishCapRecomp"
  - "https://github.com/Shy/BoktaiRecomp"
updated: "2026-08-25"
---

A port here is a repository that records how to turn one game file into a native program. It does not contain the game, and it holds very little hand-written code. It holds four things: a pinned recompiler framework, the identity of the file you supply, the facts the recompiler could not work out from the bytes alone, and a thin runtime shim. All 64 game ports share that shape, and one rule: a game-specific fix is configuration, never an edit to the generated code.

## Before you start

This guide begins where [build a toolchain](/docs/guides/build-a-toolchain) ends. You have a framework built for your console, and your own copy of the game. The console picks the framework.

| Console | Framework | Example port |
|---|---|---|
| NES | nesrecomp | [FaxanaduRecomp](https://github.com/mstan/FaxanaduRecomp) |
| SNES | snesrecomp | [SuperMarioWorldRecomp](https://github.com/mstan/SuperMarioWorldRecomp) |
| Game Boy and Game Boy Color | gbrecompiled | [PokemonYellowRecomp](https://github.com/mstan/PokemonYellowRecomp) |
| Game Boy Advance | gbarecomp | [MinishCapRecomp](https://github.com/mstan/MinishCapRecomp) |
| PlayStation | psxrecomp | [MegaManX6Recomp](https://github.com/mstan/MegaManX6Recomp) |
| Genesis | segagenesisrecomp | [SonicTheHedgehogRecomp](https://github.com/mstan/SonicTheHedgehogRecomp) |
| Master System and Game Gear | smsggrecomp | [SonicTheHedgehogSMSRecomp](https://github.com/mstan/SonicTheHedgehogSMSRecomp) |
| Virtual Boy | vbrecomp | [MarioTennisVirtualBoyRecomp](https://github.com/mstan/MarioTennisVirtualBoyRecomp) |
| Nintendo DS | ndsrecomp | [MetroidPrimeHuntersRecomp](https://github.com/mstan/MetroidPrimeHuntersRecomp) |

Two Nintendo 64 repositories sit outside that table. [Nintendo 64](/hardware/nintendo-64) covers them, and [every repository](/docs/fleet/repositories) has the full map.

## What a port repository contains

Almost every port is seven things plus variation: a README, a pinned framework submodule, a pinned `recomp-ui` submodule, CMake glue, per-game recompiler input, a runtime shim, `tools/`. Counts are for the repository root across the 64 ports surveyed.

| Path | In how many of 64 | What it is |
|---|---|---|
| `README.md` | 64 | status, file identity, quick start, build, layout, licence |
| `.gitmodules` | 61 | pins framework and `recomp-ui` by gitlink SHA |
| `recomp-ui/` | 59 | shared Dear ImGui pre-boot launcher submodule |
| `CMakeLists.txt` | 59 | glue: includes the framework's runner cmake |
| `tools/` | 58 | regen, packaging, verification, debug helpers |
| `game.toml` | 45 | per-game recompiler and runtime config |
| `src/` | 33 | hand-written runtime C or C++, plus `src/mods/` |
| `mods/` | 32 | preloaded mod packages |
| `ISSUES.md` | 26 | engineering ledger, not a user tracker |
| `recomp/` | 24 | SNES pattern: one `bank*.cfg` per bank |
| `tests/` | 24 | ctest, vitest or Python suites |
| `CLAUDE.md` or `AGENTS.md` | 22 and 1 | agent contract, deferring to the framework's |
| `seeds/` | 20 | PS1 pattern: `ghidra_funcs.txt`, `bios_thunks.txt` |
| `generated/` | 19 | recompiler output, usually gitignored |
| `LICENSE` | 15 | PolyForm Noncommercial 1.0.0 dominates |
| `baserom.md` or `DISC.md` | 10 and 8 | identity record for your file |
| `symbols/` | 6 | GBA pattern: `imported_symbols.tsv`, `boundaries.tsv` |

Three things never change. The README exists in all 64. The framework is a pinned submodule, not copied source. The generated code is never hand-edited. What varies most is where the recompiler input lives: SNES uses `recomp/bank*.cfg`, PS1 uses `seeds/*.txt` plus a large `game.toml`, NES puts everything in `game.toml`, GBA uses `symbols/*.tsv` plus one file per region.

## Step 1. Record the identity of the file you supply

> **You provide this.** The repositories do not ship a game file, and most ports will not run on one they do not recognise. [The game file you supply](/docs/concepts/the-game-file-you-supply) is the canonical page for that contract.

Write the identity record first. Cartridge ports call it `baserom.md`, PS1 ports call it `DISC.md`, and repositories with neither put the table in the README. It carries every hash and header field for the revision you build against, plus what you reject. MinishCap rejects trimmed, IPS or UPS-patched and decomp-built ROMs. Recompiler output is keyed to specific opcodes at specific addresses, so a patched file is a different game.

Then write a verifier that checks more than the hash. [BoktaiRecomp](https://github.com/Shy/BoktaiRecomp) has the most thorough one, [`tools/verify_rom_hash/main.cpp`](https://github.com/Shy/BoktaiRecomp/blob/main/tools/verify_rom_hash/main.cpp). It checks two hashes, the exact size, header fields, the logo, the save chip type and the RTC signature. Run it after step 3: `./build/verify_rom_hash variants/boktai1_usa/roms/boktai1_usa.gba`. Exit 0 is verified, 1 is a mismatch, 2 is a usage or IO error.

## Step 2. Fetch the repository and its pinned framework

The framework is a submodule pinned at a gitlink SHA, so a clone without submodules cannot build. Clone with `git clone --recurse-submodules <repository url>`. Repair an existing clone with `git submodule update --init --recursive`. Faxanadu wraps that in `chmod +x setup.sh && ./setup.sh`.

**You should now see** a populated framework directory and `recomp-ui/`, both at the commits this repository recorded, not at their branch tips.

## Step 3. Build the recompiler, then regenerate the game C

Two stages, and the first is cached. Build the recompiler once from the framework submodule. Then rerun it over your game file whenever the configuration changes. [Klonoa-Door-to-Phantomile](https://github.com/TechnicallyComputers/Klonoa-Door-to-Phantomile) gives the PS1 sequence.

From [`README.md`](https://github.com/TechnicallyComputers/Klonoa-Door-to-Phantomile/blob/master/README.md):

```bash
git submodule update --init --recursive
./psxrecomp/tools/ci/build_emitters.sh
python3 psxrecomp/psxrecomp_cli.py generate \
  --config game.toml --project-root . --disc disc/<your>.cue
cmake -S . -B build-release -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build-release --target psx-runtime
```

`disc/<your>.cue` is your own image. `python3 psxrecomp/tools/prepare_disc.py --config game.toml <dump>` stages it into a gitignored `disc/`. Cartridge consoles place the ROM where `game.toml` points.

| Console | Regenerate with, from the repository named |
|---|---|
| PS1 | `./psxrecomp/recompiler/build/psxrecomp-game --config game.toml` ([xenogears-recomp](https://github.com/OpokXeno/xenogears-recomp/blob/master/README.md)) |
| NES | `nesrecomp\build_recomp\NESRecomp.exe baserom.nes` ([FaxanaduRecomp](https://github.com/mstan/FaxanaduRecomp/blob/master/build_all.bat)) |
| SNES | `bash tools/regen.sh usa --no-tests` ([MegaManX-X](https://github.com/Team-Resurgent/MegaManX-X/blob/main/README.md)) |
| SNES (DKC2) | `python3 scripts/generate_snesrecomp.py --rom /private/path/dkc2.sfc` ([DKC2Recomp](https://github.com/mstan/DKC2Recomp/blob/main/README.md)) |
| GB and GBC | `"$GBRECOMP" --config "$TOML"` ([PokemonYellowRecomp](https://github.com/mstan/PokemonYellowRecomp/blob/main/scripts/build.sh)) |

**You should now see** generated translation units under `generated/` or `src/gen/`, plus a dispatch file. On SNES that is `src/gen/bankXX_v2.c` and `dispatch_v2.c`, one per `recomp/bank*.cfg`. Nothing there is yours to edit.

## Step 4. Know what is generated and what is committed

Committed: `game.toml`, `recomp/*.cfg`, `seeds/`, `symbols/*.tsv`, `annotations/*.csv`, the Ghidra scripts, `CMakeLists.txt`, `tools/`, the docs. That small set is the entire description of your port.

Generated and normally ignored: `generated/` or `src/gen/`, `recomp/funcs.h`, overlay caches, saves, build trees, the game file itself. Two repositories commit their output anyway, and Faxanadu says why in its `.gitignore`:

> `# DO NOT ignore generated/ — committed for reproducibility`

That is the exception. The rule about editing that output has none:

> "`src/gen/` and `recomp/funcs.h` are generated. Never hand-edit. Fix the recompiler or cfg."
>
> [SuperMarioWorldRecomp `CLAUDE.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/CLAUDE.md)

Generated sources are derived from a copyrighted game file, which also decides what you can distribute. See [release a port](/docs/guides/release-a-port).

## Step 5. Put each fix in the layer that owns it

This is where new porters go wrong. Six mechanisms sit at different points in the pipeline. Which one you pick decides whether your fix survives the next regeneration, and whether anyone else benefits from it.

| Mechanism | What it changes | Where it lives | Seen in |
|---|---|---|---|
| Recompiler hints | what the recompiler believes about the ROM: dispatch tables, trampolines, seeds | `game.toml`, `recomp/bank*.cfg` | Faxanadu, SMB1, MegaManX-X |
| RAM read hooks | the value one instruction sees at a named address, per call site | `[[ram_read_hook]]`, plus `extras.c` | SMB1 |
| Mod function hooks | lets an enabled mod substitute a whole generated routine | `[[mod_function_hook]]` | SMB1 |
| Source overrides | replaces a generated function body, re-applied after every regen | `overrides/`, `tools/apply_overrides.py` | SuperMarioWorld only |
| Address-site policy lists | names the guest addresses a class of fix touches | a policy table in `game.toml` | Xenogears |
| Guarded byte writes | patches a copy of the disc at load, each write carrying its expected bytes | mod `manifest.toml`, compiled resolver | MegaManX6 |

### Recompiler hints

Hints tell the recompiler what it cannot work out from the bytes. Faxanadu declares an MMC1 bank-switch trampoline this way, plus eight dispatch tables in the same file.

From [`game.toml`](https://github.com/mstan/FaxanaduRecomp/blob/master/game.toml):

```toml title="game.toml"
# ── Bank-switch trampolines ──────────────────────────────────────────────────
# JSR $F859 is followed by 3 inline data bytes (bank, addr_lo, addr_hi).
# $CC1A is the MMC1 PRG bank-switch function in the fixed bank.
[[trampoline]]
addr = 0xF859
inline_bytes = 3
bs_fn_addr = 0xCC1A
```

Every hint marks a place automatic [code discovery](/docs/concepts/code-discovery) did not reach, which matters for the rule below. The SNES equivalent is a per-bank cfg of directives.

### Hooks that change behaviour without changing generated code

A `[[ram_read_hook]]` routes reads of a named RAM address through a game callback. The callback decides, per call site, whether to change the value. Call sites are identified by the CPU program counter. SMB1 widens draw and cull decisions this way and leaves the simulation alone.

From [`game.toml`](https://github.com/mstan/SuperMarioBrosNESRecomp/blob/master/game.toml):

```toml title="game.toml"
# Widescreen: route screen-edge reads ($071A-$071D ScreenEdge PageLoc/X_Pos)
# through game_ram_read_hook so extras.c can widen spawn/despawn/draw-cull
# decisions at specific PCs.  `indexed = true` on the two base addresses
# also hooks GetXOffscreenBits' LDA ScreenEdge_*,y reads.  The default hook
# returns the value unchanged, and extras.c gates every shift on the
# widescreen config + gameplay mode, so faithful behavior is preserved
# whenever widescreen is off.
[[ram_read_hook]]
addr = 0x071A           # ScreenLeft_PageLoc (indexed base: ScreenEdge_PageLoc,y)
indexed = true
```

Read the comment as carefully as the two lines of configuration. It names what is widened, what is left alone, and what the default is. SMB1's rule is that anything which is both draw logic and game state, such as the spawn windows, stays vanilla. `[[mod_function_hook]]` is the heavier version, marking a generated function an enabled mod can take over.

Only SuperMarioWorld has the fourth layer. Its overrides sit outside `src/gen/`, because the generated banks are rewritten on every regeneration, so `tools/apply_overrides.py` re-applies each one at build time.

### The rule: fix the framework, not the game

Every repository with a written opinion has the same one. SuperMarioWorld makes it rule zero.

> "We do not fix individual visible bugs in isolation. Each visible
> symptom is a probe into a recompiler / framework gap. The goal is
> to identify the **underlying class of recompiler bug** that
> generated the symptom, fix that class in the framework
> (`snesrecomp/`), regen all banks, and re-evaluate every symptom
> together. Per-game cfg shimming is last-resort (Rule 0)."
>
> [SuperMarioWorldRecomp `ISSUES.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/ISSUES.md)

[MinishCapRecomp](https://github.com/mstan/MinishCapRecomp/blob/main/CLAUDE.md) states it from the framework side and bans the anti-pattern by name: a hardware corner that Minish Cap happens to hit is fixed in `gbarecomp/src/gba/` with a hardware-test citation, never behind a check for the game's name.

Here is why. A per-game hint records something the recompiler failed to work out by itself, and the next game on that mapper will need the same hint. The shim hides a general defect behind a local fix: the symptom leaves your port, the bug stays in the framework, and every future port pays again. Boktai went the other way and merged its PPU bitmap modes, a shared GPIO port, a save chip override and the solar sensor into gbarecomp.

Player-facing changes are a third category. They belong in a default-off mod package, not in either place. [Write a mod](/docs/guides/write-a-mod) covers that layer.

## Step 6. Build the runtime and run it

This compiles the generated C together with the framework's runner, the launcher and your shims. On MegaManX6 it is three commands, and the last one runs the game.

From [`README.md`](https://github.com/mstan/MegaManX6Recomp/blob/master/README.md):

```sh
cmake -S . -B build -G "Unix Makefiles"
cmake --build build -j16
./build/mmx6-runtime.exe
```

**You should now see** the launcher rather than the game, because it asks for your file first. What happens with a file it does not recognise differs by console, and that matters when you are diagnosing a bad start.

| Console | What happens when the file is wrong |
|---|---|
| NES (Faxanadu) | Checks a CRC32 the game declares through `game_get_expected_crc32`, and re-prompts. |
| SNES (DKC2) | The runtime load gate refuses, reporting payload size and computed SHA-256. |
| GBA (Boktai, MinishCap) | Refuses to launch on an unrecognised hash; the BIOS must verify too. |
| PS1 (MegaManX6, Xenogears) | Warns about the header, region or serial and tries to run it anyway. |

> **Warning.** PS1 identity is advisory. A wrong or wrongly converted disc gets past the launcher and fails later, in ways that look like recompiler bugs.

After the first run, resolve every dispatch miss before any other debugging. Then pin what works: 24 of the 64 repositories carry `tests/`, and Faxanadu's pattern is the one to copy, comparing per-frame hashes against a committed baseline.

## How long a port actually takes

On a mature framework, standing up a new game is fast, and as an ecosystem matures the time from a disc to a running build keeps shrinking. The months go somewhere else: into building each console's framework, and into taking one game from booting to feeling finished.

Booting is not the finish line. MinishCap's bring-up checklist has ten milestones, from file hash verified to save and load round-tripping, and six of them are comparisons against a reference implementation. That is why [co-simulation](/docs/concepts/co-simulation) comes early rather than late, and [debug a divergence](/docs/guides/debug-a-divergence) is how you localise what it reports.

The finishing work leaves a trail. The engineering ledgers in these repositories run from 2 lines to 3,129 and hold root-cause write-ups, not bug counts. Each port states its own status in its own README, and the [status vocabulary](/docs/reference/status-vocabulary) explains those words one by one.

## Troubleshooting

### CMake cannot find the framework

The submodules were not fetched. Run `git submodule update --init --recursive`, or the repository's `setup.sh`. The framework is pinned by gitlink SHA, so this bites again after a branch switch.

### The runner refuses to start and prints a hash

Your file is not the one the port was built against. DKC2 prints the size and computed SHA-256 with the refusal, and you compare those against the identity record. Patched and decomp-built ROMs are rejected on purpose. On Boktai a sensor-hacked dump fails by design, because it removes the hardware reads the port exists to run.

### The standalone verifier passes but the game still refuses

Do not treat a standalone verifier as the authority. MinishCap's `tools/verify_rom_hash/main.cpp` is an admitted stub that always returns success. The runner's gate decides.

### The game runs but behaves strangely on PS1

Check that you did not convert the disc image to ISO. MegaManX6's `DISC.md` explains that a 2048-byte cooked ISO throws away the Mode-2 Form-2 XA sectors used for streaming FMV and audio. Re-check the serial too, since a mismatch only warns.

### Dispatch misses in the log

Resolve these before anything else. MegaManX6's contract is that all dispatch misses are resolved first, after every run. A dispatch miss is a call to an address the recompiler produced no entry for. Fix it by adding seeds or dispatch-table declarations and regenerating, never by patching around it. The [glossary](/docs/concepts/glossary) defines the term.

### Your fix vanished after a regeneration

You edited generated code. Move it into `game.toml`, into a `bank*.cfg`, or on SuperMarioWorld into `overrides/`, the only layer designed to survive regeneration.

### The game is slow at first and gets faster as you play

Not a defect on the frameworks that report it. Boktai, Emerald and MegaManZero describe coverage as incomplete by design. When the port reaches code the recompiler did not cover, a small interpreter runs that code instead, reports it, then compiles it to native and caches it. A missed target becomes a slow moment rather than a crash. The report is the useful half: that target can go into a later static pass.

## Source

- [FaxanaduRecomp](https://github.com/mstan/FaxanaduRecomp): [`game.toml`](https://github.com/mstan/FaxanaduRecomp/blob/master/game.toml), [`build_all.bat`](https://github.com/mstan/FaxanaduRecomp/blob/master/build_all.bat).
- [SuperMarioBrosNESRecomp](https://github.com/mstan/SuperMarioBrosNESRecomp): [`game.toml`](https://github.com/mstan/SuperMarioBrosNESRecomp/blob/master/game.toml), [`WIDESCREEN.md`](https://github.com/mstan/SuperMarioBrosNESRecomp/blob/master/WIDESCREEN.md).
- [SuperMarioWorldRecomp](https://github.com/mstan/SuperMarioWorldRecomp): [`ISSUES.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/ISSUES.md), [`CLAUDE.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/CLAUDE.md), [`overrides/README.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/overrides/README.md).
- [MegaManX6Recomp](https://github.com/mstan/MegaManX6Recomp): [`README.md`](https://github.com/mstan/MegaManX6Recomp/blob/master/README.md), [`DISC.md`](https://github.com/mstan/MegaManX6Recomp/blob/master/DISC.md), [`CLAUDE.md`](https://github.com/mstan/MegaManX6Recomp/blob/master/CLAUDE.md).
- [BoktaiRecomp](https://github.com/Shy/BoktaiRecomp): [`tools/verify_rom_hash/main.cpp`](https://github.com/Shy/BoktaiRecomp/blob/main/tools/verify_rom_hash/main.cpp), [`README.md`](https://github.com/Shy/BoktaiRecomp/blob/main/README.md).
- [MinishCapRecomp](https://github.com/mstan/MinishCapRecomp): [`CLAUDE.md`](https://github.com/mstan/MinishCapRecomp/blob/main/CLAUDE.md), [`baserom.md`](https://github.com/mstan/MinishCapRecomp/blob/main/baserom.md).
- [DKC2Recomp](https://github.com/mstan/DKC2Recomp): [`runner/verified_rom.c`](https://github.com/mstan/DKC2Recomp/blob/main/runner/verified_rom.c), and [Klonoa-Door-to-Phantomile](https://github.com/TechnicallyComputers/Klonoa-Door-to-Phantomile) and [xenogears-recomp](https://github.com/OpokXeno/xenogears-recomp/blob/master/game.toml) for the PS1 sequence and the policy list.

## Next

- [Write a mod](/docs/guides/write-a-mod), where player-facing changes belong.
- [Proving it with co-simulation](/docs/concepts/co-simulation), the correctness technique assumed here.
- [Debug a divergence](/docs/guides/debug-a-divergence), when the comparison fails.
- [Release a port](/docs/guides/release-a-port), what a release can and cannot contain.
