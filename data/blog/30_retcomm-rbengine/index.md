---
title: "retcomm-rbengine"
kicker: "Library"
tags: ["Rollback", "Save states"]
featured: false
desc: "A reusable rollback engine for recomp projects, built to support save states, rewind, and future rollback netplay."
date: "2026-08-12"
repo: "https://github.com/TechnicallyComputers/retcomm-rbengine"
links:
  - { label: "retcomm-rbengine on GitHub", href: "https://github.com/TechnicallyComputers/retcomm-rbengine" }
verified: "2026-08-18"
updated: "2026-08-20"
added: "2026-08-12"
---

retcomm-rbengine is the shared rollback engine for recomp projects.

It gives ports a reusable base for features that need old game states: save states, rewind, replay work, and rollback netplay.

The goal is the same as [recomp-net](/blog/recomp-net): do not make every port solve the same hard problem by itself.

## What it does

A game can save its current state, restore an older state, and keep enough history to move backward and forward through recent frames.

That is the base for rewind. It is also the base for rollback netplay, where a game may need to rewind a few frames, apply late input, and replay back to the present.

The library does not know the details of every console or every game. Each port still has to describe how its own state is saved and restored. retcomm-rbengine provides the shared structure around that work.

## Which projects use it

Today, the public showcase is [PSXRecomp](/hardware/playstation), where the same rollback work supports save states and rewind.

It is meant to be reused by other recomp ecosystems as they add the same kinds of features.

That reuse matters. If every port builds its own rewind or rollback system, every port inherits its own edge cases. A shared engine lets the fixes carry forward.

## For developers

The library is maintained by TechnicallyComputers and is MIT licensed.

It pairs with [recomp-net](/blog/recomp-net). recomp-net handles the netplay session. retcomm-rbengine handles the local rollback and state-history side.

## Sources

- [retcomm-rbengine README (GitHub)](https://github.com/TechnicallyComputers/retcomm-rbengine)
