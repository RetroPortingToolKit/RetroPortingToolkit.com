# Recomp starter kit

Start your own static recompilation project. You bring a game you own, this
gets you to something that builds and boots.

**If you are an AI agent, read [`AGENTS.md`](AGENTS.md) instead.** It is the same
material written as instructions, with every command in a form you can run
unattended. Your user can also just point you at
<https://retroportingtoolkit.com/docs/start/recomp-your-own-game> and say what
they want.

## What this is

The [Retro Porting Toolkit](https://retroportingtoolkit.com) is a set of static
recompilers: they take the original program off a disc or cartridge you own,
translate its machine code to C, and build it as a native application. There are
toolchains for twelve consoles and around sixty games have been ported with them.

This repository is the on ramp. It does not contain a recompiler, and it does not
contain any game data. It contains the shortest honest path from "I want to port
this" to "it builds", per console, plus tutorials that walk the whole thing.

## Read this before you start

**You supply the game file.** Nothing here distributes game data, and nothing
here will help you obtain any. Ports ship as source and every user builds their
own, because a recompiled binary contains translated game code.

**How far you get depends heavily on the console.** This is the part most
introductions skip, so it is first here instead:

| Console | Scaffolding | Realistic first step |
|---|---|---|
| PlayStation | Yes, a real scaffold script | One command creates the project, probes your disc and can build it |
| NES, SNES, Game Boy Advance, Genesis, Master System, Virtual Boy, DS | None | Copy the shape of an existing port and adapt it by hand |
| CD-i, GameCube, Xbox | Not applicable | These are research projects, not a route to a playable port |

PlayStation is the one that goes fast, because `psxrecomp` ships
`tools/new_project_layout/`. That tooling is why a contributor could decide to
port Street Fighter Alpha 3 and have it running the same session. On the other
eight toolchains you are copying a working port and changing what is
game specific, which is a longer afternoon rather than a coffee break.

Nothing here will tell you a Genesis port is five minutes of work.

## PlayStation, start to finish

You need `git`, `cmake` 3.20 or newer, `ninja`, a C++20 compiler and `python3`.
On Windows use MSYS2 MinGW rather than MSVC. You do not need a BIOS dump: builds
use a bundled open source OpenBIOS by default.

```sh
git clone https://github.com/mstan/psxrecomp.git
cd psxrecomp
git submodule update --init --recursive

sh tools/new_project_layout/setup_project.sh \
  --disc /path/to/your/game.cue \
  --dir ~/src
```

Run without `--yes` and it asks you the rest: project name, player count, whether
you want the launcher interface, netplay, CI, box art, and whether to generate
and build straight away. Answer yes to generate and build and it will hand you a
tree that runs.

The full flow, the flags, and what each generated file is for are in
[`playstation/`](playstation/), and in the framework's own
[`docs/GAME_PROJECT_SETUP.md`](https://github.com/mstan/psxrecomp/blob/master/docs/GAME_PROJECT_SETUP.md),
which is the authority.

## Everything else

[`other-consoles/`](other-consoles/) covers the eight toolchains without
scaffolding: which existing port to copy for each console, what the per game
recompiler input is called there, and what you have to change.

## Tutorials

Written as full walkthroughs on the site rather than kept here, so they can carry
screenshots and stay current:

<https://retroportingtoolkit.com/blog>

[`tutorials/`](tutorials/) lists them with one line each on which one you want.

## What "done" actually looks like

A build is not a port. Once it boots you still have to play it and fix what you
find: code the analysis did not discover shows up as a crash or a hang well into
the game, not at startup. That iteration is the actual work, and it is why a port
takes weeks rather than an afternoon.

The projects in this ecosystem are honest about this in their own documentation,
and so is this one.

## Where to go next

- The documentation: <https://retroportingtoolkit.com/docs>
- What static recompilation is:
  <https://retroportingtoolkit.com/docs/start/what-is-static-recompilation>
- Existing ports, in case yours is already done:
  <https://retroportingtoolkit.com/all/games>
- The whole documentation section in one fetch, for an agent:
  <https://retroportingtoolkit.com/llms-full.txt>

## Licence

This starter kit is MIT. The toolchains it points at are licensed separately and
not all the same way: check each repository. `psxrecomp` is PolyForm
Noncommercial 1.0.0, which is not an open source licence, so read it before you
plan anything commercial.
