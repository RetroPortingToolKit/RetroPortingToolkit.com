---
title: "Mod manifest"
summary: "How a mod package describes its features, options, targets, patches, overlays, and built-in hooks without shipping game files or native code."
pageType: "reference"
tags: ["Modding", "Schema", "PlayStation", "NES"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/OpokXeno/xenogears-recomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/TombaRecomp"
updated: "2026-08-30"
---

A mod manifest tells a port how to apply an optional change.

The package usually has a `manifest.toml` at its root. The manifest describes what the mod is, which exact game revision it targets, which options it exposes, and what changes it makes when enabled.

The package should not contain the user's game file.

## What can a manifest describe?

A manifest can describe:

| Part | Meaning |
|---|---|
| Package identity | The mod id, version, name, author, and description. |
| Target identity | Which game and revision the mod applies to. |
| Features | Player-facing switches or groups of behavior. |
| Options | Values the player can choose, such as a mode or number. |
| Patches | Guarded byte changes. |
| Overlays | Replacement data loaded from the mod package. |
| Built-in hooks | A selector for code already compiled into the port. |

The exact schema depends on the framework and format version.

## What is the safety model?

A mod should fail closed.

Before a patch writes bytes, it should check that the original bytes are exactly what the manifest expects. If the target does not match, the mod should not apply.

That protects users from applying a patch to the wrong region, wrong revision, or wrong game.

## What does a target do?

A target pins the mod to one game identity.

Depending on the platform, that identity may include:

- a game id or serial;
- a ROM hash;
- a disc hash;
- an executable hash;
- a known region or revision.

The goal is simple: do not apply a mod to bytes it was not built for.

## What is a feature?

A feature is what the player sees.

Examples:

- widescreen;
- frame interpolation;
- translation;
- alternate artwork;
- bug fix;
- difficulty option.

Features should default off unless the project has a clear reason to enable them.

One feature should not secretly turn on another feature. If choices are mutually exclusive, model them as choices inside one feature.

## What is an option?

An option is a value under a feature.

Common option types are:

| Type | Example |
|---|---|
| Boolean | On or off. |
| Choice | `original`, `wide`, `ultrawide`. |
| Integer | A bounded number, such as a scale or limit. |

Options matter because a mod should be configurable without editing files by hand.

## What is a guarded patch?

A guarded patch says:

1. go to this address;
2. expect these original bytes;
3. replace them with these new bytes.

If the expected bytes do not match, stop.

This is better than blindly writing to an address. It catches wrong versions and prevents a mod from corrupting an unknown target.

## What is an overlay?

An overlay is larger replacement data.

Use it for things like art, text, audio, or other data that is too large or awkward for a small patch.

The overlay should still be checked by hash and target identity. Do not ship a prepatched game file.

## What is a built-in hook?

Some changes need code.

A manifest should not bring arbitrary native code into the user's port. Instead, it can select a hook or plugin that the port already compiled and reviewed.

That keeps code review in the port repository and keeps the mod package as data.

## What should not be in a mod package?

Do not include:

- the original game file;
- a prepatched ROM or disc;
- retail BIOS files;
- native DLLs or shared libraries;
- secrets;
- files without redistribution permission.

A mod package can be powerful without becoming a second game distribution channel.

## What should authors keep stable?

Keep these stable once released:

- package id;
- feature ids;
- option ids;
- target identities;
- save compatibility rules.

Changing labels is usually fine. Changing ids can break user settings and compatibility.

## Next

- [Write a mod](/docs/guides/write-a-mod)
- [Add widescreen](/docs/guides/add-widescreen)
- [The game file you supply](/docs/concepts/the-game-file-you-supply)
- [Configuration](/docs/reference/configuration)
