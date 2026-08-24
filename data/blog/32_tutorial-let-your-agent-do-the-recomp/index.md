---
title: "Let your agent do the recompilation"
kicker: "Tutorial"
desc: "The prompt to paste, the one scaffold flag detail that decides whether an agent ships or stalls, and the exact points where it has to stop and ask you to look."
date: "2026-08-24"
author: "Matthew Stanley"
tags: ["Tutorial", "Agents", "PlayStation"]
layout: "article"
---

The goal is a small one to state and a fussy one to get right: point an AI coding agent at a page, tell it to recompile a disc image you own on your machine, and have it work. This article is how. It covers what to say, the single flag detail that decides whether the agent finishes or produces an empty tree, and the places where it must stop and hand the screen back to you.

The manual version of this job is [Recompile a PlayStation game you own, start to finish](/blog/tutorial-recompile-a-playstation-game). Read it if you want to understand what the agent is doing. You do not need to in order to follow this one.

## Why an agent can do this at all

Because the work has already been compressed into a script. [`psxrecomp`](https://github.com/mstan/psxrecomp) ships [`tools/new_project_layout/`](https://github.com/mstan/psxrecomp/blob/master/tools/new_project_layout/), which creates the repository, pins the framework as a submodule at a fetched commit, probes your disc for its identity and a first pass at the code it needs to find, writes the packaging and CI stubs, and will run the first generate and build. There is very little for an agent to invent, which is exactly the condition under which agents are reliable.

That is a PlayStation statement, not a general one. The other eight toolchains here have no scaffolding, and starting a port on them means reproducing a working port's structure by hand. Tell your agent that up front so it tells you.

## The prompt

Paste this, with the path changed:

```text
I want to recompile a PlayStation game I own into a native build on this
machine. The disc image is at /absolute/path/to/game.cue, with its .bin
tracks beside it. I own it. Do not try to obtain it from anywhere.

Read these first, in this order:
  https://retroportingtoolkit.com/docs/agents/start-here
  https://github.com/RetroPortingToolKit/RetroPortingToolkit.com/blob/main/starter-kit/AGENTS.md
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

Three things in there earn their place. The reading list points at documents written to be followed literally rather than skimmed; [the agent orientation page](/docs/agents/start-here) is the one to give it if you only give it one. The check against the existing catalogue prevents the most wasteful outcome, which is an agent spending an hour reproducing a port that already ships builds. And the last rule is the one that keeps you in the loop at the only points where you are actually needed.

## The flag detail that decides everything

This is the part to get right, and it is a single paragraph in the framework's setup document:

> Non-interactive / CI (`--yes` / `-Yes` or `PSXRECOMP_SETUP_YES=1`): requires
> `--name` + `--disc`; Y/N options default **off** unless you pass enable flags.

An agent cannot answer prompts, so it must run the scaffold with `--yes`. In that mode the script stops prompting and takes its defaults, and the defaults for every yes or no question are off. Reading the argument parser confirms it: with `--yes` set and no explicit flag, the launcher interface, the setup wizard, netplay, the CI workflow, box art fetching, generate, build and GitHub repository creation are all off.

Generate and build being off is the one that bites. Without `--generate`, the script writes a complete, correct, entirely inert repository and exits successfully. The agent sees exit status zero, reports success, and hands you a tree with no `generated/` directory and no binary. Nothing failed. Nothing ran either.

So the agent must pass `--generate` and `--enable-build` explicitly. That is the difference between an agent that ships and one that stalls while appearing to have finished.

Two smaller behaviours are worth knowing, both read from the script rather than from prose about it. `--enable-build` without `--generate` does not silently do nothing: the script prints `warning: --enable-build requires Generate — enabling Generate` and turns generate on for you. Pass both anyway, because relying on a warning to fix your command line is not a habit worth having. And if generate fails, build is skipped rather than attempted, so a failed generate never masquerades as a failed compile.

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
| `--name` | The project name, and the source of the window title, the binary name and the release archive prefix. |
| `--disc` | Required with or without `--yes`. Staged, then probed for identity, seeds and a TOC fingerprint. |
| `--dir` | Parent directory for the new repository. Defaults to the current directory, which is rarely what you want. |
| `--players` | Default 2, maximum 8. Pass `1` for a single player title and netplay turns itself off with no further flags. |
| `--generate` | Build the emitters, then translate the game to C. Off by default under `--yes`. |
| `--enable-build` | Configure and build afterwards. Off by default under `--yes`. |
| `--no-github` | Create no remote repository. Redundant under `--yes`, and worth passing anyway so the intent is on the command line. |

Add `--bios /path/to/SCPH1001.BIN` only if the user has supplied one and asked for it. It is ignored unless generate runs, and OpenBIOS is the default for a reason.

If the user wants the launcher interface, pass `--enable-recomp-ui`. One trap comes with it: release CI requires the first run setup wizard, so `--enable-ci` together with `--enable-recomp-ui` and `--no-wizard` is a hard error and the script exits. Leave the wizard alone unless you have a reason.

**Never pass `--create-github` on the agent's own initiative.** Creating a repository under someone's account, choosing its visibility, and pushing to it are the user's decisions. The scaffold will happily do all three. An agent should do none of them unless the user asked in so many words.

## What the agent can check by itself

Plenty, and it should check all of it before claiming anything:

- **The prerequisites.** `git`, `cmake` 3.20 or newer, `ninja`, a C and C++ toolchain, `python3`. The script itself hard fails on missing `git` or `python3`. Missing tools should be reported, not routed around.
- **That the probe actually ran.** After the scaffold, `game.toml` should carry a serial, a boot executable, a load address and an entry point. If the probe failed the script says so and leaves the template behind, and every later step will be wrong in a confusing way.
- **That the seed list is non empty.** `seeds/ghidra_funcs.txt` holds the addresses the recompiler starts from.
- **That generate produced output.** A `generated/` directory with the OpenBIOS backend and the game's translated C, named after the boot executable.
- **That the build produced a binary.** Under `build-release/`, named from the window title rather than the folder: `MyGameRecomp` yields `MyGame_Recompiled`.
- **`dispatch_misses.log`, after every run.** This one is not optional and not cosmetic. Each entry is code the game reached that the recompiler never translated, which the fleet's rules call a silent game breaking bug. Non empty means stop, add the addresses as seeds, regenerate, rebuild, run again. The runtime's debug server also reports `dispatch_miss_total` on every ping, so an agent can watch it over the wire instead of parsing a file.

The framework also has a test suite, and it is cheap enough that there is no excuse for skipping it: 38 tests, under five seconds, needing no BIOS dump, no disc image and no generated code. From a `psxrecomp` checkout:

```sh
cmake -S recompiler -B recompiler/build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build recompiler/build
cd recompiler/build && ctest --output-on-failure
```

The runtime also accepts `--headless`, which skips the window and audio and exposes screenshots and state over TCP. That lets an agent capture an image without a display. It does not let the agent decide what the image means.

## Where it has to stop and ask

Be precise about this, because the failure mode is an agent that loops for an hour on a question it cannot answer.

**Anything visual needs eyes.** Whether the game boots to a picture rather than a black screen. Whether the geometry is right. Whether the colours are right. Whether textures are corrupt, whether the HUD is in the right place, whether the frame rate is what it should be. An agent can produce a screenshot; it cannot hold the opinion that the screenshot is correct. Build it, run it, and ask.

**Audio needs ears.** Whether music plays, whether it plays at the right speed, whether effects trigger on the right events. There is no artefact for this.

**Whether the port is finished is a person's judgement.** Only someone playing it can say so. "It builds" and "it boots" are milestones, not conclusions.

**Deep crashes are iterative, not a single fix.** Code the analysis could not find surfaces as a crash or a hang well into the game rather than at startup, because that is the first moment the program tries to call something that was never translated. If the game boots and dies twenty minutes later, that is the likely cause, and the answer is another pass round the seed loop rather than a clever diagnosis.

**The game file is always the user's.** An agent never obtains one, never looks for one, and never suggests where to find one. If the user has not supplied one, that is the blocker and the correct response is to say so.

**Publishing is the user's call.** No repository creation, no pushes, no releases unless asked.

## What to hand it, in one line

If you want the shortest useful version of this article to give an agent, it is the starter kit:

<https://github.com/RetroPortingToolKit/RetroPortingToolkit.com/tree/main/starter-kit>

Its [`AGENTS.md`](https://github.com/RetroPortingToolKit/RetroPortingToolkit.com/blob/main/starter-kit/AGENTS.md) is written in the second person for the agent rather than for you, and carries the decision tree, the flag table, the failure modes and an explicit list of what an agent must not decide alone. [`README.md`](https://github.com/RetroPortingToolKit/RetroPortingToolkit.com/blob/main/starter-kit/README.md) is the same material for a human.

And [If you are an agent, start here](/docs/agents/start-here) is the orientation page for this whole fleet: the rules that hold in every repository, the commands that decide whether a change worked, and, at the end, an honest list of what the fleet does not have, so an agent does not plan around a capability that is not there.

## Where to go next

- [Recomp your own game](/docs/start/recomp-your-own-game), the reference version of both tutorials
- [Recompile a PlayStation game you own, start to finish](/blog/tutorial-recompile-a-playstation-game), the same job by hand
- [Port a game](/docs/guides/port-a-game), for everything after the first build
- [The game file you supply](/docs/concepts/the-game-file-you-supply), the contract every port makes with its user
- [The PlayStation toolchain](/docs/platforms/playstation), for what the framework actually is
