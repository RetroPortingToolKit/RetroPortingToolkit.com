# DEBUG.md

This file explains how to observe and debug this recomp project.

Fill in the sections that apply. Delete sections that do not apply.

## Required Inputs

The user must provide:

- game file:
- BIOS or firmware file, if applicable:
- save file or fixture, if applicable:

Use legally obtained files. Do not commit game files, retail BIOS files, private saves, or dumps.

## Build and Run

Build:

```sh
# fill in project build command
```

Run:

```sh
# fill in project run command
```

## Generated Files

Generated files are written to:

- `generated/`

Do not edit generated files by hand. Fix the recompiler, runtime, or config, then regenerate.

## Dispatch Misses

Dispatch miss artifact:

- path:
- expected clean state:

A dispatch miss can skip a whole subroutine without crashing. Check this after every run.

## Coverage

Coverage report:

- path or command:
- expected clean state:

Record whether the route stayed static or used interpreter fallback.

## Debug Server

Protocol file:

- `TCP.md` or `TCP_COMMANDS.md`

Default port:

- native:
- oracle/reference, if any:

Basic health check:

```sh
# fill in ping command
```

## Screenshots and Frame Capture

Best capture command:

```sh
# fill in screenshot or frame capture command
```

Use the capture path closest to what the player sees.

## Co-Simulation or Oracle

Oracle/reference:

- name:
- command:
- sync point:

Use hardware events for alignment when possible. Do not rely on frame numbers unless the project proves they match.

## Known Failure Modes

- dispatch misses:
- interpreter fallback:
- timing sensitivity:
- renderer limitations:
- audio limitations:
- input timing:
- packaging risks:
