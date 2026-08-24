---
title: "Quickstart"
summary: "Build psxrecomp from source, recompile a real PlayStation BIOS image into C, compile that C into a native program, and verify it with the repository's own test suite, using no game file of your own."
section: "start"
sectionTitle: "Start here"
pageType: "guide"
tags: ["Quickstart", "Build", "PlayStation"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/gbrecompiled"
  - "https://github.com/mstan/vbrecomp"
  - "https://github.com/mstan/nesrecomp"
updated: "2026-08-23"
---

This is the shortest path in this fleet from an empty directory to a static recompiler you built, a real binary you recompiled, and a native program that runs the result. It uses [psxrecomp](https://github.com/mstan/psxrecomp), and it needs no game file of your own, because the binary you will recompile is the openly licensed PlayStation BIOS image the repository ships. Be clear about what it is not: at the end of this you will not have a game running. Nothing in this fleet takes you from a clone to a playable game in one sitting, and this page would rather say so than imply otherwise. What you get instead is every stage of the pipeline working on your machine, which is the thing worth having first.

## Why this one

Three reasons, and they are the reasons to trust the commands below.

- **It is the best documented build in the fleet.** [`docs/BUILDING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BUILDING.md) gives per-platform prerequisites, a table of CMake options with their defaults, and a list of build failures with their fixes, which is where the troubleshooting section at the end of this page comes from.
- **It has a verification step with a stated expected result.** Most repositories tell you to build. This one tells you what passing looks like.
- **It needs nothing from you.** The BIOS it recompiles is OpenBIOS, the PCSX-Redux project's from-scratch, MIT-licensed PS1 BIOS, which is redistributable and is checked into the repository. Nearly every other route here needs a file you supply, and the one exception is at the end of this page.

At the end you will have: the recompiler binaries, C source translated from a real MIPS R3000A binary that you can open and read, a native runtime compiled from that C, and a passing test suite.

## Before you start

You need a C and C++ toolchain, CMake 3.20 or newer, Ninja, and Python 3. [What you need](/docs/start/what-you-need) has the full matrix and the per-platform install lines; the short form is `pacman -S --needed mingw-w64-x86_64-toolchain mingw-w64-x86_64-cmake mingw-w64-x86_64-ninja mingw-w64-x86_64-ccache` in an MSYS2 MinGW64 shell on Windows, `brew install ninja cmake` on macOS, and `sudo apt install build-essential cmake ninja-build` on Debian or Ubuntu. Run every command below in that MSYS2 shell if you are on Windows, not in PowerShell.

## 1. Clone the repository

```sh
git clone https://github.com/mstan/psxrecomp.git && cd psxrecomp
```

No `--recurse-submodules`. The repository is explicit that "A plain clone is enough to build the recompiler and the runtime", and the submodules are only for the launcher and netplay, neither of which this page builds.

## 2. Build the recompiler

```sh
cmake -S recompiler -B recompiler/build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build recompiler/build
```

Pass `-DCMAKE_BUILD_TYPE` explicitly every time, on this repository and every other one here. The generated C compiles unusably slowly unoptimised, and the build type also decides whether the runtime gets a debug server: Release turns it off, RelWithDebInfo and Debug turn it on.

**You should now see** two binaries in `recompiler/build`: `psxrecomp-bios`, which turns a flat BIOS image into C, and `psxrecomp-game`, which turns a game executable into C.

## 3. Recompile the BIOS into C

This is the step where static recompilation actually happens.

```sh
bash tools/regen_bios.sh --config bios/OpenBIOS.toml
```

The script builds the BIOS emitter and runs it over `bios/openbios.bin`, taking the image, its seed list and its address model from the profile you named. What comes out is C source: a translation of the machine code in that image, function by function, plus a dispatch table mapping guest addresses to those functions. Run it from the framework root, the directory containing `recompiler/` and `generated/`.

This step is not optional and it is the one people skip. Recompiled BIOS C is build output and is not tracked, so a fresh clone has none, and the next step configures the runtime directly from it. As the repository's build guide puts it, CMake "does NOT fall back".

**You should now see** `generated/OpenBIOS_full.c` and `generated/OpenBIOS_dispatch.c`. Open the first one. That is a PlayStation BIOS as C, and reading a few of its functions will teach you more about the technique than this page can.

If you have your own retail BIOS dump and want the second backend as well, the same script takes another profile, and this line is genuinely optional:

```sh
bash tools/regen_bios.sh --config bios/SCPH1001.toml
```

## 4. Compile the runtime against it

```sh
cmake -S runtime -B runtime/build -G Ninja -DCMAKE_BUILD_TYPE=Release -DPSX_RECOMP_UI=OFF
cmake --build runtime/build --target psx-runtime
```

`PSX_RECOMP_UI` is ON by default and wires in the shared launcher, which lives in a submodule your plain clone does not have. With it ON and the submodule missing, configure stops with a fatal error, so turn it off here.

**You should now see** `runtime/build/psx-runtime`, or `psx-runtime.exe` on Windows. That binary contains the recompiled BIOS as native code, plus the runtime that simulates the console's hardware around it.

## 5. Verify

Run the repository's own suite. This is the checkpoint that tells you the tree is sound.

```sh
cd recompiler/build && ctest --output-on-failure
```

**Expected output.** CTest prints one line per test and ends with a summary of the form `100% tests passed, 0 tests failed out of N`. The repository documents N as 38, in [`docs/TESTING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/TESTING.md):

> That is the whole thing. 38 tests, under 5 seconds, and it needs **no BIOS dump,
> no disc image, and no generated code** — a plain recompiler build is enough. This
> is the check to run before opening a PR.

Anything other than `0 tests failed` is a real failure worth reading, and `--output-on-failure` has already printed why. `ctest -N` lists the tests without running them, and `ctest -R <name> --output-on-failure` runs one.

Note what this suite proves and what it does not. It is hermetic by design, which is why it needs nothing from you, and by the same construction it cannot tell you a game still runs. The repository keeps a separate per-game regression checklist for that: the game boots, the attract demo plays, a save can be created, a save can be loaded, and gameplay is reachable after saving and loading.

## 6. Run what you built

```sh
./runtime/build/psx-runtime
```

With no arguments it uses the bundled OpenBIOS. This repository's own release is exactly this binary, described in its README as booting on the bundled OpenBIOS and being useful for "**memory-card management**". There is no game in this build and no disc to give it. `--headless` skips the window and audio entirely, and `--renderer software|opengl|vulkan` overrides the renderer if OpenGL is a problem on your machine; the full flag list is in the [command line reference](/docs/reference/cli).

## What this did not get you

Stated plainly, because the gap between here and a playable game is the thing a newcomer most often underestimates.

- **A game.** Games live in their own repositories, each pinning a framework commit as a submodule and carrying that game's configuration. [Port a game](/docs/guides/port-a-game) is the procedure, and it starts from a disc image you supply. Expect months, not an evening.
- **Any statement about a game's compatibility.** psxrecomp says a generated project is "a practical starting point, not a promise that every game works without game-specific fixes".
- **A debug server.** Release builds do not have one. Configure with `-DCMAKE_BUILD_TYPE=RelWithDebInfo` if you want the TCP debug protocol, which is how everything in this fleet is actually observed.
- **Anything redistributable from your own disc.** Generated game and retail BIOS C is derived from your files. See [the game file you supply](/docs/concepts/the-game-file-you-supply) and [provenance](/docs/fleet/provenance).

## Troubleshooting

### Configure fails with `Cannot find source file: .../generated/OpenBIOS_full.c`

Usually followed by `No SOURCES given to target: psx-runtime`. You skipped step 3, or ran it after configuring. Recompiled BIOS C is build output and a fresh clone has none. Run `bash tools/regen_bios.sh --config bios/OpenBIOS.toml`, then configure the runtime again. The same cause produces `No recompiled BIOS backend available`.

### `regen_bios: no usable recompiler build dir found`

Step 3 builds the BIOS emitter but never configures it, so step 2 has to come first. If you set `PSXRECOMP_BIOS_BUILD` to point at a build directory, note that it is resolved relative to the framework root, not your shell's working directory.

### A fingerprint-mismatch warning at configure time

`generated/` is stale relative to the emitter, which happens whenever the recompiler changes. Re-run step 3. The script records an emitter fingerprint precisely so the runtime's CMake can warn you.

### `ninja: error: loading 'build.ninja'`, or `Error: could not load cache`

You ran a build in a directory that was never successfully configured. `CMakeCache.txt` is written before the generate step, so a failed configure leaves a cache but no build file, and the build then complains about the wrong thing. Re-run the same `cmake -S ... -B ...` and read the real error. If it keeps failing, delete the build directory so a stale cache cannot poison the retry.

### The compiler dies with no diagnostic at all

Empty output and a nonzero exit is memory exhaustion, not a source bug. Retry with `-j 2` or `-j 1`. On this repository it is usually the toml11-heavy `config_loader.cpp`.

### `SDL3 3.4+ was not found`

The pinned SDL3 fetch could not reach the network. Check network access, or install a system SDL3 package and set `SDL3_DIR`, or re-enable `-DPSX_SDL3_FETCH=ON`.

### Configure stops with a fatal error mentioning `recomp-ui`

You built with `-DPSX_RECOMP_UI=ON` without the submodule. Either keep it OFF as in step 4, or clone with `--recurse-submodules`.

### MinGW reports `Error: too many sections`

Windows COFF objects have a 32,768 section limit and very large generated translation units can exceed it. Add `-Wa,-mbig-obj` for those units, or use binutils 2.40 or newer, which handles them.

### CMake says it "is not able to compile a simple test program"

On MSYS2, the MinGW64 gcc needs its own `bin` directory on `PATH` for its runtime DLLs. Export it before configuring: `export PATH="/c/msys64/mingw64/bin:$PATH"`.

## If you would rather aim at a game

Two other short paths exist, and both are honest about where they stop.

**Game Boy, if you have your own ROM.** [gbrecompiled](https://github.com/mstan/gbrecompiled) has the fleet's shortest documented route from a clone to a running program, because the recompiler emits a complete CMake project you then build and run.

```bash
git clone https://github.com/mstan/gbrecompiled.git
cd gbrecompiled
cmake -G Ninja -B build .
ninja -C build
```

```bash
# Generate C code from a ROM
./build/bin/gbrecomp path/to/game.gb -o output/game

# Build the generated project
cmake -G Ninja -S output/game -B output/game/build
ninja -C output/game/build

# Run
./output/game/build/game
```

You supply `path/to/game.gb` yourself. See [Game Boy and Game Boy Color](/docs/platforms/game-boy) for what that project currently claims about accuracy, and expect interpreter fallbacks in `interp_fallbacks.log` to feed back into your configuration.

**Virtual Boy, with no file at all.** [vbrecomp](https://github.com/mstan/vbrecomp) builds a runtime with no cartridge linked in, and the documented check is a TCP ping rather than a picture:

```bash
python -m unittest discover recompiler/tests
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --target vb-runtime
./build/runtime/vb-runtime --port 4390      # vb-runtime.exe on Windows
python tools/_ping.py --port 4390
```

Its README describes the result exactly: "This produces a `vb-runtime` linked against `no_game_linked.c` — the runtime starts, the TCP debug server responds, but no cart code is present."

**NES.** [nesrecomp](https://github.com/mstan/nesrecomp) builds in two commands and recompiles a ROM in one more, but it stops sooner than the other two: "This builds a static library. It does not create a playable game by itself. Each game still needs game-specific configuration and runner integration." [Port a game](/docs/guides/port-a-game) is where that continues.

## Source

- [psxrecomp](https://github.com/mstan/psxrecomp): [`docs/BUILDING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BUILDING.md) for every command in steps 1 to 4 and most of the troubleshooting; [`docs/TESTING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/TESTING.md) and [`CONTRIBUTING.md`](https://github.com/mstan/psxrecomp/blob/master/CONTRIBUTING.md) for step 5; [`tools/regen_bios.sh`](https://github.com/mstan/psxrecomp/blob/master/tools/regen_bios.sh) and [`bios/OpenBIOS.toml`](https://github.com/mstan/psxrecomp/blob/master/bios/OpenBIOS.toml) for step 3; [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md) for what the BIOS-only release is; [`THIRD_PARTY_ATTRIBUTION.md`](https://github.com/mstan/psxrecomp/blob/master/THIRD_PARTY_ATTRIBUTION.md) for OpenBIOS's licence.
- [gbrecompiled](https://github.com/mstan/gbrecompiled): [`README.md`](https://github.com/mstan/gbrecompiled/blob/master/README.md).
- [vbrecomp](https://github.com/mstan/vbrecomp): [`README.md`](https://github.com/mstan/vbrecomp/blob/master/README.md).
- [nesrecomp](https://github.com/mstan/nesrecomp): [`README.md`](https://github.com/mstan/nesrecomp/blob/master/README.md).

## Next

- [PlayStation](/docs/platforms/playstation) explains what you just built, tier by tier.
- [Port a game](/docs/guides/port-a-game) is the next real step, and [the game file you supply](/docs/concepts/the-game-file-you-supply) is what it needs from you.
- [Build a toolchain](/docs/guides/build-a-toolchain) has the same procedure for the other eleven consoles.
- [If you are an agent, start here](/docs/agents/start-here) if you are automating any of the above.
