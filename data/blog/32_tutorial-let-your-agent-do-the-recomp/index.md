---
title: "Let your agent do the recompilation"
kicker: "Tutorial"
desc: "The prompt to paste, the one scaffold flag detail that decides whether an agent ships or stalls, and the exact points where it has to stop and ask you to look."
date: "2026-08-24"
author: "Shokunin"
tags: ["Tutorial", "Agents", "PlayStation"]
layout: "article"
---

You can hand this job to an AI coding agent. Point it at a page, tell it to recompile a disc image you own, and let it work. This article covers what to say, the one flag that decides whether the agent finishes or hands you an empty tree, and the points where it has to stop and give the screen back to you.

The manual version is [Recompile a PlayStation game you own, start to finish](/blog/tutorial-recompile-a-playstation-game). Read it if you want to know what the agent is doing. You do not need it to follow this one.

## Why an agent can do this at all

Because a script already does the work. [`psxrecomp`](https://github.com/mstan/psxrecomp) ships [`tools/new_project_layout/`](https://github.com/mstan/psxrecomp/blob/master/tools/new_project_layout/). It creates the repository and pins the framework as a submodule at a fetched commit. It probes your disc for its identity and for a first pass at the code it has to find. It writes the packaging and CI stubs, and it will run the first generate and build. That leaves an agent almost nothing to invent, which is when agents are reliable.

That is true of PlayStation, not of the rest. The other eight toolchains here have no scaffold script, so starting a port on them means copying a working port's structure by hand.

## The prompt

Paste this, with the path changed:

```text
I want to recompile a PlayStation game I own into a native build on this
machine. The disc image is at /absolute/path/to/game.cue, with its .bin
tracks beside it. I own it. Do not try to obtain it from anywhere.

Read these first, in this order:
  https://retroportingtoolkit.com/docs/agents/start-here
  https://github.com/RetroPortingToolKit/recomp-starter/blob/main/AGENTS.md
  https://github.com/mstan/psxrecomp/blob/master/docs/GAME_PROJECT_SETUP.md

Then check https://retroportingtoolkit.com/all/games to see whether this
game has already been ported. If it has, say so and stop.

Otherwise follow the PlayStation path in AGENTS.md. Run the scaffold non
interactively and let it generate and build.

Rules:
- Do not create a GitHub repository. Pass --no-github.
- Do not commit disc images, BIOS dumps, or anything under generated/.
- Do not edit generated code. Fix the seeds or the config instead.
- Check the prerequisites first and tell me what is missing rather than
  working around it.
- Stop and ask me whenever something needs eyes: whether it boots, whether
  the picture looks right, whether the audio is right.
```

Three parts of that prompt matter.

The reading list points at documents written to be followed word for word. If you give the agent only one link, give it [the agent orientation page](/docs/agents/start-here).

The catalogue check stops the most wasteful outcome, which is an agent spending an hour rebuilding a port that already ships builds.

The last rule keeps you in the loop at the only points where you are needed.

## The flag detail that decides everything

One paragraph in the framework's setup document decides this:

> Non-interactive / CI (`--yes` / `-Yes` or `PSXRECOMP_SETUP_YES=1`): requires
> `--name` + `--disc`; Y/N options default **off** unless you pass enable flags.

An agent cannot answer prompts, so it has to pass `--yes`. The script then stops asking and takes its defaults, and every yes or no default is off: the launcher interface, the setup wizard, netplay, the CI workflow, box art fetching, generate, build and GitHub repository creation.

Generate and build being off is the one that bites. Without `--generate`, the script writes a complete, correct repository that does nothing, and exits successfully. The agent sees exit status zero, reports success, and hands you a tree with no `generated/` directory and no binary. Nothing failed. Nothing ran either.

So the agent has to pass `--generate` and `--enable-build` explicitly. That is the difference between an agent that ships and one that looks finished and is not.

Two smaller behaviours are worth knowing. `--enable-build` without `--generate` does not quietly do nothing: the script prints `warning: --enable-build requires Generate — enabling Generate` and turns generate on for you. Pass both anyway. And if generate fails, build is skipped rather than attempted, so a failed generate never looks like a failed compile.

## The command

```sh
sh tools/new_project_layout/setup_project.sh \
  --yes \
  --name "MyGameRecomp" \
  --disc /absolute/path/to/game.cue \
  --dir "$HOME/src" \
  --players 1 \
  --generate \
  --enable-build \
  --no-github
```

Run it from inside a `psxrecomp` checkout:

```sh
git clone https://github.com/mstan/psxrecomp.git
cd psxrecomp
git submodule update --init --recursive
```

The flags, in the order they matter:

| Flag | Why it is there |
|---|---|
| `--yes` | No prompts. Requires `--name` and `--disc`. |
| `--name` | The project name. It sets the window title, the binary name and the release archive prefix. |
| `--disc` | Required with or without `--yes`. Staged, then probed for identity, seeds and a TOC fingerprint. |
| `--dir` | Parent directory for the new repository. Defaults to the current directory, which is rarely what you want. |
| `--players` | Default 2, maximum 8. Pass `1` for a single player title and netplay turns itself off. |
| `--generate` | Build the emitters, then translate the game to C. Off by default under `--yes`. |
| `--enable-build` | Configure and build afterwards. Off by default under `--yes`. |
| `--no-github` | Create no remote repository. Redundant under `--yes`, and worth passing so the intent is on the command line. |

Add `--bios /path/to/SCPH1001.BIN` only if the user supplied one and asked for it. It is ignored unless generate runs, and OpenBIOS is the default.

For the launcher interface, pass `--enable-recomp-ui`. One trap comes with it: release CI needs the first run setup wizard, so `--enable-ci` with `--enable-recomp-ui` and `--no-wizard` is a hard error and the script exits. Leave the wizard alone.

**Never pass `--create-github` on the agent's own initiative.** Creating a repository under someone's account, choosing whether it is public, and pushing to it are the user's decisions. The scaffold will do all three. An agent should do none of them unless the user asked for it.

## What the agent can check by itself

It should check all of this before it claims anything:

- **The prerequisites.** `git`, `cmake` 3.20 or newer, `ninja`, a C and C++ toolchain, `python3`. The script itself hard fails on missing `git` or `python3`. Report a missing tool rather than working around it.
- **That the probe actually ran.** After the scaffold, `game.toml` should carry a serial, a boot executable, a load address and an entry point. If the probe failed the script says so and leaves the template behind, and every later step goes wrong in a confusing way.
- **That the seed list is non empty.** `seeds/ghidra_funcs.txt` holds the addresses the recompiler starts from.
- **That generate produced output.** A `generated/` directory with the OpenBIOS backend and the game's translated C, named after the boot executable.
- **That the build produced a binary.** Under `build-release/`, named from the window title rather than the folder: `MyGameRecomp` yields `MyGame_Recompiled`.
- **The dispatch miss count, after every run.** A dispatch miss means the game jumped to an address with no generated function behind it. The fleet's rules call that a silent game breaking bug, and the runtime halts on the first one by default. Over the debug protocol, `ping` returns `dispatch_miss_total` on every heartbeat and `unknown_dispatch_log` dumps the ring of recent misses. Anything above zero means stop: add the addresses as seeds, regenerate, rebuild, run again.

The framework has a test suite: 38 tests, under five seconds, and it needs no BIOS dump, no disc image and no generated code. From a `psxrecomp` checkout:

```sh
cmake -S recompiler -B recompiler/build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build recompiler/build
cd recompiler/build && ctest --output-on-failure
```

The runtime also accepts `--headless`. It skips the window and the audio and exposes screenshots and state over TCP, so an agent can capture an image without a display. It still cannot decide what the image means.

## Where it has to stop and ask

Be exact here. The failure mode is an agent looping for an hour on a question it cannot answer.

**Anything visual needs eyes.** Does it boot to a picture instead of a black screen? Is the geometry right? Are the colours right? Are textures corrupt? Is the HUD in the right place? An agent can take a screenshot. It cannot decide whether the screenshot is correct. Build it, run it, and ask.

**Audio needs ears.** Does the music play, at the right speed? Do effects fire on the right events? There is no file an agent can read for this.

**Whether the port is finished is a person's judgement.** Only someone playing it can say so. "It builds" and "it boots" are milestones, not conclusions.

**Deep failures take several passes, not one fix.** Code the recompiler never found shows up late, not at startup, because that is the first moment the game calls it. On PlayStation the runtime does not quietly interpret around a hole like that. It records the address and stops, so you get a report naming the exact place. The answer is another pass round the seed loop, not a clever diagnosis.

**The game file is always the user's.** An agent never obtains one, never looks for one, and never suggests where to find one. If the user has not supplied one, that is the blocker. Say so.

**Publishing is the user's call.** No repository creation, no pushes, no releases unless asked.

## What to hand it, in one line

The shortest thing you can give an agent is the starter kit:

<https://github.com/RetroPortingToolKit/recomp-starter>

Its [`AGENTS.md`](https://github.com/RetroPortingToolKit/recomp-starter/blob/main/AGENTS.md) is written for the agent, not for you. It carries the decision tree, the flag table, the failure modes, and a list of what an agent must not decide alone. [`README.md`](https://github.com/RetroPortingToolKit/recomp-starter/blob/main/README.md) is the same material for a human.

[If you are an agent, start here](/docs/agents/start-here) orients an agent to the whole fleet: the rules that hold in every repository, the commands that decide whether a change worked, and a list of what the fleet does not have.

## Where to go next

- [Recomp your own game](/docs/start/recomp-your-own-game), the reference version of both tutorials
- [Recompile a PlayStation game you own, start to finish](/blog/tutorial-recompile-a-playstation-game), the same job by hand
- [Port a game](/docs/guides/port-a-game), for everything after the first build
- [The game file you supply](/docs/concepts/the-game-file-you-supply), the contract every port makes with its user
- [The PlayStation toolchain](/docs/platforms/playstation), for what the framework actually is
