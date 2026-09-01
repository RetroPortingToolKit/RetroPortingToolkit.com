---
title: "Recompile a PlayStation game you own, start to finish"
kicker: "Tutorial"
desc: "Prerequisites, one scaffold command, generate, build, run, and an honest account of everything the first build does not finish."
date: "2026-08-24"
author: "Shokunin"
tags: ["Tutorial", "PlayStation"]
layout: "article"
cover: "./cover-mascot.webp"
---

This is the whole path. A PlayStation disc image you own goes in. A native program for your own machine comes out.

New to the idea? Read [what static recompilation is](/docs/start/what-is-static-recompilation) first. The short version: the game on the disc is a program made of MIPS machine code. A recompiler reads that binary and writes source code that does the same work. The projects here write C. You compile it for your own CPU and link it against a runtime that stands in for the console's hardware. The result is an ordinary program for your computer. It does not contain a copy of the game. It is the game.

## Why this one is fast

Start with PlayStation, because PlayStation has a script. [Street Fighter Alpha 3](/games/street-fighter-alpha-3) is a community port, and the team cites roughly five minutes of game specific work between the disc and a running native build. Its README records how: "Scaffolded with the New Project Layout."

Five minutes is real, and it helps to know what it measures. The long work went into building the PlayStation framework, and that work is done. Every new game inherits it. What is left per game is small, and most of it is answering prompts. Taking that first build from booting to feeling finished is a different job, and that one still takes months.

