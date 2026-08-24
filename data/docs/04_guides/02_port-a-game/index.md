---
title: "Port a game"
summary: "How a game file you supply becomes a running native port: the repository shape 64 ports share, the commands that drive the recompiler, and why a game-specific fix belongs in configuration rather than in generated code."
section: "guides"
sectionTitle: "Guides"
pageType: "guide"
tags: ["Porting", "Recompiler", "Configuration"]
repos:
  - "https://github.com/mstan/FaxanaduRecomp"
  - "https://github.com/mstan/SuperMarioBrosNESRecomp"
  - "https://github.com/mstan/SuperMarioWorldRecomp"
  - "https://github.com/mstan/MegaManX6Recomp"
  - "https://github.com/mstan/MinishCapRecomp"
  - "https://github.com/Shy/BoktaiRecomp"
updated: "2026-08-23"
---

A port in this fleet is a repository that records how to turn one specific game file into a native program. It does not contain the game and holds little hand-written code: a pinned recompiler framework, the identity of the dump you supply, the facts the recompiler could not work out from the bytes alone, and a thin runtime shim. This guide follows the shape the fleet's 64 game ports share, and its one idea is that a game-specific fix is configuration, never an edit to the generated C.

## Before you start

This guide begins where [build a toolchain](/docs/guides/build-a-toolchain) ends: a framework built for your console, your copy of the game in hand. The console picks the framework.

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

Two N64 repositories sit outside it, building against forks of N64Recomp. [Every repository](/docs/fleet/repositories) has the map.

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

Three things are invariant: the README exists in all 64, the framework is a pinned submodule rather than vendored source, and the generated C is never hand-edited. What varies most is where the recompiler input lives: SNES `recomp/bank*.cfg`, PS1 `seeds/*.txt` plus a large `game.toml`, NES everything in `game.toml`, GBA `symbols/*.tsv` plus `config/<region>.toml` or `variants/<name>/` per region.

## Step 1. Record the identity of the file you supply

> **You provide this.** The repositories do not ship a game file, and most ports will not run on one they do not recognise. [The game file you supply](/docs/concepts/the-game-file-you-supply) is the canonical page for that contract.

Write the identity record first. Cartridge ports call it `baserom.md`, PS1 ports `DISC.md`, and repositories with neither put the table in the README under a `## ROM` heading. It carries every hash and header field for the revision you build against, one row per revision, plus what you reject: MinishCap rejects trimmed, IPS or UPS-patched and decomp-built ROMs, because recompiler output is keyed to specific opcodes at specific addresses, so a patched file is a different game.

