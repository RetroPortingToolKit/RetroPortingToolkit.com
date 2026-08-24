---
title: "It boots, then it crashes"
kicker: "Tutorial"
desc: "Your port built, ran, and died twenty minutes in. That is the normal case: here is what a dispatch miss is, how to turn a crash address into a fix, and when the fix belongs in the framework instead."
date: "2026-08-24"
author: "Matthew Stanley"
tags: ["Tutorial", "Debugging", "Dispatch misses"]
layout: "article"
---

Your port built. It opened a window, ran the title screen, took input, and then twenty minutes into the game it froze or fell over. This is not a disaster and it is not evidence that something went wrong earlier. It is the shape of the work on every console in this fleet, and the first build is the point where it starts rather than the point where it ends. This article is the loop that follows: what actually happened, how to turn one crash into one configuration change, and how to tell when the change belongs somewhere else entirely.

## Why it happens twenty minutes in and not at boot

A static recompiler has to decide which bytes in a cartridge are instructions before the game runs, and a cartridge does not say. It is one flat block of graphics, tables, text, sound data and code, with no symbols and nothing marking where a function begins. The recompiler starts from the addresses the hardware guarantees, follows every call and jump it can see, and adds heuristic passes for tables it can recognise. [Telling code from data](/docs/concepts/code-discovery) is that search in detail.

The search is good and it is not complete. Anything reached only through a pointer the game computes at runtime, from a table too small or too irregular for a scanner to recognise, or from a routine that is copied into RAM before it runs, can be invisible to every static pass. nesrecomp's own README puts a number on it: roughly 80 to 93 percent recall of dispatch table targets against a game with exhaustive disassembly ground truth, with the remainder needing to be declared by hand.

That is why the failure arrives late. Boot code, the title screen and the first room are the most statically reachable code in the game. The enemy that only appears on the fourth floor, the cutscene after a boss, the routine only the credits use: those are the ones reached through a table nothing statically references. You do not find them by reading. You find them by playing until something breaks.

## The dispatch miss

When translated code executes a jump to a computed address, it calls into a dispatch function that maps the guest address to a generated C function. When there is no entry, that is a **dispatch miss**, and it is the single most important diagnostic in this ecosystem.

Most toolchains here write them to a file called `dispatch_misses.log` next to the game executable, and four of them make reading it the rule that runs before any other debugging. gbrecompiled spells the same idea `interp_fallbacks.log`, with bank and address per line.

