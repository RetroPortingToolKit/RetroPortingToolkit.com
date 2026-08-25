---
title: "Recomp your own game"
summary: "The one page to hand an AI agent when you want a game you own turned into a native port, covering what works today, what does not, and the exact commands."
pageType: "guide"
tags: ["Tutorial", "Agents", "PlayStation"]
repos:
  - "https://github.com/mstan/psxrecomp"
updated: "2026-08-25"
---

You have a game you own and you want a native port of it. This page is what to
do. It is written so you can hand it straight to an AI coding agent: point one
here, tell it which game and where the file is, and it has what it needs to
start.

Read the next section first. How far you get depends almost entirely on which
console the game is from.

## What actually works today

There is one console where this goes fast and eight where it does not. The
difference is tooling, not difficulty.

| Console | Scaffolding | What starting a port means |
|---|---|---|
| PlayStation | Yes | One command creates the project, probes your disc, and can generate and build it |
| NES, SNES, Game Boy Advance, Game Boy, Genesis, Master System, Virtual Boy, DS | None | You copy the structure of an existing port and adapt it by hand |
| CD-i, GameCube, Xbox | Not applicable | Research projects, not a route to a playable port |

[`psxrecomp`](https://github.com/mstan/psxrecomp) ships
[`tools/new_project_layout/`](https://github.com/mstan/psxrecomp/blob/master/tools/new_project_layout/).
It creates the repository, pins the framework, and reads your disc for its
identity and a first pass at the code it needs to find. It writes the build and
packaging stubs, and runs the first generate and build if you ask it to.
That tooling is why a contributor could decide to port a PlayStation title and
have it running in the same session.
[Street Fighter Alpha 3](/games/street-fighter-alpha-3) came through this flow,
with about five minutes of game-specific work behind it.

The other eight toolchains have no equivalent. Starting a port there means
reproducing a working port's structure by hand, which is an afternoon rather
than a coffee break. Anyone telling you a Genesis port is five minutes of work
is wrong.

> **You provide this.** You supply the game file, from a copy you own. Nothing
> here distributes game data and nothing here will help you obtain any. Ports
> ship as source and each user builds their own, because a recompiled binary
> contains translated game code.

## Hand this to an agent

If you are using an AI coding agent, this is enough to give it:

> Read <https://retroportingtoolkit.com/docs/start/recomp-your-own-game> and
> <https://github.com/RetroPortingToolKit/recomp-starter>. I want to recompile
> the PlayStation game at `/path/to/my/game.cue`, which I own. Follow the
> PlayStation path. Do not create any GitHub repository. Stop and ask me when
> you need someone to look at the screen.

The starter kit's [`AGENTS.md`](https://github.com/RetroPortingToolKit/recomp-starter/blob/main/AGENTS.md)
is written for the agent rather than for you. It carries the decision tree, the
exact flags, the failure modes, and a list of what an agent must not decide on
its own.

## The PlayStation path

### Before you start

You need `git`, `cmake` 3.20 or newer, `ninja`, a C++20 compiler and `python3`.
On Windows use MSYS2 MinGW rather than MSVC.

You do not need a BIOS dump. Builds use a bundled open source OpenBIOS by
default. Some titles need a retail BIOS instead, which you will discover when
the game misbehaves rather than up front.

### Get the framework

```sh
git clone https://github.com/mstan/psxrecomp.git
cd psxrecomp
git submodule update --init --recursive
```

### Scaffold the project

Interactively, which prompts you for the rest:

```sh
sh tools/new_project_layout/setup_project.sh \
  --disc /path/to/your/game.cue \
  --dir ~/src
```

Or in one non interactive command, which is the form an agent should use:

```sh
sh tools/new_project_layout/setup_project.sh \
  --yes \
  --name "Your Game" \
  --disc /path/to/your/game.cue \
  --dir ~/src \
  --players 1 \
  --generate \
  --enable-build \
  --no-github
```

One detail matters more than it looks. `--yes` requires `--name` and `--disc`,
and in that mode **the yes or no options default to off**. So `--generate` and
`--enable-build` have to be passed explicitly, or the scaffold writes the tree
and stops. Without them an agent appears to succeed and produces nothing
runnable.

Two caveats, because "everything defaults off" is not literally true. The setup
wizard defaults on when the launcher interface is enabled, so
`--yes --enable-recomp-ui` turns the wizard on with it. And the command above
gives you no launcher interface, no wizard and no netplay. That is the right
shape for a first build, not the shape a shipping port has. Add them back
deliberately once the game boots.

The flags worth knowing:

| Flag | Meaning |
|---|---|
| `--disc PATH` | Required. Your `.cue`. Staged, then probed for identity, seeds and a TOC fingerprint |
| `--name NAME` | Required with `--yes` |
| `--dir PATH` | Parent directory for the new repository |
| `--players N` | Default 2, maximum 8. Pass `1` and netplay turns itself off |
| `--bios PATH` | Optional retail BIOS |
| `--generate` | Build the emitters and translate the game to C |
| `--enable-build` | Configure and build afterwards. Forces generate on, warning as it does so, but pass both so the command reads honestly |
| `--no-github` | Do not create a remote repository |
| `--psxrecomp-ref` | Pin a specific framework revision |

### Or run the steps yourself

```sh
./psxrecomp/tools/ci/build_emitters.sh

python3 psxrecomp/psxrecomp_cli.py generate \
  --config game.toml --project-root . --disc disc/game.cue

cmake -S . -B build-release -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build-release --target psx-runtime -j"$(nproc)"
```

`build_emitters.sh` is once per machine, and again whenever the framework
changes.

## A build is not a finished port

This is where the time actually goes, so read it before you start. The
framework's own setup document lists what remains after the scaffold has done
everything it can:

1. Boot and soak the game, fixing missing seeds, overlays and runtime quirks
2. Test netplay, if the title has it
3. Add more symbols as you learn the binary
4. Tag and ship

Code the analysis could not find ahead of time surfaces as a crash or a hang
well into the game rather than at startup. Finding and fixing those is the bulk
of the work on any console, and it takes weeks or months.

## The other eight consoles

Copy a working port and change what is game specific. The starter kit's
[`other-consoles/`](https://github.com/RetroPortingToolKit/recomp-starter/tree/main/other-consoles)
names which port to copy for each console, and what the per game recompiler
input is called there, because it is spelled differently everywhere:
`game.toml` on NES, a bank configuration directory on SNES, `game.toml` plus
symbols and per region config on Game Boy Advance.

[Port a game](/docs/guides/port-a-game) is the full guide, with the canonical
repository layout and the mechanisms for expressing per game fixes.

## When it goes wrong

| Symptom | Cause | Fix |
|---|---|---|
| `Cannot find source file: generated/OpenBIOS_full.c` | The BIOS C was never generated | Run generate before configuring CMake |
| `dispatch_miss_total` is above zero | Code the analysis did not find | A real bug, not noise. Add the address to the dispatch miss seeds and regenerate. PlayStation reports this through the debug server's `dispatch_stats` command; the cartridge toolchains write a `dispatch_misses.log` file instead |
| Compiler exits with no message, code -1 | Out of memory | Lower parallelism, `-j2` rather than `-j"$(nproc)"` |
| MinGW reports `too many sections` | COFF section limit | Add `-Wa,-mbig-obj` |

[Errors and exit codes](/docs/reference/errors-and-exit-codes) has the rest.

## Source

- [`psxrecomp/docs/GAME_PROJECT_SETUP.md`](https://github.com/mstan/psxrecomp/blob/master/docs/GAME_PROJECT_SETUP.md),
  the authority for everything on this page
- [`psxrecomp/tools/new_project_layout/`](https://github.com/mstan/psxrecomp/blob/master/tools/new_project_layout/)
- [Street Fighter Alpha 3 Recompiled](https://github.com/TechnicallyComputers/Street-Fighter-Alpha-3-Recomp),
  a real port whose README records that it was scaffolded with this flow

## Next

- [If you are an agent, start here](/docs/agents/start-here), the orientation
  page written in second person
- [Port a game](/docs/guides/port-a-game), the full guide once you are past the
  first build
- [The game file you supply](/docs/concepts/the-game-file-you-supply), the
  contract every port makes with its user
- [What static recompilation is](/docs/start/what-is-static-recompilation), if
  you want to understand what the tooling is doing
