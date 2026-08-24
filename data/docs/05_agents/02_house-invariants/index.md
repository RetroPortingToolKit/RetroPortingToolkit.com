---
title: "Rules of the codebase"
summary: "The twelve engineering rules that recur across the fleet's 36 agent instruction files, each quoted and cited, plus the thirteen places where repositories instruct differently on the same question."
section: "agents"
sectionTitle: "For agents"
pageType: "reference"
tags: ["Agents", "Conventions", "Correctness"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/vbrecomp"
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/MegaManZeroRecomp"
updated: "2026-08-23"
---

Thirty-six agent instruction files across thirty-four repositories say a lot of different things, but twelve rules recur across most of them, and those twelve are the engineering philosophy of this fleet stated out loud. This page collects them, each with the reason it exists and a verbatim quote from a repository that states it. It closes with the thirteen questions on which repositories genuinely instruct differently, because a summary that hid those would send you into a repository with the wrong rule in hand. Terms used here in the fleet's own sense, such as oracle, dispatch miss and divergence, are defined in the [glossary](/docs/concepts/glossary).

## Why this page exists

In at least fourteen repositories the agent rules defer to something that is not in the repository. [`YoshiNESRecomp/CLAUDE.md`](https://github.com/mstan/YoshiNESRecomp/blob/master/CLAUDE.md) says to read `F:\Projects\PRINCIPLES.md` first and that those principles override the local file; that is an absolute path on one workstation. The six PlayStation game repositories read their framework constitution through `psxrecomp-v4/`, which [`ApeEscapeRecomp/CLAUDE.md`](https://github.com/mstan/ApeEscapeRecomp/blob/master/CLAUDE.md) describes as "a junction → `F:/Projects/psxrecomp/psxrecomp`", and a Windows directory junction does not survive a clone. [`SuperMarioWorldRecomp/CLAUDE.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/CLAUDE.md) defers to a `recomp-template` repository that is not part of this fleet. [`vbrecomp/CLAUDE.md`](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md) cites a rule living in `~/.claude/CLAUDE.md`, a personal config no contributor can read. [`Megaman3NESRecomp/CLAUDE.md`](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md) points at a command reference held "in memory", which is not a location.

That is a normal thing to happen to a set of rules that grew inside one working environment. It is also why the rules have never had a public, resolvable address. This page is that address.

> **Note.** This page is a survey, not an authority. Where a repository states a rule in its own files, follow the repository. Where the repository's rule points somewhere you cannot open, use this page rather than guessing.

## The twelve rules

### Fix the tool, never the output

Generated C is a build artefact. If it is wrong, the recompiler, the runtime or the per-game config is wrong.

It exists because a hand edit to generated code is destroyed by the next regeneration, silently, and takes the knowledge of the bug with it. The corollary matters as much: a fix that only one game needs is treated as a smell, and a class fix that the next title inherits is preferred.

From [`CLAUDE.md`](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md) in nesrecomp, lines 39 to 44:

> `generated/*_full.c` and `generated/*_dispatch.c` are BUILD ARTIFACTS.
>
> **NEVER read them whole. NEVER modify them. NEVER patch them.**
>
> If generated code is wrong → fix `recompiler/src/code_generator.c` and regenerate.

Also stated in [psxrecomp](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md), [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp/blob/master/CLAUDE.md), [SuperMetroidRecomp](https://github.com/mstan/SuperMetroidRecomp/blob/main/CLAUDE.md), [gcnlle](https://github.com/mstan/gcnlle/blob/master/CLAUDE.md) and [ApeEscapeRecomp](https://github.com/mstan/ApeEscapeRecomp/blob/master/CLAUDE.md). It is the single most repeated rule in the corpus, present in at least twenty of the thirty-four repositories.

### No stubs

A function is either fully implemented or it aborts with a fatal error.

It exists because a stub converts a missing implementation into a wrong answer, and a wrong answer propagates until it surfaces somewhere unrelated. The rule is written to close the obvious escapes: a placeholder return, a `// TODO`, and the subtle one, hand-delivering a result that the missing code would have produced.

From [`CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md) in psxrecomp, lines 77 to 82:

> There are **no stubs**. A function is either fully implemented or it aborts with a fatal error. `return 0;`, `return 1;`, `cpu->v0 = 1; return;` are all stubs. `// TODO`, `// FIXME`, `// for now` are all stubs. Hand-delivering an event because the chain handler isn't installed is a stub wearing a costume and is the worst kind because it hides the missing integration.

Also stated in [vbrecomp](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md), which names `vb_stub_abort(...)` as the abort path, in [YoshiNESRecomp](https://github.com/mstan/YoshiNESRecomp/blob/master/CLAUDE.md), and in [`psxrecomp/PRINCIPLES.md`](https://github.com/mstan/psxrecomp/blob/master/PRINCIPLES.md) as rule 12.

### The first divergence is the only bug

When the recompiled build and the oracle disagree, find the earliest point of disagreement. Everything after it is consequence.

It exists because a final symptom is almost never the fault. Debugging the visible breakage means debugging a state that was already wrong several thousand instructions earlier, which is how sessions get spent on the wrong subsystem.

From [`CLAUDE.md`](https://github.com/mstan/gbarecomp/blob/main/CLAUDE.md) in gbarecomp, lines 180 to 182:

> - Expect divergence early. The earliest divergence is the only one
>   with a root cause; everything after is consequence.

Also stated in [Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md), [YoshiNESRecomp](https://github.com/mstan/YoshiNESRecomp/blob/master/CLAUDE.md), [ndsrecomp](https://github.com/mstan/ndsrecomp/blob/main/CLAUDE.md) in both its rules and its [`TCP.md`](https://github.com/mstan/ndsrecomp/blob/main/TCP.md), and in [`psxrecomp/PRINCIPLES.md`](https://github.com/mstan/psxrecomp/blob/master/PRINCIPLES.md) as rule 3.

### Sync on hardware events, not frame numbers

Line the two implementations up on something the hardware did, not on an index that each engine counts its own way.

It exists because frame numbers do not mean the same thing in two implementations, and on a two-CPU machine they do not mean anything at all. A comparison taken at a mismatched point reports a difference that is an artefact of the alignment.

From [`CLAUDE.md`](https://github.com/mstan/gbarecomp/blob/main/CLAUDE.md) in gbarecomp, lines 176 to 179:

> - Sync via **hardware events**, not raw frame numbers.
>   Useful sync points: VBlank IRQ count, DMA completion count, timer
>   overflow count, SWI count, BIOS-IRQ-return count, specific PC at
>   specific function entry.

Also stated in [Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md), which lists PPU state, scroll position and palette snapshot as markers, in [YoshiNESRecomp](https://github.com/mstan/YoshiNESRecomp/blob/master/CLAUDE.md), in [`ndsrecomp/TCP.md`](https://github.com/mstan/ndsrecomp/blob/main/TCP.md), and in [gcnlle](https://github.com/mstan/gcnlle/blob/master/CLAUDE.md), which diffs by value and order rather than frame alignment.

### Always-on ring buffers, queried backward

The runtime records continuously. You connect afterwards and ask what already happened.

It exists because the alternative, arming a trace and then trying to reproduce the event, fails on anything intermittent and changes the timing of what you are measuring. It is also why several repositories refuse to pause: an observation taken from a stopped runtime is an observation of a different program.

From [`CLAUDE.md`](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md) in vbrecomp, lines 98 to 100:

> Always-on ring buffers (frame snapshots, fntrace, wtrace) cover
> historical events. Probes QUERY the ring; they do NOT arm a trace,
> run a workload, and hope.

Also stated in [SuperMarioWorldRecomp](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/CLAUDE.md), [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp/blob/master/CLAUDE.md), which inventories five rings, [ndsrecomp](https://github.com/mstan/ndsrecomp/blob/main/CLAUDE.md) and [`gcnlle/docs/TCP_COMMANDS.md`](https://github.com/mstan/gcnlle/blob/master/docs/TCP_COMMANDS.md).

### A dispatch miss is a silent game-breaking bug

When the dispatcher finds no generated function for an address, the game skips that subroutine and keeps going. Check the miss artefact after every run.

It exists because this failure is invisible. Nothing crashes, nothing prints, the game simply does less than it should, and the resulting misbehaviour looks like a hardware bug somewhere else entirely.

From [`TCP.md`](https://github.com/mstan/vbrecomp/blob/master/TCP.md) in vbrecomp, lines 167 to 175:

> Dispatch misses are logged to `dispatch_misses.log` next to the
> executable. This file is the PRIMARY source — check it after EVERY
> runtime run. `dispatch_miss_info` via TCP returns the same data live.
>
> A dispatch miss means `vb_dispatch(addr)` found no generated function.
> The game skips that entire subroutine. This is a SILENT GAME-BREAKING
> BUG.

Also stated in [cdirecomp](https://github.com/mstan/cdirecomp/blob/master/CLAUDE.md), [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp/blob/master/CLAUDE.md) with a `dispatch_misses.toml`, [gbarecomp](https://github.com/mstan/gbarecomp/blob/main/CLAUDE.md) with a coverage report and a miss-list fragment, and [TsumuLightRecomp](https://github.com/mstan/TsumuLightRecomp/blob/master/CLAUDE.md). The artefact names differ per toolchain; [Checking your own work](/docs/agents/verification-rituals) lists which file to open where.

### Build the tool that answers the question

If the query you need does not exist, add it to the debug server. Do not work around it.

It exists because routing around a missing or broken tool produces conclusions nobody can check, and a known-broken tool compounds: two broken implementations that agree are not evidence of correctness, they are evidence of a shared bug.

From [`CLAUDE.md`](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md) in Megaman3NESRecomp, lines 218 to 226:

> If a required query/tool does NOT exist:
>
> - You MUST implement it in the native TCP server OR emulator TCP server
> - You MUST NOT work around missing tooling
> - You MUST NOT fall back to logging or guessing
>
> **IF TOOLING IS MISSING → BUILD IT FIRST → THEN CONTINUE**

Also stated in [psxrecomp](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md), whose rule 15 refuses to carry a broken tool forward as a known limitation, in [`psxrecomp/PRINCIPLES.md`](https://github.com/mstan/psxrecomp/blob/master/PRINCIPLES.md) as rule 10, and in [`nesrecomp/TCP.md`](https://github.com/mstan/nesrecomp/blob/master/TCP.md), which adds that a side-channel debug log is never the substitute.

### Unknown is acceptable, guessing is not

Say what you measured. When you have not measured it, say that instead of estimating it.

It exists because a hedged guess reads like a finding once it is written down, and the next session inherits it as fact. Several repositories ban the vocabulary directly: no "likely", no "probably", no "this might be".

From [`CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md) in psxrecomp, lines 189 to 191:

> Use all three, never just one. Don't guess. Don't say "probably". If you
> cannot answer a question from the disasm, Ghidra, or the Beetle oracle,
> the answer is "I don't know yet" — not a confident guess.

Also stated in [Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md), [YoshiNESRecomp](https://github.com/mstan/YoshiNESRecomp/blob/master/CLAUDE.md), and [xboxlle-probe](https://github.com/mstan/xboxlle-probe/blob/main/AGENTS.md), which requires observed values to be distinguished from interpretations and from emulator-derived expectations. This rule binds hardest when you are least able to measure: see [when you cannot run the game](/docs/agents/when-you-cannot-run-the-game).

### No speculative progress

Work touching indirect jumps, relocation or hardware interaction must produce an artefact that proves it, not just code that compiles.

It exists because those three areas are where a plausible implementation and a correct one look identical until much later. The demanded artefact varies by toolchain: an oracle comparison, a decoder report, a screenshot, a manifest.

From [`CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md) in psxrecomp, lines 312 to 325:

> If a step involves:
>
> - indirect jumps
> - relocation
> - hardware interaction
>
> You MUST produce:
>
> - manifest
> - proof artifact
>
> Code without proof is invalid.

Also stated in [vbrecomp](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md), and in weaker form in [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp/blob/master/CLAUDE.md) and [smsggrecomp](https://github.com/mstan/smsggrecomp/blob/main/CLAUDE.md), which both require the user to verify end to end before a fix is called fixed.

### Nothing from the game file goes in git

Game files, BIOS images, dumps, saves, extracted assets, generated code derived from them and diagnostic output all stay outside the repository.

It exists as a hard content boundary. Several repositories also keep release binaries and build outputs out, and [MegaManZeroRecomp](https://github.com/mstan/MegaManZeroRecomp/blob/main/CLAUDE.md) requires the release packager itself to produce archives free of ROM, BIOS, save, config, symbol and generated-source content.

From [`AGENTS.md`](https://github.com/mstan/DKC2Recomp/blob/main/AGENTS.md) in DKC2Recomp, lines 11 to 12:

> - Never add ROMs, save files, extracted graphics, music, BRR samples, level
>   data, screenshots, or generated game binaries to the repository.

Also stated in [xboxlle-probe](https://github.com/mstan/xboxlle-probe/blob/main/AGENTS.md), which extends the list to IP and MAC addresses, credentials, console-unique identifiers and unsanitised probe logs, in [MegaManZeroRecomp](https://github.com/mstan/MegaManZeroRecomp/blob/main/CLAUDE.md), [smsggrecomp](https://github.com/mstan/smsggrecomp/blob/main/CLAUDE.md) and [MegaManX6Recomp](https://github.com/mstan/MegaManX6Recomp/blob/master/CLAUDE.md).

> **You provide this.** You supply your own game file. These repositories do not contain one and do not distribute one, which is why the identity gate below exists at all. See [the game file you supply](/docs/concepts/the-game-file-you-supply).

### The game file's hash gates the program

The runtime verifies the file it was given and refuses to start on an unknown one. New versions are added by checksum.

It exists because almost every downstream assumption is version-specific. A near-miss revision produces a build that runs and is wrong, which is far more expensive than a build that refuses to start.

From [`CLAUDE.md`](https://github.com/mstan/MinishCapRecomp/blob/main/CLAUDE.md) in MinishCapRecomp, lines 37 to 39:

> 3. **ROM hash gates everything.** The runner refuses to launch with
>    an unknown ROM. Versions live in `config/<region>.toml`. New
>    versions are added by checksum, not by guessing.

Also stated in [DragonBallZBuusFuryRecomp](https://github.com/mstan/DragonBallZBuusFuryRecomp/blob/main/CLAUDE.md), which says not to weaken the identity gate, in [FireRedLeafGreenRecomp](https://github.com/mstan/FireRedLeafGreenRecomp/blob/main/CLAUDE.md), in [ndsrecomp](https://github.com/mstan/ndsrecomp/blob/main/CLAUDE.md), where three dumps are verified before the runtime starts, and in [LegendOfZeldaNESRecomp](https://github.com/mstan/LegendOfZeldaNESRecomp/blob/master/CLAUDE.md).

### Check your preconditions before you start

Read the constitution, confirm the phase, confirm the tools you depend on are reachable, and surface a failed precondition before doing the work rather than after.

It exists because the expensive failure is a session that runs to completion on a broken assumption. The checklist is cheap and it fails fast.

From [`CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md) in psxrecomp, lines 236 to 248:

> At the start of every session, before any code change:
>
> 1. Read this file (CLAUDE.md).
> 2. Read docs/internal/PLAN.md to confirm what phase we are in and what the next
>    concrete milestone is.
> 3. Verify `docs/psx_bios_disasm.txt` exists (primary reference).
> 4. Verify Ghidra MCP is reachable. If not, stop and ask.
>
> [snip]
>
> If any of these fail, do not proceed with the user's task — surface
> the failure first.

Also stated in [Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md), which additionally requires the rules to be restated back before work starts, in [vbrecomp](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md) and [YoshiNESRecomp](https://github.com/mstan/YoshiNESRecomp/blob/master/CLAUDE.md).

## Where repositories disagree

Thirteen questions get different answers in different repositories. On each of these, the repository you are in wins, and no rule from another repository transfers.

### Pausing the runtime

Forbidden outright in [SuperMarioWorldRecomp](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/CLAUDE.md), whose RULE 0 says violating it invalidates every conclusion drawn from the paused observation. Removed in [psxrecomp](https://github.com/mstan/psxrecomp/blob/master/TCP_COMMANDS.md), where `pause`, `continue`, `step` and `run_to_frame` are still registered and always return an error. Preferred against in [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp/blob/master/CLAUDE.md) and [ndsrecomp](https://github.com/mstan/ndsrecomp/blob/main/CLAUDE.md). Documented and supported in [`nesrecomp/TCP.md`](https://github.com/mstan/nesrecomp/blob/master/TCP.md), [`vbrecomp/TCP.md`](https://github.com/mstan/vbrecomp/blob/master/TCP.md) and [`cdirecomp/TCP.md`](https://github.com/mstan/cdirecomp/blob/master/TCP.md). Actively recommended in [LegendOfZeldaNESRecomp](https://github.com/mstan/LegendOfZeldaNESRecomp/blob/master/CLAUDE.md) for frame-by-frame analysis.

### printf debugging

Absolute in [psxrecomp](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md), which forbids `fprintf(stderr, ...)` in source "ever, for any reason", and in [YoshiNESRecomp](https://github.com/mstan/YoshiNESRecomp/blob/master/CLAUDE.md). Allowed with one named exception in [vbrecomp](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md), for a crash banner. A numbered step in the debugging loop in [nesrecomp](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md) and a last resort in [gbrecompiled](https://github.com/mstan/gbrecompiled/blob/master/CLAUDE.md). Restricted only in hot paths in [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp/blob/master/CLAUDE.md). And [Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md) forbids it near the top of the file and mandates `printf(...)` with `fflush(stdout)` three hundred lines later in the same file.

### Whether an interpreter exists

It does not exist and must not be written, in [psxrecomp](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md) and [vbrecomp](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md). It exists as a carve-out inside the same psxrecomp file, whose rule 18 mandates a small MIPS interpreter for code installed at runtime. It is a named runtime source file in [gbrecompiled](https://github.com/mstan/gbrecompiled/blob/master/CLAUDE.md). It is the default for uncovered code in [SuperMetroidRecomp](https://github.com/mstan/SuperMetroidRecomp/blob/main/CLAUDE.md). It is permitted under conditions in [gbarecomp](https://github.com/mstan/gbarecomp/blob/main/CLAUDE.md) and [MegaManZeroRecomp](https://github.com/mstan/MegaManZeroRecomp/blob/main/CLAUDE.md), and its presence is a showstopper in [MinishCapRecomp](https://github.com/mstan/MinishCapRecomp/blob/main/CLAUDE.md).

### Where HLE sits

Within [`psxrecomp/CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md) alone the position moves three times through dated amendments, from no HLE layer at all, to a permitted subsystem replacement, to a standing swappable tier, to the default. Elsewhere: [gcnlle](https://github.com/mstan/gcnlle/blob/master/CLAUDE.md) forbids drifting toward an HLE boot, [cdirecomp](https://github.com/mstan/cdirecomp/blob/master/CLAUDE.md) recompiles the system ROM with no hand-written stubs, [gbarecomp](https://github.com/mstan/gbarecomp/blob/main/CLAUDE.md) permits only an opt-in shadow that never becomes the verify oracle, and [MegaManZeroRecomp](https://github.com/mstan/MegaManZeroRecomp/blob/main/CLAUDE.md) calls HLE opt-in convenience and never the correctness oracle. See [high level and low level](/docs/concepts/hle-and-lle).

### How hard a gate Ghidra is

A hard session gate with no exceptions in [nesrecomp](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md), [gbrecompiled](https://github.com/mstan/gbrecompiled/blob/master/CLAUDE.md) and [Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md): no Ghidra means no action. A checklist item that stops and asks in [psxrecomp](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md). Explicitly demoted in [vbrecomp](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md), which says not to make Ghidra the source of truth for execution correctness because SLEIGH bugs exist. Not the discovery mechanism at all in [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp/blob/master/CLAUDE.md) and [smsggrecomp](https://github.com/mstan/smsggrecomp/blob/main/CLAUDE.md), where static disassembly is ground truth.

### Automatic screenshots

Automatic every 60 frames in [nesrecomp](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md). Explicitly forbidden in [Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md) and [YoshiNESRecomp](https://github.com/mstan/YoshiNESRecomp/blob/master/CLAUDE.md), which want script-triggered captures instead. Those two consume nesrecomp, so this is a disagreement inside one toolchain.

### Screenshot format

PNG in [nesrecomp](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md), which prohibits BMP as too large for token limits. PPM in [gbrecompiled](https://github.com/mstan/gbrecompiled/blob/master/CLAUDE.md). Client-side BMP or PPM in [`cdirecomp/TCP.md`](https://github.com/mstan/cdirecomp/blob/master/TCP.md).

### `game.cfg` or `game.toml`

[nesrecomp](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md) says a game repository contains `game.cfg`. [Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md), on the same framework, uses `game.toml`. [YoshiNESRecomp](https://github.com/mstan/YoshiNESRecomp/blob/master/CLAUDE.md) is explicit that this is unresolved and says the TOML parser had problems with that project, so do not switch back without fixing it. Across the fleet, [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp/blob/master/CLAUDE.md) and [smsggrecomp](https://github.com/mstan/smsggrecomp/blob/main/CLAUDE.md) use `game.toml`, [cdirecomp](https://github.com/mstan/cdirecomp/blob/master/CLAUDE.md) uses `game.cfg`.

### How to resolve a dispatch miss

[gbarecomp](https://github.com/mstan/gbarecomp/blob/main/CLAUDE.md) runs a miss-to-proposal pipeline that emits candidate entries from the miss log for a human to merge, and [`vbrecomp/TCP.md`](https://github.com/mstan/vbrecomp/blob/master/TCP.md) says to add entries to the game's TOML and regenerate. [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp/blob/master/CLAUDE.md) and [smsggrecomp](https://github.com/mstan/smsggrecomp/blob/main/CLAUDE.md) forbid exactly that, requiring resolution through the disassembly-driven pipeline rather than hand-adding entries from the log alone. [YoshiNESRecomp](https://github.com/mstan/YoshiNESRecomp/blob/master/CLAUDE.md) forbids touching those entries at all until a divergence is proven to originate from a missing function.

### Who declares a fix done

The user, in [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp/blob/master/CLAUDE.md) and [smsggrecomp](https://github.com/mstan/smsggrecomp/blob/main/CLAUDE.md). The agent, after validating it itself, in [`nesrecomp/AGENTS.md`](https://github.com/mstan/nesrecomp/blob/master/AGENTS.md). A machine check, in [MegaManZeroRecomp](https://github.com/mstan/MegaManZeroRecomp/blob/main/CLAUDE.md) and [gbarecomp](https://github.com/mstan/gbarecomp/blob/main/CLAUDE.md). Pixels on a screen, in [psxrecomp](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md) and [vbrecomp](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md).

### Unit tests

Required before and after a milestone in [DKC2Recomp](https://github.com/mstan/DKC2Recomp/blob/main/AGENTS.md), which also asks for synthetic unit tests for public behaviour. Explicitly deprioritised in [gbrecompiled](https://github.com/mstan/gbrecompiled/blob/master/CLAUDE.md): "Do not run unit tests as primary driver — run the game".

### Commit cadence

Never commit without explicit user instruction, in [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp/blob/master/CLAUDE.md) and [smsggrecomp](https://github.com/mstan/smsggrecomp/blob/main/CLAUDE.md). [TombaRecomp](https://github.com/mstan/TombaRecomp/blob/master/CLAUDE.md) requires audit notes to be committed before implementation commits, which presumes the agent commits. [`nesrecomp/AGENTS.md`](https://github.com/mstan/nesrecomp/blob/master/AGENTS.md) gates the claim of a commit on validation rather than the commit itself. See [contributing as an agent](/docs/agents/contributing-as-an-agent).

### Backward compatibility

[psxrecomp](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md) says the faithfulness fix wins even if it breaks other titles, because those titles were built on a faulty ecosystem and will be regenerated: backward compatibility is not a constraint. The Game Boy Advance repositories require the opposite discipline in the core, where a hardware corner fix must be general and cited rather than guarded behind a per-game condition, which is a constraint that protects other titles. Both reject per-game hacks, but they point in opposite directions on whether breaking a shipped title is acceptable.

## Source

- The 36 agent instruction files, principally [`psxrecomp/CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md), [`nesrecomp/CLAUDE.md`](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md), [`gbarecomp/CLAUDE.md`](https://github.com/mstan/gbarecomp/blob/main/CLAUDE.md), [`vbrecomp/CLAUDE.md`](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md), [`segagenesisrecomp/CLAUDE.md`](https://github.com/mstan/segagenesisrecomp/blob/master/CLAUDE.md) and [`Megaman3NESRecomp/CLAUDE.md`](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md).
- The protocol documents that carry rules of their own: [`vbrecomp/TCP.md`](https://github.com/mstan/vbrecomp/blob/master/TCP.md), [`nesrecomp/TCP.md`](https://github.com/mstan/nesrecomp/blob/master/TCP.md), [`ndsrecomp/TCP.md`](https://github.com/mstan/ndsrecomp/blob/main/TCP.md), [`psxrecomp/TCP_COMMANDS.md`](https://github.com/mstan/psxrecomp/blob/master/TCP_COMMANDS.md).
- [`psxrecomp/PRINCIPLES.md`](https://github.com/mstan/psxrecomp/blob/master/PRINCIPLES.md), the one PRINCIPLES file quoted here in full. Six other toolchains carry one and they have not been surveyed at the same depth.

## Next

- [If you are an agent, start here](/docs/agents/start-here), if you arrived at this page first and want the orientation around it.
- [Checking your own work](/docs/agents/verification-rituals), for the commands that enforce these rules.
- [How changes go wrong here](/docs/agents/failure-modes), for what breaking one of them looks like from the outside.
- [Machine-readable surfaces](/docs/agents/machine-surfaces) and [the TCP debug protocol](/docs/reference/tcp-protocol), for the debug server that most of these rules assume you are using.
