---
title: "Rules of the codebase"
summary: "The twelve engineering rules that recur across the fleet's 36 agent instruction files, each quoted and cited, plus the thirteen questions repositories answer differently."
pageType: "reference"
tags: ["Agents", "Conventions", "Correctness"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/vbrecomp"
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/MegaManZeroRecomp"
updated: "2026-08-25"
---

Thirty-six agent instruction files across thirty-four repositories say many different things. Twelve rules recur across most of them. Each one below is stated, explained in a line or two, and quoted from a repository that states it. After them come the thirteen questions repositories answer differently. Words used here in the fleet's own sense, such as oracle, dispatch miss and divergence, are defined in the [glossary](/docs/concepts/glossary).

## Rules that point somewhere you cannot open

In at least fourteen repositories the agent rules defer to something that is not in the repository.

[`YoshiNESRecomp/CLAUDE.md`](https://github.com/mstan/YoshiNESRecomp/blob/master/CLAUDE.md) says to read `F:\Projects\PRINCIPLES.md` first, and that those principles override the local file. That is an absolute path on one workstation. The six PlayStation game repositories reach their framework through `psxrecomp-v4/`, which [`ApeEscapeRecomp/CLAUDE.md`](https://github.com/mstan/ApeEscapeRecomp/blob/master/CLAUDE.md) describes as "a junction → `F:/Projects/psxrecomp/psxrecomp`". A Windows directory junction does not survive a clone. [`SuperMarioWorldRecomp/CLAUDE.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/CLAUDE.md) defers to a `recomp-template` repository outside this fleet. [`vbrecomp/CLAUDE.md`](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md) cites a rule in `~/.claude/CLAUDE.md`, a personal config file. [`Megaman3NESRecomp/CLAUDE.md`](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md) points at a command reference held "in memory", which is not a place.

> **Note.** This is a survey, not an authority. Where a repository states a rule in its own files, follow the repository. Where its rule points somewhere you cannot open, use this page rather than guessing.

## The twelve rules

### Fix the tool, never the output

Generated C is a build artefact. If it is wrong, the fault is in the recompiler, the runtime or the per-game config.

A hand edit dies silently at the next regeneration, and it takes the knowledge of the bug with it. A fix that only one game needs is also a warning sign: prefer a fix in the tool that every later game inherits.

From [`CLAUDE.md`](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md) in nesrecomp, lines 39 to 44:

> `generated/*_full.c` and `generated/*_dispatch.c` are BUILD ARTIFACTS.
>
> **NEVER read them whole. NEVER modify them. NEVER patch them.**
>
> If generated code is wrong → fix `recompiler/src/code_generator.c` and regenerate.

Also in [psxrecomp](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md), [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp/blob/master/CLAUDE.md), [SuperMetroidRecomp](https://github.com/mstan/SuperMetroidRecomp/blob/main/CLAUDE.md), [gcnlle](https://github.com/mstan/gcnlle/blob/master/CLAUDE.md) and [ApeEscapeRecomp](https://github.com/mstan/ApeEscapeRecomp/blob/master/CLAUDE.md). It is the most repeated rule in the corpus, in at least twenty of the thirty-four repositories.

### No stubs

A function is either fully implemented or it aborts with a fatal error.

A stub turns a missing implementation into a wrong answer, and that answer travels until it surfaces somewhere unrelated.

From [`CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md) in psxrecomp, lines 77 to 82:

> There are **no stubs**. A function is either fully implemented or it aborts with a fatal error. `return 0;`, `return 1;`, `cpu->v0 = 1; return;` are all stubs. `// TODO`, `// FIXME`, `// for now` are all stubs. Hand-delivering an event because the chain handler isn't installed is a stub wearing a costume and is the worst kind because it hides the missing integration.

Also in [vbrecomp](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md), which names `vb_stub_abort(...)` as the abort path, [YoshiNESRecomp](https://github.com/mstan/YoshiNESRecomp/blob/master/CLAUDE.md), and [`psxrecomp/PRINCIPLES.md`](https://github.com/mstan/psxrecomp/blob/master/PRINCIPLES.md) as rule 12.

### The first divergence is the only bug

When the recompiled build and the oracle disagree, find the earliest disagreement. Everything after it is a consequence.

Debug what you can see and you are debugging state that went wrong thousands of instructions earlier. That is how a session goes to the wrong subsystem.

From [`CLAUDE.md`](https://github.com/mstan/gbarecomp/blob/main/CLAUDE.md) in gbarecomp, lines 180 to 182:

> - Expect divergence early. The earliest divergence is the only one
>   with a root cause; everything after is consequence.

Also in [Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md), [YoshiNESRecomp](https://github.com/mstan/YoshiNESRecomp/blob/master/CLAUDE.md), [ndsrecomp](https://github.com/mstan/ndsrecomp/blob/main/CLAUDE.md) and its [`TCP.md`](https://github.com/mstan/ndsrecomp/blob/main/TCP.md), and [`psxrecomp/PRINCIPLES.md`](https://github.com/mstan/psxrecomp/blob/master/PRINCIPLES.md) as rule 3.

### Sync on hardware events, not frame numbers

Line the two implementations up on something the hardware did, not on a number each engine counts its own way.

Frame numbers do not mean the same thing in two implementations, and on a machine with two CPUs they mean nothing at all. Compare at a mismatched point and the difference you report comes from the alignment.

From [`CLAUDE.md`](https://github.com/mstan/gbarecomp/blob/main/CLAUDE.md) in gbarecomp, lines 176 to 179:

> - Sync via **hardware events**, not raw frame numbers.
>   Useful sync points: VBlank IRQ count, DMA completion count, timer
>   overflow count, SWI count, BIOS-IRQ-return count, specific PC at
>   specific function entry.

Also in [Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md), [YoshiNESRecomp](https://github.com/mstan/YoshiNESRecomp/blob/master/CLAUDE.md), [`ndsrecomp/TCP.md`](https://github.com/mstan/ndsrecomp/blob/main/TCP.md) and [gcnlle](https://github.com/mstan/gcnlle/blob/master/CLAUDE.md).

### Always-on ring buffers, queried backward

The runtime records all the time. You connect afterwards and ask what already happened.

Arming a trace and then reproducing the event fails on anything intermittent, and it changes the timing of what you measure. It is also why several repositories refuse to pause: a stopped runtime is a different program.

From [`CLAUDE.md`](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md) in vbrecomp, lines 98 to 100:

> Always-on ring buffers (frame snapshots, fntrace, wtrace) cover
> historical events. Probes QUERY the ring; they do NOT arm a trace,
> run a workload, and hope.

Also in [SuperMarioWorldRecomp](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/CLAUDE.md), [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp/blob/master/CLAUDE.md), which lists five rings, [ndsrecomp](https://github.com/mstan/ndsrecomp/blob/main/CLAUDE.md) and [`gcnlle/docs/TCP_COMMANDS.md`](https://github.com/mstan/gcnlle/blob/master/docs/TCP_COMMANDS.md).

### A dispatch miss is a silent game-breaking bug

When the dispatcher finds no generated function for an address, the game skips that subroutine and carries on. Check the miss file after every run.

Nothing crashes and nothing prints. The game does less than it should, and the result looks like a hardware bug somewhere else.

From [`TCP.md`](https://github.com/mstan/vbrecomp/blob/master/TCP.md) in vbrecomp, lines 167 to 175:

> Dispatch misses are logged to `dispatch_misses.log` next to the
> executable. This file is the PRIMARY source — check it after EVERY
> runtime run. `dispatch_miss_info` via TCP returns the same data live.
>
> A dispatch miss means `vb_dispatch(addr)` found no generated function.
> The game skips that entire subroutine. This is a SILENT GAME-BREAKING
> BUG.

Also in [cdirecomp](https://github.com/mstan/cdirecomp/blob/master/CLAUDE.md), [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp/blob/master/CLAUDE.md), [gbarecomp](https://github.com/mstan/gbarecomp/blob/main/CLAUDE.md) and [TsumuLightRecomp](https://github.com/mstan/TsumuLightRecomp/blob/master/CLAUDE.md). The file name differs per toolchain; [Checking your own work](/docs/agents/verification-rituals) says which to open where.

### Build the tool that answers the question

If the query you need does not exist, add it to the debug server. Do not work around it.

A workaround produces a conclusion nobody can check. A known-broken tool is worse: two broken implementations that agree are evidence of a shared bug, not of correctness.

From [`CLAUDE.md`](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md) in Megaman3NESRecomp, lines 218 to 226:

> If a required query/tool does NOT exist:
>
> - You MUST implement it in the native TCP server OR emulator TCP server
> - You MUST NOT work around missing tooling
> - You MUST NOT fall back to logging or guessing
>
> **IF TOOLING IS MISSING → BUILD IT FIRST → THEN CONTINUE**

Also in [psxrecomp](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md) as rule 15, [`psxrecomp/PRINCIPLES.md`](https://github.com/mstan/psxrecomp/blob/master/PRINCIPLES.md) as rule 10, and [`nesrecomp/TCP.md`](https://github.com/mstan/nesrecomp/blob/master/TCP.md), which adds that a side-channel debug log is never the substitute.

### Unknown is acceptable, guessing is not

Say what you measured. When you have not measured something, say that instead of estimating it.

A hedged guess reads like a finding once it is written down, and the next session inherits it as fact. Several repositories ban the words: no "likely", no "probably", no "this might be".

From [`CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md) in psxrecomp, lines 189 to 191:

> Use all three, never just one. Don't guess. Don't say "probably". If you
> cannot answer a question from the disasm, Ghidra, or the Beetle oracle,
> the answer is "I don't know yet" — not a confident guess.

Also in [Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md), [YoshiNESRecomp](https://github.com/mstan/YoshiNESRecomp/blob/master/CLAUDE.md) and [xboxlle-probe](https://github.com/mstan/xboxlle-probe/blob/main/AGENTS.md). The rule binds hardest when you can measure least: see [when you cannot run the game](/docs/agents/when-you-cannot-run-the-game).

### No speculative progress

Work on indirect jumps, relocation or hardware interaction must produce an artefact that proves it. Code that compiles is not enough.

Those are the three areas where a plausible implementation and a correct one look identical until much later. The artefact varies by toolchain: an oracle comparison, a decoder report, a screenshot, a manifest.

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

Also in [vbrecomp](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md), and weaker in [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp/blob/master/CLAUDE.md) and [smsggrecomp](https://github.com/mstan/smsggrecomp/blob/main/CLAUDE.md), which require the user to verify end to end.

### Nothing from the game file goes in git

Game files, BIOS images, dumps, saves, extracted assets, code generated from them and diagnostic output all stay outside the repository.

It is a hard boundary. Several repositories keep release binaries and build output out too, and [MegaManZeroRecomp](https://github.com/mstan/MegaManZeroRecomp/blob/main/CLAUDE.md) requires the release packager to produce archives with no ROM, BIOS, save, config, symbol or generated source inside.

From [`AGENTS.md`](https://github.com/mstan/DKC2Recomp/blob/main/AGENTS.md) in DKC2Recomp, lines 11 to 12:

> - Never add ROMs, save files, extracted graphics, music, BRR samples, level
>   data, screenshots, or generated game binaries to the repository.

Also in [xboxlle-probe](https://github.com/mstan/xboxlle-probe/blob/main/AGENTS.md), which adds IP and MAC addresses, credentials, console-unique identifiers and unsanitised probe logs, plus [MegaManZeroRecomp](https://github.com/mstan/MegaManZeroRecomp/blob/main/CLAUDE.md), [smsggrecomp](https://github.com/mstan/smsggrecomp/blob/main/CLAUDE.md) and [MegaManX6Recomp](https://github.com/mstan/MegaManX6Recomp/blob/master/CLAUDE.md).

> **You provide this.** You supply your own game file. These repositories do not contain one and do not distribute one, which is why the identity gate below exists at all. See [the game file you supply](/docs/concepts/the-game-file-you-supply).

### The game file's hash gates the program

The runtime checks the file it was given and refuses to start on an unknown one. New versions are added by checksum.

Almost every assumption downstream is version-specific. A near-miss revision gives you a build that runs and is wrong, which costs far more than one that refuses to start.

From [`CLAUDE.md`](https://github.com/mstan/MinishCapRecomp/blob/main/CLAUDE.md) in MinishCapRecomp, lines 37 to 39:

> 3. **ROM hash gates everything.** The runner refuses to launch with
>    an unknown ROM. Versions live in `config/<region>.toml`. New
>    versions are added by checksum, not by guessing.

Also in [DragonBallZBuusFuryRecomp](https://github.com/mstan/DragonBallZBuusFuryRecomp/blob/main/CLAUDE.md), which says not to weaken the identity gate, [FireRedLeafGreenRecomp](https://github.com/mstan/FireRedLeafGreenRecomp/blob/main/CLAUDE.md), [ndsrecomp](https://github.com/mstan/ndsrecomp/blob/main/CLAUDE.md), which checks three dumps, and [LegendOfZeldaNESRecomp](https://github.com/mstan/LegendOfZeldaNESRecomp/blob/master/CLAUDE.md).

### Check your preconditions before you start

Read the constitution, confirm the phase, confirm the tools you depend on are reachable. If one fails, say so before you do the work.

The expensive failure is a session that runs all the way to the end on a broken assumption. The checklist is cheap and it fails fast.

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

Also in [Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md), which also asks you to state the rules back first, [vbrecomp](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md) and [YoshiNESRecomp](https://github.com/mstan/YoshiNESRecomp/blob/master/CLAUDE.md).

## Where repositories disagree

Thirteen questions get different answers in different repositories. On each one, the repository you are in wins. No rule from another repository transfers.

One term below needs a definition first. An interpreter reads the game's instructions and acts them out one at a time, which is how an emulator works. In a port it is a fallback: the recompiled code runs natively, and the interpreter catches what the recompiler missed, so a miss becomes a slow moment instead of a crash.

| Question | How repositories answer |
|---|---|
| Pausing the runtime | Forbidden in [SuperMarioWorldRecomp](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/CLAUDE.md), whose RULE 0 says a paused observation invalidates every conclusion drawn from it. Removed in [psxrecomp](https://github.com/mstan/psxrecomp/blob/master/TCP_COMMANDS.md), where `pause`, `continue`, `step` and `run_to_frame` are still registered and always return an error. Advised against in [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp/blob/master/CLAUDE.md) and [ndsrecomp](https://github.com/mstan/ndsrecomp/blob/main/CLAUDE.md). Supported in [`nesrecomp/TCP.md`](https://github.com/mstan/nesrecomp/blob/master/TCP.md), [`vbrecomp/TCP.md`](https://github.com/mstan/vbrecomp/blob/master/TCP.md) and [`cdirecomp/TCP.md`](https://github.com/mstan/cdirecomp/blob/master/TCP.md). Recommended for frame-by-frame analysis in [LegendOfZeldaNESRecomp](https://github.com/mstan/LegendOfZeldaNESRecomp/blob/master/CLAUDE.md) |
| printf debugging | Absolute in [psxrecomp](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md), which forbids `fprintf(stderr, ...)` "ever, for any reason", and in [YoshiNESRecomp](https://github.com/mstan/YoshiNESRecomp/blob/master/CLAUDE.md). Allowed for a crash banner in [vbrecomp](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md). A step in the debugging loop in [nesrecomp](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md), restricted to hot paths in [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp/blob/master/CLAUDE.md). [Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md) forbids it near the top of its file and requires `printf(...)` with `fflush(stdout)` three hundred lines later |
| Whether an interpreter exists | Does not exist and must not be written, in [psxrecomp](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md) and [vbrecomp](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md). A carve-out inside that same psxrecomp file, whose rule 18 requires a small MIPS interpreter for code installed while the game runs. The default for uncovered code in [SuperMetroidRecomp](https://github.com/mstan/SuperMetroidRecomp/blob/main/CLAUDE.md). Allowed under conditions in [gbarecomp](https://github.com/mstan/gbarecomp/blob/main/CLAUDE.md) and [MegaManZeroRecomp](https://github.com/mstan/MegaManZeroRecomp/blob/main/CLAUDE.md). A showstopper in [MinishCapRecomp](https://github.com/mstan/MinishCapRecomp/blob/main/CLAUDE.md) |
| Where HLE sits | Inside [`psxrecomp/CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md) alone the position moves three times through dated amendments: no HLE layer, then a permitted subsystem replacement, then a standing swappable tier, then the default. [gcnlle](https://github.com/mstan/gcnlle/blob/master/CLAUDE.md) forbids drifting toward an HLE boot. [cdirecomp](https://github.com/mstan/cdirecomp/blob/master/CLAUDE.md) recompiles the system ROM with no hand-written stubs. [gbarecomp](https://github.com/mstan/gbarecomp/blob/main/CLAUDE.md) allows only an opt-in shadow that never becomes the verify oracle. [MegaManZeroRecomp](https://github.com/mstan/MegaManZeroRecomp/blob/main/CLAUDE.md) calls HLE opt-in convenience and never the correctness oracle. See [high level and low level](/docs/concepts/hle-and-lle) |
| How hard a gate Ghidra is | A hard session gate with no exceptions in [nesrecomp](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md) and [Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md): no Ghidra means no action. A checklist item that stops and asks in [psxrecomp](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md). Demoted in [vbrecomp](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md), which says SLEIGH bugs exist so Ghidra is not the source of truth for execution correctness. Not the discovery mechanism at all in [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp/blob/master/CLAUDE.md) and [smsggrecomp](https://github.com/mstan/smsggrecomp/blob/main/CLAUDE.md), where static disassembly is ground truth |
| Automatic screenshots | Automatic every 60 frames in [nesrecomp](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md). Forbidden in [Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md) and [YoshiNESRecomp](https://github.com/mstan/YoshiNESRecomp/blob/master/CLAUDE.md), which want script-triggered captures. Those two use nesrecomp, so the disagreement is inside one toolchain |
| Screenshot format | PNG in [nesrecomp](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md), which bans BMP as too large for token limits. Client-side BMP or PPM in [`cdirecomp/TCP.md`](https://github.com/mstan/cdirecomp/blob/master/TCP.md) |
| `game.cfg` or `game.toml` | `game.cfg` in [nesrecomp](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md) and [cdirecomp](https://github.com/mstan/cdirecomp/blob/master/CLAUDE.md). `game.toml` in [Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md) on that same nesrecomp framework, and in [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp/blob/master/CLAUDE.md) and [smsggrecomp](https://github.com/mstan/smsggrecomp/blob/main/CLAUDE.md). [YoshiNESRecomp](https://github.com/mstan/YoshiNESRecomp/blob/master/CLAUDE.md) says this is unresolved, and that the TOML parser had problems on that project, so do not switch back without fixing it |
| How to resolve a dispatch miss | [gbarecomp](https://github.com/mstan/gbarecomp/blob/main/CLAUDE.md) turns the miss log into candidate entries for a human to merge, and [`vbrecomp/TCP.md`](https://github.com/mstan/vbrecomp/blob/master/TCP.md) says to add entries to the game's TOML and regenerate. [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp/blob/master/CLAUDE.md) and [smsggrecomp](https://github.com/mstan/smsggrecomp/blob/main/CLAUDE.md) forbid exactly that and require the disassembly-driven pipeline. [YoshiNESRecomp](https://github.com/mstan/YoshiNESRecomp/blob/master/CLAUDE.md) forbids touching those entries until a divergence is proven to come from a missing function |
| Who declares a fix done | The user, in [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp/blob/master/CLAUDE.md) and [smsggrecomp](https://github.com/mstan/smsggrecomp/blob/main/CLAUDE.md). The agent, after validating it itself, in [`nesrecomp/AGENTS.md`](https://github.com/mstan/nesrecomp/blob/master/AGENTS.md). A machine check, in [MegaManZeroRecomp](https://github.com/mstan/MegaManZeroRecomp/blob/main/CLAUDE.md) and [gbarecomp](https://github.com/mstan/gbarecomp/blob/main/CLAUDE.md). Pixels on a screen, in [psxrecomp](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md) and [vbrecomp](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md) |
| Commit cadence | Never without explicit user instruction, in [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp/blob/master/CLAUDE.md) and [smsggrecomp](https://github.com/mstan/smsggrecomp/blob/main/CLAUDE.md). [TombaRecomp](https://github.com/mstan/TombaRecomp/blob/master/CLAUDE.md) requires audit notes committed before implementation commits, which assumes the agent commits. [`nesrecomp/AGENTS.md`](https://github.com/mstan/nesrecomp/blob/master/AGENTS.md) gates the claim, not the act. See [contributing as an agent](/docs/agents/contributing-as-an-agent) |
| Backward compatibility | [psxrecomp](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md) says the faithfulness fix wins even if it breaks other titles, because those titles will be regenerated. The Game Boy Advance repositories require the opposite in the core: a hardware corner fix must be general and cited, not guarded behind a per-game condition. Both reject per-game hacks, and they point in opposite directions on breaking a shipped title |

## Source

- The 36 agent instruction files, principally [`psxrecomp/CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md), [`nesrecomp/CLAUDE.md`](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md), [`gbarecomp/CLAUDE.md`](https://github.com/mstan/gbarecomp/blob/main/CLAUDE.md), [`vbrecomp/CLAUDE.md`](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md), [`segagenesisrecomp/CLAUDE.md`](https://github.com/mstan/segagenesisrecomp/blob/master/CLAUDE.md) and [`Megaman3NESRecomp/CLAUDE.md`](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md).
- The protocol documents that carry rules of their own: [`vbrecomp/TCP.md`](https://github.com/mstan/vbrecomp/blob/master/TCP.md), [`nesrecomp/TCP.md`](https://github.com/mstan/nesrecomp/blob/master/TCP.md), [`ndsrecomp/TCP.md`](https://github.com/mstan/ndsrecomp/blob/main/TCP.md), [`psxrecomp/TCP_COMMANDS.md`](https://github.com/mstan/psxrecomp/blob/master/TCP_COMMANDS.md).
- [`psxrecomp/PRINCIPLES.md`](https://github.com/mstan/psxrecomp/blob/master/PRINCIPLES.md). Six other toolchains carry a PRINCIPLES file, and they have not been surveyed as closely.

## Next

- [If you are an agent, start here](/docs/agents/start-here), the orientation around this page.
- [Checking your own work](/docs/agents/verification-rituals), the commands that enforce these rules.
- [How changes go wrong here](/docs/agents/failure-modes), what breaking one of them looks like from outside.
- [Machine-readable surfaces](/docs/agents/machine-surfaces) and [the TCP debug protocol](/docs/reference/tcp-protocol), the debug server most of these rules assume.
