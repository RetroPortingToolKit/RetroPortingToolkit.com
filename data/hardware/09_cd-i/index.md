---
title: "CD-i"
kicker: "SCC68070"
tags: ["System ROM recomp", "OS-9"]
featured: false
desc: "A research project for the Philips CD-i system software. The BIOS shell runs, and Hotel Mario only reaches an early title sequence."
year: "2026"
status: "Research"
maturity: "Tech demo"
availability: "Source only"
provenance: "core"
arch: "Philips SCC68070"
repo: "https://github.com/mstan/cdirecomp"
group: "Early platform work"
links:
  - { label: "cdirecomp on GitHub", href: "https://github.com/mstan/cdirecomp" }
verified: "2026-08-18"
cover: "/consoles/cd-i.jpg"
---

cdirecomp is CD-i research.

It focuses first on the Philips CD-i system software. That means the BIOS shell matters here before normal games do.

You provide your own system ROM and disc dumps.

## What runs today

The recompiled CD-i system software boots into the player shell.

Hotel Mario can start far enough to show early intro and title material, but it has visual errors and gameplay does not work.

There are no commercial game ports yet.

## What CD-i ports can add

- Native desktop builds for the CD-i shell and future game projects.
- Mouse-driven pointer input.
- Modern window handling.
- Debugging tools for learning how CD-i software behaves.

## What to expect

Treat this as research, not a playable platform.

The important milestone today is that the system software can run. Commercial game support is still much earlier than that.
