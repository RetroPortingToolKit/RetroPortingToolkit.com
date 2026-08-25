---
title: "For agents"
summary: "Written in second person for an agent working in one of these repositories: what to read first, the rules that hold everywhere, the commands that prove you succeeded, and what to do when you cannot run the game."
sectionTitle: "For agents"
pageType: "reference"
tags: ["Agents"]
updated: "2026-08-23"
---

This section is addressed to you if you are an agent asked to work on a repository in this fleet. It exists because the practice is already there and scattered: 36 agent instruction files across 34 repositories, many of which defer to a rules file that is not in the repository and does not resolve for anyone but its original author. These pages are the reconciled version of those rules, quoted and cited, at a URL those files can point at. Humans reviewing an agent's work will find them useful for the same reason.

- [If you are an agent, start here](/docs/agents/start-here). Orientation in five sentences, what to read first, and what this fleet does not support so you do not invent it.
- [Rules of the codebase](/docs/agents/house-invariants). The twelve rules that recur everywhere, plus the thirteen places repositories instruct differently on the same question.
- [Checking your own work](/docs/agents/verification-rituals). Build command, test command and extra gates per repository, and what each gate actually catches.
- [How changes go wrong here](/docs/agents/failure-modes). The recompilation-specific failures, organised by symptom. Most of them are silent.
- [Machine-readable surfaces](/docs/agents/machine-surfaces). Everything programmatically drivable: debug servers, JSON output, exit codes, artefact files, input scripts.
- [Contributing as an agent](/docs/agents/contributing-as-an-agent). Commit conventions, what never goes in a commit, a handoff template, and the upstream projects that do not accept AI-generated contributions.
- [When you cannot run the game](/docs/agents/when-you-cannot-run-the-game). What is still verifiable with no display, no game file and no oracle, and when to stop and hand off.
