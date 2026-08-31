---
title: "How to check AI work"
summary: "How to decide whether an AI-generated recomp change was actually proven."
pageType: "reference"
tags: ["Agents", "Testing", "Verification"]
updated: "2026-08-30"
---

Do not ask whether the agent "tested it."

Ask what the test proves.

A build proves the compiler accepted the code. It does not prove the game is correct. A screenshot proves one visual moment. It does not prove timing, input, audio, or end-to-end play.

## The minimum checklist

For most recomp changes, expect:

- the project builds
- the game starts
- dispatch misses are empty or unchanged for a known reason
- coverage did not regress, if the project reports coverage
- the debug server still answers, if the project has one
- the relevant route was observed

If the agent cannot run a check because it lacks a game file, BIOS, oracle, or platform tool, it should say that clearly.

## Match the check to the claim

| Claim | Useful proof |
|---|---|
| The code compiles. | Build log. |
| Generated output is stable. | Idempotent regeneration. |
| All needed code was found. | Empty dispatch-miss report. |
| The port stayed static. | Coverage report with no unexpected fallback. |
| Native matches reference behavior. | Co-simulation or oracle comparison. |
| The screen looks right. | Screenshot, frame dump, or visual smoke test. |
| Input works. | TCP input, scripted route, or hands-on route. |
| Performance improved. | Repeatable timing with the same route and settings. |
| A release is clean. | Allowlist package check. |

The wrong proof is a weak proof, even when it is real.

## Dispatch misses

Check the dispatch-miss artifact after every run.

The filename varies by project. The rule does not: a miss can skip game logic silently. Empty is clean. Non-empty is a blocker unless the project has already documented that exact miss as expected.

Resolve misses before debugging later symptoms.

## Coverage and fallback

Some frameworks can fall back to an interpreter or dynamic path when static coverage is incomplete.

That can help during bring-up. It is still weaker than native static execution.

When a project has a coverage report, read it. Do not call a port finished because it reached gameplay while important code was interpreted.

## Co-simulation

Co-simulation compares the native build against an oracle.

It is strongest when the route is deterministic. Attract demos are useful early because they often run without input and still exercise real game behavior.

Input timing can cause divergence. If native and oracle receive input at different hardware points, they may disagree even when both implementations are correct.

If a game has random behavior in an attract path, find the seed or make both sides use the same starting state before trusting the comparison.

## TCP debug checks

TCP debug servers are useful because recomp clients restart constantly.

A simple TCP client can disconnect, reconnect, and continue after each rebuild or crash.

Useful TCP checks include:

- `ping`
- registers
- memory reads
- screenshots or frame capture
- input for menus and basic movement
- trace queries
- dispatch-miss queries

TCP input is good for menus, simple button presses, and non-timing-sensitive movement. It is not a replacement for skilled gameplay testing.

## Visual checks

Use screenshots or frame capture when the claim is visual.

For AI review, capture the actual game output when possible. A debug buffer may miss a high-resolution renderer layer, post-processing, or final presentation.

If the project has multiple capture paths, use the one closest to what the player sees.

## Performance checks

Performance needs repeatability.

Use the same route, same build type, same settings, and similar host conditions. Run more than once.

For later systems, optimization is usually not one pass. It can take weeks of profiling and focused fixes. Avoid claiming victory from one faster boot unless that was the exact target.

## Packaging checks

Before a release, inspect the archive.

It should contain the app and allowed assets. It should not contain game files, retail BIOS files, local dumps, private saves, scratch captures, or debug leftovers.

Prefer allowlist packaging tools over zipping a build directory.

## What the agent should report

The final report should include:

- commands run
- results
- files changed
- assumptions
- missing inputs
- remaining risk

This is how the next person avoids repeating the same experiment.
