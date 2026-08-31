---
title: "recomp-net API"
summary: "What recomp-net is for, what a port has to provide, and the rules that keep netplay deterministic."
pageType: "reference"
tags: ["Netplay", "Rollback", "API"]
repos:
  - "https://github.com/TechnicallyComputers/recomp-net"
updated: "2026-08-30"
---

`recomp-net` is the shared netplay layer for recomp projects.

It is not a full game server by itself. It does not know what a controller means. It does not know what a menu, race, battle, or save file is.

Its job is smaller:

- collect local input
- receive remote input
- decide when a frame or tick is safe to run
- publish the input set back to the game
- keep every peer moving through the same timeline

The port still owns the game logic. `recomp-net` owns the input scheduling and network plumbing.

## The basic model

Most ports need deterministic netplay.

That means two machines should run the same game state when they receive the same inputs at the same time. If one machine runs a tick early, late, or with different input, the game can diverge.

`recomp-net` avoids that by admitting a tick only when the needed inputs are ready.

The library treats input as opaque bytes. A PlayStation pad, an SNES controller, a GBA link event, or a project-specific sync byte can all cross the same boundary. The platform layer decides what the bytes mean.

## What a port provides

A port gives `recomp-net` a small host interface.

| Callback | Required? | What it does |
|---|---|---|
| `sample_local` | Yes | Capture this machine's input for a tick. |
| `publish` | Yes | Give the resolved input set back to the game. |
| `now_ms` | No | Provide a monotonic clock. |
| `on_signal` | No | Send signaling data for online connection setup. |

Most game projects should not touch this directly.

The usual split is:

- the shared platform framework integrates `recomp-net`
- the game project exposes the input or hook points that framework needs
- the release or launcher supplies connection UI

That split matters. Netplay should be part of the ecosystem, not a one-off patch hidden inside one game.

## Session settings

Every peer in a session has to agree on the settings that affect simulation.

| Setting | Why it matters |
|---|---|
| `slot_count` | Everyone must agree how many players exist. |
| `local_slot` | Each peer gets a different player slot. |
| `input_delay` | Everyone must schedule input the same number of ticks ahead. |
| `bundle_redundancy` | Older input samples are resent to survive packet loss. |
| `session_id` | Peers must know they are in the same session. |
| `protocol_magic` | Peers must reject traffic for another protocol or game. |
| `occupied_mask` | Empty seats should not block the game forever. |

If these are negotiated by a lobby, the lobby must be strict. A mismatch is not a warning. It is a different session.

## The game loop shape

A typical integration looks like this:

1. Create the session.
2. Start a transport.
3. Pump network traffic.
4. Ask whether the next tick can run.
5. If admitted, run exactly one game tick.
6. Advance the netplay session.
7. Repeat.

The important part is step 4. The game should not run a tick just because the renderer is ready. It runs when the netplay layer says the inputs for that tick are valid.

## Transports

The library supports more than one way to connect peers.

| Transport | Use |
|---|---|
| Direct LAN | Simple local testing and same-network play. |
| LAN lobby or beacon | Finding and joining sessions on a local network. |
| ICE | Internet play through signaling, NAT traversal, and fallback paths. |

The transport changes how peers find each other. It should not change the simulation contract.

## Rollback

Delay-based netplay waits for input before running a tick. Rollback adds the ability to rewind and replay when late input arrives.

Rollback is powerful, but it raises the bar for the port:

- save state must be correct
- load state must be correct
- input must be deterministic
- rendering must tolerate replayed frames
- audio must be handled carefully

If save/load is not trustworthy, rollback will expose that quickly.

## Platform barriers

Some systems have hardware events that act like synchronization points. A platform layer may need to model those as barriers so peers do not pass them at different times.

| Code | Name | Meaning |
|---|---|---|
| 13 | `SIO_MULTI_XFER` | Game Boy Advance link cable multi-player barrier. |

The exact barrier names are platform details. The rule is general: if hardware would force the machines to agree, the netplay layer needs an equivalent rule.

## What not to put here

Do not put game-specific hacks in the netplay layer.

If one game needs a special workaround, prove whether it is actually a platform rule first. Otherwise the workaround becomes part of the framework and the next game inherits a lie.

The netplay floor should be faithful and deterministic. Convenience layers can sit on top of that, but they should not replace it.
