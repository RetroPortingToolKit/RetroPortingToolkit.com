---
title: "Start a NES port by copying a working one"
kicker: "Tutorial"
desc: "nesrecomp has no scaffold script, so a new NES port begins as a hand assembled copy of a port that already builds. FaxanaduRecomp is the model."
date: "2026-08-24"
author: "Matthew Stanley"
tags: ["Tutorial", "NES", "nesrecomp"]
layout: "article"
---

On PlayStation you can run a scaffold script and get a repository that configures and builds. On NES there is nothing equivalent, so a new port starts as a deliberate copy: you reproduce the structure of a port that already works, then replace everything in it that names the old game. This tutorial does that against [FaxanaduRecomp](https://github.com/mstan/FaxanaduRecomp), which is the easiest NES port in the fleet to learn from. Its `CMakeLists.txt` is 76 lines, its recompiler input is one TOML file, and its build script names its three steps out loud.

## The CLI exists, and it is not a scaffold

`nesrecomp` ships a packaged command line tool, and reading its output is the fastest way to understand what you are being handed.

```powershell
.\nesrecomp.exe build `
  --rom "C:\Games\MyGame.nes" `
  --game "C:\Projects\MyGamePort\game.toml" `
  --output "C:\Projects\MyGameRecomp"
```

`--rom` and `--output` are required, `--game` and `--name` are optional, `--force` allows writing into a non empty output folder, and `--verbose` shows every native recompiler diagnostic. The tool rejects anything without the `NES\x1a` iNES header magic before it does any work.

What lands in `--output` is a `generated/` directory of translated C, three framework headers, a `CMakeLists.txt`, `build.ps1`, `build.sh`, and a README the tool writes itself. That README states the limit exactly, and it is worth reading before you plan your week.

From [`tools/cli.py`](https://github.com/mstan/nesrecomp/blob/master/tools/cli.py), which is the text the generated README carries:

```text title="tools/cli.py"
The build creates the `nesrecomp_game` static library. This confirms that the
generated source compiles; it is not a complete playable port by itself.

To make a playable port, add game-specific configuration and integrate the
library with the NESRecomp runner. Existing game repositories are useful
starting points: https://github.com/mstan/nesrecomp
```

So the CLI answers one question, "does my ROM translate into C that compiles", and it answers it in minutes. Everything after that is the repository you are about to build by hand.

## The tree you are reproducing

This is FaxanaduRecomp's root, abridged to the parts that carry meaning, with each entry annotated by what it is and whether it is committed, generated, or yours.

```text
FaxanaduRecomp/
  nesrecomp/                     submodule, pinned by gitlink
  recomp-ui/                     submodule, the shared launcher
  CMakeLists.txt                 76 lines of glue, committed
  game.toml                      the recompiler's per game input, committed
  baserom_annotations.csv        address notes for the generated C, committed
  extras.c  extras.h             this game's implementation of the runner hooks
  nes_snapshot.c  verify_mode.c  watchdog.c   hand written runtime shims
  override_text.c                optional text override plugin
  boxart.tga                     launcher art
  setup.sh  setup.bat            fetch the submodules at their pinned commits
  build_all.bat                  the three step release build
  generated/                     recompiler output, committed here on purpose
  ghidra/                        the analysis project the annotations came from
  tests/                         vitest regression and frame hash baselines
  tools/                         dbg.py, packaging, text scanning
  docs/  media/  ISSUES.md  MODDING.md  RELEASE_NOTES.md
  baserom.nes                    YOUR dump, gitignored, never committed
```

> **You provide this.** The `.nes` file is yours. Faxanadu gitignores it by pattern rather than by name, with a bare `*.nes`, and the README carries only its identity: CRC32 `57DD23D1`, MD5 `b3bb9296b5e1e0c83e90b6da9e8a41aa`, SHA-1 `5b05c8859f356013d37f0545f5de5fa1693da5da`, all over the ROM data with the 16 byte iNES header excluded.

Two of those entries are submodules, and they are pinned rather than tracked. The comment in the CMake file is the whole policy.

From [`CMakeLists.txt`](https://github.com/mstan/FaxanaduRecomp/blob/master/CMakeLists.txt):

```cmake title="CMakeLists.txt"
set(NESRECOMP_ROOT ${CMAKE_SOURCE_DIR}/nesrecomp)

# nesrecomp/ and recomp-ui/ are git submodules (see .gitmodules); the pinned
# commit is the gitlink recorded in this repo. After cloning run setup.sh/.bat
# (git submodule update --init) to fetch them at the recorded commits.

include(${NESRECOMP_ROOT}/runner/runner.cmake)
```

The rest of that file lists the generated C plus the hand written shims as sources, finds SDL2 out of the framework's own vendored copy, and calls `recomp_target_launcher_ui()` to attach the shared launcher. There is no build system to write. There is a list of your files to declare.

## Faxanadu commits its generated code, and most ports do not

Across the fleet, `generated/` is normally gitignored: it is derived from a copyrighted ROM, it is enormous, and it can be rebuilt at any time. Faxanadu goes the other way, and says so.

From [`.gitignore`](https://github.com/mstan/FaxanaduRecomp/blob/master/.gitignore):

```text title=".gitignore"
# DO NOT ignore generated/ — committed for reproducibility
```

The reason is that the generated C is a function of three things: your ROM, the `game.toml` you wrote, and the exact recompiler commit the submodule pins. Committing the output turns that into something a reviewer can check. When the pin moves, the diff in `generated/` is the answer to "what did the recompiler change", and `build_all.bat` records the expectation directly: regen is "byte-identical to the committed generated/ for the pinned recompiler". SuperMarioBrosNESRecomp does the same, ignoring only the per run `*_coverage.txt` audit file.

The cost is real. Faxanadu's `generated/` is tens of megabytes of C split across per bank part files, and every regeneration produces a large diff. Most ports decide that trade is not worth it. Pick deliberately, once, at the start: switching later rewrites your history either way.

## What a new title must set in `game.toml`

`game.toml` is the file that carries everything the recompiler cannot derive from the cartridge itself. On NES it is the whole per game input; there is no second directory of configuration to keep in sync.

The minimum for a new title is the `[game]` block, which sets the output prefix used for every generated filename and symbol.

From [`game.toml`](https://github.com/mstan/FaxanaduRecomp/blob/master/game.toml):

```toml title="game.toml"
[game]
output_prefix = "faxanadu"
disable_ptr_scan = true
disable_secondary = true
```

Everything else in the file is a hint, added as analysis discovers something the finder could not reach on its own. The directives you will reach for first are `[[known_table]]` for a contiguous table of little endian targets, `[[split_table]]` when the low and high bytes live in separate arrays, `[[trampoline]]` for a bank switching call that is followed by inline data bytes, `[[data_region]]` to tell the pointer scanner that a range is graphics rather than code, and `[functions]` for addresses that nothing statically references.

Faxanadu's trampoline entry is a good example of how much a three line directive can be carrying:

```toml title="game.toml"
# ── Bank-switch trampolines ──────────────────────────────────────────────────
# JSR $F859 is followed by 3 inline data bytes (bank, addr_lo, addr_hi).
# $CC1A is the MMC1 PRG bank-switch function in the fixed bank.
[[trampoline]]
addr = 0xF859
inline_bytes = 3
bs_fn_addr = 0xCC1A
```

A `JSR $F859` in this game is not a normal call. The three bytes after it are arguments, not instructions, and without this declaration the recompiler would translate them as code and lose the return address. Every entry in a mature `game.toml` encodes a discovery like that, which is why the file does not copy across between games: it describes one cartridge's layout.

One trap is worth knowing before you write your first seed list. `[[extra_func]]` creates a standalone function, and `[[extra_label]]` creates a secondary entry point inside an existing one. The framework README is blunt about mixing them up: adding an address as `extra_func` when it sits inside an existing function splits that function, breaks its internal gotos, and causes freezes.

## The annotations file next to it

`baserom_annotations.csv` is the other committed input, and it changes nothing about codegen. It is a comment channel: `bank, address, note`, where each note is emitted into the generated C as `/* NOTE: ... */` at that address.

From [`baserom_annotations.csv`](https://github.com/mstan/FaxanaduRecomp/blob/master/baserom_annotations.csv):

```text title="baserom_annotations.csv"
# Workflow: when a non-obvious pattern is discovered via Ghidra, document it here
# so the generated code is self-explaining without ever reading faxanadu_full.c whole.

# Entry vectors
15, 0xC913, RESET vector — game main loop, never returns
15, 0xC999, NMI vector — VBlank handler, called at 60 Hz
15, 0xC9D5, IRQ vector
```

Start this file on day one. Every hour you spend in Ghidra working out what a routine does is an hour you will otherwise spend again in three weeks, and a note here survives every regeneration.

## The build

The framework's own documented commands are two stages. Build the recompiler once:

```sh
cmake -S recompiler -B build/recompiler -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build/recompiler
```

Then translate your ROM:

```sh
build/recompiler/NESRecomp <rom.nes> --game <path/to/game.toml>
```

On Windows the binary is `build/recompiler/Release/NESRecomp.exe` and the generator is `"Visual Studio 17 2022" -A x64`. The output is `generated/<prefix>_full.c`, `generated/<prefix>_dispatch.c`, and the per bank part files.

In a port repository, both stages are wrapped. Fetch the pinned framework first:

```sh
chmod +x setup.sh && ./setup.sh
```

That runs `git submodule update --init --recursive nesrecomp recomp-ui` and symlinks the Nestopia core the co-simulation path uses. Then build the port:

```sh
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
```

Faxanadu's `build_all.bat` is the same sequence with the regen step wired in between, labelled `STEP 1: Build recompiler`, `STEP 2: Regen game code (plain)`, `STEP 3: Configure + build release`. If you are copying one file out of this repository to understand the pipeline, copy that one.

## Wire the runner hooks, then run it

The last piece a new port owes the framework is `extras.c`. The runner calls a fixed set of functions, declared in [`runner/include/game_extras.h`](https://github.com/mstan/nesrecomp/blob/master/runner/include/game_extras.h), and every game implements all of them even when most are empty. Faxanadu's identity hook is one line:

```c title="extras.c"
uint32_t game_get_expected_crc32(void) { return 0x57DD23D1u; }

const char *game_get_name(void) { return "Faxanadu"; }
```

The launcher checks that CRC32 before starting the game and re-prompts if it does not match. Returning `0` skips verification. Note that this is the NES convention: on Game Boy Advance and SNES a hash mismatch refuses to launch outright, so do not carry a habit across consoles.

When the thing finally opens a window, the first file to read is not a screenshot. It is `dispatch_misses.log`, written next to the executable, which lists every address the game jumped to that has no generated function behind it. Each line is formatted as a paste ready `extra_func` entry for exactly that reason. A non empty log is not a warning, it is a silent game breaking bug, and [it boots, then it crashes](/blog/tutorial-it-boots-then-crashes) is the rest of that story.

## Be honest with yourself about the timeline

Faxanadu's README describes its state as "**Status: Playable.** The game runs from title screen through credits. No outstanding known bugs. Not 100% playtested". Its `ISSUES.md` is a long ledger of resolved root causes that got it there: a missing dispatch table that garbled one area's background, three layered bugs behind a dialogue box that froze the game, a hardcoded scanline split that garbled the HUD after a screen transition. That is the work. The tree above is a day.

Nobody has built the scaffolder that would collapse that first day into a command, and building one is probably the highest value thing anyone could contribute to this toolchain right now.

## Source

- [FaxanaduRecomp](https://github.com/mstan/FaxanaduRecomp): `CMakeLists.txt`, `game.toml`, `baserom_annotations.csv`, `.gitignore`, `setup.sh`, `build_all.bat`, `extras.c`, `ISSUES.md`
- [nesrecomp](https://github.com/mstan/nesrecomp): `README.md`, `tools/cli.py`, `runner/include/game_extras.h`
- [SuperMarioBrosNESRecomp](https://github.com/mstan/SuperMarioBrosNESRecomp): `game.toml`, `.gitignore`

## Read next

- [Telling code from data](/docs/concepts/code-discovery), which is why `game.toml` needs hints at all
- [NES](/docs/platforms/nes), the toolchain's status, commands and known limits in its own words
- [Faxanadu](/games/faxanadu), the port this tutorial reads from
