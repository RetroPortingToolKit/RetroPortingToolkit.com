---
title: "Set up co-simulation"
summary: "Run a port beside a trusted reference, stop both at the same guest-time checkpoints, and use the first mismatch to guide debugging."
pageType: "guide"
tags: ["Correctness", "Testing", "Co-simulation"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/gbarecomp"
updated: "2026-08-30"
---

Co-simulation is a developer tool.

You run the port beside a trusted reference and ask both machines the same questions at the same guest-time checkpoints.

If they agree, you gain confidence. If they split, the first split tells you where to debug.

## What is the reference?

The reference is usually an emulator people already trust.

In this ecosystem, that reference is often called an oracle.

The oracle is not shipped as the game port. It is a development tool used to answer questions like:

- what are the CPU registers now?
- what does memory look like now?
- what did the video or audio state look like at this point?
- did the port and reference reach the same hardware event?

A project may also compare the native path against its own interpreter. That is useful, but weaker. If both paths share the same bug, they can agree and still be wrong.

## What do both sides need to expose?

Both sides need a way to answer the same debug questions.

Usually that means a TCP debug server. One process is the port. The other process is the oracle. A coordinator asks both for state and compares the answers.

Useful commands often include:

- registers;
- memory reads;
- frame or screenshot capture;
- input state;
- timing counters;
- recent trace rings;
- dispatch-miss state.

The command names do not have to be identical across every framework. Inside one co-sim pair, they need to mean the same thing.

## Why guest time matters

Do not sync by wall-clock time.

Your PC is not the console. Host frame pacing, background load, debugger pauses, and TCP traffic can all change wall-clock timing.

Sync on guest time instead: cycles, frames, VBlank counts, DMA completions, interrupt counts, or another hardware event both sides can measure.

That lets the comparison ask: "At this same console moment, did both machines have the same state?"

## What about input timing?

Input can cause divergence too.

If the port and the reference receive an input on different guest frames, both machines may be correct and still split. The test was not deterministic.

This is why attract demos are powerful early co-simulation targets. Many games play a long scripted demo after the title screen. No player input is needed, so the two runs can line up cleanly and exercise a lot of game logic, video, audio, timing, and state changes.

If an attract demo depends on randomness, make the randomness deterministic before trusting the comparison. Find the RNG seed and force the same seed on both sides, or choose a path that does not depend on random input.

## What is a stride?

The stride is how often you stop and compare.

A large stride is faster but less precise. A small stride is slower but gets closer to the exact bug.

A normal workflow is:

1. start with a large stride;
2. find the first failing window;
3. run again with a smaller stride inside that window;
4. repeat until the first bad operation is close enough to inspect.

The goal is not to compare everything forever. The goal is to find the first useful disagreement.

## How do I know the harness is honest?

Prove it can fail.

A comparison tool can accidentally compare nothing and report success. It can also ignore a field that matters.

Before trusting a green run:

- run the same backend against itself and expect agreement;
- inject a known fault and expect disagreement;
- make sure the report names the right subsystem;
- make sure hashes are backed by real state, not empty values.

A green result only means something after the red path has been proven.

## What files do I need?

You need the files the project normally requires.

That may include a game file, and sometimes a BIOS or firmware file. Use legally obtained files. This site does not provide them.

Keep co-simulation out of release builds. It is diagnostic machinery for developers, not part of the normal player package.

## What do I do with the result?

If the run is green, record the setup:

- game file identity;
- framework revision;
- oracle used;
- stride;
- final frame or cycle;
- final hash or result.

That gives you a baseline to re-run after changes.

If the run is red, do not jump to the final symptom. Read the first mismatch and move to [Debug a divergence](/docs/guides/debug-a-divergence).

## What are the limits?

Co-simulation is powerful, but it is not the whole release bar.

A headless run may miss feel, presentation, frame pacing, or user-facing problems. A clean comparison does not replace playtesting.

It also depends on the oracle. If the oracle is wrong, incomplete, or wired incorrectly, the comparison inherits that risk.

Use co-simulation as a discipline, not as a magic stamp.

## Next

- [Debug a divergence](/docs/guides/debug-a-divergence), when the run comes back red.
- [Co-simulation](/docs/concepts/co-simulation), for the concept.
- [What correct enough means](/docs/concepts/accuracy-and-burndowns), for turning evidence into a claim.
- [TCP debug protocol](/docs/reference/tcp-protocol), for the tool surface.
