---
title: "Port a game"
summary: "Start a port from one legally supplied game file, configure the recompiler, build the runtime, and fix the right layer when something breaks."
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

A port repository is a recipe.

It does not contain the game. It records how to turn one exact game file into a native program.

The recipe usually includes file identity checks, recompiler configuration, build scripts, runtime glue, and project-specific fixes.

Generated code is output. Do not edit it by hand. If regeneration would erase your fix, the fix belongs somewhere else.

## Before you start

You need:

- a framework that already builds;
- a legally dumped copy of the game;
- a BIOS or system file, if that console needs one;
- enough disk and memory for generated code;
- a way to run and observe the result.

Use legally obtained files. This site does not provide game files or retail BIOS files.

## Step 1. Identify the exact game

Start by proving which file the port targets.

A good port records:

- title and region;
- revision, if known;
- file size;
- hashes;
- disc serials or cartridge header fields where they matter;
- rejected formats or known-bad dumps.

This is not busywork. Static recompilation depends on exact bytes. A different revision can move code, data, overlays, or tables.

## Step 2. Fetch the framework

Most ports pin their framework.

That pin matters. A newer framework can change code generation, runtime behavior, build flags, or file layout.

If a repository uses submodules, clone with submodules or fetch them before building.

## Step 3. Teach the recompiler about the game

The game file does not explain itself.

The project may need to identify:

- where functions start;
- which bytes are data;
- which banks or overlays are active;
- which indirect calls are valid;
- which hardware addresses matter;
- which names help humans understand the binary.

Put those facts in configuration, symbols, annotations, or project-owned scripts. Do not hide them in generated C.

If a game has a public decompilation or strong disassembly, it can help a lot during discovery. Use it as an overlay for names, boundaries, and intent. Still verify everything against the exact file your port targets.

## Step 4. Generate the code

Run the project's generator or recompiler command.

The output usually lands in a generated directory.

After generation, check for missed code. A dispatch miss means the game tried to call code the recompiler did not cover. Fix that before chasing graphics, sound, timing, or gameplay bugs.

## Step 5. Build and run

The runtime links together:

- generated game code;
- console hardware behavior;
- input, video, audio, saves, and timing;
- launcher or file-picker code;
- optional mods or enhancements.

On first run, expect the port to ask for your game file. If the file does not match, a strict project should reject it instead of trying to continue blindly.

## Step 6. Fix the right layer

When something breaks, classify it before changing code.

| Problem | Usually belongs in |
|---|---|
| An instruction decoded wrong. | Recompiler. |
| Hardware behaves wrong. | Runtime. |
| A function was missed. | Discovery or config. |
| A game table or address is needed. | Game config. |
| A player-facing option is desired. | Mod or enhancement, off by default. |
| Generated C looks wrong. | The generator, then regenerate. |

Framework fixes are the best fixes. A bug found in one game is often a bug the next game would hit too.

Per-game configuration is still valid. It should describe the game, not paper over a framework bug.

## What does done mean?

Booting is not done.

A useful bring-up checklist asks:

- does the file identity check work?
- does the game reach title screen?
- does input work?
- can you reach gameplay?
- do saving and loading work?
- does audio behave?
- do menus and transitions work?
- are dispatch misses resolved?
- has the port been compared against a reference where possible?

Faithfulness is the measurement. Enhancements can come later, but the default path should behave like the original game.
