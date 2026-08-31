---
title: "Configuration"
summary: "How configuration is split between game files, runtime settings, player overrides, BIOS choices, environment variables, and build options."
pageType: "reference"
tags: ["Configuration", "PlayStation", "TOML"]
repos:
  - "https://github.com/mstan/psxrecomp"
updated: "2026-08-30"
---

Configuration is how a port records decisions.

Some settings describe the game. Some describe the runtime. Some are player choices. Some are build-time switches.

Keep those layers separate. A setting in the wrong layer becomes confusing fast.

## Which file owns what?

A typical PlayStation-style project has these layers:

| Layer | What it owns |
|---|---|
| BIOS profile | Facts about a BIOS image and how it maps into memory. |
| Game config | Facts about this game and this port. |
| Runtime settings | Defaults for video, audio, input, saves, debug ports, and BIOS behavior. |
| Player settings | The player's local choices. |
| Mod state | Which optional features are enabled. |
| Environment variables | Temporary overrides for a run or build. |
| CMake options | Build-time feature switches. |

Do not use one layer as a junk drawer for another.

## What belongs in game config?

The game config should describe the port.

Common fields include:

- game name;
- serial or game id;
- disc or executable path;
- load address;
- entry point;
- text size;
- stack base;
- seed files;
- generated output directory;
- runtime defaults;
- debug port.

These are project facts. If changing the value changes what the port is, it probably belongs in `game.toml`.

## What belongs in a BIOS profile?

A BIOS profile describes a BIOS image.

It can include:

- display name;
- image id;
- ROM path;
- load address;
- entry PC;
- image size;
- expected hash;
- copy windows;
- exported runtime anchors.

A BIOS profile should not be used for player preferences. It is a description of an image, not a settings screen.

## What belongs in player settings?

Player settings are local preferences.

Examples:

- selected renderer;
- aspect ratio;
- fullscreen or windowed behavior;
- controller choices;
- language selection;
- selected BIOS path, when allowed.

A player setting should not change the identity of the port or the game file it targets.

## What about BIOS choices?

Use a legally obtained BIOS when a project requires one. This site does not provide retail BIOS files.

Some projects can use open-source BIOS alternatives where appropriate. That does not make every retail BIOS path irrelevant.

A good project is clear about:

- whether a BIOS is required;
- whether an open-source BIOS can be used;
- which retail BIOS dumps are supported;
- whether saves or states depend on the BIOS choice.

## What about widescreen and enhancements?

Enhancement settings should not change the faithful default.

For video options, the original view depends on the system.

Many older TV consoles target a 4:3 display. Game Boy Advance is closer to 3:2. Newer consoles may have 4:3 and 16:9 modes. Multi-screen systems, such as Nintendo DS, are different again.

The safe rule is not one aspect ratio. The safe rule is that the default view should match the original system and game.

Widescreen, frame interpolation, higher internal resolution, and similar features should be opt-in. They may need game-specific configuration and testing.

See [Add widescreen](/docs/guides/add-widescreen).

## What wins when settings conflict?

A common runtime order is:

`environment > command line > player settings > game config > compiled default`

That order is useful because temporary choices stay temporary.

Build-time settings are different. A CMake option can change what code exists in the binary, so a runtime setting may not be able to turn it back on.

## What should environment variables do?

Use environment variables for temporary developer control.

Good uses include:

- selecting an overlay backend;
- forcing or disabling a debug path;
- setting a co-simulation stride;
- changing a cache directory;
- pinning time or randomness for a deterministic run.

Do not require normal players to manage environment variables for basic play.

## What should CMake options do?

CMake options should describe the build.

Examples:

- include debug tools;
- choose SDL backend;
- enable Vulkan support;
- enable netplay support;
- build a setup wizard;
- choose which generated BIOS backends are linked.

If a feature is not compiled in, a runtime config file cannot reliably enable it later.

## What makes a config good?

A good config is:

- explicit;
- versioned with the port;
- checked against exact game files;
- small enough to review;
- separated by responsibility;
- regenerated only from known inputs;
- strict when a mismatch would be dangerous.

A loose config may feel easier during bring-up, but it can hide the bug you most need to find.

## Next

- [Port a game](/docs/guides/port-a-game)
- [Command line reference](/docs/reference/cli)
- [Mod manifest](/docs/reference/mod-manifest)
- [The game file you supply](/docs/concepts/the-game-file-you-supply)