From [`DEBUG.md`](https://github.com/mstan/gbarecomp/blob/main/DEBUG.md):

```text title="DEBUG.md"
# RULE 0a — DISPATCH MISS CHECK (every run, before any debugging)

Before anything else, read `dispatch_misses.log` next to the game
executable.

- If non-empty: add the listed functions (with detected mode: ARM or
  THUMB) to `game.toml [functions]`, regenerate, rebuild, re-run.
- Repeat until `dispatch_misses.log` is empty.

A game with dispatch misses is FUNDAMENTALLY BROKEN. Do not debug
anything else until resolved.
```

The word to notice is silent. vbrecomp spells out why: a miss means the dispatch found no generated function, "The game skips that entire subroutine", and it calls that a silent game breaking bug. A skipped subroutine raises nothing. The game continues with whatever state it had, and the consequence surfaces elsewhere, some number of frames later, as a wrong value, a wrong sprite, a freeze, or a crash. By the time you see the symptom you are downstream of the cause, which is exactly the situation the whole method exists to avoid.

The repositories are not unanimous on what happens at the moment of the miss, and it is worth knowing which one you are on. vbrecomp describes the subroutine being skipped outright. In nesrecomp, interpreter fallback discovery is on by default: the miss is recorded and the code runs interpreted, with a `fallback_telemetry.jsonl` alongside the log carrying a record for each first sighting. gbarecomp goes further and describes bridging a missed PC through the interpreter, compiling it, and remembering it on disk. Either way the log is the thing to empty, because a fallback tier is slower and, more importantly, is telling you your configuration is incomplete.

## Turning a crash into a fix

The loop is four steps and it is short. Capture the address, declare it, regenerate, retest.

**Capture it.** The log line is already formatted to be pasted. nesrecomp writes "one manifest-ready `extra_func` line for each first-seen bank/address pair". gbarecomp writes the address with its detected instruction mode, ARM or THUMB, because BX and BLX targets carry the mode bit and code generation needs to know which entry signature to emit. If the runtime is live and you want to ask rather than read a file, `dispatch_miss_info` over the debug protocol returns the count plus the ring of recent misses.

**Declare it.** On NES, addresses go under `[functions]` keyed by bank, and the convention is to annotate what each one is so the file stays readable a year later. From [FaxanaduRecomp's `game.toml`](https://github.com/mstan/FaxanaduRecomp/blob/master/game.toml):

```toml title="game.toml"
[functions]
fixed = [
    0xC0A0, 0xC559, 0xC9C1, 0xCCC4, 0xCE9A, 0xD8F0, 0xFF03, 0xFF3C, 0xFFA5,
    0xD673,  # fixed-bank VRAM write (called dynamically)
    0xC2E9,  # entity loop continuation — pushed as $C2E8 by $BAD9 4-PHA
]
bank5 = [
    0x828E,  # entity dispatch via RAM vector $2901
    0x8680,  # bare RTS no-op in sound dispatch table
    0x9D86,  # from correct illegal opcode sizes
]
```

On Game Boy Advance the same block is split by instruction mode instead of by bank. From [MinishCapRecomp's `game.toml`](https://github.com/mstan/MinishCapRecomp/blob/main/game.toml):

```toml title="game.toml"
[functions]
arm   = []
thumb = []
```

If the misses cluster, look for the table rather than listing its entries. A run of addresses a few bytes apart is almost always a dispatch table the scanner did not recognise, and declaring the table once with a `[[known_table]]` or `[[split_table]]` entry covers every target in it, including the ones you have not hit yet.

**Watch the two traps.** The first is the difference between creating a function and creating an entry point. nesrecomp's README is blunt: adding an address as `extra_func` when it sits inside an existing function splits that function, breaks its internal gotos, and causes freezes. `extra_label` is the form for an address inside an existing body. The second is the temptation to declare aggressively, and Boktai's recompiler config states the asymmetry that should stop you:

```toml title="variants/boktai1_usa/symbols/boktai1_usa_recompile.toml"
# False-positive policy (load-bearing):
#   Missing a function  -> a runtime_dispatch_miss naming the exact PC. Cheap.
#   Data decoded as code -> junk C that may silently dispatch and corrupt
#                           state, bypassing the oracle diff. Catastrophic.
# So: lean conservative, and close gaps here deliberately.
```

**Regenerate and retest.** Then run the log again, because closing one miss routinely exposes the next: code that was being skipped now executes, and what it calls can be missing too. Repeat until the file is empty. That loop is the bulk of bringing up a port.

Whatever you learned along the way belongs in the repository, not in your head. On NES that means a line in the annotations CSV, which the recompiler emits into the generated C as a comment at that address; everywhere else it means a comment beside the entry you just added. A seed with no note is a seed nobody can safely remove later.

## The other two routes

Not every late crash is a dispatch miss, and once the log is empty you need instruments.

**The TCP debug protocol.** The runtimes here open a debug server that speaks JSON over newline: one request object per line, one response line back, with the request's `id` echoed. It is activated by a `debug.ini` next to the executable or by a CLI flag, depending on the console. smsggrecomp is the one stated exception, taking plain newline terminated commands and replying in JSON. The portable command set is worth knowing because a tool written against one console mostly works against another: `get_registers`, `read_ram`, `get_frame` and `frame_range` against a ring of recent frames, `read_frame_ram` for RAM as of a specific past frame, `set_input` and `press` to drive the game without hands, `screenshot`, and `dispatch_miss_info`.

Three rules govern its use and all three exist because somebody broke them. Sync on hardware events, never on frame numbers, because frames drift after a single timing glitch. Query the always on ring rather than arming a trace and re-running, because by the time you have armed and restarted, the interesting event has already happened. And never pause two observers and step them together to line them up: two observer synchronisation is free run, ring query, diff.

**Co-simulation.** When a project has a reference implementation it trusts, you can run both over the same deterministic sequence and compare state per frame instead of guessing from symptoms. nesrecomp compares against an in process libretro host; gbarecomp names mGBA as its oracle, with NanoBoyAdvance as a tiebreaker only. The method is first divergence narrowing: find the earliest frame where state differs, then the first write that produced the wrong value, then the function that made the write. Later differences are consequences, and only the first has a root cause.

Insist on one thing: that the comparator is not blind. Fault injection, where a deliberately corrupted byte must halt the comparison at the right place and name the right subsystem, is the only gate that catches a comparator reporting agreement because it is reading nothing. [Debug a divergence](/docs/guides/debug-a-divergence) is that whole procedure, including how to read a halt report.

## When the fix does not belong in your game

Every project in this fleet that has an opinion has the same one, and it is the most useful rule in this article.

From [`CLAUDE.md`](https://github.com/mstan/MegaManX6Recomp/blob/master/CLAUDE.md):

> Codegen/runtime fixes belong in the framework (`psxrecomp-v4/`) or in
> per-game `game.toml` config — never in `generated/*.c`. A fix that only this
> game needs is a smell; prefer a class fix that the next title inherits.

The classification decides who fixes it. Wrong C emitted for a correctly identified instruction is a code generation bug and belongs in the recompiler. Wrong hardware behaviour, timing or IO belongs in the runtime. A missing seed or a mis-declared table is genuinely per game. A function the finder should have found generically is the interesting case, because it looks like a config problem and is not: if the pattern that hid it appears in other games, the durable fix is a pass that recognises it, and your entry is a workaround the next porter has to rediscover.

Minish Cap has a worked example of exactly that judgment, recorded in the file where the fix landed. A block of code the game copies into IWRAM and runs with interrupts live can be re-entered at any instruction boundary, not only at its entry, because the runtime yields to present a frame and then re-dispatches wherever it happened to be. On one engine revision that landed eight bytes into the function about 291 times over 900 frames; on the revision the port had previously pinned, it landed elsewhere. Nothing about the game had changed. The note explains why it was not fixed as a list of observed addresses:

```toml title="symbols/minishcap_reviewed.toml"
# Declared as a [[resume_range]] rather than one [[extra_func]] resume = true
# per observed address, because chasing individual PCs only re-fixes this the
# next time frame pacing shifts by an instruction.
```

That is the tell. If your fix is a list of specific addresses that would need extending the next time anything unrelated moves, you have described a symptom rather than a cause.

## What never happens

Four moves are forbidden across the fleet, and each one converts a fixable bug into a permanent one.

Do not hand edit generated code. It is regenerated from your ROM on every run, so your edit is gone, and while it survives it hides the real defect from every diff and every comparison.

Do not add a special case for your game to a framework's console core. If your title exercises an obscure hardware corner, the fix goes in the core with evidence, not behind a check on the game's name.

Do not stub something to return what the game expects, and do not silence a diagnostic because it is noisy. If something gets noisy, decide deliberately: implement it, or document why it is safe and put it on an allowlist that is itself logged at startup.

Do not disable a watchdog assertion. If the watchdog fires, the state is wrong. Fix the state.

## Source

- [gbarecomp](https://github.com/mstan/gbarecomp): `DEBUG.md`, `TCP.md`, `docs/DEBUGGING.md`
- [nesrecomp](https://github.com/mstan/nesrecomp): `README.md`, `TCP.md`, `COSIM.md`
- [psxrecomp](https://github.com/mstan/psxrecomp): `DEBUG.md`, `TCP_COMMANDS.md`
- [vbrecomp](https://github.com/mstan/vbrecomp): `TCP.md`
- [gbrecompiled](https://github.com/mstan/gbrecompiled): `README.md`
- [smsggrecomp](https://github.com/mstan/smsggrecomp): `DEBUG.md`
- [FaxanaduRecomp](https://github.com/mstan/FaxanaduRecomp): `game.toml`, `baserom_annotations.csv`
- [MinishCapRecomp](https://github.com/mstan/MinishCapRecomp): `game.toml`, `symbols/minishcap_reviewed.toml`, `CLAUDE.md`
- [BoktaiRecomp](https://github.com/Shy/BoktaiRecomp): `variants/boktai1_usa/symbols/boktai1_usa_recompile.toml`
- [MegaManX6Recomp](https://github.com/mstan/MegaManX6Recomp): `CLAUDE.md`
- [PokemonStadiumRecomp](https://github.com/mstan/PokemonStadiumRecomp): `DEBUG.md`

## Read next

- [Debug a divergence](/docs/guides/debug-a-divergence), the localisation procedure in full
- [Telling code from data](/docs/concepts/code-discovery), why the misses exist at all
- [Start a NES port](/blog/tutorial-start-a-nes-port) and [start a Game Boy Advance port](/blog/tutorial-start-a-game-boy-advance-port), the two tutorials this one follows
