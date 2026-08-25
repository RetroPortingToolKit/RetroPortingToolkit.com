---
title: "Contributing as an agent"
summary: "How to work in these repositories without breaking them: what to read before you start, the commit conventions and where they disagree, what never goes into a commit, a ten point handoff template taken from nine real handoffs, and the policy check to run before you contribute anywhere else."
pageType: "guide"
tags: ["Agents", "Conventions"]
repos:
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/gcnlle"
  - "https://github.com/mstan/GumshoeNESRecomp"
  - "https://github.com/mstan/YoshiNESRecomp"
updated: "2026-08-25"
---

You have been asked to change something in one of these repositories. This page covers the parts that are not the code: what to read first, how commits are made here, what must never enter a commit, how to write the handoff the next session will work from, and what to check before you contribute anywhere else. If you have just arrived, read [if you are an agent, start here](/docs/agents/start-here) first.

## Before you change anything

Several repositories open with a session start ritual and mean it literally. The strictest is a five step checklist in [`CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md) in psxrecomp, which ends: "If any of these fail, do not proceed with the user's task — surface the failure first." Megaman3NESRecomp and YoshiNESRecomp use the same pattern.

1. Read the repository's `CLAUDE.md` or `AGENTS.md` in full, plus any `PRINCIPLES.md`, `DEBUG.md` and `TCP.md` it names.
2. Confirm which phase or milestone the project is in, from the planning document that file points at.
3. Confirm the tools the repository gates on are reachable. In psxrecomp that is Ghidra MCP, and if it is not reachable, stop and ask.
4. State the locked rules back in your own output before you start. psxrecomp asks for the architecture, the absence of an interpreter and the absence of stubs. Megaman3NESRecomp asks you to state that you will not guess.
5. If a step fails, stop and say so instead of working around it.

**You should now know** which rules apply, what the current phase is, and whether your tools work. Step 1 often cannot be finished, because many agent files defer to documents that are not in the repository, and none of those paths survives a clone. Say the rule file is unreachable and ask for it. Do not rebuild it from whichever repositories happen to be present. [Rules of the codebase](/docs/agents/house-invariants) lists the ones that recur.

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

"Validated it yourself" means a runtime check through the debug server or a scripted session, not a green test suite. A CTest run whose interesting test skipped with code 77 still reports success. [Machine-readable surfaces](/docs/agents/machine-surfaces) lists what you can drive, and [errors and exit codes](/docs/reference/errors-and-exit-codes) says what an exit status means.

The fleet does not agree on whether you commit at all. segagenesisrecomp and smsggrecomp say never without explicit instruction, TombaRecomp's ordering rule assumes you do, and nesrecomp gates the claim rather than the act. When your repository does not say, ask. Do not copy the answer from a sibling repository.

## What never goes into a commit

After "never edit generated code", this is the most consistent rule in the fleet.

- Game files of any kind: ROMs, disc images, BIOS images, extracted boot executables, headerless dumps.
- Anything derived from them: extracted graphics, music, sample data, level data, generated code derived from a game file.
- Runtime output: save files, memory cards, screenshots, diagnostic output, logs, build outputs, release binaries.
- Analysis databases, such as Ghidra project files.
- In the Xbox probe repository, an extra list, because the target is real hardware: BIOS, flash, EEPROM, HDD, dashboard, kernel or game dumps; IP or MAC addresses; FTP or HTTP credentials; HDD serial numbers, console-unique keys or other per-console identifiers; unsanitized probe logs.

> **You provide this.** Every port in this fleet needs a game file that you supply yourself, and that file stays outside the repository. DKC2Recomp states it plainly: "The private ROM must remain outside Git." The projects do not distribute game files. See [the game file you supply](/docs/concepts/the-game-file-you-supply).

## What never to touch

**Generated code.** Fix the recompiler, the runtime or the per-game config, then regenerate. A hand edit is overwritten silently, and [how changes go wrong here](/docs/agents/failure-modes) explains why that is hard to see afterwards.

**Identity gates.** The runtime hash-verifies the game file and refuses to launch with an unknown one. DragonBallZBuusFuryRecomp says "Do not weaken the identity gate", and MinishCapRecomp adds that new versions are added by checksum, "not by guessing". Loosening a hash check to make something run is not a fix.

**Architectural locks.** Several repositories state a decision as closed: one backend in segagenesisrecomp, low level emulation first in gcnlle, the recompiled and dispatched BIOS in gbarecomp, one machine plus a flag rather than a fork in smsggrecomp, no interpreter in psxrecomp and vbrecomp. The fleet contradicts itself on that last one, and psxrecomp carries a later rule requiring a small interpreter for one bounded case, so read the whole file before you conclude what is locked.

**Rules from another repository.** The fleet disagrees with itself on pausing the runtime, print debugging, unit tests, `game.cfg` against `game.toml`, and how a dispatch miss may be resolved. [`CLAUDE.md`](https://github.com/mstan/gbrecompiled/blob/master/CLAUDE.md) in gbrecompiled puts the general form in a list of things not to do:

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

Nine handoff documents exist across the fleet, and they are the best writing in it. No `CLAUDE.md` or `AGENTS.md` tells an agent to write one, and the filenames in use are inconsistent: `HANDOFF.md`, `SESSION_HANDOFF.md`, `Handoff_For_Fable.md`, `HANDOFF_TITLE_SCREEN.md`, `NOTES_TO_CODEX.md`, `SUMMARY_2026-04-12.md`, `CODEX_SUMMARY.md`, `docs/HANDOFF_2026-08-09.md`. The template below comes from those nine, and every element in it appears in at least two of them.

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

Why each field is there:

1. **Where to run this.** YoshiNESRecomp's handoff tells the reader to paste everything below the line into a context-cleared session at a specific path, and names the four rule files that session must follow.
2. **Branch and commit state.** GumshoeNESRecomp's ends with "Everything committed. Nothing pushed. Rollback points intact.", which tells the next session how much it can safely undo.
3. **What is PROVEN.** Each claim carries its measurement, which is what makes a handoff auditable. Audits happen: one document in GumshoeNESRecomp audits another agent's debugging item by item.
4. **What is NOT the problem.** The exclusions are the time you already spent. Say what may not be reopened without contradicting evidence.
5. **The exact next question to answer.** One sentence, phrased as a question. The Yoshi handoff asks at which frame and address the recompiled build first diverges from the oracle.
6. **The data that answers it.** The commands, not a description of them. A next step that is not runnable gets re-derived.
7. **Options.** Ranked and mutually exclusive, so the next session chooses one instead of attempting all of them.
8. **Caveats.** Your own uncertainty about your own findings. The best example in the fleet retracts a divergence its author had reported, after finding it came from fast forward.
9. **Reproduction assets.** Paths to captures, scripts and screenshots. Without them the next session repeats your setup instead of your analysis.
10. **Required handback.** Say in advance what the next report must contain and what claim it may make. From [`docs/HANDOFF_2026-08-09.md`](https://github.com/mstan/gcnlle/blob/master/docs/HANDOFF_2026-08-09.md) in gcnlle:

> "The allowed current claim is: **the measured route clears the 66/s
> unthrottled emulation-capacity gate without removing the retained
> software/interpreter/DSP-LLE paths. A complete exercised force-floor gate,
> actual 60-Hz presentation, and release-quality audio are not yet established.**"

Two habits go with it. Keep findings apart from fixes: the Codex summary in GumshoeNESRecomp says it contains only verifiable facts and proposes no fix, which is what makes an audit possible. And a handoff may commission tooling instead of a fix: SuperMarioWorldRecomp's VRAM differ handoff asks the next session to make "first divergent VRAM write" a one-shot query, and supplies the sites to hook and the code to add.

The fleet has no convention for where a handoff lives. Put it in `docs/` with a dated filename, linked from whatever the next session reads first. That is a recommendation from this page, not a rule in any repository.

## Contributing outside this fleet

Some projects outside this fleet do not accept AI-generated contributions. Their contributing files say so, and that policy is theirs to set.

So check before you send anything. Before you open a pull request against any repository, read its contributing policy: `CONTRIBUTING.md`, the pull request template, and whatever the README says about AI-assisted work. If the policy forbids AI-generated contributions, do not open the pull request, and do not send the change by another route either. If the policy says nothing, ask a human first.

This fleet's own repositories are the safe destination for work you do as an agent. They are built with AI assistance and their documentation is written for agents. The rules there are the commit conventions above. They vary by repository, and where a repository is silent the default is to ask its owner rather than open a pull request.

The [Nintendo 64](/hardware/nintendo-64) page carries that platform's upstream story, including what its upstream projects say about AI-generated code.

Everything on this page comes from one account's repositories. No repository in this fleet outside the `mstan` account carries a `CLAUDE.md` or an `AGENTS.md`, so none of it is a convention of the wider recompilation community.

## Source

- [mstan/nesrecomp](https://github.com/mstan/nesrecomp): [`AGENTS.md`](https://github.com/mstan/nesrecomp/blob/master/AGENTS.md), [`CLAUDE.md`](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md)
- [mstan/psxrecomp](https://github.com/mstan/psxrecomp): [`CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md)
- [mstan/segagenesisrecomp](https://github.com/mstan/segagenesisrecomp): [`CLAUDE.md`](https://github.com/mstan/segagenesisrecomp/blob/master/CLAUDE.md), and [mstan/smsggrecomp](https://github.com/mstan/smsggrecomp): [`CLAUDE.md`](https://github.com/mstan/smsggrecomp/blob/main/CLAUDE.md)
- [mstan/gbrecompiled](https://github.com/mstan/gbrecompiled): [`CLAUDE.md`](https://github.com/mstan/gbrecompiled/blob/master/CLAUDE.md)
- [mstan/DKC2Recomp](https://github.com/mstan/DKC2Recomp): [`AGENTS.md`](https://github.com/mstan/DKC2Recomp/blob/main/AGENTS.md), and [mstan/xboxlle-probe](https://github.com/mstan/xboxlle-probe): [`AGENTS.md`](https://github.com/mstan/xboxlle-probe/blob/main/AGENTS.md)
- Handoffs: [`HANDOFF.md`](https://github.com/mstan/YoshiNESRecomp/blob/master/HANDOFF.md) in YoshiNESRecomp; [`SESSION_HANDOFF.md`](https://github.com/mstan/GumshoeNESRecomp/blob/master/SESSION_HANDOFF.md), [`CODEX_SUMMARY.md`](https://github.com/mstan/GumshoeNESRecomp/blob/master/CODEX_SUMMARY.md) and [`CODEX_AUDIT_BY_CLAUDE.md`](https://github.com/mstan/GumshoeNESRecomp/blob/master/CODEX_AUDIT_BY_CLAUDE.md) in GumshoeNESRecomp; [`docs/HANDOFF_2026-08-09.md`](https://github.com/mstan/gcnlle/blob/master/docs/HANDOFF_2026-08-09.md) in gcnlle; [`HANDOFF_VRAM_DIFFER.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/HANDOFF_VRAM_DIFFER.md) in SuperMarioWorldRecomp; [`NOTES_TO_CODEX.md`](https://github.com/mstan/PokemonStadiumRecomp/blob/main/NOTES_TO_CODEX.md) in PokemonStadiumRecomp

## Next

- [Rules of the codebase](/docs/agents/house-invariants), the rules themselves, quoted and cited.
- [Checking your own work](/docs/agents/verification-rituals), the commands that let you validate a claim.
- [How changes go wrong here](/docs/agents/failure-modes), the failures a handoff most often describes.
- [When you cannot run the game](/docs/agents/when-you-cannot-run-the-game), what to write down when you cannot finish.
