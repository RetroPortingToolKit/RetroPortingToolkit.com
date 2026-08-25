---
title: "What you need"
summary: "Two things before you start: a normal set of programming tools, which is the same five for every project here, and your own copy of the game, which no repository ships."
pageType: "guide"
tags: ["Prerequisites", "Build", "Game files"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
updated: "2026-08-24"
---

Two things. First, a normal set of programming tools, the same ones people use to build any C or C++ program. Second, if you want to play something rather than just build it, your own copy of the game. No repository here ships a game. This page is the software half in detail, and the short version of the game half with a link to the page that states it properly.

## The five tools

Nearly every project here wants the same five things, and nothing exotic.

| Tool | Version | What it is for |
|---|---|---|
| `git` | any recent release | Downloading the code. Some projects pull in other projects, so clone with `--recurse-submodules` |
| A C and C++ compiler | recent enough for C11 and C++20 | Turning source code into a program |
| CMake | 3.20 or newer | Setting the build up |
| Ninja | any recent release | Running the build |
| Python 3 | 3.9 or newer | Driving the helper scripts around the build |

One more, if you want to see a game and not only build one: these projects draw their picture with SDL, so install your system's SDL development package too. Some want SDL2 and some want SDL3.

Every console here needs a slightly different set of steps on top of that, and there is no point learning them all now. [Build a toolchain](/docs/guides/build-a-toolchain) has the exact commands for each one, and each [platform page](/docs/platforms) says what its project supports. Read your console's page before you spend an evening on it: some of these projects say plainly that a given computer is untested.

## Your computer

### Windows

Most of these projects expect you to work inside an MSYS2 MinGW64 shell rather than in PowerShell. Install it, open that shell, and run:

```sh
pacman -S --needed mingw-w64-x86_64-toolchain mingw-w64-x86_64-cmake \
                   mingw-w64-x86_64-ninja mingw-w64-x86_64-ccache
```

Two Windows problems come up often enough to warn about. If you have other development tools installed, Windows may find the wrong `cmake` or the wrong `python` first, and the build fails in a confusing way; the fix is to run the one you meant, by its full path. And a very large generated file can defeat the Windows assembler with an error about too many sections, which needs a newer toolchain or one extra build flag. [Errors and exit codes](/docs/reference/errors-and-exit-codes) has the exact messages and the exact fixes.

### macOS

Install Apple's command line tools for the compiler, then:

```sh
brew install cmake ninja sdl2
```

### Linux

```sh
sudo apt install build-essential cmake ninja-build libsdl2-dev
```

Adjust the package names for your distribution.

## Two settings that are not optional

**Always say which kind of build you want.** Pass `-DCMAKE_BUILD_TYPE=Release` to CMake. If you leave it out, the compiler skips its optimisations, and the generated code is so large that the build takes an unreasonable amount of time.

**Do not ask for too many parallel jobs.** The generated files are huge, and each one takes a lot of memory to compile. Too many at once and your machine runs out, which does not produce a polite error. psxrecomp's [`docs/TESTING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/TESTING.md) records the symptom:

> If `cmake --build` dies with no diagnostic, retry with `-j 2` or `-j 1`; the failure is resource exhaustion, not a code error.

## The game

> **You provide this.** Every port needs a game file that you supply from your own media, and the port checks that file before it will start. No repository here ships one and no release archive contains one. [The game file you supply](/docs/concepts/the-game-file-you-supply) is the full contract: what each console expects, how the file is checked, and what a project refuses.

Two things to know before you go looking. The port wants one exact version of the game, so a file that is nearly right will be refused rather than half working. And a few consoles want a second file as well as the game itself, because part of the machine's own software has to come from you too. Your console's [platform page](/docs/platforms) says which.

This site does not describe how to obtain any of those files.

## What you do not need

- **A game file, to try any of this.** You can build a toolchain and recompile a real binary without one. That is what the [quickstart](/docs/start/quickstart) does.
- **Any prior knowledge of the console.** You do not need to know how the hardware worked to build one of these projects and run it.
- **All the extra downloads, every time.** psxrecomp says a plain clone is enough to build the recompiler and the runtime on their own. A game project is the opposite: it pulls its toolchain in as a linked copy, and a clone without that copy cannot build.

## Check your setup

Run these four. Each one prints a version.

```sh
git --version
cmake --version
ninja --version
python3 --version
```

| Command | You should see | Minimum |
|---|---|---|
| `git --version` | `git version 2.x.y` | any recent release |
| `cmake --version` | `cmake version 3.20.0` or higher | 3.20 |
| `ninja --version` | `1.x.y` | any recent release |
| `python3 --version` | `Python 3.12.0` or similar | 3.9 |

On Windows, run them inside the MSYS2 MinGW64 shell you intend to build in, not in PowerShell. That is the same trap described above, and this is where it is cheapest to catch. If all four answer, go to the [quickstart](/docs/start/quickstart).

## Source

- [psxrecomp](https://github.com/mstan/psxrecomp): [`docs/BUILDING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BUILDING.md) for the prerequisites, the per-platform install lines and the build type rule; [`docs/TESTING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/TESTING.md) for the parallel build warning and for the test suite that needs no game file.
- [nesrecomp](https://github.com/mstan/nesrecomp): [`README.md`](https://github.com/mstan/nesrecomp/blob/master/README.md) for the macOS install line and for a project stating which computers it has and has not been tested on.

## Next

- [Quickstart](/docs/start/quickstart) uses exactly this setup to build a recompiler and recompile a real binary.
- [The game file you supply](/docs/concepts/the-game-file-you-supply) is the full contract for the half of this page that is not software.
- [Build a toolchain](/docs/guides/build-a-toolchain) has the per console commands and the table of things that go wrong.
- [How a port is made](/docs/start/how-a-port-is-made) for where these tools sit in the whole process.
