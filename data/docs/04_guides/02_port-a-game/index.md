---
title: "Port a game"
summary: "Turn one legally supplied game file into a native port by identifying the file, configuring the recompiler, building the runtime, and fixing the framework instead of patching generated code."
pageType: "guide"
tags: ["Porting", "Recompiler", "Configuration"]
repos:
  - "https://github.com/mstan/FaxanaduRecomp"
  - "https://github.com/mstan/SuperMarioBrosNESRecomp"
  - "https://github.com/mstan/SuperMarioWorldRecomp"
  - "https://github.com/mstan/MegaManX6Recomp"
  - "https://github.com/mstan/MinishCapRecomp"
  - "https://github.com/Shy/BoktaiRecomp"
updated: "2026-08-30"
---

A port repository records how to turn one game file into a native program.

It does not contain the game. It contains the port recipe: the pinned framework, the expected file identity, the recompiler configuration, small hand-written runtime code, and build scripts.

The generated code is output. Do not edit it by hand. If the next regeneration would erase your fix, the fix is in the wrong place.

## Before you start

You need:

- a built framework for the console;
- a legally dumped copy of the game;
- a clean clone of the port repository;
- enough disk and memory for generated code;
- a way to run and compare the result.

Some consoles or projects may also ask for a BIOS. Use a legally obtained BIOS. This site does not provide one.

## Step 1. Identify the exact game file

Start by proving which file the port targets.

A good port records:

- the game title and region;
- the expected file size;
- one or more hashes;
- disc serials or cartridge header fields where they matter;
- the file types that are rejected.

This matters because a patched dump, trimmed ROM, bad disc conversion, or different region can move code. If code moves, the recompiler configuration may point at the wrong bytes.

## Step 2. Fetch the pinned framework

Most ports pin their framework as a Git submodule.

Clone with submodules:

```sh
git clone --recurse-submodules <port repository url>
```

If you already cloned it:

```sh
git submodule update --init --recursive
```

Do this before building. The pinned framework commit is part of the port. Building against a newer framework tip can change behavior.

## Step 3. Configure the recompiler

The recompiler needs facts the game file does not state clearly.

Those facts may include:

- where functions begin;
- which addresses are data, not code;
- how bank switching or overlays work;
- which indirect calls are valid;
- where hardware reads and writes happen;
- which symbols or labels are useful to humans.

Put those facts in configuration files, symbol files, annotations, or project-owned scripts. Do not hide them in generated C.

If a game has a public decompilation or a strong disassembly project, it can be very useful as an overlay during discovery. Treat it as a guide for names, boundaries, and intent. Still verify against the exact game file your port targets.

## Step 4. Generate the code

Run the project script or recompiler command for the game.

The output usually lands in a generated directory. It may be called `generated/`, `src/gen/`, or something similar.

After generation, check for dispatch misses. A dispatch miss means the game tried to call code the recompiler did not cover. Fix those before debugging graphics, sound, timing, or gameplay.

## Step 5. Build and run the runtime

The runtime links together:

- the generated game code;
- the console runtime;
- the launcher or file picker;
- game-specific glue;
- optional mods or enhancements.

On first run, expect the port to ask for your game file. If the file does not match, the project may reject it, warn, or fail later. A strict rejection is better for users. A warning is useful only when the project can keep running safely.

## Step 6. Fix the right layer

Use this order when something is wrong:

| Problem | Correct layer |
|---|---|
| The decoder misunderstood an instruction. | Recompiler. |
| The runtime models hardware wrong. | Runtime. |
| A function was missed. | Discovery or config. |
| A game needs a known address or table. | Game config. |
| A player-facing change is desired. | Mod or enhancement, off by default. |
| Generated C looks wrong. | Fix the source of generation, then regenerate. |

Framework fixes are the prize. A bug found in one game is often a bug the next game will hit too.

Per-game configuration is still valid. It should describe that game, not paper over a framework bug.

## What does done mean?

Booting is not done.

A useful bring-up checklist includes:

- the file identity check works;
- the game reaches title screen;
- input works;
- saving and loading work;
- audio works;
- menus and transitions work;
- no dispatch misses remain;
- common gameplay paths are tested;
- comparison against an oracle exists where the project supports it.

Faithfulness is the measurement. Enhancements can come later, but the default path should act like the original game.

## Common failures

| Symptom | Likely cause |
|---|---|
| The build cannot find the framework. | Submodules were not fetched. |
| The launcher rejects the file. | Wrong region, wrong revision, trimmed ROM, bad disc image, or patched file. |
| The game jumps into missing code. | Dispatch misses are not resolved. |
| A fix disappears after regeneration. | Generated code was edited by hand. |
| The game boots but later softlocks. | Timing, hardware behavior, or an overlay path is wrong. |
| A PS1 game has broken video or audio after conversion. | The disc image may have lost sector data during conversion. |

## Next

- [Debug a divergence](/docs/guides/debug-a-divergence), when the port disagrees with the reference.
- [Write a mod](/docs/guides/write-a-mod), for player-facing changes.
- [Release a port](/docs/guides/release-a-port), before distributing anything.
