---
title: "recomp-net"
kicker: "Library"
tags: ["Netplay"]
featured: false
desc: "A reusable netplay library for recomp projects, powering PSXRecomp multiplayer now and aimed at other ecosystems next."
date: "2026-07-18"
repo: "https://github.com/TechnicallyComputers/recomp-net"
verified: "2026-08-18"
updated: "2026-08-19"
added: "2026-07-18"
---

recomp-net is the shared netplay library for recomp projects.

The goal is simple: a game port should not have to invent online play from scratch. It should be able to use one library for sessions, player input, LAN play, and internet play, then focus on the game itself.

## What it does

It lets two or more players run the same recompiled game together and keep their copies in sync.

That sounds small, but it is one of the hard parts of multiplayer. Both players need to see the same game state. Inputs need to arrive at the right time. The host needs to handle disconnects, slow connections, and local network setup without each game solving that again.

recomp-net gives ports a reusable base for that work.

## Which projects use it

Today, recomp-net powers netplay work in the [PlayStation](/hardware/playstation) ecosystem.

It is meant to be reused beyond one console. The same library is expected to fit other recomp ecosystems, including [Super Nintendo](/hardware/super-nintendo), as those ports grow their multiplayer support.

That reuse matters. If every project builds its own netplay layer, every project inherits its own bugs. A shared library lets the fixes carry forward.

## For developers

The library is maintained by TechnicallyComputers. It is written in C11, builds with CMake, and is MIT licensed.

The current shipped path is delay-sync netplay. Rollback support is being developed alongside [retcomm-rbengine](/blog/retcomm-rbengine).

## Sources

- [recomp-net README (GitHub)](https://github.com/TechnicallyComputers/recomp-net)
- [recomp-net-server, the companion lobby server (GitHub)](https://github.com/TechnicallyComputers/recomp-net-server)
