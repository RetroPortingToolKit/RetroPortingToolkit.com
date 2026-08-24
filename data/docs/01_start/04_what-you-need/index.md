---
title: "What you need"
summary: "Prerequisites before you build anything here: a C and C++ toolchain, CMake and Ninja, Python for the tooling and SDL for the runners, per toolchain and per host OS, plus the one thing no repository ships, which is your own game file."
section: "start"
sectionTitle: "Start here"
pageType: "guide"
tags: ["Prerequisites", "Build", "Game files"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/segagenesisrecomp"
updated: "2026-08-23"
---

Two things. A normal C and C++ development toolchain, because every project here is a CMake tree that produces a compiler-like tool and a program that links its output. And, if you want to run anything rather than just build it, your own copy of the game, which no repository in this fleet ships. This page is the first half in detail, per toolchain and per host operating system, and the short version of the second half with a link to the page that states it properly. Everything below is what the repositories themselves claim, not a portability guarantee: several are explicit that a platform is untested.

## The short list

Nearly every toolchain here wants the same five things.

| Thing | Version | Why |
|---|---|---|
| `git` | any recent | In a game repository the framework and the shared launcher are submodules, so you will need `--recurse-submodules` or `git submodule update --init --recursive` |
| A C and C++ compiler | C11 and C++20 between them | Recompilers are C11 or C++20; runtimes are C99, C11 or C++17 depending on the project |
| CMake | 3.20 or newer | Every toolchain configures with it. gbrecompiled asks only for 3.15 |
| Ninja | any recent | The generator the documented commands use on macOS and Linux, and one of two options on Windows alongside Visual Studio 17 2022 |
| Python 3 | 3.9 or newer, 3.12 where a CLI zip is built | Drives regeneration wrappers, co-simulation coordinators and packaging |

Plus SDL for anything that opens a window. Most runners want SDL2; psxrecomp defaults to SDL3 with an SDL2 fallback, and snesrecomp does the same.

The recompilers themselves are deliberately light. nesrecomp's is "pure C11 with no external dependencies", and smsggrecomp needs no Python at all to build one. It is the runner half that pulls in SDL, and the packaging half that pulls in PyInstaller.

## What each toolchain asks for

Read this as what the repository claims, quoted from its own build documentation.

| Toolchain | OS support, as stated | Compiler | Build system | Python | Other dependencies |
|---|---|---|---|---|---|
| [psxrecomp](https://github.com/mstan/psxrecomp) | "Windows (MSVC or MinGW/MSYS2), macOS (Apple Silicon & Intel), and Linux" | MSYS2 MinGW-w64 or MSVC; Apple Clang; GCC or Clang. Recompiler C++20, runtime C99 plus C++17 | CMake >= 3.20, plus Ninja and pkg-config on macOS and Linux. Two separate CMake trees | Python 3 for the tooling | SDL3 3.4+, fetched pinned if no system package; OpenGL; Vulkan headers on by default; `ccache` used if present |
| [nesrecomp](https://github.com/mstan/nesrecomp) | Windows x64 MSVC "Primary / mature"; macOS "**Experimental — newly added**"; Linux "Likely works via the same POSIX path; less tested" | Recompiler is "pure C11 with no external dependencies" | CMake 3.20+ | 3.12 plus PyInstaller, only to build the released CLI zip | SDL2 for game runners |
| [snesrecomp](https://github.com/mstan/snesrecomp) | Windows, macOS and Linux implied by the SDL backend section; the CLI release artifact is Windows x86_64 | A C compiler for the generated source; Rust 1.85 or newer for the recompiler crate | CMake and Ninja | 3.9 or newer; `pyinstaller==6.21.0` | SDL3 by default, SDL2 as an explicit fallback; `recomp-ui` |
| [gbarecomp](https://github.com/mstan/gbarecomp) | macOS "verified booting a real ROM"; Steam Deck and Flatpak "**verified on a real Deck**"; ordinary Linux distros "**untested**"; Windows through MSYS2 MinGW, not MSVC | C++20 | CMake and ctest | 3.12 plus PyInstaller for the Windows CLI zip | SDL2; `toml++` v3.4.0 fetched pinned |
| [gbrecompiled](https://github.com/mstan/gbrecompiled) | Desktop unstated; Android is "single-ROM only, landscape only, `arm64-v8a` only" | "A C/C++ compiler (Clang, GCC, or MSVC)" | CMake 3.15+ and Ninja | tools under `tools/` | SDL2. Android additionally needs gradle, the Android SDK and NDK, `adb` and an SDL2 source checkout |
| [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp) | "The runner builds and runs natively on **Windows (MSVC)**, **macOS (Apple Silicon & Intel)**, and **Linux**" | "The recompiler is C11 and builds with CMake and a C toolchain" | CMake and CTest, Visual Studio 17 2022 or Ninja | for the smoke and packaging scripts | SDL2; submodules `m68k-recomp-core`, `z80-recomp-core`, `recomp-net` |
| [smsggrecomp](https://github.com/mstan/smsggrecomp) | "Targets **Windows (MSVC / MinGW)**, **macOS**, and **Linux**" | A C toolchain | CMake, Visual Studio 17 2022 or Ninja | none required for the recompiler | SDL2; recursive submodules for the shared Z80 core |
| [vbrecomp](https://github.com/mstan/vbrecomp) | "Windows (MSVC/MinGW), macOS (Apple Silicon & Intel), and Linux" | not stated beyond a C and C++ toolchain | CMake | `python -m unittest discover recompiler/tests` | SDL2. No fiber or coroutine dependency |
| [ndsrecomp](https://github.com/mstan/ndsrecomp) | not stated as a list; the build is shown with Ninja | C++20 | CMake 3.20+ | firmware capture and export tools | SDL2 optional at configure time; without it the runner is headless |
| [cdirecomp](https://github.com/mstan/cdirecomp) | "Builds with Visual Studio 17 2022, and is also verified with MinGW gcc + Ninja" | C11 | CMake | probe tools such as `tools/first_divergence.py` | the SDL2 development package |
| [gcnlle](https://github.com/mstan/gcnlle) | "The tested host setup is 64-bit Windows on an AVX2-capable CPU, with MSYS2 MinGW64 GCC, CMake, and Ninja" | recompiler C11, plus a C++20 DSP component | CMake and Ninja, driven by `./build.sh` | debug and co-simulation clients | Vulkan optional and auto-detected. Defaults to `x86-64-v3`, so pass `-DGCN_X86_64_V3=OFF` for an older CPU |
| [xboxlle-probe](https://github.com/mstan/xboxlle-probe) | CI runs ubuntu-latest | clang, lld and llvm through nxdk | `make` through nxdk | 3.12 | `bison clang cmake flex lld llvm make`, plus the nxdk commit pinned in `.nxdk-version` |

Upstream [N64Recomp](https://github.com/N64Recomp/N64Recomp) asks for CMake 3.20 or above and a C++20 compiler, and [Zelda64Recomp](https://github.com/Zelda64Recomp/Zelda64Recomp) documents Ubuntu and Windows with clang. See [lineage and credit](/docs/fleet/lineage-and-credit) for how those relate to this fleet.

## Your host operating system

The install lines below are the ones psxrecomp's [`docs/BUILDING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BUILDING.md) gives, and they cover what most of the other toolchains want too.

### Windows

Two toolchains are in play, and which one you use is not always your choice. MSVC builds several of these projects, but psxrecomp's own instructions assume an MSYS2 MinGW64 shell, and gbarecomp must be built with MSYS2 MinGW rather than MSVC because `bios_hle.cpp` uses `__builtin_clz`, which MSVC does not have. In an MSYS2 MinGW64 shell:

```sh
pacman -S --needed mingw-w64-x86_64-toolchain mingw-w64-x86_64-cmake \
                   mingw-w64-x86_64-ninja mingw-w64-x86_64-ccache
```

Two Windows-only traps are documented and worth knowing before you hit them. A devkitPro or MSYS tool earlier on your `PATH` mangles Windows path arguments: [DKC2Recomp](https://github.com/mstan/DKC2Recomp/blob/main/ISSUES.md) records it for `python` and [cdirecomp](https://github.com/mstan/cdirecomp/blob/master/TCP.md) for `cmake`, and in both cases the fix is to invoke the native one explicitly. And MinGW can fail to assemble a very large generated translation unit with `Error: too many sections`, which is a COFF section limit fixed by adding `-Wa,-mbig-obj` or by using binutils 2.40 or newer.

### macOS

Apple Clang from the Xcode command line tools, plus:

```sh
brew install ninja cmake
```

Runners that use SDL2 want `brew install sdl2` as well; nesrecomp's own macOS line is `brew install cmake sdl2 ninja`. Both Apple Silicon and Intel are named as supported by psxrecomp, vbrecomp and segagenesisrecomp. nesrecomp calls its macOS support experimental and newly added, so treat a failure there as a bug worth reporting rather than as your mistake.

### Linux

```sh
sudo apt install build-essential cmake ninja-build
```

Add your distribution's SDL2 development package for the runners, `libsdl2-dev` on Debian and Ubuntu. Linux is named as supported by most of the fleet, with one honest exception: gbarecomp's packaging notes verify Steam Deck and Flatpak and mark ordinary Linux distributions untested.

## Two settings that are not optional

**Always pass an explicit `-DCMAKE_BUILD_TYPE`.** Generated C is enormous, and psxrecomp's build guide warns that it "compiles unusably slowly at `-O0`, so never build it debug-by-accident". The build type also decides whether you get a debug server: on psxrecomp, Release turns the TCP debug server off, while RelWithDebInfo and Debug turn it on.

**Keep `-j` modest.** Generated translation units are multi-megabyte, and an over-subscribed build does not fail politely. psxrecomp's [`docs/TESTING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/TESTING.md) records the symptom exactly: "If `cmake --build` dies with no diagnostic, retry with `-j 2` or `-j 1`; the failure is resource exhaustion, not a code error."

## The game file

> **You provide this.** Every port needs a cartridge dump, disc image or system ROM that you supply from your own media. No repository here ships one, the release archives do not contain one, and the runtime checks the file you give it before it will start. [The game file you supply](/docs/concepts/the-game-file-you-supply) is the canonical statement of that contract: what each console expects, how the file is verified, what a project rejects and why, and the projects' own wording on what they do not distribute. Read it before you go looking for anything.

The short version, so you know what to have ready:

- **Cartridge consoles** want the ROM, matching one exact region and revision recorded in the port's `baserom.md`.
- **PlayStation** wants a `.cue` file with its `.bin` tracks, recorded in the port's `DISC.md`. Do not convert it to a plain ISO.
- **Some consoles want a second file.** Game Boy Advance ports need the console BIOS as well as the ROM, CD-i needs a player system ROM, and a few SNES titles need coprocessor firmware that is not part of the game ROM.

This site does not describe how to obtain any of these files and does not reproduce their hashes. The port's own identity record is the file to open.

## What you do not need

- **A BIOS on the NES.** nesrecomp's packaged CLI needs only your own `.nes` file. Its README is blunt: "No BIOS file is needed."
- **A PlayStation BIOS dump, to get started.** psxrecomp bundles OpenBIOS, which is MIT licensed and redistributable, and its build notes say "OpenBIOS alone is enough to build and boot". A retail dump is optional, and only some titles require one, because a title whose configuration sets `openbios = false` needs a retail image instead.
- **A game file to build and test a framework.** psxrecomp's test suite runs with "no BIOS dump, no disc image, and no generated code". That is what makes the [quickstart](/docs/start/quickstart) possible without any file of yours.
- **The submodules, always.** psxrecomp says "A plain clone is enough to build the recompiler and the runtime", and asks for `--recurse-submodules` only if you want the launcher or netplay. Game repositories are the opposite: their framework is a pinned submodule and a clone without it cannot build.

## Check your setup

Run these four before anything else. Each prints a version; the numbers in the right column are the minimums the repositories state.

```sh
git --version
cmake --version
ninja --version
python3 --version
```

| Command | You should see | Minimum stated |
|---|---|---|
| `git --version` | `git version 2.x.y` | any recent release |
| `cmake --version` | `cmake version 3.20.0` or higher | 3.20, or 3.15 for gbrecompiled |
| `ninja --version` | `1.x.y` | any recent release |
| `python3 --version` | `Python 3.12.0` or similar | 3.9, or 3.12 to build a CLI zip |

On Windows, run these inside the MSYS2 MinGW64 shell you intend to build in, not in PowerShell, because a different `cmake` or `python` on the system `PATH` is exactly the failure mode described above. If all four answer, go to the [quickstart](/docs/start/quickstart).

## Source

- [psxrecomp](https://github.com/mstan/psxrecomp): [`docs/BUILDING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BUILDING.md) for prerequisites, per-platform install lines, CMake options and the build-type rule; [`docs/TESTING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/TESTING.md) for the parallelism warning and the no-BIOS test suite; [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md).
- [nesrecomp](https://github.com/mstan/nesrecomp): [`README.md`](https://github.com/mstan/nesrecomp/blob/master/README.md) for the platform status table and the macOS and Linux lines.
- [snesrecomp](https://github.com/mstan/snesrecomp): [`README.md`](https://github.com/mstan/snesrecomp/blob/main/README.md). [gbarecomp](https://github.com/mstan/gbarecomp): [`README.md`](https://github.com/mstan/gbarecomp/blob/main/README.md) and [`packaging/README.md`](https://github.com/mstan/gbarecomp/blob/main/packaging/README.md).
- [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp): [`README.md`](https://github.com/mstan/segagenesisrecomp/blob/master/README.md). [smsggrecomp](https://github.com/mstan/smsggrecomp): [`README.md`](https://github.com/mstan/smsggrecomp/blob/main/README.md). [vbrecomp](https://github.com/mstan/vbrecomp): [`README.md`](https://github.com/mstan/vbrecomp/blob/master/README.md). [ndsrecomp](https://github.com/mstan/ndsrecomp): [`README.md`](https://github.com/mstan/ndsrecomp/blob/main/README.md). [cdirecomp](https://github.com/mstan/cdirecomp): [`README.md`](https://github.com/mstan/cdirecomp/blob/master/README.md). [gcnlle](https://github.com/mstan/gcnlle): [`README.md`](https://github.com/mstan/gcnlle/blob/master/README.md). [gbrecompiled](https://github.com/mstan/gbrecompiled): [`README.md`](https://github.com/mstan/gbrecompiled/blob/master/README.md) and [`ANDROID.md`](https://github.com/mstan/gbrecompiled/blob/master/ANDROID.md).

## Next

- [Quickstart](/docs/start/quickstart) uses exactly this setup to build a recompiler and recompile a real binary.
- [The game file you supply](/docs/concepts/the-game-file-you-supply) is the full contract for the half of this page that is not software.
- [Build a toolchain](/docs/guides/build-a-toolchain) has the per-console command sequences and the failure table.
- [How a port is made](/docs/start/how-a-port-is-made) for where these tools sit in the pipeline.
