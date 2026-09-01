---
title: "Making AI contributions reviewable"
summary: "How to keep AI-assisted recomp work auditable, testable, and easy for a maintainer to accept or reject."
pageType: "guide"
tags: ["Agents", "Conventions"]
updated: "2026-08-30"
---

AI-assisted work should be easy to review.

That does not mean the diff has to be small. It means the maintainer can tell what changed, why it changed, what proved it, and what remains unproven.

If the work cannot be reviewed, it is not ready.

## Before work starts

The agent should report the ground rules before editing:

- which repository it is in
- whether it is a framework repo or game repo
- whether a submodule is involved
- which local instruction files exist
- which required files are missing
- which checks can run locally

This catches a common mistake early: applying rules from the wrong repository.

## Commit policy

Do not let an agent invent a commit policy.

Some repositories want commits only when the user explicitly asks. Some want evidence committed next to code. Some require framework commits before game-repo submodule bumps.

When the repo is silent, the safe default is:

- make the change
- run the best available checks
- show the diff and results
- wait for explicit approval before committing

That matches the review flow most users expect.

## What never belongs in a change

Do not accept a change that adds:

- game files
- retail BIOS files
- disc images
- extracted private assets
- private saves or memory cards
- local dumps or scratch captures
- large diagnostic logs
- generated build output, unless the project explicitly tracks it

Be careful with generated code. Some projects ship compiled derived code as part of a release. That is not the same as committing uncompiled generated source from a user's game file. Avoid broad statements. Follow the project's release policy.

## What never counts as proof

These are weak claims:

- "it builds, so it works"
- "the screen looks fine"
- "the tests pass" without checking skips
- "the code path probably cannot happen"
- "the generated output looked reasonable"
- "the agent compared it to its memory of the system"

Ask for the proof that matches the claim. The [verification page](/docs/agents/verification-rituals) has the checklist.

## Handoff format

When work is not finished, the handoff is the deliverable.

Use this shape:

```markdown
# Handoff: <what this session worked on>

## Where this runs
Repository, branch, commit, and required local files.

## What changed
Short list of touched areas.

## What is proven
One claim per line, with the command, trace, screenshot, or oracle result that proves it.

## What is not proven
Missing checks, missing files, skipped tests, or routes not run.

## What is not the problem
Things already ruled out, with the evidence.
