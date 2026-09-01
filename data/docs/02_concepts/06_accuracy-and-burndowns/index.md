---
title: "What does correct enough mean?"
summary: "A recomp port is correct enough when it behaves faithfully for a clear, measured scope. A burndown records what has been checked and what has not."
pageType: "concept"
tags: ["Correctness", "Testing", "Accuracy"]
repos:
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/smsggrecomp"
  - "https://github.com/mstan/segagenesisrecomp"
updated: "2026-08-30"
---

"Does it work?" is too vague.

A better question is: **what has been measured, against what reference, and under what scope?**

A recomp port can boot and still be wrong. It can play one level and still be wrong somewhere else. It can match the original game for one revision and fail on another.

Correctness is not a feeling. It is a claim with boundaries.

## What is a burndown?

A **burndown** is a scorecard for accuracy work.

It lists the parts of the console or port that need to be faithful, then records the current status of each part. It is not a marketing checklist. It is a way to say what has been checked and what still needs work.

The exact format can vary, but a useful burndown answers three questions:

1. What part of the machine are we talking about?
2. What reference are we comparing against?
3. How was this tested?

Without those answers, "correct" does not mean much.

## What usually gets measured?

Projects often split accuracy into areas like these:

- instruction behavior
- timing
- interrupts and events
- memory and hardware registers
- video, audio, and input
- agreement between compiled code and fallback paths
- determinism

Those areas make the work easier to discuss. They do not mean every console can be compared with one simple number.

Timing on SNES is not the same problem as timing on PlayStation. Audio on one console may be a whole separate processor. A handheld may have hardware quirks a home console never had.

The labels help organize the work. The details are still console-specific.

## When should something count as done?

An item should only count as done when it has evidence.

At minimum, that means:

- it was compared against a trustworthy reference
- it was tested in a way that can be repeated
- the scope is clear

"Looks good" is useful as a first impression. It is not enough for a correctness claim.

For mature projects, the stronger version is [co-simulation](/docs/concepts/co-simulation): run the port beside a trusted reference and stop at the first difference.

## Why does scope matter?

Scope is the difference between an honest claim and an accidental overclaim.

"This game boots" is a claim.

"This game reaches the attract loop with no known differences under this test" is a stronger and clearer claim.

"This console is accurate" is usually too broad unless the project has a lot of evidence behind it.

Good docs should name the game, revision, test path, reference, and known gaps when the claim depends on them.

## How should users read maturity?

Treat maturity as practical confidence, not a universal guarantee.

psxrecomp is the gold-standard framework in this ecosystem today. SNES is the next strongest reference point. Other projects are useful, but many are still early, experimental, or focused on a smaller problem.

That is not an insult to those projects. It is just the state of the work.

A mature framework usually has better discovery, stronger runtime behavior, clearer tests, and fewer surprises when a new game is added.

## What should not be claimed?

Do not say a port is perfect because it boots.

Do not say a whole console is solved because one game looks good.

Do not say co-simulation proves real hardware behavior in every case. It proves agreement with the reference used for that test.

Do not hide scope. If a result only covers one game, one path, one region, or one build, say that.
