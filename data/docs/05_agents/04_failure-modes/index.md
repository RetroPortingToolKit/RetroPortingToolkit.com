---
title: "How AI breaks recomp projects"
summary: "The common ways AI-generated recomp changes fail even when the build looks fine."
pageType: "reference"
tags: ["Agents", "Correctness", "Verification"]
updated: "2026-08-30"
---

AI is good at producing plausible code quickly.

That is exactly why it can be dangerous here. Recomp projects fail quietly. The game may boot. The diff may look reasonable. The failure may still be real.

Use this page as a review checklist.

## Common failure shapes

| What you see | What it may mean |
|---|---|
| One behavior never happens. | A dispatch miss skipped a subroutine. |
| A fix disappears later. | The agent edited generated output. |
| The fix only works for one game. | A framework bug was hidden in game config. |
| Tests pass but the game is wrong. | The test did not cover the route, or it skipped. |
| Native and oracle diverge at different places on each run. | The route is not deterministic, or input timing changed. |
| Two implementations agree on a wrong value. | They share the same bug, or the checker is broken. |
| A visual bug appears after a timing tweak. | The timing tweak changed real game behavior. |
| A release archive is too large or suspicious. | It may include generated junk or forbidden inputs. |

Start with the quiet failures. They are the ones AI is most likely to explain away.

## Dispatch misses

A dispatch miss is a blocking bug.

The runtime tried to call an address that has no generated function. Depending on the framework, it may log the miss, fall back, or skip the call.

Skipping is the dangerous case. The game can keep running while missing real logic.

Make the agent check the miss artifact before debugging the symptom.

## Generated output edits

Generated output is temporary.

If the agent patches it by hand, the next regeneration removes the fix. The project also loses the durable explanation of the bug.

The correct fix belongs in the generator, runtime, or config.

## One-game fixes

Sometimes a one-game fix is correct. Many times it is a framework bug wearing a local patch.

Ask what the fix means:

- Is this a real property of this game?
- Is this a code pattern the recompiler should discover?
- Will the next game need the same special case?
- Is this becoming a table of hand-entered addresses?

If the answer points at the framework, make the agent fix the framework.

## False green

A green build is weak evidence.

A green test suite is stronger, but only proves what the suite actually ran. Check for skipped tests and missing private inputs. A visual smoke test that skipped because screenshots were absent did not test visuals.

Read the details, not just the summary.

## Bad alignment

Do not compare two runs at "frame 500" unless frame 500 means the same thing on both sides.

Use hardware events or known synchronization points. This is especially important for systems with multiple CPUs, DMA, timers, audio, or link hardware.

Bad alignment creates fake divergences.

## Input timing

Input is part of the state.

If native and oracle receive input at different times, they may diverge even when both implementations are correct.

Attract demos are useful because they often need no input. Scripted input is useful when delivered at a precise, repeatable point. Manual input is useful for exploration, but weak for proof.

## Broken tools

If a screenshot command returns black, that does not prove the screen is black.

If a trace misses an event you know happened, that does not prove the event did not happen.

Fix or replace the tool before making claims from it.

## Timing optimizations

Faithful timing is usually the safe default.

A game-specific timing reduction may improve performance. It may also introduce softlocks, races, animation bugs, input bugs, or audio drift.

Treat timing changes as advanced and local to one game unless evidence proves the rule transfers.

## Packaging mistakes

Do not let an agent zip a build folder blindly.

Release archives should be assembled from an allowlist. They should not include game files, retail BIOS files, local dumps, private saves, scratch captures, or debug leftovers.

When in doubt, inspect the archive before uploading it.
