---
title: "Build a toolchain"
summary: "Clone to built binary for every framework in the fleet: what each one requires, the exact command sequence its own documentation gives, how to verify the result without a game file, and what to do when the build fails."
pageType: "guide"
tags: ["Building", "CMake", "Toolchain"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/vbrecomp"
  - "https://github.com/mstan/cdirecomp"
  - "https://github.com/mstan/ndsrecomp"
  - "https://github.com/mstan/gbrecompiled"
updated: "2026-08-25"
---

A toolchain here is two programs. The recompiler reads a game's binary, which is compiled machine code, and writes out source code. The projects here emit C. The runtime is the library that generated C links against. Building a toolchain gives you the tools, not a game you can play. That is the right place to stop and check your work, because every framework here can prove it built correctly with no game file present. Every command below comes from the project that publishes it.

## What each toolchain requires

This is what each repository claims. It is not a promise that the build works on your machine. Where a project says a platform is untested, that word is kept here.

| Toolchain | OS support, as stated | Compiler | Build system | Python | Other dependencies |
|---|---|---|---|---|---|
| [psxrecomp](https://github.com/mstan/psxrecomp) | Windows (MSVC or MinGW/MSYS2), macOS on Apple Silicon and Intel, Linux | MSYS2 MinGW-w64 or MSVC on Windows, Apple Clang on macOS, GCC or Clang on Linux. Recompiler is C++20, runtime is C99 plus C++17 | CMake 3.20 or above, two separate trees (`recompiler/`, `runtime/`); Ninja and pkg-config on macOS and Linux | Python 3, system copy for development or an embedded copy in releases | SDL3 3.4 or newer, else a pinned SDL 3.4.10 fetch; SDL2 only as an explicit fallback; vendored fmt 9.1.0, toml11, ELFIO, rabbitizer; OpenGL; Vulkan headers on by default with `glslc` for shaders; `ccache` auto-detected |
| [nesrecomp](https://github.com/mstan/nesrecomp) | Windows x64 under MSVC is primary and mature; macOS on Apple Silicon and Intel is labelled experimental and newly added; other UNIX is described as likely to work and less tested | Recompiler is pure C11 with no external dependencies; game runners need SDL2 | CMake 3.20 or above | Python 3.12 plus PyInstaller, only to build the released CLI zip | SDL2 for runners |
| [snesrecomp](https://github.com/mstan/snesrecomp) | Windows, macOS and Linux implied by the SDL backend section; the released CLI artifact is Windows x86_64 | A C compiler for the generated source, Rust 1.85 or newer for the recompiler crate | CMake plus Ninja | Python 3.9 or newer, `pyinstaller==6.21.0` | SDL3 as the default desktop backend, SDL2 as an explicit fallback; `recomp-ui` |
| [gbarecomp](https://github.com/mstan/gbarecomp) | macOS verified booting a real ROM; Steam Deck and Flatpak verified on a real Deck; ordinary Linux distributions untested; Windows through a game's `tools/package_release.ps1`, built with MSYS2 MinGW rather than MSVC because `bios_hle.cpp` uses `__builtin_clz` | C++20 | CMake plus ctest | Python 3.12 plus PyInstaller for the Windows CLI zip | SDL2; `toml++` v3.4.0 fetched pinned for `gba_recompile` |
| [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp) | The runner builds and runs natively on Windows (MSVC), macOS on Apple Silicon and Intel, and Linux | Recompiler is C11; Visual Studio 17 2022 or Ninja | CMake, CTest | Python for `tools/boot_smoke.py`, `tools/zone_smoke.py`, `tools/package_release.py` | SDL2; submodules `m68k-recomp-core`, `z80-recomp-core`, `recomp-net`; ymfm, superzazu Z80, clowncommon |
| [ndsrecomp](https://github.com/mstan/ndsrecomp) | Not stated as a platform list; the build is shown with Ninja | C++20 | CMake 3.20 or above | `tools/capture_firmware_images.py`, `tools/export_firmware_bank_configs.py` for firmware bring-up | SDL2 optional at configure time; without it the runner is headless |
| [cdirecomp](https://github.com/mstan/cdirecomp) | Builds with Visual Studio 17 2022, and is also verified with MinGW gcc plus Ninja | C11 | CMake | `tools/first_divergence.py` and other probes | SDL2 development package |
| [vbrecomp](https://github.com/mstan/vbrecomp) | Windows (MSVC or MinGW), macOS on Apple Silicon and Intel, and Linux | Not stated beyond a C and C++ toolchain | CMake | `python -m unittest discover recompiler/tests` | SDL2, from Homebrew, a distribution package, or a vendored dev pack on Windows. No fiber or coroutine dependency |
| [smsggrecomp](https://github.com/mstan/smsggrecomp) | Targets Windows (MSVC or MinGW), macOS and Linux | A C toolchain | CMake, with Visual Studio 17 2022 or Ninja | None required for the recompiler | SDL2; recursive submodules for the shared Z80 core |
| [gbrecompiled](https://github.com/mstan/gbrecompiled) | Desktop platforms unstated. Android is single-ROM only, landscape only, `arm64-v8a` only, controller-first | A C or C++ compiler: Clang, GCC or MSVC | CMake 3.15 or above, Ninja | Tools under `tools/` | SDL2 development libraries. Android additionally needs `gradle`, the Android SDK and NDK, `adb`, and an SDL2 source checkout at `SDL2_SOURCE_DIR` |

Three gaps are worth naming. ndsrecomp lists no supported operating systems. gbrecompiled lists requirements for its Android target but not for desktop hosts. vbrecomp names no compiler version or language standard. If you need certainty on one of those, ask in the repository.

The table covers this fleet's console toolchains. The Xbox probe is not in it. It builds through nxdk, pinned to the commit in its `.nxdk-version`, and not through CMake at all.

## Two rules that apply to every build here

**Always set a build type.** Generated C is enormous, and at `-O0` it compiles unusably slowly. psxrecomp says what happens if you configure without one, in [`docs/BUILDING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BUILDING.md):

> With no `-DCMAKE_BUILD_TYPE`, the framework defaults to **Release** (optimized). The huge generated C compiles unusably slowly at `-O0`, so never build it debug-by-accident.

The build type also decides whether you get debug tools. On psxrecomp, `PSX_DEBUG_TOOLS` is on for Debug and RelWithDebInfo and off for Release, so a Release build has no TCP debug server.

**`-j` is a memory setting, not a speed dial.** Two repositories found this out separately. From [`RELEASE.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/RELEASE.md) in SuperMarioWorldRecomp:

> Keep -j modest: the generated banks are multi-MB TUs at -O3, and an over-subscribed build kills the compiler with NO diagnostic (empty output, exit -1). That is memory pressure, not a source bug.

psxrecomp says the same about `config_loader.cpp` and gives the fix. If `cmake --build` dies with no message at all, retry with `-j 2` or `-j 1`.

## Build the PlayStation toolchain

psxrecomp has the best documented build here. Read it first even if your console is a different one, because the other frameworks repeat its three stages. A plain clone is enough for the recompiler and the runtime. Add `--recurse-submodules` only if you want the launcher (`recomp-ui`) or netplay (`lib/recomp-net`). Configuring with `-DPSX_RECOMP_UI=ON` without that submodule present is a `FATAL_ERROR`.

Install the host toolchain first. In an MSYS2 MinGW64 shell:

```sh
pacman -S --needed mingw-w64-x86_64-toolchain mingw-w64-x86_64-cmake \
                   mingw-w64-x86_64-ninja mingw-w64-x86_64-ccache
```

On macOS run `brew install ninja cmake`. On Debian and Ubuntu run `sudo apt install build-essential cmake ninja-build`. Then the three stages, verbatim from [`docs/BUILDING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BUILDING.md):

```sh
# 1. Recompiler tool → produces psxrecomp-bios and psxrecomp-game
cmake -S recompiler -B recompiler/build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build recompiler/build

# 2. REQUIRED before the first runtime build: generate a BIOS backend.
#    Step 3 configures psx-runtime from generated/OpenBIOS_full.c. If generated/
#    is empty, CMake does NOT fall back -- it fails at configure time with
#    "Cannot find source file: .../generated/OpenBIOS_full.c" followed by
#    "No SOURCES given to target: psx-runtime". Re-run this step whenever the
#    recompiler emitter changes; a stale generated/ raises a fingerprint-mismatch
#    warning from runtime.cmake.
#
#    OpenBIOS can always be regenerated from the tracked image. Regenerating
#    the retail backend requires your own bios/SCPH1001.BIN dump and is genuinely
#    optional -- OpenBIOS alone is enough to build and boot.
bash tools/regen_bios.sh --config bios/OpenBIOS.toml
bash tools/regen_bios.sh --config bios/SCPH1001.toml   # optional, needs your own dump

# 3. Runtime → produces psx-runtime (BIOS-only for this repo)
cmake -S runtime -B runtime/build -G Ninja -DCMAKE_BUILD_TYPE=Release \
      -DPSX_RECOMP_UI=OFF
cmake --build runtime/build --target psx-runtime
```

**You should now see** two emitter binaries under `recompiler/build` and a `psx-runtime` under `runtime/build`. Check them without a BIOS and without a disc:

```sh
cd recompiler/build && ctest --output-on-failure
```

On Linux and macOS, `sh tools/setup_dev.sh` wraps the same setup. It checks the toolchain, builds the CLI and recompiler tools, refreshes the generated BIOS C when your own `bios/SCPH1001.BIN` is present, and builds the BIOS-only runtime. It does not create per-game runtime targets. It prints an `[ok]`, `[missing]` or `[warn]` line for `cmake`, `python3`, `ninja` and a C compiler, which is the fastest way to find out what your machine is missing.

Those three stages, recompiler then regenerate then runner, are the shape the other frameworks repeat. No project publishes that pattern as a rule. It was read out of one real build script, [`build_all.bat`](https://github.com/mstan/FaxanaduRecomp/blob/master/build_all.bat) in FaxanaduRecomp, which numbers the stages and returns a different exit code for each. Treat it as a description of what the scripts do.

> **You provide this.** Nothing on this page needs a game file, and the frameworks do not distribute one. One optional step does read a dump you supply yourself: regenerating psxrecomp's retail BIOS backend from `bios/SCPH1001.BIN`. You can skip it. [The game file you supply](/docs/concepts/the-game-file-you-supply) is the contract behind them.

## Build the other toolchains

Each block below is copied from that project's own README. Run them from the repository root unless the block says otherwise.

### nesrecomp

The recompiler is standalone C11. Windows first, then the Ninja path:

```bash
# Build the recompiler
cmake -S recompiler -B build/recompiler -G "Visual Studio 17 2022" -A x64
cmake --build build/recompiler --config Release
```

```bash
# Install prerequisites (macOS / Homebrew shown; use your distro's packages on Linux)
brew install cmake sdl2 ninja

# Build the recompiler
cmake -S recompiler -B build/recompiler -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build/recompiler
```

**You should now see** `build/recompiler/Release/NESRecomp.exe` on Windows, or `build/recompiler/NESRecomp` with no suffix elsewhere. Running it on a ROM you supply is the next step, in [port a game](/docs/guides/port-a-game).

### snesrecomp

The recompiler is a Rust crate. The shipped CLI is packaged with PyInstaller:

```sh
git clone https://github.com/mstan/snesrecomp.git
cd snesrecomp
python -m pip install pyinstaller==6.21.0
python tools/build_cli.py release
```

**You should now see** a printed backend line when a game repository configures against it. An SDL3 build reports the SDL3 desktop backend for both the game target and recomp-ui. An SDL2 build reports the SDL2 compatibility backend. Keep the two backends in separate build directories, so stale CMake package paths cannot leak between them.

### gbarecomp

Submodules are required at clone time, and `ctest` is the built-in check:

```sh
git clone --recurse-submodules https://github.com/mstan/gbarecomp.git
cd gbarecomp
cmake -S . -B build
cmake --build build
ctest --test-dir build
```

On Windows the redistributable CLI is built separately with `py -3.12 tools/build_cli.py`, and the archive lands in `build/cli-release/`. Build with MSYS2 MinGW on Windows, not MSVC: `bios_hle.cpp` uses `__builtin_clz`, and MSVC fails with `error C3861`.

### segagenesisrecomp

Clone recursively for the shared 68000 and Z80 cores, build the recompiler, then build and register the tests:

```bash
git clone --recursive https://github.com/mstan/segagenesisrecomp.git
```

```bash
cd recompiler

# Windows (MSVC)
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release

# macOS / Linux (Ninja)
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
ninja -C build
```

```bash
cmake -S tests -B build/tests
cmake --build build/tests --config Release
ctest --test-dir build/tests -C Release --output-on-failure
```

**You should now see** a green CTest run. One test is missing from it on purpose: `l1_decoder_test` is built but not registered with CTest, because it needs a Sonic ROM you supply.

### vbrecomp

The Virtual Boy runtime can be built and proven with no cart at all, which makes it the cheapest check in the fleet:

```bash
python -m unittest discover recompiler/tests
# macOS/Linux: -G Ninja; Windows/MSYS2 as documented in the per-game README
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --target vb-runtime
./build/runtime/vb-runtime --port 4390      # vb-runtime.exe on Windows
python tools/_ping.py --port 4390
```

**You should now see** a runtime linked against `no_game_linked.c`. It starts, the TCP debug server answers, and no cart code is present. That is the documented result, not a failure.

### cdirecomp

Recompiler, generated BIOS C, then runtime:

```powershell
# Recompiler (CdiRecomp) — 68000 frontend + CD-i disc/module inventory
cmake -S recompiler -B build/recompiler -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build/recompiler -j

# Recompile the CD-RTOS system ROM to C (emit generated BIOS)
build/recompiler/CdiRecompBios.exe bios/cdi490a.rom --emit

# Runtime (CdiRuntime) — hardware models + native/interpreted guest execution
cmake -S runner -B build/runner-release -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build/runner-release -j
```

The CeDImu oracle has its own build and one documented trap: use the mingw64 cmake explicitly, because the devkitPro cmake on PATH mangles Windows paths.

### ndsrecomp

Recompiler, decode tests, BIOS banks, runner:

```sh
cmake -G Ninja -B recompiler/build recompiler
cmake --build recompiler/build
./recompiler/build/armv5te_decode_test
./recompiler/build/interpreter_cycle_test
```

```sh
cmake -G Ninja -B runner/build runner
cmake --build runner/build
```

The repository is candid that the middle of this is not turnkey. The full runner also expects firmware RAM-bank captures matching the configs under `bios/firmware_banks/`, and the repository says this bootstrap workflow still assumes an active developer setup.

### smsggrecomp and gbrecompiled

smsggrecomp needs `git submodule update --init --recursive` for the shared Z80 core, then the same CMake pair as segagenesisrecomp from inside `recompiler/`. gbrecompiled is the shortest build here:

```bash
git clone https://github.com/mstan/gbrecompiled.git
cd gbrecompiled
cmake -G Ninja -B build .
ninja -C build
```

**You should now see** `build/bin/gbrecomp`. It generates a project from a ROM you supply, and a second CMake invocation builds that project.

## When the build fails

| Symptom | Cause | Fix |
|---|---|---|
| `Cannot find source file: .../generated/OpenBIOS_full.c`, then `No SOURCES given to target: psx-runtime` | Fresh clone. The recompiled BIOS C is build output and is not tracked, and CMake does not fall back | Run stage 2 before configuring the runtime: `bash tools/regen_bios.sh --config bios/OpenBIOS.toml` |
| `regen_bios: no usable recompiler build dir found` | The script builds the BIOS emitter but never configures it | Run stage 1 first. `PSXRECOMP_BIOS_BUILD` overrides the directory and resolves relative to the framework root, not your shell's working directory |
| `ninja: error: loading 'build.ninja'`, or CMake cannot load the cache | A build was run in a directory that was never successfully configured. `CMakeCache.txt` is written before the generate step, so a failed configure leaves a cache and no generator file | Re-run the same `cmake -S ... -B ...`, read the real error, and delete the build directory if it recurs |
| `cmake --build` dies with no diagnostic and exit -1 | Memory exhaustion on multi-megabyte translation units | Lower `-j`. psxrecomp recommends `-j 2` or `-j 1` |
| CMake try-compile reports it is not able to compile a simple test program, under MSYS2 | The msys2 mingw64 gcc needs its own bin directory on PATH for its runtime DLLs | `export PATH="/c/msys64/mingw64/bin:$PATH"` before configuring. |
| MinGW reports too many sections | Windows COFF objects have a 32,768 section limit and generated C can exceed it on older binutils | Add `-Wa,-mbig-obj` to that file's compile options; binutils 2.40 and newer generally do not need it |
| `SDL3 3.4+ was not found` | Network access blocked, or `PSX_SDL3_FETCH` turned off | Install a system SDL3 package and set `SDL3_DIR`, or re-enable `-DPSX_SDL3_FETCH=ON` |
| Configure fails with `FATAL_ERROR` on `PSX_RECOMP_UI=ON` | The `recomp-ui` submodule is absent | Clone with `--recurse-submodules`, or pass `-DPSX_RECOMP_UI=OFF` |
| `error C3861: '__builtin_clz': identifier not found` | MSVC building gbarecomp's `bios_hle.cpp` | Build with MSYS2 MinGW on Windows |

The full catalogue, with sources and the packaging and runtime failures too, is [errors and exit codes](/docs/reference/errors-and-exit-codes).

## Source

- psxrecomp: [`docs/BUILDING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BUILDING.md), [`docs/TESTING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/TESTING.md), [`runtime/runtime.cmake`](https://github.com/mstan/psxrecomp/blob/master/runtime/runtime.cmake), [`tools/regen_bios.sh`](https://github.com/mstan/psxrecomp/blob/master/tools/regen_bios.sh), [`tools/setup_dev.sh`](https://github.com/mstan/psxrecomp/blob/master/tools/setup_dev.sh)
- nesrecomp: [`README.md`](https://github.com/mstan/nesrecomp/blob/master/README.md). snesrecomp: [`README.md`](https://github.com/mstan/snesrecomp/blob/main/README.md). gbarecomp: [`README.md`](https://github.com/mstan/gbarecomp/blob/main/README.md), [`CMakeLists.txt`](https://github.com/mstan/gbarecomp/blob/main/CMakeLists.txt)
- segagenesisrecomp: [`README.md`](https://github.com/mstan/segagenesisrecomp/blob/master/README.md). vbrecomp: [`README.md`](https://github.com/mstan/vbrecomp/blob/master/README.md).
- cdirecomp: [`README.md`](https://github.com/mstan/cdirecomp/blob/master/README.md), [`TCP.md`](https://github.com/mstan/cdirecomp/blob/master/TCP.md). ndsrecomp: [`README.md`](https://github.com/mstan/ndsrecomp/blob/main/README.md). smsggrecomp: [`README.md`](https://github.com/mstan/smsggrecomp/blob/main/README.md). gbrecompiled: [`README.md`](https://github.com/mstan/gbrecompiled/blob/master/README.md), [`ANDROID.md`](https://github.com/mstan/gbrecompiled/blob/master/ANDROID.md)
- The three-stage game build shape: [`FaxanaduRecomp/build_all.bat`](https://github.com/mstan/FaxanaduRecomp/blob/master/build_all.bat)

## Next

- [Getting started](/docs/start/what-you-need) is the shorter answer, plus the game file contract.
- [Port a game](/docs/guides/port-a-game) is the step after this one.
- [Command line reference](/docs/reference/cli) has every flag on every tool built here.
- [Checking your own work](/docs/agents/verification-rituals) lists the build and test command for each repository.
