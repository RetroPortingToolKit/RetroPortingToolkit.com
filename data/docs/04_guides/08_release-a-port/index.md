---
title: "Release a port"
summary: "Package a port for players without shipping game data, retail BIOS files, generated game code, private saves, or developer-only diagnostics."
pageType: "guide"
tags: ["Releasing", "Packaging", "Compliance"]
repos:
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/FaxanaduRecomp"
  - "https://github.com/mstan/SuperMarioWorldRecomp"
  - "https://github.com/Shy/BoktaiRecomp"
  - "https://github.com/mstan/TombaRecomp"
  - "https://github.com/TechnicallyComputers/retcomm-catalog"
updated: "2026-08-30"
---

A release is what another person downloads.

That makes it different from your local build folder. A release should contain only what the project is allowed to distribute and what the player needs to run the port.

The most important rule is simple: do not ship game data.

## What must never be in a release?

Do not package:

- ROMs;
- disc images;
- copyrighted retail BIOS files;
- uncompiled generated game code derived from a game file, unless the project has made a deliberate release decision;
- private saves;
- debug logs;
- local config files;
- crash dumps;
- build junk.

Some projects can include legal open-source BIOS alternatives. Retail BIOS dumps are different. Use legally obtained files, and do not distribute them through the port.

## Why is this stricter than a normal app?

A native recomp port can contain compiled translated game code.

That is why this topic needs care. Some projects ship compiled ports. Others avoid shipping a finished game binary and release a setup kit or builder instead.

This is why some releases ask the player for their own game file on first run, and some projects make the player build locally.

The release shape depends on the project. The rule does not: do not distribute files you do not have the right to distribute.

## Package with a script

Do not zip a build folder by hand.

Build folders collect whatever was convenient during development: ROMs, dumps, logs, generated code, cache files, config files, and local tools.

A release script should do the opposite. It should start from an allowlist and copy only known-safe files.

A good packager:

- stages named files only;
- refuses forbidden extensions;
- strips developer configs;
- includes license and attribution files;
- checks the version stamped into the executable;
- writes one predictable archive per platform.

## What should a player receive?

Usually one archive per platform.

That archive should include:

- the executable or launcher;
- required runtime assets;
- required open-source support files, if any;
- license files;
- third-party notices;
- a short first-run note.

The first-run note should say what file the player must provide and what the project will check. Keep it practical.

## What should CI do?

CI usually cannot run the whole game path because it should not have the game file or retail BIOS.

It can still prove useful things:

- the project configures;
- the non-generated code compiles;
- unit tests pass;
- package scripts refuse forbidden files;
- release assets have the expected names;
- generated files are not accidentally committed.

If a project uses a private self-hosted runner for deeper checks, keep those files off public CI.

## What should I test before publishing?

Before publishing, test the release as a player would.

Use a clean directory. Extract the archive. Run it. Give it the game file it asks for. If a BIOS is needed, use the same path a real user would use.

Check at least:

- first launch;
- file identity rejection for the wrong file;
- file identity acceptance for the right file;
- input;
- save creation;
- relaunch after save;
- basic audio and video;
- no debug files appearing in the archive.

For ports with online features, also check that the released version matches the catalogue or lobby version.

## What should release notes say?

Release notes should be plain.

Say:

- what changed;
- what platforms are included;
- what file the player must provide;
- whether a BIOS is needed;
- known limits;
- where to report problems.

Do not overclaim compatibility. If only part of a game is tested, say that.

## Common release failures

| Symptom | Likely cause |
|---|---|
| The game launches only on the developer machine. | A required DLL, asset, or support file was missed. |
| The launcher cannot find fonts or assets. | The package layout is wrong. |
| The wrong file is accepted. | Identity checks are too loose. |
| Players cannot see each other online. | Version or catalogue data does not match the binary. |
| A crash report names a dev build. | The release was not stamped or packaged from the right commit. |

## Next

- [The game file you supply](/docs/concepts/the-game-file-you-supply), for the file contract.
- [Port a game](/docs/guides/port-a-game), for the build you are packaging.
- [Status vocabulary](/docs/reference/status-vocabulary), before you describe maturity.
- [Catalog schema](/docs/reference/catalog-schema), if the release goes into a launcher catalogue.
