---
title: "Start a Game Boy Advance port by copying a working one"
kicker: "Tutorial"
desc: "gbarecomp has no scaffold script either, and a GBA port has more moving parts than a NES one: game.toml, symbols/, config/, and a baserom contract that refuses to launch on the wrong file."
date: "2026-08-24"
author: "Matthew Stanley"
tags: ["Tutorial", "Game Boy Advance", "gbarecomp"]
layout: "article"
---

Game Boy Advance is the second console in this fleet where you start a port by copying a working one rather than running a scaffold script, and it asks more of you than NES does. A NES port's entire per game input is one `game.toml`. A GBA port splits that job across three places: a `game.toml` the runtime reads, a `symbols/` directory the recompiler reads, and a `config/<region>.toml` layered on top for the exact cartridge revision you are building against. This tutorial reads [MinishCapRecomp](https://github.com/mstan/MinishCapRecomp), whose README describes it as "`gbarecomp`'s original target and the most mature of the GBA recomps here", with [BoktaiRecomp](https://github.com/Shy/BoktaiRecomp) alongside it because Boktai carries a complete `docs/BUILDING.md` and Minish Cap's build notes are shorter.

## The CLI exists, and the framework says what it is not

`gbarecomp` ships a Windows CLI, and its README frames it before you download it.

