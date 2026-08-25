---
title: "If you are an agent, start here"
summary: "Orientation for an agent dropped into one of these repositories: what to read first, the rules that hold everywhere, the commands that decide whether you succeeded, and the things this fleet does not have."
pageType: "project"
tags: ["Agents", "Conventions", "Verification"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/ndsrecomp"
updated: "2026-08-25"
---

You have been asked to change something in one of these repositories. The repository may not tell you how it wants to be worked in. This page does. Read it before you touch a file.

## What this fleet is

A set of static recompilation toolchains, one per console, plus a much larger set of per-game repositories that use them.

A static recompiler reads a game's binary, which is the compiled machine code the console ran, and writes out source code that an ordinary compiler can build. The projects here write C.

A toolchain repository owns the recompiler and the runtime. A game repository owns its config, its game-specific hooks and its regenerated C, and no framework code. [`nesrecomp/CLAUDE.md`](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md) says it flatly: "The recompiler and runner are the source of truth."

Correctness is not decided by looking at the screen. A reference implementation, called the oracle, runs beside the recompiled build, and the two are compared.

Of the 86 repositories surveyed, 34 carry an agent instruction file, and all 34 belong to the [mstan](https://github.com/mstan) account. Work moves between sessions through markdown committed to the repository, so what you write down is part of the deliverable.

## The repository you are in

Look in the root for `CLAUDE.md` and `AGENTS.md`. There are 36 such files across 34 repositories; [gbrecompiled](https://github.com/mstan/gbrecompiled) and [nesrecomp](https://github.com/mstan/nesrecomp) carry both. They come in three shapes.

**A framework constitution** is long and self-contained: [psxrecomp](https://github.com/mstan/psxrecomp) at 511 lines, [Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp) at 475, [vbrecomp](https://github.com/mstan/vbrecomp) at 302, [gbrecompiled](https://github.com/mstan/gbrecompiled) at 286, [nesrecomp](https://github.com/mstan/nesrecomp) at 264. Read it in full. It is the authority for that toolchain.

**A deferring game repository** is 1 to 3 KB: a pointer to its framework plus five or six local rules. The six PlayStation game repositories are near copies of one another, and so are the six Game Boy Advance ones. Read the local rules, then read the framework file.

**Two files are different.** [`xboxlle-probe/AGENTS.md`](https://github.com/mstan/xboxlle-probe/blob/main/AGENTS.md) is a safety document about talking to real hardware. [`DKC2Recomp/AGENTS.md`](https://github.com/mstan/DKC2Recomp/blob/main/AGENTS.md) is a source-port working agreement, not a recompiler.

Then open the documents that file names, usually `PRINCIPLES.md`, `TCP.md` or `TCP_COMMANDS.md`, `DEBUG.md` and `COSIM.md`. The protocol documents matter most, because the debug server is how you observe anything at all. See [the TCP debug protocol](/docs/reference/tcp-protocol) and [machine-readable surfaces](/docs/agents/machine-surfaces).

### When the file points somewhere you cannot go

In at least 14 repositories the rules defer to something that is not in the repository. That is the normal case, not a broken one. [`YoshiNESRecomp/CLAUDE.md`](https://github.com/mstan/YoshiNESRecomp/blob/master/CLAUDE.md) opens with an absolute Windows path:

> "**Read `F:\Projects\PRINCIPLES.md` first.** Those global principles override
> anything in this file. This file specializes them for Yoshi."

The PlayStation game repositories reach their framework through a Windows directory junction, which does not survive a clone. [`vbrecomp/CLAUDE.md`](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md) cites a rule in `~/.claude/CLAUDE.md`, a personal config file. [`Megaman3NESRecomp/CLAUDE.md`](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md) points at a reference held "in memory", which is not a place you can open.

Do not rebuild the missing rules by guessing. [Rules of the codebase](/docs/agents/house-invariants) is the version you can read.

Only 34 of the 86 repositories have an agent file at all, and no repository outside the mstan account has one. In the other 52, these pages are what you have. Use them as defaults, say in your report that you did, and do not invent a house style the repository has never stated.

## What you must not break

Twelve rules recur across the fleet. [Rules of the codebase](/docs/agents/house-invariants) quotes and cites each one. Short form:

1. Fix the tool, never the output. Generated C is a build artefact and is never hand-edited.
2. No stubs. A function is fully implemented or it aborts.
3. Find the first divergence. Everything after it is a consequence.
4. Sync on hardware events, never on frame numbers.
5. Ring buffers are always on. Query them backward. Never arm a trace, run, and hope.
6. A dispatch miss is a silent game-breaking bug. Check after every run.
7. If the tool you need does not exist, build it. Never route around broken tooling.
8. Unknown is an acceptable answer. Guessing is not.
9. No speculative progress. Code without a proof artefact is invalid.
10. No game files, dumps, saves or diagnostic output in git.
11. The game file's hash gates the program. Do not weaken an identity gate.
12. Read the constitution at session start. Surface a failed precondition before you work, not after.

## The loop, and what ends it

Every framework file describes the same four beats: build the recompiler, regenerate, build the game, run it and observe. [`nesrecomp/CLAUDE.md`](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md) writes it out as nine steps.

From [`CLAUDE.md`](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md) in nesrecomp, lines 73 to 84:

```text title="CLAUDE.md"
1. BUILD recompiler     →  NESRecomp.exe  (only when recompiler src changes)
2. RUN recompiler       →  generates <game>_full.c in game project's generated/
3. BUILD game project   →  GameName.exe  (after runner or game changes)
4. RUN game (timed)     →  start, wait 10s, kill
5. OBSERVE screenshot   →  Read C:/temp/nes_shot_01.png  (saved every 60 NES frames)
6. IDENTIFY bug         →  wrong pixels → ppu_renderer.c;  crash → Ghidra
7. GHIDRA if needed     →  understand what the 6502 code actually does
8. FIX the bug          →  runtime.c / ppu_renderer.c / code_generator.c
9. GOTO 1 (or 3 if only runner changed)
```

A build that succeeds is not the check. The checks are the dispatch-miss file next to the executable, the coverage report, and the oracle comparison.

Four repositories say what done means precisely enough to settle it without a human. [MegaManZeroRecomp](https://github.com/mstan/MegaManZeroRecomp) wants a strict pass: zero misses, zero interpreted instructions, zero healed code, zero unmapped accesses, zero unhandled I/O. [gbarecomp](https://github.com/mstan/gbarecomp) wants the coverage report to read FULLY STATIC. [psxrecomp](https://github.com/mstan/psxrecomp) wants pixels on screen. [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp) wants the user to confirm end to end. [Checking your own work](/docs/agents/verification-rituals) has the commands. If you cannot launch the game at all, read [When you cannot run the game](/docs/agents/when-you-cannot-run-the-game) first.

## What this fleet does not have

Read this as a list of things not to assume.

- **No CI will judge your change.** Four repositories carry a workflow file, and none of the 36 agent files mentions CI. The [psxrecomp workflow](https://github.com/mstan/psxrecomp/blob/master/.github/workflows/cli-release.yml) skips pull requests and pushes to master on purpose: "A check nobody trusts is worse than no check, because it still costs attention."
- **No formatter, linter or naming convention.** The one formatting gate is [snesrecomp](https://github.com/mstan/snesrecomp)'s native-analyzer workflow, which runs `cargo fmt -- --check` and `clippy`. Do not reformat to a standard nobody stated.
- **No specification for the TCP debug protocol**, and no schema, version or capability negotiation. Nine repositories describe the same transport in their own words, and two spellings of the error key are in use.
- **No port registry, and the ports collide.** Port 4380 is claimed by four different projects.
- **No glossary, no rule versioning, no index** of which repository solves which problem. Only psxrecomp dates its own rule changes.
- **Not every repository has a test command.** The six PlayStation game repositories and the two Sonic release repositories have none.
- **Three repositories gate all work on a Ghidra MCP server and ship no `.mcp.json`.** [nesrecomp](https://github.com/mstan/nesrecomp), [Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp) and [YoshiNESRecomp](https://github.com/mstan/YoshiNESRecomp) each say no Ghidra means no action.
- **No handoff standard.** Nine handoff documents exist under eight filenames, and no agent file tells you to write one. [Contributing as an agent](/docs/agents/contributing-as-an-agent) supplies a template.

## Source

- The five largest constitutions: [`psxrecomp/CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md), [`gbrecompiled/CLAUDE.md`](https://github.com/mstan/gbrecompiled/blob/master/CLAUDE.md), [`Megaman3NESRecomp/CLAUDE.md`](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md), [`vbrecomp/CLAUDE.md`](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md), [`nesrecomp/CLAUDE.md`](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md).
- [`nesrecomp/AGENTS.md`](https://github.com/mstan/nesrecomp/blob/master/AGENTS.md), eight lines, the shortest file in the corpus.
- [`xboxlle-probe/AGENTS.md`](https://github.com/mstan/xboxlle-probe/blob/main/AGENTS.md) and [`DKC2Recomp/AGENTS.md`](https://github.com/mstan/DKC2Recomp/blob/main/AGENTS.md), the two files unlike the rest.
- [`psxrecomp/.github/workflows/cli-release.yml`](https://github.com/mstan/psxrecomp/blob/master/.github/workflows/cli-release.yml), the fleet's only written position on CI.

## Next

- [Rules of the codebase](/docs/agents/house-invariants), the twelve rules in full.
- [Checking your own work](/docs/agents/verification-rituals), the build and test command per repository.
- [How changes go wrong here](/docs/agents/failure-modes), the ways a good-looking change breaks here.
- [Glossary](/docs/concepts/glossary), for oracle, dispatch miss and burndown.
