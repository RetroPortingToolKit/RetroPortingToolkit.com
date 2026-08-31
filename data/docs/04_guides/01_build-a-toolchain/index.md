---
title: "Build a toolchain"
summary: "Build the console framework before you touch a game: the recompiler, the runtime, and the quick checks that prove your local setup works."
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
updated: "2026-08-30"
---

A toolchain is the developer side of a port.

It is not the game. It is the set of programs that can read a game file, generate native code, and build the runtime that surrounds it.

Before you try to port a game, prove the toolchain builds by itself.

## Who is this for?

This page is for people who want to build or work on ports.

If you only want to play a finished port, you probably do not need this page. Download the port, run it, and give it the game file it asks for. Some projects may also ask for a BIOS.

Use legally obtained files. This site does not provide games or retail BIOS files.

## What do I install first?

Most projects need the same basics:

| Need | Why it matters |
|---|---|
| Git | Gets the repository and its submodules. |
| CMake | Creates the build files. |
| Ninja or Visual Studio | Runs the build. |
| A C or C++ compiler | Builds the runtime and generated code. |
| Python | Runs helper scripts, tests, and packaging tools. |
| SDL | Provides windows, input, and audio for many runners. |

Exact versions vary by project. If a project has a setup script, use it first.

When something fails, read the first error. The first error is usually the one that matters.

## What am I building?

Usually two things:

1. The recompiler.
2. The runtime.

The recompiler translates the original machine code into host code.

The runtime models the console around that translated code: memory, video, audio, input, timing, storage, and other hardware behavior.

A clean toolchain build only proves the tools compile. It does not prove a game works.

## Why use PlayStation as the example?

psxrecomp is the strongest reference path today.

Other systems differ, but the shape is similar:

1. clone the framework;
2. fetch submodules;
3. build the recompiler;
4. generate any framework support files;
5. build the runtime;
6. run the project's smoke checks.

The [Developer quickstart](/docs/start/quickstart) walks through that reference path.

## What changes by console?

| Console | What to expect |
|---|---|
| PlayStation | The clearest reference flow today. |
| SNES | Strong results, but more CPU-mode and game-specific discovery work. |
| NES | Small target where mappers and banking matter. |
| Game Boy Advance | Alpha/experimental work with ARM and Thumb code. Some projects need BIOS handling. |
| Sega Genesis | Two-CPU scheduling around the 68000 and Z80. |
| Master System and Game Gear | Very early Z80 tech-demo path. |
| Nintendo DS | Alpha-stage work around two ARM CPUs and optimization. |
| Virtual Boy | Focused one-game tech demo. |
| CD-i | BIOS-focused research path. |

Use the platform page for the maturity level. Use the project repository for exact build commands.

## What should I see after a good build?

You should have:

- a recompiler executable;
- a runtime build;
- any generated framework support files the project expects;
- passing smoke checks, if the project has them;
- no game file copied into the framework repository.

That last point matters. Framework repositories should not contain games, BIOS dumps, or generated game code.

## What usually goes wrong?

| Symptom | Likely cause |
|---|---|
| CMake cannot find a generated file. | A generation step was skipped. |
| CMake cannot compile a test program. | The compiler install is broken or not on PATH. |
| The UI build fails. | A submodule was not fetched. |
| The build dies with little output. | Too many compile jobs for available memory. |
| A command works in one shell but not another. | The shells have different tools on PATH. |

For large generated projects, try fewer build jobs before assuming the source is wrong.

## Next

- [Port a game](/docs/guides/port-a-game), once the framework builds.
- [What do I need to get started?](/docs/start/what-you-need), for the short non-developer version.
- [Command line reference](/docs/reference/cli), when you need flags instead of a guide.
