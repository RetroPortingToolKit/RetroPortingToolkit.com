---
title: "Build a toolchain"
summary: "Build the programs a port developer needs before touching a game: the recompiler, the runtime, and the quick checks that prove the setup works."
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

A toolchain is the set of programs used to build a port.

It is not the game. It does not include a game file. It gives you the recompiler and the runtime for one console.

The recompiler reads the game's compiled machine code and emits host code. The runtime is the library that stands in for the console hardware. Building both is the first developer check: before you try a game, prove your tools can build.

## Who is this for?

This page is for people who want to build or work on ports.

If you only want to play a finished port, you do not need this page. Download the port from that project's release page and give it the game file, and possibly BIOS file, it asks for.

Use legally obtained files. This site does not provide games or retail BIOS files. Some projects can use legal open-source BIOS replacements where they are appropriate.

## What should I install first?

Most projects need the same basics:

| Need | What it is for |
|---|---|
| Git | Cloning the project and its submodules. |
| CMake | Creating the build files. |
| Ninja or Visual Studio | Running the build. |
| A C or C++ compiler | Compiling the recompiler, runtime, and generated code. |
| Python | Packaging tools, helper scripts, and test scripts. |
| SDL | Window, input, and audio for many runners. |

Exact versions vary by project. If a repository has a setup script, use it first. If it fails, read the first error. The first error is usually the real one.

## Use PlayStation as the reference shape

psxrecomp is the most mature reference for this ecosystem. Other systems differ, but the shape is similar:

1. Build the recompiler.
2. Generate the runtime support files the project needs.
3. Build the runtime.
4. Run tests or a smoke check before touching a game.

On psxrecomp, the developer quick path looks like this:

```sh
git clone https://github.com/mstan/psxrecomp.git
cd psxrecomp

cmake -S recompiler -B recompiler/build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build recompiler/build

bash tools/regen_bios.sh --config bios/OpenBIOS.toml

cmake -S runtime -B runtime/build -G Ninja -DCMAKE_BUILD_TYPE=Release -DPSX_RECOMP_UI=OFF
cmake --build runtime/build --target psx-runtime
```

OpenBIOS is used here because it proves the path works without asking for a retail BIOS dump. A project may also support a retail BIOS backend, but you must supply that BIOS legally yourself.

## What should I see?

After a clean build, you should have:

- a recompiler executable in the recompiler build directory;
- a runtime binary in the runtime build directory;
- passing tests, if the project has tests;
- no game file copied into the framework repository.

For psxrecomp, run:

```sh
cd recompiler/build
ctest --output-on-failure
```

This only checks the toolchain. It does not prove any one game is correct.

## What changes by console?

| Console | What to expect |
|---|---|
| PlayStation | The best reference flow. Build the emitters, generate BIOS support, then build the runtime. |
| NES | Small C recompiler, CMake build, SDL runner in game projects. |
| SNES | Rust recompiler plus a C or C++ runtime path in game projects. |
| Game Boy Advance | CMake build with tests. Some projects need BIOS handling. |
| Genesis, Master System, Game Gear | Shared CPU cores through submodules. Clone recursively. |
| Nintendo DS | Early and experimental. Expect more setup and more project-specific work. |
| Virtual Boy | Smallest smoke-test surface. Useful for proving a runtime can start with no game linked. |
| CD-i | More advanced. BIOS and oracle setup matter early. |

That table is a map, not a support promise. Use the project you are building as the authority for its own command line.

## Two build rules

Always set a release-style build type unless you are debugging.

Generated code can be huge. Debug builds can compile very slowly, and sometimes fail because they use too much memory.

Keep `-j` modest. If a build dies with no useful message, try:

```sh
cmake --build build -j 2
```

or:

```sh
cmake --build build -j 1
```

That is often memory pressure, not a bad source file.

## Common failures

| Symptom | Likely cause | What to do |
|---|---|---|
| CMake cannot find a generated BIOS C file | The runtime was configured before the generated support file existed. | Run the generation step first, then configure again. |
| CMake cannot compile a simple test program | The compiler is missing or its runtime DLLs are not on `PATH`. | Fix the compiler install before changing the project. |
| The UI build fails because a submodule is missing | The repo was cloned without recursive submodules. | Run `git submodule update --init --recursive`. |
| The build dies with little or no output | Too many compile jobs for available memory. | Build with `-j 2` or `-j 1`. |
| A command works in one shell but not another | The shell has different compilers or CMake on `PATH`. | Use one shell for the whole build. |

## Next

- [Port a game](/docs/guides/port-a-game), once the framework builds.
- [What do I need to get started?](/docs/start/what-you-need), for the short non-developer version.
- [Command line reference](/docs/reference/cli), when you need flags instead of a guide.
