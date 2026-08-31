---
title: "When an agent cannot run the game"
summary: "What AI-assisted work can and cannot prove without the game file, BIOS, display, or oracle."
pageType: "guide"
tags: ["Agents", "Verification", "Testing"]
updated: "2026-08-30"
---

Sometimes the agent cannot run the game.

That may be fine. A clean clone often lacks the user's game file, BIOS file, display access, oracle setup, or local debug tools.

The rule is simple: the agent can still do useful work, but it must not claim proof it does not have.

## What may be missing

| Missing item | What it prevents |
|---|---|
| Game file | Regeneration, launch, runtime identity checks, gameplay verification. |
| BIOS or firmware | Boot paths for systems that require one. |
| Display or capture path | Visual claims. |
| Oracle or reference process | Correctness comparison. |
| Ghidra or disassembly access | Some code-discovery and reverse-engineering work. |
| Compiler or SDK | Build verification. |

Each missing item removes a class of claim. It does not make guessing acceptable.

## What the agent can still do

Without the game, an agent may still:

- read and explain code
- improve docs
- build framework-only tools
- run unit tests that need no private files
- check packaging scripts
- inspect config structure
- add or improve debug commands
- write a handoff for a human who can run the game

That work can be valuable. It just needs honest boundaries.

## What the agent cannot claim

Without a real run, do not accept claims like:

- the bug is fixed
- the port is playable
- dispatch misses are empty
- coverage is complete
- native matches the oracle
- timing is correct
- the visual output is correct
- the release works end to end

The agent can say "this builds" only if it built. It can say "this should be checked by running X" if it could not run X.

## Existing artifacts are not fresh proof

A log, screenshot, trace, or dispatch-miss file already in the tree is evidence about an earlier run.

It is not evidence about the current change unless the agent produced it during this session or can prove it matches the current build.

This is a common false pass. Avoid it.

## Useful partial checks

| Check | What it proves |
|---|---|
| Build | The compiler accepted the code. |
| Unit tests | The covered host logic still passes. |
| Static inspection | The diff follows project structure. |
| Package inspection | The archive or script excludes forbidden files. |
| Config validation | Required fields are present and coherent. |
| Tool wiring | A debug command is registered, documented, and callable in principle. |

Phrase the result narrowly.

## What to write down

If the agent cannot finish verification, require a handoff with:

- the exact missing resource
- what was checked anyway
- commands that were run
- tests that skipped
- the command a human should run next
- what output would confirm the change
- what output would refute it

This is not failure. It is an honest stop.

## When to stop

Stop and hand off when:

- the repo requires a tool the agent cannot access
- the change touches hardware behavior and no oracle check can run
- the change touches timing and no route can be tested
- the framework instructions are missing
- required private files are unavailable

Do not let the agent fill the gap with confidence.
