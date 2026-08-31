---
title: "Working with AI agents"
summary: "How to brief, supervise, and verify AI agents working on recomp projects."
sectionTitle: "Working with AI agents"
pageType: "reference"
tags: ["Agents"]
updated: "2026-08-31"
---

This section is for people using AI agents on recomp projects.

Do not assume an agent will discover these rules by crawling the site. Treat these pages as a briefing packet: give the agent the rules, point it at the local repository instructions, and make it prove its work.

- [What to tell an AI agent before it touches a recomp project](/docs/agents/start-here). The human-facing overview and recommended agent setup.
- [Rules to give an AI agent](/docs/agents/house-invariants). The rules an agent should follow unless the local repository says something stricter.
- [How to check AI work](/docs/agents/verification-rituals). What proof counts for builds, coverage, co-simulation, screenshots, TCP checks, and releases.
- [How AI breaks recomp projects](/docs/agents/failure-modes). The quiet failure modes to look for when reviewing AI-generated recomp work.
- [Debug surfaces agents can use](/docs/agents/machine-surfaces). TCP servers, traces, JSON output, screenshots, input commands, and other surfaces an agent can query.
- [Making AI contributions reviewable](/docs/agents/contributing-as-an-agent). Commit rules, handoff expectations, and what never belongs in a change.
- [When an agent cannot run the game](/docs/agents/when-you-cannot-run-the-game). What an agent can still check without the game, display, or oracle.
- After an agent finishes, expect a recap that names the files changed, checks run, commit, and published URL.
