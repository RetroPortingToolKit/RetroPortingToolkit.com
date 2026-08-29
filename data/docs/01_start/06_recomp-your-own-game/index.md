---
title: "Recomp your own game"
summary: "A plain-language starting point for turning a game you own into a native port."
pageType: "guide"
tags: ["Tutorial", "PlayStation"]
updated: "2026-08-29"
---

Static recompilation is an active development process, not a one-click conversion. You provide a game file you own, choose a toolchain with a realistic status, and work through the remaining gaps with the project’s documentation and community.

## Start with the right project

Begin with the [starter kit repository](https://github.com/mstan/psxrecomp), then read its current instructions before choosing a game. The repository is the source of truth for dependencies, supported systems, commands and known issues; this page is only the map.

The [platform guide](/docs/platforms) gives the short version of what is useful today. PlayStation and SNES are the strongest starting points here, with NES, Game Boy Advance and Genesis offering smaller examples. A platform page describes the shape of the work, not a guarantee that your particular title is finished.

| Console | Scaffolding | What starting a port means |
|---|---|---|
| PlayStation | Yes | The starter repository can create a project and inspect your disc |
| NES, SNES, Game Boy Advance, Genesis, Nintendo DS | None | Adapt an existing project and follow its current guidance |
| CD-i, GameCube, Xbox | Not applicable | Research projects, not a route to a playable port |
| Options | Repository-defined | Use the current `--psxrecomp-ref` value from the starter kit |

For the PlayStation starter, the repository currently documents:

```sh
git clone https://github.com/mstan/psxrecomp.git
cd psxrecomp
git submodule update --init --recursive
```

```sh
sh tools/new_project_layout/setup_project.sh \
  --yes \
  --name "Your Game" \
  --disc /path/to/your/game.cue \
  --dir ~/src \
  --players 1 \
  --generate \
  --enable-build \
  --no-github
```

## What the process looks like

1. **Check the prerequisites.** The starter repository or your AI assistant should verify the compiler, build tools and platform dependencies on your machine, and explain how to install anything missing.
2. **Use a game file you own.** Nothing on this site distributes game data. Keep your dump and any generated files local to your project.
3. **Generate and build.** The toolchain translates the game's code, then a normal compiler creates a native application.
4. **Run and observe.** Boot the game, exercise the parts you care about, and note missing graphics, sound, input, timing or code paths.
5. **Iterate with the project.** Fixes may belong in the game project or in the shared runtime. Follow the repository's issue tracker and current guidance rather than copying an old command from a web page.

## A build is a beginning

A successful build only proves that the generated source compiles. A usable port still needs playtesting, controller mapping, saves, timing, audio, video and cleanup of any fallback or missing-code reports. Treat each milestone as evidence about one game, not a claim about every title on the platform.

## When you need help

Describe the title, the exact toolchain revision, the step that failed and the first useful error message. The [status vocabulary](/docs/reference/status-vocabulary) helps you say whether a project is experimental, booting, playable or finished. For the concepts behind the process, see [what static recompilation is](/docs/start/what-is-static-recompilation) and [the recompiler and runtime](/docs/concepts/recompiler-and-runtime).

## Next

- [Quickstart](/docs/start/quickstart)
- [Platforms](/docs/platforms)
- [The game file you supply](/docs/concepts/the-game-file-you-supply)
- [Code you cannot see ahead of time](/docs/concepts/code-you-cannot-see-ahead-of-time)
