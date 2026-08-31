---
title: "Use AI assist on a PlayStation recomp"
kicker: "Tutorial"
desc: "A short guide for asking an AI coding agent to start a PSXRecomp project without letting it invent policy, skip the build, or make publishing decisions."
date: "2026-08-24"
tags: ["Tutorial", "Agents", "PlayStation"]
layout: "article"
---

You can ask an AI coding agent to start a PlayStation recomp project for you.

Use PSXRecomp as the example. It has the best setup path today, and the work is structured enough that an agent can help without guessing too much.

The non-AI version is [How do I recomp my own game?](/docs/start/recomp-your-own-game).

## What the agent can do

An agent can clone PSXRecomp, check your tools, run the project setup script, generate the first code, build the project, and report what happened.

That is useful. It saves time and avoids small setup mistakes.

It does not replace you. You still need to provide the game file, approve any publishing, and look at the result. The agent cannot know whether the title screen looks correct, whether the audio is right, or whether a game feels faithful.

## What you provide

Give the agent the full path to a `.cue` file from your own disc image, with the `.bin` tracks beside it.

Do not ask it to find a game file. Do not let it suggest where to get one.

This site does not provide game files or tell you how to get them. Use a legally obtained dump from your own copy.

## A prompt to start with

Paste something like this:

```text
I want to start a PlayStation recomp project using PSXRecomp.

My disc image is here:
/absolute/path/to/game.cue

I own this game. Do not look for game files online.

Use PSXRecomp as the framework. Check the required tools first.
Run the project setup script non-interactively. Generate and build the first version.

Do not create a GitHub repository. Do not commit or copy disc images,
retail BIOS files, generated C/C++ output, or build output.

Stop and ask me when the game needs human review:
- first boot
- graphics
- audio
- controls
- any publishing or release step
```

Keep the prompt plain. The point is to give the agent boundaries, not a novel.

## The command it should end up using

For a single-player game, the shape should look like this:

```sh
sh tools/new_project_layout/setup_project.sh \
  --yes \
  --name "MyGameRecomp" \
  --disc /absolute/path/to/game.cue \
  --dir ~/src \
  --players 1 \
  --generate \
  --enable-build \
  --no-github
```

The important part is `--generate` and `--enable-build`.

Without those flags, the script can create a project folder and still not produce a runnable build. That looks like success to an agent, but it is not the result you wanted.

## Where the agent should stop

It should stop when the project builds and the game first opens.

At that point, you look.

Does it show the right screen? Are the colors correct? Is the audio moving at the right speed? Do the controls work? Does it behave like the original game?

An agent can take screenshots and press buttons. It cannot decide faithfulness by itself.

## What happens after the first build

The first build is a milestone, not a finished port.

The next work is testing and fixing:

- missing code paths
- timing issues
- graphics problems
- audio problems
- save behavior
- performance

AI can help with that work too, but it needs smaller goals. Ask it to investigate one problem at a time.

## Good agent rules

Use these rules every time:

- Do not edit generated code.
- Do not commit game files, retail BIOS files, generated C/C++ output, or build output.
- Do not create or publish a repository unless asked.
- Do not hide dispatch misses or runtime errors.
- Prefer fixing config, seeds, or framework code over patching around one symptom.
- Ask for human review when the question is visual, audio, feel, or release policy.

## Read next

- [Working with AI agents](/docs/agents/start-here)
- [How do I recomp my own game?](/docs/start/recomp-your-own-game)
- [The PlayStation toolchain](/docs/platforms/playstation)
- [The game file you supply](/docs/concepts/the-game-file-you-supply)
