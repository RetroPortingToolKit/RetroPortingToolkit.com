---
title: "The fleet"
summary: "The map: all 86 repositories with their roles and dependencies, what this fleet inherits from upstream and what it does not, the license census, and how one project documents where its code came from."
section: "fleet"
sectionTitle: "The fleet"
pageType: "reference"
tags: ["Fleet"]
updated: "2026-08-23"
---

This is where the companion wiki promise becomes literal. The rest of the site explains techniques and consoles; this section is the map of the 86 repositories those techniques live in, and of the questions that only become visible when you look at all of them at once. No single repository can tell you that a shared launcher is pinned at 19 different commits, or that 48 repositories carry no license file, or which two of them actually contain upstream code. Read these when you need to place a repository rather than use one.

- [Every repository](/docs/fleet/repositories). All 86, grouped by role, each linked and attributed to its toolchain, plus the dependency map of which shared component is consumed by what. The index the rest of this wiki hangs off.
- [Lineage and credit](/docs/fleet/lineage-and-credit). What this fleet inherits from N64Recomp and the wider community, and the exact line between conceptual inheritance and a fork. Only two repositories are on the far side of it.
- [Licenses](/docs/fleet/licenses). The census, taken from the license files themselves, including the repositories that declare nothing and the places where a headline license is narrower than it looks.
- [Provenance](/docs/fleet/provenance). How one project records where every line of its device code came from, step by step, and what each toolchain says about firmware it does or does not ship. An engineering-ethics page, not a legal one.
