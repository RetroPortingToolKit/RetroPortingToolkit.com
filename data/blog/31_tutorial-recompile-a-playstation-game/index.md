---
title: "Recompile a PlayStation game you own, start to finish"
kicker: "Tutorial"
desc: "Prerequisites, one scaffold command, generate, build, run, and an honest account of everything the first build does not finish."
date: "2026-08-24"
author: "Matthew Stanley"
tags: ["Tutorial", "PlayStation"]
layout: "article"
---

This is the whole path, from a PlayStation disc image you own to a native build running on your own machine. It is written for a person at a terminal, and every command below is copied from the framework's own documentation or from the script that executes it. Nothing is paraphrased, because a command that is almost right is worse than no command at all.

Read [what static recompilation is](/docs/start/what-is-static-recompilation) first if the idea is new to you. The short version: the original program is translated from MIPS machine code into C ahead of time, compiled for your CPU, and linked against a runtime that stands in for the console's hardware.

## Why this one is fast

[Street Fighter Alpha 3](/games/street-fighter-alpha-3) is the reason to start here. It is a community port, and the team cites roughly five minutes of game specific work between the disc and a running native build. Its README records how: "Scaffolded with the New Project Layout."

That is not luck, and it is not a claim about how easy porting is in general. It is a claim about one script. [`psxrecomp`](https://github.com/mstan/psxrecomp) ships [`tools/new_project_layout/`](https://github.com/mstan/psxrecomp/blob/master/tools/new_project_layout/), and in a single invocation that tooling:

- creates the repository, with `CMakeLists.txt`, `game.toml`, `codegen_setup.c`, a `.gitignore` that already excludes disc images and generated code, `VERSION` and a README stub
- adds the framework as a root level submodule and detaches it at a fetched commit, so your project is pinned rather than floating
- probes your disc for its identity, writes the Track 01 digests and a `psxrecomp-toc-v1` fingerprint into `game.toml`, and derives a first pass seed list from the boot executable
- fills in the packaging script, and the GitHub Actions release workflow if you ask for it
- optionally runs the first generate and the first build for you

The other eight toolchains in this ecosystem have no equivalent. On NES, SNES, Game Boy Advance, Game Boy, Genesis, Master System, Virtual Boy or DS you copy the shape of a working port by hand. Do not read this article as a promise about those.

## Before you start

You need `git`, CMake 3.20 or newer, Ninja, a C and C++ toolchain, and Python 3. The framework's [`BUILDING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BUILDING.md) lists the per platform packages:

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

You do not need a BIOS dump. The framework bundles the MIT licensed OpenBIOS and builds against it by default. A retail `SCPH1001.BIN` can be supplied later with `--bios` if a title turns out to need one, which you discover when the game misbehaves rather than in advance.

> **You provide this.** You supply the disc image, from a copy you own, as a `.cue` with its `.bin` tracks beside it. Nothing here distributes game data and nothing here will help you obtain any. Prefer a full multi track Redump style cue: a single track dump will warn, and will fail the online multi track gates. See [the game file you supply](/docs/concepts/the-game-file-you-supply).

## 1. Get the framework

```sh
git clone https://github.com/mstan/psxrecomp.git
cd psxrecomp
git submodule update --init --recursive
```

**You should see** a `psxrecomp` directory containing `recompiler/`, `runtime/`, `tools/`, `docs/` and `psxrecomp_cli.py`. If `tools/new_project_layout/setup_project.sh` is not there, you are on an older checkout and the rest of this will not apply.

## 2. Run the scaffold

The interactive form, from [`docs/GAME_PROJECT_SETUP.md`](https://github.com/mstan/psxrecomp/blob/master/docs/GAME_PROJECT_SETUP.md):

```bash
sh tools/new_project_layout/setup_project.sh \
  --disc /path/to/legal/game.cue \
  --dir ~/src
```

`--disc` is the one path the script will not prompt for. Missing it exits with a nag, deliberately, because tab completing a path is something your shell does better than a prompt. `--dir` is the parent directory the new repository is created in, and it defaults to the current directory.

Everything else is asked, in this order, with these defaults:

| Prompt | Default |
|---|---|
| `Project name (e.g. MyGameRecomp)` | none, required |
| `Max players (1-8)` | `2` |
| `Zip / CI artifact prefix` | an acronym derived from the name |
| `Short game description (optional)` | empty |
| `Publisher (optional)` / `Release year (optional)` | empty |
| `Region` | `USA` |
| `Include recomp-ui launcher submodule?` | `Y` |
| `Enable first-run setup wizard + Generate & rebuild?` | `Y` |
| `Enable netplay UI (needs nested recomp-net)?` | `N` |
| `Add GitHub Actions release workflow (Linux/Windows/macOS)?` | `Y` |
| `Fetch libretro boxart now? (needs network)` | `Y` |
| `Run Generate now (emitters + OpenBIOS + game C)?` | `N` |
| `Configure & build psx-runtime after Generate?` | `Y` |
| `Create GitHub repo with gh (needs auth)?` | `N` |

Two of those are worth thinking about before you press return. Answer `1` to the players question for a single player game and the netplay prompts are skipped entirely. Answer `Y` to Generate and the script will build the emitters and translate the game before it finishes, which is the difference between a tree of stubs and something you can run tonight.

**You should see** the script print its phases as it goes: `== External disc (no full copy) ==`, then `== Probing disc (identity + seeds + TOC fp) ==`, then `== Sync symbols header ==`, and finally a `== Done ==` block listing next steps and the number of seeds the probe found. If the probe failed it says so and leaves a template `game.toml` behind for you to fill in by hand.

## 3. Read what the probe found

Change into the new repository and open `game.toml`. This is the file the rest of the toolchain reads, and the probe has already filled most of it in. Street Fighter Alpha 3's, written by exactly this flow:

```toml title="game.toml"
[game]
name = "Street Fighter Alpha 3"
id = "SLUS-00821"
players = 2
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

The serial, the boot executable, the load address and the entry point all come off the disc. So do the digests, which the runtime uses to check that the disc it is handed at run time is the one the build was made for.

Then open `seeds/ghidra_funcs.txt`. These are the addresses the recompiler starts from: the entry point plus every direct call target inside the boot executable's text. That file has 1168 lines in the Street Fighter Alpha 3 repository. It is a first pass, not a complete map, and growing it is most of the work described at the end of this article.

## 4. Generate

If you answered `N` to the Generate prompt, run the local development loop by hand. From `GAME_PROJECT_SETUP.md`:

```bash
./psxrecomp/tools/ci/build_emitters.sh
```

That builds `psxrecomp-game` and `psxrecomp-bios`. It is once per machine, and again whenever the framework changes.

```bash
python3 psxrecomp/psxrecomp_cli.py generate \
  --config game.toml --project-root . --disc disc/game.cue
```

**You should see** a `generated/` directory appear, containing the OpenBIOS backend and the game's translated C, named after the boot executable. `generated/` is gitignored and never committed: it is build output, and it is rebuilt from the disc every time.

## 5. Build

```bash
cmake -S . -B build-release -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build-release --target psx-runtime -j"$(nproc)"
```

**You should see** a binary under `build-release/`. Its name comes from the window title rather than the folder name, because every title instantiates the same CMake target: a project named `MyGameRecomp` produces a window title of `MyGame Recompiled` and a binary called `MyGame_Recompiled`. `ls build-release` will show you which.

## 6. Run it

```bash
./build-release/MyGame_Recompiled --game game.toml
```

Substitute the binary name you actually got. `--game` points the runtime at the config, which is the single source of truth for the disc path, the memory card directory, the window title and the debug port. `--disc` overrides the disc path from the config if you need it to.

**You should see** the game boot. Or not, which is the normal case the first time and the subject of the rest of this article.

## A build is not a finished port

Most tutorials stop at the previous section. That is where the misunderstanding starts, so here is the framework's own document on the subject, quoted in full:

```markdown title="psxrecomp/docs/GAME_PROJECT_SETUP.md"
### After scaffold (still not automatic)

If you answered Y to boxart + Generate (+ optional build), you get a local
playable tree (OpenBIOS / optional retail BIOS C). You still must:

1. **Boot / soak** — fix missing seeds, overlays, FMV/runtime quirks in `game.toml`
2. **Netplay QA** — LAN then lobby; confirm digests + TOC fp; pin `VERSION`
3. **Polish** — more symbols in `symbols.toml`, boxart name mismatches
4. **Ship** — scaffold already creates the repo and pushes once at the end when
   you opt in; otherwise push manually. Enable Actions, tag `vX.Y.Z` (CI ships
   setup-host **without** `generated/` — end users run Generate locally / via wizard)
```

**Boot and soak** is where the time goes, and it is the step people underestimate by an order of magnitude. Static analysis finds the code it can prove is code. Anything reached only through a computed jump, an overlay loaded at run time, or a pointer the analysis could not resolve is simply absent from the translation, and its absence does not show up at startup. It shows up as a crash or a hang an hour into the game, at whichever point the program first tries to call something that was never translated. You play, you find one, you add its address as a seed, you regenerate, you build, you play again. That loop is the port.

**Netplay QA** applies only if the title has multiplayer and you enabled it. LAN first, then the lobby, confirming that the disc digests and the TOC fingerprint gate correctly so a partial dump cannot go online against a full one.

**Polish** means labelling what you have learned. `symbols.toml` is a progressive map: you name a function, run `python3 tools/sync_symbols.py`, and it becomes a `PSX_FN_*` entry in `psx_symbols.h` that the rest of your work can refer to by name.

**Ship** is the setup host model. The release zip contains the sources, the framework and the setup host, and deliberately does not contain `generated/`, a retail BIOS, or any disc data. Each player runs Generate once, locally, against their own copy of the game. That is why ports in this ecosystem ship as source rather than as a finished executable.

[Port a game](/docs/guides/port-a-game) is the guide for everything after your first build.

## When it goes wrong

**`Cannot find source file: .../generated/OpenBIOS_full.c`, followed by `No SOURCES given to target: psx-runtime`.** The BIOS C was never generated. CMake does not fall back to anything here, by design: it fails at configure time. Run the generate step before configuring, and re-run it whenever the recompiler's emitter changes, because a stale `generated/` raises a fingerprint mismatch warning instead.

**`dispatch_misses.log` next to the executable is not empty.** This is the one that looks like noise and is not. Each line is code the game reached that the recompiler never translated. The fleet's rule is blunt about it: a dispatch miss is a silent, game breaking bug, and a game with dispatch misses is fundamentally broken. Do not debug anything else while that file has contents. Add the addresses to your seeds, regenerate, rebuild, run again, and repeat until it is empty. The debug server also reports `dispatch_miss_total` on every ping, so you can watch it without reading the file.

**The compiler exits with no diagnostic at all, or a bare code -1.** That is resource exhaustion, not a code error. Parallel builds of this tree can crash the compiler on a memory constrained machine. Retry with `-j 2` or `-j 1` instead of `-j"$(nproc)"`.

**MinGW reports `Error: too many sections`.** Windows COFF objects have a 32,768 section limit, and the generated game C can exceed it. Add `-Wa,-mbig-obj` to that translation unit's compile options. Binutils 2.40 and newer generally handle these files without the flag.

**`ninja: error: loading 'build.ninja': GetLastError() = 2`, or CMake's `Error: could not load cache`.** Both mean you built a directory that was never successfully configured. The cache file is written before the generate step, so a failed configure leaves a cache and no build file, and the build then fails on the wrong error. Fix the original configure failure and re-run the same `cmake -S ... -B ...`; if it keeps failing, delete the build directory so a stale cache cannot poison the retry.

## Two rules that are not negotiable

**Never edit generated code.** Anything under `generated/` is overwritten on the next run. Fix the seed list, the config, or the tool. This is the rule the framework has held from the beginning, and it is what keeps the tooling general instead of accumulating one game's hacks.

**Never commit disc images, ROMs, BIOS dumps, or anything derived from them.** The scaffold writes a `.gitignore` that already covers `disc/`, `generated/` and the build tree. Leave it alone.

## Where to go next

- [Port a game](/docs/guides/port-a-game), the full guide for the work after the first build
- [The PlayStation toolchain](/docs/platforms/playstation), for what `psxrecomp` actually is
- [Let your agent do the recompilation](/blog/tutorial-let-your-agent-do-the-recomp), the same job driven by an AI coding agent
- [Is this emulation?](/docs/start/is-this-emulation), if you want the honest answer rather than the marketing one
- [`docs/GAME_PROJECT_SETUP.md`](https://github.com/mstan/psxrecomp/blob/master/docs/GAME_PROJECT_SETUP.md), the authority for everything on this page

`psxrecomp` is licensed under PolyForm Noncommercial 1.0.0, which is not an open source licence. Read it before you plan anything commercial.
