---
title: "Getting started"
summary: "For building ports, not just playing them. Two things before you start: a normal set of programming tools, the five nearly every project here uses, and your own copy of the game, which no repository ships."
pageType: "guide"
tags: ["Prerequisites", "Build", "Game files"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
updated: "2026-08-26"
---

**Just playing?** You do not need this page. Every finished port is a normal program: go to the [game's page](/games), download its release, and supply your own game file. That is the whole setup.

**Building?** Keep reading. You need two things. First, a normal set of programming tools, the same ones people use to build any C or C++ program. Second, your own copy of the game, if you want to play what you build. No repository here ships a game.

## The five tools

Nearly every project here wants the same five things, and nothing exotic.

| Tool | Version | What it is for |
|---|---|---|
| `git` | any recent release | Downloading the code. Some projects pull in other projects, so clone with `--recurse-submodules` |
| A C and C++ compiler | recent enough for C11 and C++20 | Turning source code into a program |
| CMake | 3.20 or newer | Setting the build up |
| Ninja | any recent release | Running the build |
| Python 3 | 3.9 or newer | Driving the helper scripts around the build |

One more, if you want to see a game and not only build one: your system's SDL development package. Your console's [platform page](/docs/platforms) and its repository say exactly what to install.

Every console needs a few more steps on top of that. [Build a toolchain](/docs/guides/build-a-toolchain) has the exact commands for each one, and each [platform page](/docs/platforms) says what its project supports. Read your console's page before you spend an evening on it: some of these projects say plainly that a given computer is untested.

## Your computer

### Windows

Most of these projects expect you to work inside an MSYS2 MinGW64 shell rather than in PowerShell. Install it, open that shell, and run:

```sh
pacman -S --needed mingw-w64-x86_64-toolchain mingw-w64-x86_64-cmake \
                   mingw-w64-x86_64-ninja mingw-w64-x86_64-ccache
```

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

## Two build settings to know about

The build type and the parallel job count both matter, and each project has its own words on them. [Build a toolchain](/docs/guides/build-a-toolchain) quotes them project by project, with the exact symptoms and fixes.

## The game

> **You provide this.** Every port needs a game file that you supply from your own media, and the port checks that file before it will start. No repository here ships one and no release archive contains one. [The game file you supply](/docs/concepts/the-game-file-you-supply) is the full contract: what each console expects, how the file is checked, and what a project refuses.

Two things to know before you go looking. The port wants one exact version of the game, so a file that is nearly right will be refused rather than half working. And a few consoles want a second file as well as the game itself, because part of the machine's own software has to come from you too. Your console's [platform page](/docs/platforms) says which.

This site does not describe how to obtain any of those files.

## What you do not need

- **A game file, to try any of this.** The [quickstart](/docs/start/quickstart) recompiles a PlayStation BIOS image that ships with psxrecomp, so you can run the whole pipeline end to end before you own anything. To be clear about what that gets you: a recompiled BIOS, not a game.
- **Any prior knowledge of the console.** You do not need to know how the hardware worked to build one of these projects and run it.
- **A separate toolchain download for each game.** A game project pulls its framework in as a linked copy at a pinned commit. Clone with `--recurse-submodules` and the build has everything it needs.

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

On Windows, run them inside the MSYS2 MinGW64 shell you intend to build in, not in PowerShell. If all four answer, go to the [quickstart](/docs/start/quickstart).

## Source

- [psxrecomp](https://github.com/mstan/psxrecomp): [`docs/BUILDING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BUILDING.md) for the prerequisites and the per-platform install lines; [`docs/TESTING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/TESTING.md) for the test suite that needs no game file.
- [nesrecomp](https://github.com/mstan/nesrecomp): [`README.md`](https://github.com/mstan/nesrecomp/blob/master/README.md) for the macOS install line and for a project stating which computers it has and has not been tested on.

## Next

- [Quickstart](/docs/start/quickstart) uses exactly this setup to build a recompiler and recompile a real binary.
- [The game file you supply](/docs/concepts/the-game-file-you-supply) is the full contract for the half of this page that is not software.
- [Build a toolchain](/docs/guides/build-a-toolchain) has the per console commands and the table of things that go wrong.
- [How a port is made](/docs/start/how-a-port-is-made) for where these tools sit in the whole process.
