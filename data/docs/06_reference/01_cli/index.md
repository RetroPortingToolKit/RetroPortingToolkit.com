---
title: "Command line reference"
summary: "A practical map of the command line tools: what each class of tool does, when to use it, and which flags matter most."
pageType: "reference"
tags: ["CLI", "Reference", "Tooling"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/smsggrecomp"
  - "https://github.com/mstan/ndsrecomp"
  - "https://github.com/mstan/cdirecomp"
  - "https://github.com/mstan/vbrecomp"
updated: "2026-08-30"
---

This page is a map, not a dump of every flag in every repository.

The exact command line changes as the toolchains move. Use the project you are building as the final authority, and use `--help` when a command accepts it.

The useful part here is the shape: which tool you are running, what file it expects, and what output it should produce.

## What kinds of tools exist?

Most repositories have some mix of these:

| Tool kind | What it does |
|---|---|
| Recompiler | Reads game or BIOS machine code and writes generated C or C++. |
| Runtime | Runs the generated code and models the console around it. |
| Builder | Wraps CMake, Ninja, emitters, and project setup. |
| Debug client | Talks to a running port through TCP. |
| Packager | Creates a release archive from allowlisted files. |
| Oracle harness | Runs a trusted reference beside the port for comparison. |

If you are not sure which one you need, start from the guide instead of this page: [Build a toolchain](/docs/guides/build-a-toolchain) or [Port a game](/docs/guides/port-a-game).

## What files do commands usually ask for?

Common inputs are:

| Input | Meaning |
|---|---|
| Game file | The ROM, disc image, or executable you legally provide. |
| BIOS or firmware | A legally obtained system file, if the platform needs one. |
| `game.toml` | Per-game configuration: identity, entry points, output paths, runtime settings. |
| Seeds or symbols | Hints that tell the recompiler where functions and labels are. |
| Output directory | Where generated code or a new project should be written. |

This site does not provide game files or copyrighted retail BIOS files.

## PlayStation reference shape

psxrecomp is the clearest command-line reference today.

A normal developer flow looks like:

1. verify the disc;
2. generate code;
3. build the runtime;
4. run the port;
5. use TCP tools when debugging.

The important commands are grouped around those jobs:

| Command | Job |
|---|---|
| `psxrecomp build` | Create a new project from a disc and BIOS path. |
| `psxrecomp_cli.py verify-disc` | Check that the disc matches what the project expects. |
| `psxrecomp_cli.py generate` | Prepare inputs and regenerate code. |
| `psxrecomp_cli.py rebuild` | Run the CMake build. |
| `psx-runtime` | Launch the built port. |
| `tools/debug_client.py` | Send TCP debug commands to a running port or oracle. |

The common flags are the ones you would expect: `--disc`, `--bios`, `--config`, `--build-dir`, `--target`, `--debug-port`, and `--headless`.

## Other console shapes

Other systems follow the same broad pattern, but maturity differs.

| Platform | Usual command shape |
|---|---|
| NES | Build a small recompiler, pass a `.nes` file and optional game config, then build a game runner. |
| SNES | Pass a `.sfc` or `.smc` file to a project/tool wrapper, then build the generated project. |
| Game Boy Advance | Pass a `.gba` file, config, symbols, and output directory; some projects also involve BIOS handling. |
| Sega Genesis | Pass a Genesis/Mega Drive cartridge dump and `game.toml`, then build the runner. |
| Master System and Game Gear | Pass a cartridge dump and game config; this path is still tech-demo level. |
| Nintendo DS | Pass BIOS, firmware, and title data through project-specific commands; this path is alpha-stage. |
| Virtual Boy | Pass a Virtual Boy cartridge dump; the public path is still a one-game tech demo. |
| CD-i | BIOS-focused research commands; not a normal game-port route yet. |

When a platform is early, the command line is more likely to change. Do not build long-term instructions around one old command.

## How should I run commands safely?

Use these rules:

- clone with submodules when the project uses them;
- keep game files outside framework repositories;
- use release-style builds unless you are debugging;
- use fewer build jobs if generated code exhausts memory;
- keep exact commands in scripts once they work;
- do not edit generated code by hand.

A failed command is usually most useful at the first error. Later errors may only be consequences.

## How do debug commands fit in?

Debug clients usually talk to a running port over TCP.

The client sends a command like `ping`, `screenshot`, `read_ram`, or `get_registers`. The runtime answers with JSON.

That is the right tool for AI-assisted debugging too. The AI can capture a screen, press simple inputs, read state, and compare results without relying only on text logs.

See [TCP debug protocol](/docs/reference/tcp-protocol) for the transport and [Debug a divergence](/docs/guides/debug-a-divergence) for the workflow.

## When should I use a packager?

Use a packager when another person will download the result.

Do not zip a build folder by hand. A build folder can contain local files that should never ship.

A good package command copies only allowlisted files and rejects ROMs, disc images, retail BIOS files, generated source, logs, and local config.

See [Release a port](/docs/guides/release-a-port).

## Next

- [Build a toolchain](/docs/guides/build-a-toolchain)
- [Port a game](/docs/guides/port-a-game)
- [TCP debug protocol](/docs/reference/tcp-protocol)
- [Errors and exit codes](/docs/reference/errors-and-exit-codes)
