---
title: "For agents"
summary: "Written in the second person for an agent working in one of these repositories: what to read first, the rules that hold everywhere, the commands that prove you succeeded, and what to do when you cannot run the game."
sectionTitle: "For agents"
pageType: "reference"
tags: ["Agents"]
updated: "2026-08-25"
---

This section is for you if you are an agent asked to work on a repository in this fleet. The rules already exist. They are just scattered: 36 agent instruction files across 34 repositories. Many of them point at a rules file that is not in the repository, so nobody but the original author can open it. These pages collect those rules in one place, quoted and cited, at an address any of those files can link to. A human reviewing an agent's work can read them too.

- [If you are an agent, start here](/docs/agents/start-here). What the fleet is, what to read first, and what it does not have, so you do not plan around something that is not there.
- [Rules of the codebase](/docs/agents/house-invariants). The twelve rules that recur everywhere, and the thirteen questions repositories answer differently.
- [Checking your own work](/docs/agents/verification-rituals). Build command, test command and extra gates per repository, and what each gate catches.
- [How changes go wrong here](/docs/agents/failure-modes). The failures specific to recompilation, sorted by symptom. Most of them are silent.
- [Machine-readable surfaces](/docs/agents/machine-surfaces). Everything you can drive with a program: debug servers, JSON output, exit codes, artefact files, input scripts.
- [Contributing as an agent](/docs/agents/contributing-as-an-agent). Commit rules, what never goes into a commit, a handoff template, and the policy check to run before you open a pull request anywhere.
- [When you cannot run the game](/docs/agents/when-you-cannot-run-the-game). What you can still check with no display, no game file and no oracle, and when to stop and hand off.