[`psxrecomp`](https://github.com/mstan/psxrecomp) ships [`tools/new_project_layout/`](https://github.com/mstan/psxrecomp/blob/master/tools/new_project_layout/). One command does all of this:

- creates the repository, with `CMakeLists.txt`, `game.toml`, `codegen_setup.c`, `VERSION`, a README stub, and a `.gitignore` that already excludes disc images and generated code
- adds the framework as a submodule, pinned at a fetched commit, so your project does not drift
- probes your disc, writes the Track 01 digests and a `psxrecomp-toc-v1` fingerprint into `game.toml`, and derives a first pass seed list from the boot executable
- fills in the packaging script, and the GitHub Actions release workflow if you ask for it
- runs the first generate and the first build, if you ask it to

The other toolchains here have no equivalent. On NES, SNES, Game Boy Advance, Genesis, Master System, Virtual Boy or DS you copy the shape of a working port by hand.

## Before you start

You need `git`, CMake 3.20 or newer, Ninja, a C and C++ toolchain, and Python 3. The framework's [`BUILDING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BUILDING.md) lists the packages per platform:

```sh
# Windows, in an MSYS2 MinGW64 shell:
pacman -S --needed mingw-w64-x86_64-toolchain mingw-w64-x86_64-cmake \
                   mingw-w64-x86_64-ninja mingw-w64-x86_64-ccache

# macOS:
brew install ninja cmake

# Linux (Debian/Ubuntu):
sudo apt install build-essential cmake ninja-build
```

On Windows, prefer MSYS2 MinGW over MSVC: that is the configuration release builds use.

You do not need a BIOS dump. The framework bundles OpenBIOS, which is MIT licensed, and builds against it by default. If a game turns out to need a retail BIOS, pass `--bios` with your own `SCPH1001.BIN` later. You learn that when the game misbehaves, not in advance.

> **You provide this.** You supply the disc image, from a copy you own: a `.cue` file with its `.bin` tracks beside it. Nothing here distributes game data or helps you find any. Use a full multi track dump. See [the game file you supply](/docs/concepts/the-game-file-you-supply).

## 1. Get the framework

```sh
git clone https://github.com/mstan/psxrecomp.git
cd psxrecomp
git submodule update --init --recursive
```

**You should see** a `psxrecomp` directory containing `recompiler/`, `runtime/`, `tools/`, `docs/` and `psxrecomp_cli.py`. If `tools/new_project_layout/setup_project.sh` is missing, your checkout is too old and the rest of this will not apply.

## 2. Run the scaffold

The interactive form, from [`docs/GAME_PROJECT_SETUP.md`](https://github.com/mstan/psxrecomp/blob/master/docs/GAME_PROJECT_SETUP.md):

```bash
sh tools/new_project_layout/setup_project.sh \
  --disc /path/to/legal/game.cue \
  --dir ~/src
```

`--disc` is the one path the script never prompts for. Leave it out and it exits and tells you. `--dir` is the parent directory the new repository is created in, and it defaults to the current directory.

The script asks for everything else, in this order, with these defaults:

| Prompt | Default |
|---|---|
| `Project name (e.g. MyGameRecomp)` | none, required |
| `Zip / CI artifact prefix` | an acronym derived from the name |
| `Short game description (optional)` | empty |
| `Publisher (optional)` / `Release year (optional)` | empty |
| `Region` | `USA` |
| `Include recomp-ui launcher submodule?` | `Y` |
| `Enable first-run setup wizard + Generate & rebuild?` | `Y` |
| `Add GitHub Actions release workflow (Linux/Windows/macOS)?` | `Y` |
| `Fetch libretro boxart now? (needs network)` | `Y` |
| `Run Generate now (emitters + OpenBIOS + game C)?` | `N` |
| `Configure & build psx-runtime after Generate?` | `Y` |
| `Create GitHub repo with gh (needs auth)?` | `N` |

One answer matters. Answer `Y` to Generate and the script translates the game and builds it before it finishes. That is the difference between a tree of stubs and something you can run tonight.

**You should see** the script print its phases: `== External disc (no full copy) ==`, then `== Probing disc (identity + seeds + TOC fp) ==`, then `== Sync symbols header ==`, then a `== Done ==` block listing next steps and the number of seeds the probe found. If the probe failed it says so, and leaves a template `game.toml` for you to fill in by hand.

## 3. Read what the probe found

Change into the new repository and open `game.toml`. The rest of the toolchain reads this file, and the probe has already filled most of it in. Here is Street Fighter Alpha 3's, written by exactly this flow:

```toml title="game.toml"
[game]
name = "Street Fighter Alpha 3"
id = "SLUS-00821"
exe = "disc/SLUS_008.21"
disc = "disc/Street Fighter Alpha 3 (USA).cue"
load_address = "0x80113B00"
entry_pc = "0x80113B08"
text_size = "0x000A5800"
stack_base = "0x801FFFF0"

# Digests are for data Track 01 (first BINARY FILE / TRACK 01).
[prepare_disc]
out_dir = "disc"
bin_name = "Street Fighter Alpha 3 (USA) (Track 1).bin"
cue_name = "Street Fighter Alpha 3 (USA).cue"
boot_exe = "SLUS_008.21"
```

All of that comes off the disc: the serial, the boot executable, the load address, the entry point and the digests. The runtime uses the digests to check that the disc it is handed at run time is the one the build was made for.

Now open `seeds/ghidra_funcs.txt`. These are the addresses the recompiler starts from: the entry point, plus every direct call target inside the boot executable's text. In the Street Fighter Alpha 3 repository that file has 1168 lines. It is a first pass, not a complete map, and growing it is most of the work described below.

## 4. Generate

If you answered `N` to the Generate prompt, run the loop by hand. From `GAME_PROJECT_SETUP.md`:

```bash
./psxrecomp/tools/ci/build_emitters.sh
```

That builds `psxrecomp-game` and `psxrecomp-bios`. You do it once per machine, and again whenever the framework changes.

```bash
python3 psxrecomp/psxrecomp_cli.py generate \
  --config game.toml --project-root . --disc disc/game.cue
```

**You should see** a `generated/` directory appear, holding the OpenBIOS backend and the game's translated C, named after the boot executable. `generated/` is gitignored and never committed. It is build output, rebuilt from the disc every time.

## 5. Build

```bash
cmake -S . -B build-release -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build-release --target psx-runtime -j"$(nproc)"
```

**You should see** a binary under `build-release/`. Its name comes from the window title, not the folder name, because every title uses the same CMake target. A project named `MyGameRecomp` gives a binary called `MyGame_Recompiled`. Run `ls build-release` to see what you got.

## 6. Run it

```bash
./build-release/MyGame_Recompiled --game game.toml
```

Use the binary name you actually got. `--game` points the runtime at the config, which holds the disc path, the memory card directory, the window title and the debug port. `--disc` overrides the disc path.

**You should see** the game boot. Or not. That is normal the first time, and it is what the rest of this article is about.

## A build is not a finished port

The framework's own document lists what is left:

```markdown title="psxrecomp/docs/GAME_PROJECT_SETUP.md"
### After scaffold (still not automatic)

If you answered Y to boxart + Generate (+ optional build), you get a local
playable tree (OpenBIOS / optional retail BIOS C). You still must:

1. **Boot / soak** — fix missing seeds, overlays, FMV/runtime quirks in `game.toml`
2. **Polish** — more symbols in `symbols.toml`, boxart name mismatches
3. **Ship** — scaffold already creates the repo and pushes once at the end when
   you opt in; otherwise push manually. Enable Actions, tag `vX.Y.Z` (CI ships
   setup-host **without** `generated/` — end users run Generate locally / via wizard)
```

**Boot and soak** is where the time goes. The recompiler finds the code it can prove is code. Code reached only through a jump the game computes while it runs, or through an overlay loaded from the disc, can be missing from the translation. You do not see that at startup. You see it an hour in, the first time the game calls something that was never translated.

The runtime carries a small interpreter as a fallback. psxrecomp's README states the bound:

> **The worst case is always performance, never correctness** — anything not yet
> native simply runs interpreted, correctly.

That covers code the game writes into RAM while it runs: the interpreter picks it up and play continues, so a miss there costs speed, not correctness. A function the static pass never found is handled the other way on purpose. The runtime does not interpret around it, because that would hide the gap. It records the address and stops.

Either way the fix is the same. You play, you find one, you add its address as a seed, you regenerate, you build, and you play again. That loop is the port.

**Polish** means naming functions in `symbols.toml`. Run `python3 tools/sync_symbols.py` and each name becomes a `PSX_FN_*` entry in `psx_symbols.h`.

**Ship** is the setup host model. The release zip holds the sources, the framework and the setup host. It holds no `generated/`, no retail BIOS and no disc data. Each player runs Generate once, on their own machine, against their own copy of the game. That is why ports here ship as source, not as a finished executable.

## When it goes wrong

**`Cannot find source file: .../generated/OpenBIOS_full.c`, followed by `No SOURCES given to target: psx-runtime`.** The BIOS C was never generated. CMake has no fallback here by design: it fails at configure time. Run generate before you configure, and run it again whenever the recompiler's emitter changes. A stale `generated/` gives you a fingerprint mismatch warning instead.

**The game stops and reports a dispatch miss.** It jumped to an address with no generated function behind it. The runtime is loud about this on purpose. Read the ring of misses with the `unknown_dispatch_log` debug command, and watch the count live with `ping`, which returns `dispatch_miss_total` on every heartbeat. Add the addresses to your seeds, regenerate, rebuild, run again. Debug nothing else first: the fleet's rule is that a game with dispatch misses is fundamentally broken.

**The compiler exits with no message, or a bare code -1.** That is the machine running out of memory, not an error in the code. A parallel build of this tree can crash the compiler when RAM is tight. Retry with `-j 2` or `-j 1` instead of `-j"$(nproc)"`.

**MinGW reports `Error: too many sections`.** Windows COFF object files have a limit of 32,768 sections, and the generated game C can go past it. Add `-Wa,-mbig-obj` to that file's compile options. Binutils 2.40 and newer usually handle these files without the flag.

**`ninja: error: loading 'build.ninja': GetLastError() = 2`, or CMake's `Error: could not load cache`.** Both mean you built a directory that never configured successfully. CMake writes the cache before it writes the build file, so a failed configure leaves one without the other, and the build then fails on the wrong error. Fix the configure failure and run the same `cmake -S ... -B ...` again. If it still fails, delete the build directory.

## Two rules that are not negotiable

**Never edit generated code.** Everything under `generated/` is overwritten on the next run. Fix the seed list, the config, or the tool instead. That is what keeps the tooling general, rather than collecting one game's hacks.

**Never commit disc images, ROMs, BIOS dumps, or anything derived from them.** The scaffold writes a `.gitignore` that already covers `disc/`, `generated/` and the build tree. Leave it alone.

## Where to go next

- [Port a game](/docs/guides/port-a-game), the guide for the work after the first build
- [The PlayStation toolchain](/docs/platforms/playstation), for what `psxrecomp` is
- [Let your agent do the recompilation](/blog/tutorial-let-your-agent-do-the-recomp), the same job driven by an AI coding agent
- [Is this emulation?](/docs/start/is-this-emulation), for the short answer and the long one
- [`docs/GAME_PROJECT_SETUP.md`](https://github.com/mstan/psxrecomp/blob/master/docs/GAME_PROJECT_SETUP.md), the authority for this page

`psxrecomp` is licensed under PolyForm Noncommercial 1.0.0, which is not an open source licence. Read it before you plan anything commercial.
