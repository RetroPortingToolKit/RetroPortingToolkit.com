---
title: "recomp-net"
kicker: "Library"
tags: ["Netplay"]
featured: false
desc: "Portable delay-sync netcode library for recompilation hosts, used by psxrecomp's opt-in netplay build."
year: "2026"
status: "Active"
provenance: "community"
repo: "https://github.com/TechnicallyComputers/recomp-net"
group: "Shared libraries"
links:
  - { label: "recomp-net on GitHub", href: "https://github.com/TechnicallyComputers/recomp-net" }
---

recomp-net is a portable netcode library for recompilation hosts, written in C11 with a CMake build and released under the MIT license by TechnicallyComputers. Its documentation names N64Recomp and the PSX recomp as consumers, and [psxrecomp](/hardware/playstation) integrates it for its opt-in netplay build.

## What it provides

Delay-sync lockstep netcode, with optional ICE connectivity via libjuice, LAN UDP transport, and STUN support. A lobby server lives in the sibling recomp-net-server project.

## Where it is going

Rollback support is developing alongside [retcomm-rbengine](/software/retcomm-rbengine), the companion rollback engine, with newer recomp-net work building toward that model.

The library ships no game data of any kind; it is infrastructure that recompilation projects link against.
