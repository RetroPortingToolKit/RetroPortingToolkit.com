---
title: "Why does determinism matter?"
summary: "Save states, rewind, recordings, and rollback netplay only work when the port can repeat the same game state exactly."
pageType: "concept"
tags: ["Correctness", "Netplay", "Save states"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/DKC2Recomp"
  - "https://github.com/TechnicallyComputers/recomp-net"
  - "https://github.com/TechnicallyComputers/retcomm-rbengine"
  - "https://github.com/mstan/MegaManXSNESRecomp"
  - "https://github.com/mstan/gcnlle"
updated: "2026-08-30"
---

Determinism means the same starting state and the same inputs produce the same result.

That sounds simple. It is not.

A recomp port is native code running on a modern computer, but the game still expects the old console's behavior. If two runs drift apart, features like save states, rewind, input recordings, and rollback netplay become unreliable.

## Why do save states need it?

A save state captures the machine and restores it later.

For that to work, the snapshot has to include everything that can affect the game: memory, CPU state, video state, sound state, timers, device state, and any other mutable console behavior.

If the snapshot misses something, the restored game may look fine for a moment and then drift. That kind of bug is hard to see because the failure happens after the real mistake.

## Why does rewind need it?

Rewind is save states taken over and over.

The runtime keeps recent snapshots in a ring. When the player rewinds, the port loads older states and walks backward through recent gameplay.

That only feels clean when restore is complete. If audio, graphics, timers, or controller state are not restored correctly, rewind exposes it quickly.

## Why does netplay need it?

Rollback netplay is stricter.

Two players may briefly predict each other's inputs. When the real inputs arrive, the game rolls back, replays the frames, and expects both machines to land on the same state.

If they do not, the session desyncs.

That means the port has to produce the same result across machines, settings, and runs. Host-only details cannot leak into the simulation. A graphics setting, thread timing difference, random pointer value, or platform-specific floating point difference must not change the game state.

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
- allowing mods or patches to affect netplay without all peers agreeing
- treating "it loaded" as proof that a state restored correctly

The strict version is simple: restore the state, run again, and prove the game lands in the same place.

## What should users take away?

Save states, rewind, and netplay are not just nice extras. They require the port to understand the full machine well enough to put it back exactly.

When a project supports those features well, it is usually a sign that the runtime is becoming more mature.

## Next

- [How do we compare a port to the original?](/docs/concepts/co-simulation)
- [What does correct enough mean?](/docs/concepts/accuracy-and-burndowns)
- [recomp-net API](/docs/reference/recomp-net-api)
- [What do these terms mean?](/docs/concepts/glossary)
