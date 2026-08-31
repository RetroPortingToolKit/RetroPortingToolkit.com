# AGENTS.md

This file tells AI agents how to work in this recomp project.

Before editing code, read this file, then read `README.md`, `DEBUG.md`, and any framework or submodule instructions this project points to.

## Project Shape

This repository is a:

- [ ] framework repo
- [ ] game repo
- [ ] mixed or transitional repo

Framework repos own reusable system behavior: recompiler logic, runtime logic, hardware models, debug tools, timing, graphics, audio, input, and shared build tooling.

Game repos own one port: game identity, configuration, symbols, game-specific hooks, packaging, and project-specific assets.

If this repo uses a submodule, remember that a submodule is a pointer to another Git repository at one exact commit. Framework fixes usually land in the framework repo first, then the game repo updates the submodule pointer.

## Required Rules

- Follow local project instructions before general advice.
- Do not edit generated code.
- Do not add stubs or fake success behavior.
- Fix framework bugs in the framework.
- Keep game-specific rules in the game repo.
- Treat dispatch misses as blocking unless explicitly documented otherwise.
- Align co-simulation by hardware events, not by frame number.
- Keep game and BIOS identity checks strict.
- Do not commit game files, retail BIOS files, disc dumps, private saves, scratch captures, or local build junk.
- If evidence is missing, say so plainly.

## Before Editing

Report:

- what kind of repo this is
- what local instructions were found
- what framework or submodule is involved
- what files are generated
- what checks can be run locally
- what required inputs are missing

## Verification

The proof must match the claim.

Useful checks may include:

- build
- regeneration
- idempotent regeneration
- game launch
- dispatch-miss report
- coverage report
- TCP debug `ping`
- screenshot or frame capture
- trace query
- co-simulation or oracle comparison
- release package inspection

Do not claim gameplay correctness from a build alone.

## Handoff

End with:

- what changed
- what was tested
- exact commands run
- what could not be tested
- remaining risks
- next recommended step
