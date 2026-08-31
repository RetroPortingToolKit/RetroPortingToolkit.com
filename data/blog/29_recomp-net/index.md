---
title: "recomp-net"
author: "Shokunin"
kicker: "Library"
tags: ["Netplay"]
featured: false
desc: "The ecosystem's multiplayer plumbing: one shared library gives recompiled games their online and LAN netplay."
date: "2026-07-18"
repo: "https://github.com/TechnicallyComputers/recomp-net"
verified: "2026-08-18"
updated: "2026-08-19"
added: "2026-07-18"
---

Multiplayer is infrastructure, and recomp-net is where this ecosystem keeps it: a portable netcode library that recompiled games link against instead of each writing their own. It is written in C11, builds with CMake, and is MIT licensed, maintained by TechnicallyComputers.

## What it does

Delay-sync lockstep netplay: every player's copy runs the same simulation, and each frame waits until the other side's inputs arrive, offset by a fixed input delay. The library owns the session and the transports: UDP on a LAN, optional internet connectivity through ICE (via libjuice) with STUN address discovery, and ranked local interface discovery for LAN launchers. Matchmaking is deliberately out of scope; the open-source sibling recomp-net-server provides the WebSocket lobby. A rollback mode is in development alongside [retcomm-rbengine](/blog/retcomm-rbengine), the companion rollback engine, starting from a portable input contract.

## Which projects use it

The shipped delay-sync session is used by the [PlayStation](/hardware/playstation) and [Super Nintendo](/hardware/super-nintendo) recomp netplay builds, and the library is aimed at recompilation hosts generally. Its documentation also spells out the host-side patterns an engine needs for netplay to feel good: stall gracefully while waiting on a peer, keep the simulation deterministic, and recover from network jitter without inventing inputs.

## Sources

- [recomp-net README (GitHub)](https://github.com/TechnicallyComputers/recomp-net)
- [recomp-net-server, the companion lobby server (GitHub)](https://github.com/TechnicallyComputers/recomp-net-server)
