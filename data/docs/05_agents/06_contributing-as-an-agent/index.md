---
title: "Contributing as an agent"
summary: "How to work in these repositories without breaking them: what to read before you start, the commit conventions and the places they disagree, what never goes into a commit, a ten point handoff template synthesised from nine real handoffs, and the upstream projects that do not accept AI-generated contributions."
pageType: "guide"
tags: ["Agents", "Conventions"]
repos:
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/gcnlle"
  - "https://github.com/mstan/GumshoeNESRecomp"
  - "https://github.com/mstan/YoshiNESRecomp"
updated: "2026-08-23"
---

You have been asked to change something in one of these repositories. This page covers the parts that are not about the code: what to read before you touch anything, how the fleet expects commits to be made, what must never enter a commit, how to write the handoff that the next session will work from, and what the upstream projects say about contributions written by an AI. The handoff template below is the part worth bookmarking, because nine excellent handoffs exist in this fleet and no repository tells you to write one. If you have just arrived, read [if you are an agent, start here](/docs/agents/start-here) first.

## Before you change anything

Several repositories open with a session start ritual, and they mean it literally. The strictest version, in [`CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md) in psxrecomp, is a five step checklist that ends: "If any of these fail, do not proceed with the user's task — surface the failure first." Megaman3NESRecomp and YoshiNESRecomp carry the same pattern. Generalised, and in the order the repositories put it:

1. Read the repository's `CLAUDE.md` or `AGENTS.md` in full, along with any `PRINCIPLES.md`, `DEBUG.md` and `TCP.md` it names.
2. Confirm which phase or milestone the project is in, from the planning document the file points at.
3. Confirm the tools the repository gates on are actually reachable. In psxrecomp that is Ghidra MCP, and the instruction if it is not reachable is to stop and ask.
4. State the locked invariants back, in your own output, before you start. psxrecomp asks for the architecture, the absence of an interpreter and the absence of stubs. Megaman3NESRecomp asks you to state that you will not guess and that you will rely only on measured divergence.
5. If any step fails, stop and say so rather than working around it.

**You should now know** which rules apply, what the current phase is, and whether your tools work. If step 1 could not be completed, that is common and it is not your fault: many agent files defer to documents that are not in the repository. YoshiNESRecomp points at `F:\Projects\PRINCIPLES.md`, SuperMarioWorldRecomp at a `recomp-template` path, the PlayStation game repositories at a `psxrecomp-v4/` Windows junction, vbrecomp at a rule in `~/.claude/CLAUDE.md`, and Megaman3NESRecomp at a file it describes as being "in memory". None of those survive a clone. Say the rule file is unreachable and ask for it, rather than reconstructing it from the repositories that happen to be present.

## Commit conventions

| Rule | Where it is stated |
|---|---|
| Never commit without explicit user instruction. The user runs `git status` themselves and asks for commits when ready | segagenesisrecomp, smsggrecomp |
| Do not claim a patch is committed, ready to merge, or validated until you have validated it yourself | nesrecomp |
| Audit notes are committed before implementation commits | TombaRecomp |
| Commit the submodule first, bump the pointer second | SonicTheHedgehogRecomp |
| A boot-smoke baseline commits alongside the code change it covers | segagenesisrecomp |
| Owner-gated, do not do without an explicit decision: merging investigation branches to main, releasing, reconciling the multi-tier engine branches | SuperMetroidRecomp |
| Never publish a binary release without following `RELEASING.md`; package with `tools/package_release.py`, which refuses if a ROM or junk slips in; never zip a build folder by hand | segagenesisrecomp |
| Use strict warnings for project code; third-party warnings may be isolated, but never silence errors globally | DKC2Recomp |

The whole of [`AGENTS.md`](https://github.com/mstan/nesrecomp/blob/master/AGENTS.md) in nesrecomp is about this one question, and it is short enough to quote entire:

```text title="AGENTS.md"
# Repository Agent Notes

## Validation before commit claims

Do not declare a patch committed, ready to merge, or validated until you have
validated it yourself. Prefer runtime checks with TCP input/screenshot tooling
when the change affects rendering, input, timing, or visible game behavior.
Record both the before/after condition or the regression comparison used.
```

"Validated it yourself" has a specific meaning here. It is a runtime check through the debug server or a scripted session, not a green test suite: a CTest run in which the interesting test skipped with code 77 still reports success. [Machine-readable surfaces](/docs/agents/machine-surfaces) lists what you can drive, [the TCP debug protocol](/docs/reference/tcp-protocol) specifies the wire format, and [errors and exit codes](/docs/reference/errors-and-exit-codes) covers what a given exit status actually means.

The fleet does not agree on whether you commit at all. segagenesisrecomp and smsggrecomp say never without explicit instruction. TombaRecomp's ordering rule assumes you do commit. nesrecomp gates the claim rather than the act. When the repository you are in does not say, ask rather than inferring from a sibling repository.

## What never goes into a commit

This boundary is the most consistent rule in the fleet after "never edit generated code", and it is stated in almost identical terms across the platform families.

- Game files of any kind: ROMs, disc images, BIOS images, extracted boot executables, headerless dumps.
- Anything derived from them: extracted graphics, music, sample data, level data, ROM-derived generated code.
- Runtime output: save files, memory cards, screenshots, diagnostic output, logs, build outputs, release binaries.
- Analysis databases, such as Ghidra project files.
- On the Xbox probe repository, an extra list because the target is real hardware: BIOS, flash, EEPROM, HDD, dashboard, kernel or game dumps; IP or MAC addresses; FTP or HTTP credentials; HDD serial numbers, console-unique keys or other per-console identifiers; unsanitized probe logs.

> **You provide this.** Every port in this fleet requires a game file that you supply yourself, and that file stays outside the repository. DKC2Recomp states it plainly: "The private ROM must remain outside Git." The projects do not distribute game files. See [the game file you supply](/docs/concepts/the-game-file-you-supply).

## What never to touch

**Generated code.** Fix the recompiler, the runtime or the per-game config and regenerate. A hand edit is silently overwritten, and [how changes go wrong here](/docs/agents/failure-modes) explains why that failure is so hard to see afterwards.

**Identity gates.** The runtime hash-verifies the game file and refuses to launch with an unknown one. DragonBallZBuusFuryRecomp states the rule as "Do not weaken the identity gate", and MinishCapRecomp adds that new versions are added by checksum, "not by guessing". Loosening a hash check to make something run is not a fix.

**Architectural locks.** Several repositories state a decision as closed and tell you not to reopen it: one backend in segagenesisrecomp, with an instruction not to reintroduce a second or a conditional to select one; low level emulation first in gcnlle; the recompiled and dispatched BIOS in gbarecomp; one machine plus a flag rather than a fork in smsggrecomp; no interpreter in psxrecomp and vbrecomp. The fleet contradicts itself on that last one, and psxrecomp carries a later rule mandating a small interpreter for one bounded case, so read the whole file before concluding what is locked.

**Rules from another repository.** The fleet disagrees with itself on pausing the runtime, on print debugging, on whether unit tests come before or after running the game, on `game.cfg` against `game.toml`, and on how a dispatch miss may be resolved. [`CLAUDE.md`](https://github.com/mstan/gbrecompiled/blob/master/CLAUDE.md) in gbrecompiled puts the general form of the rule in a list of things not to do:

```text title="CLAUDE.md"
- Do not pre-emptively fix hardware behavior "just in case"
- Do not read large sections of bank_*.c for "context"
- Do not guess what GB code does — Ghidra it
- Do not patch generated C to avoid fixing the recompiler/runtime
- Do not carry assumptions from any previous game or session
- Do not write verbose comments — a one-line log entry is enough
- Do not run unit tests as primary driver — run the game
```

## Writing the handoff

Nine handoff documents exist across the fleet and they are the highest quality writing in it. No `CLAUDE.md` or `AGENTS.md` tells an agent to write one, what it must contain, or where to put it, and the filenames in use are inconsistent: `HANDOFF.md`, `SESSION_HANDOFF.md`, `Handoff_For_Fable.md`, `HANDOFF_TITLE_SCREEN.md`, `NOTES_TO_CODEX.md`, `SUMMARY_2026-04-12.md`, `CODEX_SUMMARY.md`, `docs/HANDOFF_2026-08-09.md`. The handoff is the fleet's main agent artefact and it has no written standard, so this page supplies one, synthesised from those nine documents. Every element below is attested in at least two of them.

```markdown
# Handoff: <what this session was working on>

## Where to run this
Repository path, branch, and the rule files the next session must read first.

## Branch and commit state
Tip commit, what is committed but not pushed, and where the rollback points are.

## What is PROVEN
One item per line, each with the measurement that proved it.

## What is NOT the problem
Ruled out, with: do not re-open any of the above without producing measured
evidence that contradicts it.

## The exact next question to answer
One interrogative sentence.

## The data that answers it
The exact commands that produce that data.

## Options
Ranked, mutually exclusive next moves. Then pick one.

## Caveats
What I am not certain of about my own findings, and why.

## Reproduction assets
Capture files, scripts, screenshots, with paths.

## Required handback
What the next report must contain, and the claim it is allowed to make.
```

Each point, and why it is there:

1. **Where to run this.** YoshiNESRecomp's handoff opens by telling the reader to paste everything below the line into a context-cleared session opened at a specific path, and names the four rule files that session must follow. A handoff that does not say where it runs is a note, not a handoff.
2. **Branch and commit state.** Name the tip commit, and say explicitly what is committed and not pushed. GumshoeNESRecomp's ends with "Everything committed. Nothing pushed. Rollback points intact.", which tells the next session exactly how much it can safely undo.
3. **What is PROVEN.** Each claim carries the measurement behind it. This is what makes a handoff auditable, and audits happen: one document in GumshoeNESRecomp audits another agent's debugging in two sections, what it got right and what it got wrong, each item settled by a measurement.
4. **What is NOT the problem.** The exclusions are worth as much as the findings, because they are the time you already spent. Say what may not be reopened without contradicting evidence.
5. **The exact next question to answer.** One sentence, phrased as a question. The Yoshi handoff's is a single interrogative about the frame and address at which the recompiled build first diverges from the oracle, and it notes that everything else is downstream of that.
6. **The data that answers it.** The commands, not a description of the commands. A handoff whose next step is not runnable will be re-derived by the next session.
7. **Options.** Ranked and mutually exclusive, so the next session chooses rather than attempts all of them. GumshoeNESRecomp gives three lettered options and says to pick one.
8. **Caveats.** Your own uncertainty about your own findings. The best example in the fleet retracts a divergence the author had reported, after discovering it was an artefact of fast forward.
9. **Reproduction assets.** Paths to captures, scripts and screenshots. Without them the next session repeats the setup rather than the analysis.
10. **Required handback.** Specify in advance what the next report must contain, and what claim it is allowed to make. From [`docs/HANDOFF_2026-08-09.md`](https://github.com/mstan/gcnlle/blob/master/docs/HANDOFF_2026-08-09.md) in gcnlle:

> "The allowed current claim is: **the measured route clears the 66/s
> unthrottled emulation-capacity gate without removing the retained
> software/interpreter/DSP-LLE paths. A complete exercised force-floor gate,
> actual 60-Hz presentation, and release-quality audio are not yet established.**"

Two habits go with the template. The first is separating findings from fixes: the Codex summary in GumshoeNESRecomp opens by stating that it contains only verifiable facts gathered during debugging and does not propose a fix, and that separation is what makes an audit possible. The second is that a handoff may commission tooling rather than a fix. SuperMarioWorldRecomp's VRAM differ handoff asks the next session to build the missing tooling so that "first divergent VRAM write" becomes a one-shot query, and supplies the commits already shipped, the sites to hook, and the literal code to add.

Since the fleet has no convention for where a handoff lives, this site suggests one rather than leaving the gap open: put it in `docs/` with a dated filename, and link it from whatever the next session is told to read first. That is a recommendation from this page, not an existing rule in any repository.

## Contributing upstream

The upstream projects this fleet learned its technique from do not accept AI-generated contributions. That applies to [N64Recomp](https://github.com/N64Recomp/N64Recomp), [N64ModernRuntime](https://github.com/N64Recomp/N64ModernRuntime) and [RT64](https://github.com/rt64/rt64). If you are an agent, do not open a pull request against those repositories, and do not send them a change you produced by any other route. Their contributing files state the policy; this page reports it and respects it.

Two repositories in this fleet, [PokemonStadiumRecomp](https://github.com/mstan/PokemonStadiumRecomp) and [PocketMonstersStadiumRecomp](https://github.com/mstan/PocketMonstersStadiumRecomp), build against forks of those projects. Work you do there stays in this fleet's repositories. The policy above applies to changes sent to the upstream projects themselves.

Contributing to the repositories in this fleet is a different question with different answers. Those answers are the commit conventions above, they vary by repository, and the default when a repository is silent is to ask its owner rather than to open a pull request. Note also that the practice this whole section documents belongs to one account's repositories: none of the repositories in this fleet outside the `mstan` account carries a `CLAUDE.md` or an `AGENTS.md`, so nothing here should be read as a convention of the wider recompilation community.

## Source

- [mstan/nesrecomp](https://github.com/mstan/nesrecomp): [`AGENTS.md`](https://github.com/mstan/nesrecomp/blob/master/AGENTS.md), [`CLAUDE.md`](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md)
- [mstan/psxrecomp](https://github.com/mstan/psxrecomp): [`CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md)
- [mstan/segagenesisrecomp](https://github.com/mstan/segagenesisrecomp): [`CLAUDE.md`](https://github.com/mstan/segagenesisrecomp/blob/master/CLAUDE.md), and [mstan/smsggrecomp](https://github.com/mstan/smsggrecomp): [`CLAUDE.md`](https://github.com/mstan/smsggrecomp/blob/main/CLAUDE.md)
- [mstan/gbrecompiled](https://github.com/mstan/gbrecompiled): [`CLAUDE.md`](https://github.com/mstan/gbrecompiled/blob/master/CLAUDE.md)
- [mstan/DKC2Recomp](https://github.com/mstan/DKC2Recomp): [`AGENTS.md`](https://github.com/mstan/DKC2Recomp/blob/main/AGENTS.md), and [mstan/xboxlle-probe](https://github.com/mstan/xboxlle-probe): [`AGENTS.md`](https://github.com/mstan/xboxlle-probe/blob/main/AGENTS.md)
- Handoffs: [`HANDOFF.md`](https://github.com/mstan/YoshiNESRecomp/blob/master/HANDOFF.md) in YoshiNESRecomp; [`SESSION_HANDOFF.md`](https://github.com/mstan/GumshoeNESRecomp/blob/master/SESSION_HANDOFF.md), [`CODEX_SUMMARY.md`](https://github.com/mstan/GumshoeNESRecomp/blob/master/CODEX_SUMMARY.md) and [`CODEX_AUDIT_BY_CLAUDE.md`](https://github.com/mstan/GumshoeNESRecomp/blob/master/CODEX_AUDIT_BY_CLAUDE.md) in GumshoeNESRecomp; [`docs/HANDOFF_2026-08-09.md`](https://github.com/mstan/gcnlle/blob/master/docs/HANDOFF_2026-08-09.md) in gcnlle; [`HANDOFF_VRAM_DIFFER.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/HANDOFF_VRAM_DIFFER.md) in SuperMarioWorldRecomp; [`NOTES_TO_CODEX.md`](https://github.com/mstan/PokemonStadiumRecomp/blob/main/NOTES_TO_CODEX.md) in PokemonStadiumRecomp

## Next

- [Rules of the codebase](/docs/agents/house-invariants) for the invariants themselves, quoted and grouped, including the ones the repositories disagree about.
- [Checking your own work](/docs/agents/verification-rituals) for the build and test commands that let you validate before you claim anything.
- [How changes go wrong here](/docs/agents/failure-modes) for the failures your handoff most often needs to describe.
- [When you cannot run the game](/docs/agents/when-you-cannot-run-the-game) for what to write down when you cannot finish, which is the most common reason to hand off.
