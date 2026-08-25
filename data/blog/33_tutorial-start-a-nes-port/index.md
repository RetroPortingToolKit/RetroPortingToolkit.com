---
title: "Start a NES port by copying a working one"
kicker: "Tutorial"
desc: "nesrecomp has no scaffold script, so a new NES port begins as a hand assembled copy of a port that already builds. FaxanaduRecomp is the model."
date: "2026-08-24"
author: "Matthew Stanley"
tags: ["Tutorial", "NES", "nesrecomp"]
layout: "article"
---

On PlayStation a scaffold script hands you a repository that configures and builds. NES has nothing like it. A new NES port starts as a copy: reproduce a working port's structure, then replace everything in it that names the old game.

This tutorial copies [FaxanaduRecomp](https://github.com/mstan/FaxanaduRecomp), the easiest NES port in the fleet to learn from. Its `CMakeLists.txt` is 76 lines, its recompiler input is one TOML file, and its build script names its three steps out loud.

## The CLI exists, and it is not a scaffold

`nesrecomp` ships a packaged command line tool. Reading what it produces is the fastest way to see what you get and what you do not.

```powershell
.\nesrecomp.exe build `
  --rom "C:\Games\MyGame.nes" `
  --game "C:\Projects\MyGamePort\game.toml" `
  --output "C:\Projects\MyGameRecomp"
```

`--rom` and `--output` are required, `--game` and `--name` are optional, `--force` allows writing into a non empty output folder, and `--verbose` shows every native recompiler diagnostic. The tool rejects anything without the `NES\x1a` iNES header magic before it does any work.

What lands in `--output` is a `generated/` directory of translated C, three framework headers, a `CMakeLists.txt`, `build.ps1`, `build.sh`, and a README the tool writes itself. That README states the limit exactly.

From [`tools/cli.py`](https://github.com/mstan/nesrecomp/blob/master/tools/cli.py), the text that README carries:

```text title="tools/cli.py"
The build creates the `nesrecomp_game` static library. This confirms that the
generated source compiles; it is not a complete playable port by itself.

To make a playable port, add game-specific configuration and integrate the
library with the NESRecomp runner. Existing game repositories are useful
starting points: https://github.com/mstan/nesrecomp
```

So the CLI answers one question, in minutes: does my ROM translate into C that compiles? Everything after that is the repository you are about to build by hand.

## The tree you are reproducing

FaxanaduRecomp's root, cut down to the parts that matter. Each line says what the entry is and who owns it.

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

> **You provide this.** The `.nes` file is yours. Faxanadu gitignores it by pattern, with a bare `*.nes`, and its README carries only the file's identity: CRC32 `57DD23D1`, MD5 `b3bb9296b5e1e0c83e90b6da9e8a41aa`, SHA-1 `5b05c8859f356013d37f0545f5de5fa1693da5da`. All three are taken over the ROM data, with the 16 byte iNES header excluded.

Two entries are submodules, and they are pinned rather than tracked. The comment in the CMake file is the whole policy.

From [`CMakeLists.txt`](https://github.com/mstan/FaxanaduRecomp/blob/master/CMakeLists.txt):

```cmake title="CMakeLists.txt"
set(NESRECOMP_ROOT ${CMAKE_SOURCE_DIR}/nesrecomp)

# nesrecomp/ and recomp-ui/ are git submodules (see .gitmodules); the pinned
# commit is the gitlink recorded in this repo. After cloning run setup.sh/.bat
# (git submodule update --init) to fetch them at the recorded commits.

include(${NESRECOMP_ROOT}/runner/runner.cmake)
```

The rest of that file lists the generated C and the hand written shims as sources, finds SDL2 in the framework's vendored copy, and calls `recomp_target_launcher_ui()` to attach the launcher. You are not writing a build system. You are listing your files.

## Faxanadu commits its generated code, and most ports do not

Across the fleet, `generated/` is normally gitignored. It comes from a copyrighted ROM, it is enormous, and it can be rebuilt at any time. Faxanadu goes the other way, and says so.

From [`.gitignore`](https://github.com/mstan/FaxanaduRecomp/blob/master/.gitignore):

```text title=".gitignore"
# DO NOT ignore generated/ — committed for reproducibility
```

The generated C depends on exactly three things: your ROM, your `game.toml`, and the recompiler commit the submodule pins. Committing the output makes that checkable. When the pin moves, the diff in `generated/` shows what the recompiler changed. `build_all.bat` states the expectation: regen is "byte-identical to the committed generated/ for the pinned recompiler". SuperMarioBrosNESRecomp does the same, ignoring only the per run `*_coverage.txt` audit file.

The cost is real. That `generated/` is tens of megabytes of C in per bank part files, and every regeneration makes a large diff. Most ports decide it is not worth it. Choose once, at the start: switching later rewrites your history either way.

## What a new title must set in `game.toml`

`game.toml` carries everything the recompiler cannot work out from the cartridge. On NES it is the whole per game input, with no second directory of configuration to keep in sync.

The minimum for a new title is the `[game]` block, which sets the output prefix used for every generated filename and symbol.

From [`game.toml`](https://github.com/mstan/FaxanaduRecomp/blob/master/game.toml):

```toml title="game.toml"
[game]
output_prefix = "faxanadu"
disable_ptr_scan = true
disable_secondary = true
```

Everything else in the file is a hint. You add one when your own analysis finds something the finder could not reach. The ones you reach for first:

- `[[known_table]]`, a contiguous table of little endian targets
- `[[split_table]]`, when the low and high bytes live in separate arrays
- `[[trampoline]]`, a bank switching call followed by inline data bytes
- `[[data_region]]`, to tell the pointer scanner a range is graphics, not code
- `[functions]`, for addresses nothing statically references

Faxanadu's trampoline entry shows how much a three line directive can carry:

```toml title="game.toml"
# ── Bank-switch trampolines ──────────────────────────────────────────────────
# JSR $F859 is followed by 3 inline data bytes (bank, addr_lo, addr_hi).
# $CC1A is the MMC1 PRG bank-switch function in the fixed bank.
[[trampoline]]
addr = 0xF859
inline_bytes = 3
bs_fn_addr = 0xCC1A
```

A `JSR $F859` in this game is not a normal call. The three bytes after it are arguments, not instructions. Without this entry the recompiler translates them as code and loses the return address. Every line in a mature `game.toml` records a discovery like that, which is why the file does not copy across between games. It describes one cartridge.

One trap before your first seed list. `[[extra_func]]` creates a standalone function. `[[extra_label]]` creates a second entry point inside an existing one. The framework README is blunt about mixing them up: an address added as `extra_func` when it sits inside an existing function splits that function, breaks its internal gotos, and causes freezes.

## The annotations file next to it

`baserom_annotations.csv` is the other committed input, and it changes nothing about codegen. It is a comment channel: `bank, address, note`. Each note is emitted into the generated C as `/* NOTE: ... */` at that address.

From [`baserom_annotations.csv`](https://github.com/mstan/FaxanaduRecomp/blob/master/baserom_annotations.csv):

```text title="baserom_annotations.csv"
# Workflow: when a non-obvious pattern is discovered via Ghidra, document it here
# so the generated code is self-explaining without ever reading faxanadu_full.c whole.

# Entry vectors
15, 0xC913, RESET vector — game main loop, never returns
15, 0xC999, NMI vector — VBlank handler, called at 60 Hz
15, 0xC9D5, IRQ vector
```

Start this file on day one. An hour in Ghidra working out what a routine does is an hour you will otherwise spend again in three weeks. A note here survives every regeneration.

## The build

The framework documents two stages. Build the recompiler once:

```sh
cmake -S recompiler -B build/recompiler -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build/recompiler
```

Then translate your ROM:

```sh
build/recompiler/NESRecomp <rom.nes> --game <path/to/game.toml>
```

On Windows the binary is `build/recompiler/Release/NESRecomp.exe` and the generator is `"Visual Studio 17 2022" -A x64`. The output is `generated/<prefix>_full.c`, `generated/<prefix>_dispatch.c`, and the per bank part files.

In a port repository both stages are wrapped. Fetch the pinned framework first:

```sh
chmod +x setup.sh && ./setup.sh
```

That runs `git submodule update --init --recursive nesrecomp recomp-ui` and symlinks the Nestopia core the co-simulation path uses. Then build the port:

```sh
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
```

Faxanadu's `build_all.bat` is the same sequence with the regen step in between, labelled `STEP 1: Build recompiler`, `STEP 2: Regen game code (plain)`, `STEP 3: Configure + build release`. If you copy one file out of this repository, copy that one.

## Wire the runner hooks, then run it

The last piece a new port owes the framework is `extras.c`. The runner calls a fixed set of functions, declared in [`runner/include/game_extras.h`](https://github.com/mstan/nesrecomp/blob/master/runner/include/game_extras.h), and every game implements all of them even when most are empty. Faxanadu's identity hook is one line:

```c title="extras.c"
uint32_t game_get_expected_crc32(void) { return 0x57DD23D1u; }

const char *game_get_name(void) { return "Faxanadu"; }
```

The launcher checks that CRC32 before starting the game and asks again if it does not match. Returning `0` skips the check. That is the NES convention. On Game Boy Advance and SNES a hash mismatch refuses to launch, so do not carry the habit across consoles.

When it finally opens a window, read `dispatch_misses.log` before you look at the picture. It sits next to the executable and lists every address the game jumped to with no generated function behind it. Each line is already formatted as a paste ready `extra_func` entry.

On NES a miss does not always kill the run. The dispatcher can hand the address to a 6502 interpreter that shares the same CPU state. The code then runs, play continues, and the miss costs a slow moment instead of the game. That fallback needs the game built with `push_all_jsr`, so the 6502 stack mirrors the C call stack. Faxanadu does not set it, and without it the interpreter turns itself off.

Either way the log means the same thing. Your configuration is incomplete, and the fleet calls a non empty log a silent game breaking bug. [It boots, then it crashes](/blog/tutorial-it-boots-then-crashes) is the rest of that story.

## Be honest with yourself about the timeline

Faxanadu's README describes its state as "**Status: Playable.** The game runs from title screen through credits. No outstanding known bugs. Not 100% playtested". Its `ISSUES.md` is a long ledger of the root causes behind that: a missing dispatch table that garbled one area's background, three layered bugs behind a dialogue box that froze the game, a hardcoded scanline split that garbled the HUD after a screen change.

The tree above is a day of work. The ledger is the months. Nobody has written the scaffolder that would turn that first day into one command.

## Source

- [FaxanaduRecomp](https://github.com/mstan/FaxanaduRecomp): `CMakeLists.txt`, `game.toml`, `baserom_annotations.csv`, `.gitignore`, `setup.sh`, `build_all.bat`, `extras.c`, `ISSUES.md`
- [nesrecomp](https://github.com/mstan/nesrecomp): `README.md`, `tools/cli.py`, `runner/include/game_extras.h`
- [SuperMarioBrosNESRecomp](https://github.com/mstan/SuperMarioBrosNESRecomp): `game.toml`, `.gitignore`

## Read next

- [Telling code from data](/docs/concepts/code-discovery), which is why `game.toml` needs hints at all
- [NES](/docs/platforms/nes), the toolchain's status, commands and known limits in its own words
- [Faxanadu](/games/faxanadu), the port this tutorial reads from
