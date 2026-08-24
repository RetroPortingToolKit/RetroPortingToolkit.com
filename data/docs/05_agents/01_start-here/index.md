---
title: "If you are an agent, start here"
summary: "Orientation for an agent dropped into one of these repositories: what to read first, the rules that hold everywhere, the commands that decide whether you succeeded, and the capabilities this fleet does not have."
section: "agents"
sectionTitle: "For agents"
pageType: "project"
tags: ["Agents", "Conventions", "Verification"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/ndsrecomp"
updated: "2026-08-23"
---

You have been asked to change something in one of these repositories. This page is the orientation the repository itself may not give you. It says what the fleet is, what to open first, which rules are never negotiable, which commands decide whether you succeeded, and, at the end, what the fleet does not do, so that you do not plan around a capability that is not there. Read it before you touch a file.

## What this fleet is

It is a set of static recompilation toolchains, one per console, plus a much larger set of per-game repositories that consume them. A toolchain repository owns the recompiler and the runtime; a game repository owns its config, its game-specific hooks and its regenerated C, and owns no framework code, which is why [`nesrecomp/CLAUDE.md`](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md) states flatly that "The recompiler and runner are the source of truth." Correctness is established by running a reference implementation, called the oracle, beside the recompiled build and comparing state, not by looking at the screen and forming an opinion. Of the 86 repositories surveyed, 34 carry an agent instruction file, and every one of those 34 is in the [mstan](https://github.com/mstan) organisation. Work moves between sessions and between agents through markdown committed to the repository, so what you write down is as much the deliverable as the code is.

## The repository you are in

Look at the root for `CLAUDE.md` and `AGENTS.md`. There are 36 such files across 34 repositories; [gbrecompiled](https://github.com/mstan/gbrecompiled) and [nesrecomp](https://github.com/mstan/nesrecomp) carry both. They fall into three shapes, and which shape you are in changes what you should do next.

**A framework constitution** is large and self-contained: [psxrecomp](https://github.com/mstan/psxrecomp) at 511 lines, [gbrecompiled](https://github.com/mstan/gbrecompiled) at 286, [Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp) at 475, [vbrecomp](https://github.com/mstan/vbrecomp) at 302, [nesrecomp](https://github.com/mstan/nesrecomp) at 264. Read it in full. It is the authority for that toolchain, and everything downstream of it defers to it.

**A deferring game repository** is 1 to 3 KB: a pointer to its framework plus five or six local rules. The six PlayStation game repositories are near copies of one another, and so are the six Game Boy Advance ones. Read the local rules carefully, because they are the only thing in the file that is specific to you, then go and read the framework constitution.

**Two files are outliers.** [`xboxlle-probe/AGENTS.md`](https://github.com/mstan/xboxlle-probe/blob/main/AGENTS.md) governs talking to physical hardware and is mostly a safety document. [`DKC2Recomp/AGENTS.md`](https://github.com/mstan/DKC2Recomp/blob/main/AGENTS.md) is a source-port working agreement, not a recompiler.

After the constitution, open the companion documents it names. The common ones are `PRINCIPLES.md`, `TCP.md` or `TCP_COMMANDS.md`, `DEBUG.md` and `COSIM.md`. The protocol documents matter more than their size suggests, because the debug server is how you are expected to observe anything at all: see [the TCP debug protocol](/docs/reference/tcp-protocol) for the wire format and [machine-readable surfaces](/docs/agents/machine-surfaces) for everything else that is programmatically drivable.

### When the file points somewhere you cannot go

This happens often, and it is the normal case rather than the broken one. In at least 14 repositories the agent rules defer to something that is not in the repository. [`YoshiNESRecomp/CLAUDE.md`](https://github.com/mstan/YoshiNESRecomp/blob/master/CLAUDE.md) opens with an absolute Windows path:

> "**Read `F:\Projects\PRINCIPLES.md` first.** Those global principles override
> anything in this file. This file specializes them for Yoshi."

The PlayStation game repositories reach their framework through a Windows directory junction that does not survive a clone. [`vbrecomp/CLAUDE.md`](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md) cites a rule in `~/.claude/CLAUDE.md`, a personal config. [`Megaman3NESRecomp/CLAUDE.md`](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md) points at a reference "in memory", which is not a location you can open.

Do not reconstruct the missing rules by guessing. [Rules of the codebase](/docs/agents/house-invariants) is the resolvable version of what those files reach for: the twelve rules that recur across the corpus, quoted and cited, plus the places where repositories genuinely disagree.

### If there is no agent file at all

Only 34 of the 86 repositories have one, all 34 in the mstan organisation; no repository outside it carries either file. In the other 52 there are no local rules and these pages are what you have. Apply them as defaults, say in your report that you did so, and do not invent a house style the repository has never stated.

## What you must not break

Twelve rules recur across the corpus. Each is stated, quoted and cited in full on [Rules of the codebase](/docs/agents/house-invariants); this is the short form.

1. Fix the tool, never the output. Generated C is a build artefact and is never hand-edited.
2. No stubs. A function is fully implemented or it aborts.
3. Find the first divergence. Everything after it is consequence, not cause.
4. Sync on hardware events, never on frame numbers.
5. Ring buffers are always on. Query them backward; never arm, run and hope.
6. A dispatch miss is a silent game-breaking bug. Check for them after every run.
7. If the tool you need does not exist, build it. Never route around broken tooling.
8. Unknown is an acceptable answer. Guessing is not.
9. No speculative progress. Code without a proof artefact is invalid.
10. No game files, dumps, saves or diagnostic output in git.
11. The game file's hash gates the program. Do not weaken an identity gate.
12. Read the constitution at session start, and surface a failed precondition before you start work rather than after.

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

The build succeeding is not the check. The checks are the dispatch-miss artefact next to the executable, the coverage report, and the oracle comparison. Four repositories state a definition of done precise enough to be settled without a human: [MegaManZeroRecomp](https://github.com/mstan/MegaManZeroRecomp) requires a strict pass with zero misses, zero interpreted instructions, zero healed code, zero unmapped accesses and zero unhandled I/O; [gbarecomp](https://github.com/mstan/gbarecomp) requires the coverage report to read FULLY STATIC; [psxrecomp](https://github.com/mstan/psxrecomp) requires the pixels on screen; [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp) requires the user to confirm end to end. [Checking your own work](/docs/agents/verification-rituals) has the per-repository command table and says what each gate actually catches. If you cannot launch the game at all, go to [When you cannot run the game](/docs/agents/when-you-cannot-run-the-game) before you start improvising.

## What this fleet does not support

Read this section as a list of things not to assume.

- **There is no CI that will judge your change.** Only four repositories in the mstan organisation carry any workflow, and none of the 36 agent files mentions CI. The [psxrecomp workflow](https://github.com/mstan/psxrecomp/blob/master/.github/workflows/cli-release.yml) deliberately does not run on pull requests or on pushes to master, and says why: "A check nobody trusts is worse than no check, because it still costs attention."
- **There is no formatter, linter or naming convention** in any of the 36 agent files. The one formatting gate anywhere in the fleet is [snesrecomp](https://github.com/mstan/snesrecomp)'s native-analyzer workflow, which runs `cargo fmt -- --check` and `clippy`. Do not reformat a file to a standard nobody has stated.
- **The TCP debug protocol has no specification, no schema, no versioning and no capability negotiation.** Nine repositories re-describe the same transport in their own words. A client cannot ask a server what it supports; it must be told. Two spellings of the error key are in use and a client must accept both.
- **There is no port registry in the repositories, and the ports collide.** Port 4380 is claimed by four different projects.
- **There is no glossary, no rule versioning and no cross-fleet index** of which repository solves which problem. Only psxrecomp dates its own rule amendments, so you cannot tell from a file whether it still reflects practice.
- **Not every repository has a test command.** For the six PlayStation game repositories and the two Sonic release repositories there is no test command in the repository at all; they defer to a framework checkout reached by a Windows junction or a workspace sibling.
- **Three repositories gate all work on a Ghidra MCP server and ship no `.mcp.json`.** [nesrecomp](https://github.com/mstan/nesrecomp), [Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp) and [YoshiNESRecomp](https://github.com/mstan/YoshiNESRecomp) each say no Ghidra means no action, and none of them configures a server for you to reach.
- **There is no handoff standard.** Nine handoff documents exist under eight different filenames, and no agent file tells you to write one. [Contributing as an agent](/docs/agents/contributing-as-an-agent) supplies the template the fleet has never had.

## Source

- The five largest constitutions: [`psxrecomp/CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md), [`gbrecompiled/CLAUDE.md`](https://github.com/mstan/gbrecompiled/blob/master/CLAUDE.md), [`Megaman3NESRecomp/CLAUDE.md`](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md), [`vbrecomp/CLAUDE.md`](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md), [`nesrecomp/CLAUDE.md`](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md).
- [`nesrecomp/AGENTS.md`](https://github.com/mstan/nesrecomp/blob/master/AGENTS.md), eight lines, the shortest file in the corpus.
- [`xboxlle-probe/AGENTS.md`](https://github.com/mstan/xboxlle-probe/blob/main/AGENTS.md) and [`DKC2Recomp/AGENTS.md`](https://github.com/mstan/DKC2Recomp/blob/main/AGENTS.md), the two outliers.
- [`psxrecomp/.github/workflows/cli-release.yml`](https://github.com/mstan/psxrecomp/blob/master/.github/workflows/cli-release.yml), the fleet's only written CI philosophy.

## Next

- [Rules of the codebase](/docs/agents/house-invariants), the twelve invariants in full, with the disagreements named.
- [Checking your own work](/docs/agents/verification-rituals), the per-repository build and test commands, and what each gate catches.
- [How changes go wrong here](/docs/agents/failure-modes), for the recompilation-specific ways a good-looking change breaks.
- [Glossary](/docs/concepts/glossary), if oracle, dispatch miss or burndown are not yet words you use precisely.