From [`README.md`](https://github.com/mstan/gbarecomp/blob/main/README.md):

> The CLI generates a recompilation project; it does not turn an arbitrary ROM
> into a finished playable port by itself.

```powershell
.\gbarecomp.exe build `
  --rom "C:\Games\MyGame.gba" `
  --output "C:\Projects\MyGameRecomp"
```

No BIOS is needed to generate source. What you get is sharded C++, runtime headers, CMake files and build helpers, and `.\build.ps1` inside that folder checks that the generated static library compiles. The README's next paragraph is the honest part:

> A playable integration still needs verified function coverage, a host
> application, cartridge configuration, and game-specific validation. Use one of
> the public game repositories below as a reference.

That is the tutorial. The reference is the port repository.

## The tree you are reproducing

MinishCapRecomp's root, abridged:

```text
MinishCapRecomp/
  gbarecomp/                 submodule, pinned by gitlink
  recomp-ui/                 submodule, the shared launcher
  third_party/tmc/           submodule, the decomp this port imports symbols from
  CMakeLists.txt             431 lines, committed
  game.toml                  what the RUNTIME reads: identity, save chip, video
  config/minishcap_usa.toml  per region overrides layered on game.toml
  symbols/                   what the RECOMPILER reads
    imported_symbols.tsv       addr, mode, name
    function_boundaries.tsv    start, end, mode, name
    minishcap.toml             the gba_recompile --config, importer output
    minishcap_reviewed.toml    a hand owned overlay passed as a second --config
  src/                       hand written host code: main.cpp, game config, mods
  generated/                 gitignored except its README, regenerate locally
  tools/                     import_tmc_symbols, verify_rom_hash, packaging
  tests/  docs/  ghidra/  mods/  ISSUES.md  baserom.md  CLAUDE.md
  roms/                      YOUR dumps, gitignored, never committed
```

Boktai reaches the same shape a different way, with everything game specific under `variants/boktai1_usa/{game.toml,config/,symbols/,generated/,roms/}` so the Japanese release and the sequels can drop in as sibling directories. If your title has more than one region worth supporting, start from that layout instead: it is much harder to retrofit than to adopt.

## Three files, three different jobs

The single most common confusion on this console is which TOML does what, and the repositories know it. Boktai's region config carries the warning inline.

From [`variants/boktai1_usa/config/boktai1_usa.toml`](https://github.com/Shy/BoktaiRecomp/blob/main/variants/boktai1_usa/config/boktai1_usa.toml):

```toml title="variants/boktai1_usa/config/boktai1_usa.toml"
# boktai1_usa.toml — region overrides for Boktai 1 USA.
#
# Layered on top of ../game.toml (config/<short_name>_<region>.toml =
# config/boktai1_usa.toml). Consumed by the RUNTIME.
#
# NOTE: this is not the recompiler config. The gba_recompile --config file
# (with [program] / [identity] / [[data_range]]) lives at
# ../symbols/boktai1_usa_recompile.toml and uses a different schema
# (see gbarecomp/docs/TOML_SCHEMA.md).
```

**`game.toml` is the runtime's.** Its own header says so: the runtime reads it to decide which ROM to load, which region config to layer in, where the entry point is, and what save chip is expected. Minish Cap's has `[game]` with a name and a default region, `[bios]` and `[rom]` with paths and expected hashes, `[recompiler]` naming the seed and boundary files, `[save]` with the chip type, `[runtime]` with a debug port and window title, and `[video]` and `[audio]` for presentation policy. For a new title, the fields you cannot guess are the save chip and the region default, and both come from your own analysis of the cartridge rather than from the model port.

**`config/<region>.toml` is the per revision overlay.** It carries the SHA-1 that gates launch, the save size, and any quirks that region has. Minish Cap's is seventeen lines, and the comment on its CRC32 is a useful piece of precision: the informational hash is CRC32, "the runtime's gate is SHA-1, not CRC32".

**`symbols/` is the recompiler's.** Two TSVs plus a TOML with a completely different schema: `[program]` for load address, size, entry PC and shard count, `[identity]` for the SHA-1 the config is pinned to, `[[data_range]]` to fence off literal pools and the header, `[[code_copy]]` for routines the game copies into IWRAM before running, and `[[extra_func]]` for entry points the walk did not reach.

## Where symbols come from, and where they do not

MinishCap has a symbol map of about 8,500 functions because a decomposition project exists for the game and the port imports from it mechanically. Its `symbols/README.md` states the boundary carefully: the importer reads names, addresses and sizes, and "The decomp's C source code is **never** read or copied", only its symbol metadata.

If your game has no decomp, you start with nothing, and that is normal. Boktai says so in the header of the file itself.

From [`variants/boktai1_usa/symbols/imported_symbols.tsv`](https://github.com/Shy/BoktaiRecomp/blob/main/variants/boktai1_usa/symbols/imported_symbols.tsv) and its sibling:

```text title="variants/boktai1_usa/symbols/imported_symbols.tsv"
# imported_symbols.tsv — addr<TAB>mode<TAB>name
# No Boktai decomp exists, so this starts empty (unlike the zeldaret/pret targets).
```

```text title="variants/boktai1_usa/symbols/function_boundaries.tsv"
# function_boundaries.tsv — addr<TAB>mode[<TAB>end][<TAB>name]
# Grown from dispatch_misses.log. Empty is valid: the finder walks from entry_pc.
```

"Grown from `dispatch_misses.log`" is the actual workflow. The finder walks from the entry point, you run the game, and the addresses it could not reach statically show up in a log which you fold back into configuration. `mode` is `arm` or `thumb` and it is not optional: BX and BLX targets carry the mode bit, and codegen needs to know which entry signature to emit.

Boktai's recompiler config also states the asymmetry that should govern how aggressive you are:

```toml title="variants/boktai1_usa/symbols/boktai1_usa_recompile.toml"
# False-positive policy (load-bearing):
#   Missing a function  -> a runtime_dispatch_miss naming the exact PC. Cheap.
#   Data decoded as code -> junk C that may silently dispatch and corrupt
#                           state, bypassing the oracle diff. Catastrophic.
# So: lean conservative, and close gaps here deliberately.
```

## The baserom contract, which is stricter here than anywhere else

> **You provide this.** A GBA port needs two files from you, not one: your own dump of the cartridge, and your own dump of the GBA BIOS. Neither ships in any of these repositories.

The BIOS is not optional on this console. `gbarecomp` translates and executes the real BIOS rather than stubbing it, so the boot path, the interrupt handlers and the SWI calls all run through recompiled BIOS code. Its expected image is 16,384 bytes with SHA-1 `300c20df6731a33952ded8c436f7f186d25d3492`, and the framework's own note is that the runtime refuses to start with a BIOS whose hash it does not recognise, the same gate the cartridge goes through.

The cartridge gate is exact, and the reason is worth stating plainly because it explains every rejection below it: generated code is keyed to specific opcodes at specific addresses. A port does not consume "the game", it consumes one byte sequence, and every seed, boundary, data range and code copy in your configuration is an offset into that sequence.

From [`baserom.md`](https://github.com/mstan/MinishCapRecomp/blob/main/baserom.md):

```text title="baserom.md"
## What we don't accept

- Trimmed ROMs (header pad removed). The original cartridge image is
  what hardware sees, including pad bytes.
- IPS/UPS-patched ROMs (translation patches, randomizers, etc.).
  Recompiler output is keyed to specific opcodes at specific
  addresses; a patched ROM is a different game and needs its own
  hash entry.
- Decomp-built ROMs. The decomp produces a byte-different artifact;
  even if it boots, it isn't the original cartridge.
```

Note the third one. A decomposition that reproduces the game does not reproduce the cartridge, so even a build of the very decomp a port imports its symbols from is the wrong input. And note that regions are separate entries, not variations of one: Minish Cap's `baserom.md` keeps a row per region and leaves the unverified hashes blank on purpose, "they go in once verified, not from secondhand sources".

## Boktai, and why the exact file matters

Boktai is the clearest illustration in the fleet, because its cartridge carries a photodiode and its `baserom.md` spells out what a patched dump does to it.

From [`baserom.md`](https://github.com/Shy/BoktaiRecomp/blob/main/baserom.md):

> - **Sensor patches** replace the cartridge photodiode reads with a constant, so
>   the game no longer talks to the hardware this project emulates. The solar
>   sensor becomes inert — the whole point of the port, gone.

The standalone verifier says the same thing at the point of failure, so nobody has to go looking for the explanation:

```cpp title="tools/verify_rom_hash/main.cpp"
        std::printf("\nSHA-1 mismatch.\n  expected %s\n  actual   %s\n"
                    "The runtime gates on this and will refuse to launch.\n"
                    "Note: sensor-hack / translation-patched ROMs will fail here\n"
                    "by design — they remove the real solar sensor reads.\n",
                    kExpectedSha1, sha.c_str());
```

The other patch class cost this project real time. Boktai's recompiler config carries a dated history block recording that the file was rewritten on 2026-07-28 because the previous version had been tuned against an intro patched dump: a loader appended near the end of the ROM that the reset vector branched to, which unpacked itself into IWRAM before entering the game. A `[[code_copy]]`, several crt0 seeds and seven interior resume points had all been written to describe that loader. The note's own summary is that they "described the crack, not Boktai". On the clean dump the reset vector branches to `0x080000C0` as retail code does, and all of that configuration was deleted.

That is what a hash gate is protecting you from. Not piracy policy: weeks of analysis aimed at a program that is not your game.

## The build, as the repositories document it

Boktai's [`docs/BUILDING.md`](https://github.com/Shy/BoktaiRecomp/blob/main/docs/BUILDING.md) is the fullest build document of the two, and it is the project's own rather than anything reconstructed here, so it is the one to follow. Prerequisites are CMake 3.20 or newer, a C++20 compiler, SDL2 and preferably Ninja.

Clone with submodules:

```bash
git clone --recurse-submodules https://github.com/Shy/BoktaiRecomp.git
cd BoktaiRecomp
```

Recompile the BIOS once, which is a step NES does not have:

```bash
cmake -B gbarecomp/build -S gbarecomp && cmake --build gbarecomp/build -j
./gbarecomp/build/gba_recompile --bios gbarecomp/bios/gba_bios.bin \
    --config gbarecomp/bios/gba_bios.toml
```

Recompile the cartridge:

```bash
./gbarecomp/build/gba_recompile \
    --rom    variants/boktai1_usa/roms/boktai1_usa.gba \
    --config variants/boktai1_usa/symbols/boktai1_usa_recompile.toml \
    --out    variants/boktai1_usa/generated
```

Build and run:

```bash
cmake -B build -S . -G Ninja -DGBAGAME_RECOMP_UI=ON
cmake --build build -j
cd build && ./BoktaiRecomp ../variants/boktai1_usa/game.toml
```

Run from the directory holding the executable. The launcher and the runtime resolve `config.ini` and `keybinds.ini` relative to the executable, while `game.toml` paths resolve relative to the toml itself, so passing the toml explicitly from inside `build/` keeps both halves agreeing.

Minish Cap's own README gives the shorter form of the same two stages, `gba_recompile --rom roms/minishcap_usa.gba --config symbols/minishcap.toml --out generated` followed by a CMake configure with `-DGBARECOMP_ROOT=../gbarecomp`. Two details there are worth knowing before you copy it. Its instructions expect `gbarecomp` cloned as a sibling directory even though the repository also carries it as a submodule, so the two do not quite agree with each other. And `--config` is repeatable: the first file is the base and each later one is an overlay merged on top with the base winning conflicts, which is how `symbols/minishcap_reviewed.toml` exists at all. That file is hand owned, no tool writes it, and anything reviewed that lands in the importer generated config instead is lost the next time the importer runs. Where two repositories differ, prefer the one you are actually copying.

## When it boots

The first thing to read is `dispatch_misses.log` next to the executable, before a screenshot and before any other debugging. `gbarecomp` makes it rule zero-a of its debug loop: if the file is non empty, add the listed functions with their detected mode to `game.toml [functions]`, regenerate, rebuild, re-run, and repeat until it is empty. A game with dispatch misses is described there as fundamentally broken. [It boots, then it crashes](/blog/tutorial-it-boots-then-crashes) is the rest of that loop.

## Be honest with yourself about the timeline

Minish Cap's README calls the project "a **static-recompilation base + runner**, not a finished port", and says of itself that it "is the most-complete GBA title in this collection, but still **early**". Getting a first build standing takes an afternoon of hand assembly on this console rather than a single command, and everything interesting happens in the weeks after it. Nobody has written the scaffolder that would collapse that afternoon, and writing one would help every future GBA port more than any single title will.

## Source

- [MinishCapRecomp](https://github.com/mstan/MinishCapRecomp): `README.md`, `CLAUDE.md`, `baserom.md`, `game.toml`, `config/minishcap_usa.toml`, `symbols/README.md`, `generated/README.md`
- [BoktaiRecomp](https://github.com/Shy/BoktaiRecomp): `README.md`, `baserom.md`, `docs/BUILDING.md`, `variants/boktai1_usa/game.toml`, `variants/boktai1_usa/config/boktai1_usa.toml`, `variants/boktai1_usa/symbols/`, `tools/verify_rom_hash/main.cpp`
- [gbarecomp](https://github.com/mstan/gbarecomp): `README.md`, `PRINCIPLES.md`, `DEBUG.md`, `bios/README.md`

## Read next

- [The game file you supply](/docs/concepts/the-game-file-you-supply), the contract every port in this fleet holds you to
- [Game Boy Advance](/docs/platforms/game-boy-advance), the toolchain's status, commands and limits in its own words
- [The Minish Cap](/games/minish-cap) and [Boktai](/games/boktai), the two ports this tutorial reads from
