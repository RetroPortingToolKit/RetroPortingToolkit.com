---
title: "What to tell an AI agent before it touches a recomp project"
summary: "How to brief an AI agent before it works on static recompilation code."
pageType: "project"
tags: ["Agents", "Conventions", "Verification"]
updated: "2026-08-30"
---

These pages are for people using AI agents on recomp projects.

Do not assume the agent will find this page on its own. Give it the rules. Paste the important parts into the session. Point it at the local repository instructions. Then make it prove the work.

Recomp projects are unusually easy for AI to damage. The game can boot while skipping real logic. A patch can compile while weakening accuracy. A "temporary" stub can survive for months because it looks harmless.

The goal is not to make the diff sound smart. The goal is to preserve correctness.

## What to give the agent first

Do not assume every project already has the same instruction files.

If a project already has local instructions, tell the agent to read them before editing. If it does not, start from system-agnostic templates and have the agent adapt them to that project.

These starter files are intentionally generic:

| Starter file | Use it for |
|---|---|
| [AGENTS.md](/agent-templates/AGENTS.md) | The rules any AI agent should follow in this repo: where fixes belong, what never to edit, required checks, commit rules, and handoff expectations. |
| [CLAUDE.md](/agent-templates/CLAUDE.md) | A compatibility file for projects that still use Claude-specific instructions. Keep it aligned with `AGENTS.md` instead of letting two rule sets drift. |
| [README.md](/agent-templates/README.md) | Human setup: what the project is, what works today, what files the user must legally provide, and how to build or launch it. |
| [DEBUG.md](/agent-templates/DEBUG.md) | How to observe the running port: dispatch misses, coverage, traces, screenshots, co-simulation, known failure modes, and common commands. |
| [TCP_COMMANDS.md](/agent-templates/TCP_COMMANDS.md) | The debug protocol: port, request shape, response shape, commands, error format, and examples. Rename it to `TCP.md` if that is the local convention. |

The local repository wins when it has specific rules. These site pages are a fallback and a shared philosophy. They are not a replacement for the instructions in the repo being changed.

If the local file points at a path the agent cannot open, make it say so. It should not invent missing rules.

## What kind of work is this?

A recomp project usually has more than one repository involved.

Make the agent identify where it is working before it edits anything.

| Repo type | What it usually owns |
|---|---|
| Framework repo | Recompiler, runtime, hardware model, shared tooling. |
| Game repo | Game config, hooks, allowed assets, release packaging. |

A framework repo is the reusable system layer. It is where the console rules live: CPU behavior, memory, timing, graphics, audio, input, code generation, debug tools, and shared runtime behavior.

A game repo is the specific port. It usually says "take this game file, verify its identity, generate the code, build this app, and apply these game-specific hooks."

Many game repos include the framework as a submodule. A submodule is a pointer to another Git repository at one exact commit. It may look like a normal folder, but it has its own history. Updating a submodule means changing that pointer, and usually also committing the framework change in the framework repo first.

That distinction matters:

| Change | Usually belongs in |
|---|---|
| CPU instruction behavior | Framework repo |
| Hardware timing default | Framework repo |
| Debug server command used by every game | Framework repo |
| Code discovery rule used by many games | Framework repo |
| Game hash, serial, or identity rule | Game repo |
| Game-specific symbol overlay or config | Game repo |
| Release packaging for one port | Game repo |
| Custom renderer or enhancement for one game | Game repo, unless it becomes reusable framework behavior |

A framework bug should not be hidden in one game. A game-specific rule should not become the default for a whole console.

## Recommendations from the development team

> **Note from Matthew Stanley ([mstan](https://github.com/mstan)), aka Gamemaster**
>
> For everyday recomp work, the strongest results have come from Opus 5 and GPT 5.5 High.
>
> For extremely complex problems, the most useful pattern has been orchestration: use Fable or Sol as the lead reviewer, then have them challenge subagents running Opus 5 or GPT 5.5 High.
>
> The value is not "more agents." The value is adversarial review, independent hypotheses, and forcing every claim to come with proof.
>
> In practice, Opus 5 is strong but can struggle with very long-running tasks. GPT 5.5 High tends to hold longer solo threads better. Fable and Sol are most useful when the problem is too tangled for one everyday agent to keep straight.

Treat these as experience notes, not a permanent model ranking. The important idea is the workflow: harder recomp problems benefit from independent review and proof pressure.

## The short briefing

Give the agent this standard:

- Follow the local repo instructions first.
- Do not edit generated code.
- Do not add stubs.
- Find the first divergence.
- Align by hardware events, not frame numbers.
- Check dispatch misses after runs.
- Check coverage when the project reports it.
- Use TCP, traces, screenshots, or co-simulation when available.
- Say what could not be tested.
- Leave a handoff that another person can continue.

If the agent cannot explain how it will prove the change, it is not ready to edit.

## What proof should look like

Good proof is specific:

- the build command ran
- the game launched
- the debug server answered
- dispatch misses were empty
- coverage did not regress
- the oracle matched
- the screenshot showed the expected output
- the release archive contained only allowed files

Pick the proof that matches the claim. A screenshot does not prove timing. A build does not prove gameplay. A unit test does not prove a full route.

## What to watch for

Stop the agent when it:

- patches generated files
- adds placeholder behavior
- explains around a failing check
- treats a skipped test as a pass
- says "probably" where a trace or oracle result is needed
- uses one game to justify a framework rule
- weakens a game or BIOS identity gate
- commits dumps, game files, BIOS files, saves, or local junk

These are not style problems. They are correctness problems.

## Next pages

Read these in order:

- [Rules to give an agent](/docs/agents/house-invariants)
- [How to check AI work](/docs/agents/verification-rituals)
- [How AI breaks recomp projects](/docs/agents/failure-modes)
- [Debug surfaces agents can use](/docs/agents/machine-surfaces)
