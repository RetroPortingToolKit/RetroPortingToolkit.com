---
title: "How do we compare a port to the original?"
summary: "Co-simulation runs the port beside a trusted emulator, compares them at the same points in game time, and stops at the first difference."
pageType: "concept"
tags: ["Correctness", "Testing", "Co-simulation"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/snesrecomp"
updated: "2026-08-30"
---

A port can build and still be wrong.

It can boot and still be wrong. It can reach gameplay and still be wrong. Faithfulness means the port behaves like the original game on the original machine.

**Co-simulation** is one way to measure that.

The idea is simple: run the port beside a trusted emulator, feed both the same game and same input, stop both at the same point in game time, and compare their state.

If they match, the port is still on track.

If they differ, the first difference is the bug to investigate.

This is development tooling. End users benefit from the results: fewer strange bugs, better faithfulness, and stronger confidence that the port behaves like the original game.

## Why use an emulator as the reference?

The port often has more than one way to run code. It may have compiled native code and an interpreter fallback.

If those two agree, that is useful, but it does not prove the port is faithful. They could both be wrong in the same way.

A trusted emulator gives the project an outside reference. It is still software, not magic, but it is independent enough to catch mistakes the port might miss by comparing against itself.

## What gets compared?

The project compares the parts of the machine that can affect what the game does next.

That can include CPU registers, RAM, video memory, timers, interrupt state, sound state, and other device state.

It should not include host-only details, like a pointer address on your PC. Those can change for reasons that have nothing to do with the game.

The hard part is choosing the right state. Miss something important and the comparison can pass while the game is already wrong. Include something irrelevant and the comparison can fail for no useful reason.

## Why stop at the first difference?

Visible bugs usually show up late.

A broken jump may corrupt memory. Later, the screen glitches. Later still, the game crashes. If you start debugging at the crash, you are chasing the final symptom.

Co-simulation tries to stop at the first moment the port and reference disagree. That first difference is much closer to the real bug.

![The rungs are game time checkpoints. The first mismatch matters more than the final visible symptom.](./lockstep.svg)

## How do both sides stop at the same time?

They need a shared clock.

Wall-clock time is not good enough. Your PC may run one side faster than the other.

Instead, the comparison uses time from inside the emulated machine: guest cycles, frames, scanlines, or another console-specific unit.

The exact unit depends on the console. The important rule is that both sides must stop at the same point in the game's timeline.

## Does a clean co-sim run prove everything?

No.

It proves the port matched the reference for the state and time range that were checked.

It does not prove the reference emulator is perfect. It does not prove the screen and sound are correct unless those are part of the comparison. It does not prove unplayed parts of the game.

That is still powerful. A clean co-sim run is much stronger than "it seems to play fine," because it gives the project a repeatable way to find the first wrong moment.