Then write a verifier that checks more than the hash. [BoktaiRecomp](https://github.com/Shy/BoktaiRecomp) has the fleet's most thorough one, [`tools/verify_rom_hash/main.cpp`](https://github.com/Shy/BoktaiRecomp/blob/main/tools/verify_rom_hash/main.cpp), reporting on SHA-1, CRC32, exact size, whether the size is a power of two rather than trimmed or overdumped, header invariants, the complement check, the logo, the save chip type and the RTC signature. Run it after step 3: `./build/verify_rom_hash variants/boktai1_usa/roms/boktai1_usa.gba`. Exit 0 is verified, 1 mismatch, 2 usage or IO error.

## Step 2. Fetch the repository and its pinned framework

The framework is a submodule pinned at a gitlink SHA, so a clone without submodules cannot build. Clone with `git clone --recurse-submodules <repository url>`, or repair an existing clone with `git submodule update --init --recursive`. Faxanadu wraps that in `chmod +x setup.sh && ./setup.sh`, which also links the oracle core it is compared against.

**You should now see** a populated framework directory and `recomp-ui/`, both at the commits this repository recorded, not at their branch tips.

## Step 3. Build the recompiler, then regenerate the game C

Two stages, and the first is cached: build the recompiler once from the framework submodule, then rerun it over your game file whenever the configuration changes. [Klonoa-Door-to-Phantomile](https://github.com/TechnicallyComputers/Klonoa-Door-to-Phantomile) gives the PS1 sequence in six lines.

From [`README.md`](https://github.com/TechnicallyComputers/Klonoa-Door-to-Phantomile/blob/master/README.md):

```bash
git submodule update --init --recursive
./psxrecomp/tools/ci/build_emitters.sh
python3 psxrecomp/psxrecomp_cli.py generate \
  --config game.toml --project-root . --disc disc/<your>.cue
cmake -S . -B build-release -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build-release --target psx-runtime
```

`disc/<your>.cue` is your own image, staged into a gitignored `disc/` by `python3 psxrecomp/tools/prepare_disc.py --config game.toml <dump>`, with the boot executable extracted by `extract_psx_exe.py`. Cartridge consoles place the ROM where `game.toml` points.

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

Generated and normally ignored: `generated/` or `src/gen/`, `recomp/funcs.h`, overlay caches and captures, saves, memory cards, build trees, the game file itself. Two repositories commit their output anyway, [FaxanaduRecomp](https://github.com/mstan/FaxanaduRecomp) and [SuperMarioBrosNESRecomp](https://github.com/mstan/SuperMarioBrosNESRecomp), and Faxanadu says why in the `.gitignore`:

> `# DO NOT ignore generated/ — committed for reproducibility`

That is the exception. The rule about editing that output has none:

> "`src/gen/` and `recomp/funcs.h` are generated. Never hand-edit. Fix the recompiler or cfg."
>
> [SuperMarioWorldRecomp `CLAUDE.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/CLAUDE.md)

Generated sources are derivative of a copyrighted game file, which also shapes what you can distribute: [release a port](/docs/guides/release-a-port).

## Step 5. Put each fix in the layer that owns it

This decides whether your port stays maintainable, and it is where new porters go wrong. Six mechanisms sit at different points in the pipeline, and picking the wrong one is not a style error: it decides whether your fix survives the next regeneration, and whether anyone else benefits.

| Mechanism | What it changes | Where it lives | Seen in |
|---|---|---|---|
| Recompiler hints | what the recompiler believes about the ROM: dispatch tables, trampolines, seeds | `game.toml`, `recomp/bank*.cfg` | Faxanadu, SMB1, MegaManX-X |
| RAM read hooks | the value one instruction sees at a named address, per call site | `[[ram_read_hook]]`, plus `extras.c` | SMB1 |
| Mod function hooks | lets an enabled mod substitute a whole generated routine | `[[mod_function_hook]]` | SMB1 |
| Source overrides | replaces a generated function body, re-applied after every regen | `overrides/`, `tools/apply_overrides.py` | SuperMarioWorld only |
| Address-site policy lists | names the guest addresses a class of fix touches | a policy table in `game.toml` | Xenogears |
| Guarded byte writes | patches a copy of the disc at load, each write carrying its expected bytes | mod `manifest.toml`, compiled resolver | MegaManX6 |

### Recompiler hints

Hints tell the recompiler what it cannot derive from the bytes. Faxanadu declares an MMC1 bank-switch trampoline this way, and eight dispatch tables in the same file as `[[known_table]]` and `[[split_table]]` entries.

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

Every such hint marks a place automatic [code discovery](/docs/concepts/code-discovery) did not reach, which matters for the rule below. The SNES equivalent is a per-bank cfg of directives such as `auto_vectors` and `tier_down_stubs`.

### Hooks that change behaviour without changing generated code

A `[[ram_read_hook]]` routes reads of a named RAM address through a game callback, which decides per call site, identified by the CPU program counter, whether to alter the value. SMB1 widens draw and cull decisions with it while leaving the simulation alone.

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

Read the comment as carefully as the two lines of configuration: it names what is widened, what is left alone, and what the default is. SMB1's `WIDESCREEN.md` makes that a rule, keeping the spawn windows, the player edge clamp, the loop-command rewind and the area parser vanilla because they are dual-purpose state, not draw logic. `[[mod_function_hook]]` is the heavier version, marking a generated function an enabled mod can take over, with roughly 80 lines of commentary recording per address which sibling was rejected and why.

Only SuperMarioWorld has the fourth layer. Its overrides sit outside `src/gen/` because the generated banks are rewritten on every regeneration, so `tools/apply_overrides.py` re-applies each at build time. A rule with no matching body fails the build, which is why candidates stay commented out.

### The rule: fix the framework, not the game

Every repository with a written opinion has the same one. MegaManX6 puts it in a line: "A fix that only this game needs is a smell; prefer a class fix that the next title inherits." SuperMarioWorld makes it rule zero.

> "We do not fix individual visible bugs in isolation. Each visible
> symptom is a probe into a recompiler / framework gap. The goal is
> to identify the **underlying class of recompiler bug** that
> generated the symptom, fix that class in the framework
> (`snesrecomp/`), regen all banks, and re-evaluate every symptom
> together. Per-game cfg shimming is last-resort (Rule 0)."
>
> [SuperMarioWorldRecomp `ISSUES.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/ISSUES.md)

MinishCap states it from the framework side, naming the anti-pattern.

> "**No Minish Cap special cases in the GBA core.** If we discover
> that Minish Cap exercises an obscure hardware corner, the fix
> lives in `gbarecomp/src/gba/` with a hardware-test citation,
> not behind `if (game == \"minish_cap\")`."
>
> [MinishCapRecomp `CLAUDE.md`](https://github.com/mstan/MinishCapRecomp/blob/main/CLAUDE.md)

Say the reason out loud, because "put it in config" sounds like the safe choice and often is not. A per-game hint describes something the recompiler failed to work out for itself, and a hand-declared dispatch table is a table discovery missed, which the next game on that mapper will have too. The shim therefore hides a general defect behind a local fix: the symptom leaves your port, the class of bug stays in the framework, and every future port pays again. Configuration is the right home for facts genuinely specific to one game, and the wrong home for a pattern the recompiler should have handled generically. Boktai shows the rule followed the other way, merging its PPU bitmap modes, a shared GPIO port, a save chip override, the solar sensor and non-Windows self-healing into gbarecomp instead.

Player-facing changes are a third category, belonging in a default-off mod package rather than either place. [Write a mod](/docs/guides/write-a-mod) covers that layer.

## Step 6. Build the runtime and run it

This compiles the generated C with the framework's runner, the launcher and your shims. On MegaManX6, three commands, the last being the game.

From [`README.md`](https://github.com/mstan/MegaManX6Recomp/blob/master/README.md):

```sh
cmake -S . -B build -G "Unix Makefiles"
cmake --build build -j16
./build/mmx6-runtime.exe
```

**You should now see** the launcher rather than the game, because it asks for your file first. What it does with a file it does not recognise is not uniform across the fleet, and that difference matters when diagnosing a bad start.

| Console | What happens when the file is wrong |
|---|---|
| NES (Faxanadu) | Checks a CRC32 the game declares through `game_get_expected_crc32`, and re-prompts. |
| SNES (DKC2) | The runtime load gate refuses, reporting payload size and computed SHA-256. |
| GBA (Boktai, MinishCap) | Refuses to launch on an unrecognised hash; the BIOS must verify too. |
| PS1 (MegaManX6, Xenogears) | Warns about the header, region or serial and tries to run it anyway. |

> **Warning.** PS1 identity is advisory, so a wrong or wrongly converted disc gets past the launcher and fails later in ways that look like recompiler bugs.

After the first run, resolve every dispatch miss before any other debugging, as troubleshooting describes. Then pin what works: 24 of the 64 repositories carry `tests/`, and the pattern to copy is Faxanadu's, comparing per-frame hashes against a committed baseline and failing hard on a mismatch.

## How long a port actually takes

Months, not an afternoon, and the fleet says so. Every mstan-family README opens with it:

> "**These are in-development previews, not finished ports — expect rough edges**, and depth will keep landing over months, not days."
>
> [SuperMarioWorldRecomp `README.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/README.md)

Three measurements give that a shape. The engineering ledgers run from 2 lines to 3,129, with SuperMarioWorld at 1,255, MinishCap at 1,318 and Faxanadu at 585, holding root-cause write-ups rather than bug counts. The configuration carries as much prose as data: SMB1 seeds more than 150 addresses harvested from a public disassembly, and Xenogears' widescreen table is preceded by 40 comment lines recording which candidate sites were deliberately not widened. And most repositories call themselves a preview, an alpha or a bring-up, which the [status vocabulary](/docs/reference/status-vocabulary) unpacks term by term.

Booting is not the finish line either. MinishCap's bring-up checklist has ten milestones, from file hash verified to save and load round-tripping, and six are comparisons against a reference implementation, which is why [co-simulation](/docs/concepts/co-simulation) is a prerequisite rather than a later refinement. Localising what it reports is its own discipline: [debug a divergence](/docs/guides/debug-a-divergence).

## Troubleshooting

### CMake cannot find the framework

The submodules were not fetched. Run `git submodule update --init --recursive`, or the repository's `setup.sh`. The framework is pinned by gitlink SHA, so this bites again after a branch switch.

### The runner refuses to start and prints a hash

Your file is not the one the port was built against. DKC2 reports size and computed SHA-256 with the refusal, which you compare against the identity record. Trimmed, IPS or UPS-patched and decomp-built ROMs are rejected deliberately, and on Boktai a sensor-hacked dump fails by design because it removes the hardware reads the port exists to run.

### The standalone verifier passes but the game still refuses

Do not treat a standalone verifier as the authority. MinishCap's `tools/verify_rom_hash/main.cpp` is an admitted stub returning success unconditionally, so at least one repository's verifier does not do what its `baserom.md` implies. The runner's gate decides.

### The game runs but behaves strangely on PS1

Check you did not convert the disc image to ISO. MegaManX6's `DISC.md` explains that a 2048-byte cooked ISO discards the Mode-2 Form-2 XA sectors used for streaming FMV and audio. Re-check the serial too, since a mismatch only warns.

### Dispatch misses in the log

Resolve these before anything else: MegaManX6's contract is that after every run, all dispatch misses are resolved first. A dispatch miss is a call to an address the recompiler produced no entry for, defined with the fleet's other terms in the [glossary](/docs/concepts/glossary). You fix it by adding seeds or dispatch-table declarations and regenerating, never by patching around it.

### Your fix vanished after a regeneration

You edited generated code. Move it into `game.toml`, a `bank*.cfg`, or on SuperMarioWorld into `overrides/`, the only layer designed to survive regeneration.

### The game is slow at first and gets faster as you play

Not a defect on the frameworks that report it. Boktai, Emerald and MegaManZero describe coverage as incomplete by design: an uncovered target falls back to the interpreter, is reported, then compiles to native and caches. The report is the useful half, since that target can be folded into a later static corpus.

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
