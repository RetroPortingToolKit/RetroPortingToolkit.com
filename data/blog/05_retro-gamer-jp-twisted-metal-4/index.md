---
title: "PS1 Twisted Metal 4 comes to PC/Mac/Linux: static recompilation project released on GitHub"
kicker: "Press"
tags: []
featured: false
desc: "An English digest of retro-gamer.jp's Japanese coverage of TwistedMetal4 Recompiled."
date: "2026-08-15"
venue: "retro-gamer.jp"
layout: "article"
links:
  - { label: "Read on retro-gamer.jp", href: "https://retro-gamer.jp/?p=45562" }
---

retro-gamer.jp covered the independent Twisted Metal 4 recompilation in Japanese.

This page is an English digest of the article.

## Short version

TwistedMetal4 Recompiled is a public GitHub project that aims to bring the PlayStation game Twisted Metal 4 to Windows, macOS, and Linux.

It is built with PSXRecomp, the PlayStation static recompiler used by several native PlayStation port projects.

The project does not include game data. The user supplies their own North American Twisted Metal 4 disc image.

The big player-facing goal is multiplayer. The original game supported up to four players with the PlayStation multitap, and the project is structured around keeping that path alive. Rollback netplay is described as a future goal, not something finished in the current build.

## The project

The article opens with the basic news: TwistedMetal4 Recompiled was published on GitHub, and the target platforms are Windows, Linux, and macOS.

It frames the project as a static recompilation project rather than a normal emulator package. The game code is transformed into code that can be compiled for modern computers, while the surrounding PlayStation behavior is handled by the runtime.

The article links both the Twisted Metal 4 project and PSXRecomp:

- [TwistedMetal4Recomp on GitHub](https://github.com/TechnicallyComputers/TwistedMetal4Recomp)
- [PSXRecomp on GitHub](https://github.com/mstan/psxrecomp)

## What PSXRecomp is doing

The article explains why PlayStation games cannot simply run as-is on a modern PC. The original PlayStation used a MIPS R3000A-family CPU, while modern desktop builds normally target x86-64 or another host CPU.

PSXRecomp handles that gap by translating the PlayStation game's MIPS instructions into C. That generated code is then compiled into a native program for the user's platform.

The article also explains the main difference from emulation. A normal emulator runs a simulated PlayStation and then runs the game inside it. This project instead compiles the game program itself into a host-native build, then gives it a runtime that behaves like the PlayStation pieces the game expects.

There is one important complication: PlayStation games can load extra program code from the disc while the game is already running. These are overlays. PSXRecomp has a path for code that was not visible at the first static pass: it can run that code through a small MIPS interpreter, capture it, compile it, and then reuse the native version later.

## What Twisted Metal 4 is

The article gives a quick overview of the game itself.

Twisted Metal 4 was developed by 989 Studios and released in North America in 1999. It is a car-combat game: players drive armed vehicles through arenas and fight other vehicles with missiles, bombs, and other weapons.

The article also mentions Sweet Tooth, the series mascot, and notes that Twisted Metal 4 changes the setup by having him take over the tournament.

The part that matters most for this site is multiplayer. The original game supports up to four players through the PlayStation multitap. The recomp project keeps the maximum player count at four and includes configuration for multitap-style input.

## What players need

The supported game is the North American revision 1 release of Twisted Metal 4, game ID `SCUS-94560`.

The article notes that there was no Japanese release, so users cannot use a Japanese disc. They need an image made from the North American disc.

The expected format is BIN/CUE. The article calls out that the image needs the data track and the 23 audio tracks. That matters because CD audio can affect consistency, especially for multiplayer.

The project does not ship the disc image, the game program, or generated game code. The article frames this as intentional: the user provides their own disc image and the conversion/build happens on the user's computer.

## Launcher and install flow

The article also mentions RetComM Launcher.

RetComM Launcher is meant to manage PlayStation recompilation projects: installs, updates, disc images, BIOS files, save data, and related setup. The article says the launcher generates and compiles the needed code on the user's machine, so the first install can take several minutes.

[RetComM Launcher on GitHub](https://github.com/TechnicallyComputers/RetComM-Launcher)

## BIOS support

The article explains that PSXRecomp can use OpenBIOS, the open-source PlayStation BIOS from PCSX-Redux.

That means the default path may not require a dumped retail PlayStation BIOS. If the user wants to use a retail BIOS, the project can also use a legally obtained North American `SCPH1001.BIN` where supported.

The article ties this back to the required disc image: the project expects the correct North American revision and complete track layout so players are not using mismatched game data.

## Online play goals

The article spends a section on rollback netplay.

Rollback netplay is a multiplayer technique where the game predicts remote player input instead of always waiting. If the real input arrives and the prediction was wrong, the game rolls back to a saved state and quickly replays with the correct input.

The article contrasts that with fixed-delay lockstep, where the game waits a fixed amount of time so both players' inputs are available before simulation advances.

It also notes that PSXRecomp's netplay work can support both rollback and fixed-delay styles. For two-player sessions, peer-to-peer can be used. For three or more players, a host or server path is available.

The important caveat: TwistedMetal4 Recompiled does not appear to have netplay enabled as a finished feature in the current configuration. The article says the related option is still commented out and the config notes that it should be enabled after testing.

So the correct reading is: rollback netplay is a project goal, not a finished promise.

## Current maturity

The article closes by setting expectations.

The GitHub repo includes configuration files, symbol information, and build scripts. That is useful for developers and for people following the project.

At the time of the article, there was no standalone release package for TwistedMetal4 Recompiled, and no detailed compatibility report showing how far the game works.

The article also notes that the project is based on a generated project skeleton, and that game-specific behavior and overlays still need manual adjustment.

That makes the current state easier to understand: this is not a polished one-click release for normal players yet. It is a public development project for bringing Twisted Metal 4 to PC through PSXRecomp.

Still, the idea is strong. A four-player vehicle-combat game with rollback netplay would be a meaningful use case if the project reaches that point.

Related: [Twisted Metal 4](/games/twisted-metal-4) on [PlayStation](/hardware/playstation).
