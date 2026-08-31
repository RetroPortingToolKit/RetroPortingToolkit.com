---
title: "When should timing be changed?"
summary: "Timing changes are advanced work. Recomp projects try to be faithful first because relaxed timing can create softlocks, races, and bugs that only appear later."
pageType: "concept"
tags: ["Timing", "Accuracy", "Correctness"]
repos:
  - "https://github.com/mstan/smsggrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/gbarecomp"
updated: "2026-08-30"
---

Most users should not think about timing at all.

The recomp projects try to model console timing faithfully. That is deliberate. Faithful timing avoids race conditions, softlocks, missed interrupts, broken audio, and bugs that only show up much later.

This page is for developers who are tempted to change that.

## Why be strict?

Old games were written for one machine.

They may wait for an interrupt. They may expect a hardware flag to change after a certain number of cycles. They may depend on the CPU, video hardware, audio hardware, and storage all moving in the right order.

If the port runs one part too early or too late, the game may still look fine for a while. Then it can hang, desync, skip an event, or corrupt state.

Faithful timing is rigid, sometimes to a fault, but that rigidity is useful. It makes the port less likely to depend on accidental host behavior.

## Why would anyone loosen timing?

Performance.

On a specific game, a developer may find that some timing detail is not observable, or that a cheaper model works for the paths that game uses.

That can be a valid optimization. It can also be a trap.

If the project relaxes timing because one game still passes, a later game may depend on the detail that was removed. The framework then inherits a hidden one-game assumption.

## What can go wrong?

Timing mistakes often look like unrelated bugs.

- a menu softlocks
- a cutscene never advances
- audio drifts
- input is missed
- a race condition appears only on some machines
- netplay or replay checks desync

The visible problem is usually not where the mistake started.

## What is the safe rule?

Treat the default timings as the authentic path, not the fastest path.

If you are tuning one game, you may be able to relax some values and make that game run better. That can be a valid optimization, but test it like a risky change.

Look for softlocks, missed events, broken audio, bad input timing, desyncs, and bugs that appear later than the change itself.

Keep the result specific to your game. A timing tweak that works for one game, one revision, and one test path cannot be assumed to transfer safely to other games.

## What should readers take away?

Timing is advanced port-maintenance work, not beginner setup.

For normal users, faithful timing is part of why a recomp port can feel solid. For developers, changing timing is possible, but it needs measurement because the failure mode is often a softlock or desync much later.

## Next

- [How do we compare a port to the original?](/docs/concepts/co-simulation)
- [What does correct enough mean?](/docs/concepts/accuracy-and-burndowns)
- [Why does determinism matter?](/docs/concepts/determinism)
- [Debug a divergence](/docs/guides/debug-a-divergence)
