---
title: "Developer quickstart: psxrecomp"
summary: "Build psxrecomp, recompile an open-source PlayStation BIOS into native code, and run the project tests."
pageType: "guide"
tags: ["Developer quickstart", "Build", "PlayStation"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
updated: "2026-08-30"
---

This page is for developers, port authors, and curious users who want to build a recomp toolchain.

psxrecomp is the gold-standard framework in this ecosystem right now. That does not mean every console works like PlayStation. It means this is the cleanest place to learn the shape of the work.

> **Note.** This quickstart does not build a game, and it is not required before
> playing a finished port. It recompiles an open-source PlayStation BIOS because
> that is a small, legal file the project can ship. If this works, you have
> proven the build and recompilation pipeline. A game project follows a similar
> shape.

You will build [psxrecomp](https://github.com/mstan/psxrecomp), recompile OpenBIOS into C, compile that C into a native program, and run the project tests.

## What will I have at the end?

You will have four things:

- the psxrecomp tools built on your machine
- C code generated from a PlayStation BIOS image
- a native runtime built from that generated C
- a test run that tells you whether the recompiler build is healthy

The BIOS used here is OpenBIOS, a legal open-source BIOS alternative from PCSX-Redux. This site does not provide copyrighted retail BIOS files. If a project needs a retail BIOS, the intended path is to legally dump it from your own hardware.

## Before you start

You need Git, Python 3, CMake 3.20 or newer, Ninja, and a C/C++ compiler.

If you do not have those yet, use [What do I need to get started?](/docs/start/what-you-need) first.

On Windows, use the MSYS2 MinGW64 shell for the commands below. Do not use PowerShell for this quickstart.

## 1. Clone the repository

```sh
git clone https://github.com/mstan/psxrecomp.git && cd psxrecomp
git submodule update --init --recursive
```

The second command downloads the extra libraries the runtime expects. Do it now so later build steps do not fail halfway through.

## 2. Build the recompiler

```sh
cmake -S recompiler -B recompiler/build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build recompiler/build
```

This builds the tools that translate PlayStation code into C.

You should now have `psxrecomp-bios` and `psxrecomp-game` in `recompiler/build`.

## 3. Recompile the BIOS into C

This is the step where recompilation happens.

```sh
bash tools/regen_bios.sh --config bios/OpenBIOS.toml
```

The script reads the OpenBIOS image and generates C code from it. Run it from the psxrecomp folder, the one that contains `recompiler/` and `generated/`.

This step is easy to skip, but it is required. A fresh clone does not already contain the generated BIOS C.

You should now see `generated/OpenBIOS_full.c` and `generated/OpenBIOS_dispatch.c`.

If you legally dumped your own retail BIOS and want to build that backend too, this optional command uses the retail BIOS profile:

```sh
bash tools/regen_bios.sh --config bios/SCPH1001.toml
```

Use a legally obtained BIOS. This site does not provide them.

## 4. Compile the runtime against it

```sh
cmake -S runtime -B runtime/build -G Ninja -DCMAKE_BUILD_TYPE=Release -DPSX_RECOMP_UI=OFF
cmake --build runtime/build --target psx-runtime
```

This compiles the runtime. The runtime is the native program that surrounds the recompiled code and gives it the hardware services it expects.

This page turns the shared launcher UI off because the quickstart does not need it.

You should now see `runtime/build/PSXRecomp`, or `PSXRecomp.exe` on Windows.

## 5. Verify

Run the test suite:

```sh
cd recompiler/build && ctest --output-on-failure
```

CTest prints one line per test and then a summary. The result you want is:

```text
100% tests passed, 0 tests failed
```

The exact number of tests may change over time. The important part is `0 tests failed`.

These tests check the recompiler. They do not prove that a game port is faithful. For a game, the measurement is stricter: it needs to behave like the original game, not just start without crashing.

## 6. Run what you built

```sh
./runtime/build/PSXRecomp
```

With no arguments, it uses the bundled OpenBIOS. There is no game in this build and no disc to give it.

If graphics are a problem on your machine, the command line reference has the full flag list: [CLI reference](/docs/reference/cli).

## What this did not get you

- **A game.** This quickstart builds the framework, not a game port.
- **A compatibility promise.** A generated project is a starting point. A real port still needs game-specific work.
- **A debug build.** `Release` builds are for speed. Use `RelWithDebInfo` later if you need debugging tools.
- **Anything redistributable from your own files.** Generated code from a retail BIOS or game file comes from your copy. Treat it that way.

## Troubleshooting

### Configure fails with `Cannot find source file: .../generated/OpenBIOS_full.c`

You skipped step 3, or you ran it after configuring the runtime. Run `bash tools/regen_bios.sh --config bios/OpenBIOS.toml`, then configure the runtime again.

### `regen_bios: no usable recompiler build dir found`

Step 2 has to come before step 3. Build the recompiler, then run the BIOS generation script again.

### A fingerprint-mismatch warning at configure time

The generated BIOS C is stale. Re-run step 3.

### `ninja: error: loading 'build.ninja'`, or `Error: could not load cache`

The configure step did not finish. Re-run the matching `cmake -S ... -B ...` command and read the first real error.

### The compiler dies with no diagnostic at all

This is often memory exhaustion. Retry with fewer build jobs:

```sh
cmake --build recompiler/build -- -j 2
```

### `SDL3 3.4+ was not found`

The SDL3 dependency could not be found or downloaded. Check network access, or install SDL3 locally and point CMake at it.

### Configure stops with a fatal error mentioning `recomp-ui`

Keep `-DPSX_RECOMP_UI=OFF` for this quickstart, or make sure submodules are initialized.

### MinGW reports `Error: too many sections`

Very large generated C files can hit a Windows object-file limit. Use a newer MinGW/binutils, or add `-Wa,-mbig-obj` for the affected build.

### CMake says it "is not able to compile a simple test program"

On MSYS2, the MinGW64 gcc needs its own `bin` directory on `PATH` for its runtime DLLs. Export it before configuring:

```sh
export PATH="/c/msys64/mingw64/bin:$PATH"
```

## If you would rather aim at a game

Go to [How do I recomp my own game?](/docs/start/recomp-your-own-game).

That page starts from a game file you legally provide. Some systems may also need a BIOS or system file. This site does not provide copyrighted game files or retail BIOS files.

## Next

- [PlayStation](/docs/platforms/playstation) explains what you just built, tier by tier.
- [How do I recomp my own game?](/docs/start/recomp-your-own-game) is the next real step, and [the game file you supply](/docs/concepts/the-game-file-you-supply) is what it needs from you.
- [Build a toolchain](/docs/guides/build-a-toolchain) is where the other console toolchains live.
