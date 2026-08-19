---
title: "recomp-net"
kicker: "Library"
tags: ["Netplay"]
featured: false
desc: "The ecosystem's netcode layer: portable delay-sync multiplayer for recompilation hosts, already powering psxrecomp's opt-in netplay build."
year: "2026"
availability: "Source only"
provenance: "community"
repo: "https://github.com/TechnicallyComputers/recomp-net"
group: "Shared libraries"
links:
  - { label: "View source (GitHub)", href: "https://github.com/TechnicallyComputers/recomp-net" }
verified: "2026-08-18"
---

Multiplayer is a library problem too. recomp-net is a shared library: portable netcode for recompilation hosts, written in C11 with a CMake build and released under the MIT license by TechnicallyComputers.

## What it does

Delay-sync lockstep netcode, with optional ICE connectivity via libjuice, LAN UDP transport, and STUN support. A lobby server lives in the sibling recomp-net-server project. Rollback support is developing alongside [retcomm-rbengine](/games/retcomm-rbengine), the companion rollback engine, with newer recomp-net work building toward that model.

## Used by

The library's documentation names N64Recomp and the PSX recomp as consumers, and [psxrecomp](/hardware/playstation) integrates it for its opt-in netplay build.
