---
title: "Why does determinism matter?"
summary: "Save states, rewind, and recordings only work when the port can repeat the same game state exactly."
pageType: "concept"
tags: ["Correctness", "Save states"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/DKC2Recomp"
  - "https://github.com/TechnicallyComputers/retcomm-rbengine"
  - "https://github.com/mstan/MegaManXSNESRecomp"
updated: "2026-08-31"
---

Determinism means the same starting state and the same inputs produce the same result.

That sounds simple. It is not.

A recomp port is native code running on a modern computer, but the game still expects the old console's behavior. If two runs drift apart, features like save states, rewind, and input recordings become unreliable.

## Why do save states need it?

A save state captures the machine and restores it later.

For that to work, the snapshot has to include everything that can affect the game: memory, CPU state, video state, sound state, timers, device state, and any other mutable console behavior.

If the snapshot misses something, the restored game may look fine for a moment and then drift. That kind of bug is hard to see because the failure happens after the real mistake.

## Why does rewind need it?

Rewind is save states taken over and over.

The runtime keeps recent snapshots in a ring. When the player rewinds, the port loads older states and walks backward through recent gameplay.

That only feels clean when restore is complete. If audio, graphics, timers, or controller state are not restored correctly, rewind exposes it quickly.

## What makes this harder than an emulator?

An emulator usually has one central machine model. It can stop between instructions and serialize that model.

A recomp port has generated native code, runtime device models, host APIs, and sometimes multiple renderers or helper systems. The state is spread across more places.

That is manageable, but it has to be designed. Snapshot and restore are not just file save features. They are correctness features.

## What should a project guard against?

A deterministic port should avoid:

- storing host-only state in save files
- letting graphics settings change game logic
- relying on thread timing for game behavior
- accepting save states from incompatible builds
- treating "it loaded" as proof that a state restored correctly

The strict version is simple: restore the state, run again, and prove the game lands in the same place.

## What should users take away?

Save states and rewind are not just nice extras. They require the port to understand the full machine well enough to put it back exactly.

When a project supports those features well, it is usually a sign that the runtime is becoming more mature.

## Next

- [How do we compare a port to the original?](/docs/concepts/co-simulation)
- [What does correct enough mean?](/docs/concepts/accuracy-and-burndowns)
- [What do these terms mean?](/docs/concepts/glossary)
