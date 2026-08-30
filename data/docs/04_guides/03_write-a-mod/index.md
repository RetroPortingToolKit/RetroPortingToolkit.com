---
title: "Write a mod"
summary: "Create a mod package that targets one verified game revision, exposes clear options, and changes the running port without rewriting the player's game file."
pageType: "guide"
tags: ["Modding", "PlayStation", "NES", "Configuration"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/OpokXeno/xenogears-recomp"
  - "https://github.com/mstan/TombaRecomp"
  - "https://github.com/mstan/MegaManX6Recomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/FaxanaduRecomp"
updated: "2026-08-30"
---

A mod changes how a port behaves.

It should not rewrite the player's game file. It should not ask the player to make a patched disc or patched ROM. A good mod declares what it wants changed, and the runtime applies that change in memory while the port runs.

When the mod is off, the game should return to the faithful path.

## Who is this for?

This page is for mod authors and port developers.

If you are only installing a mod, use the port's launcher or the port's own instructions.

## The three words to know

| Word | Meaning |
|---|---|
| Package | The installed archive. It has an id, version, author, license, and files. |
| Feature | One thing the player can turn on or off. A package can contain several features. |
| Operation | The actual change the runtime applies, such as a guarded byte write, overlay, or built-in plugin toggle. |

A feature is the user-facing unit. A package is the delivery unit. An operation is the low-level work.

Do not make one package per checkbox unless the package really has only one feature.

## Step 1. Target one exact game revision

A mod should say which game revision it supports.

For a disc game, use the digest the runtime expects for the mounted disc, not a random hash of one container file. For a cartridge game, use the hash and header fields the port uses.

This prevents a mod from writing bytes into the wrong version of the game.

## Step 2. Lay out the package

A simple source package looks like this:

```text
my-mod/
|-- manifest.toml
|-- README.txt
|-- LICENSE.txt
`-- assets/
    `-- replacement.bin
```

The manifest belongs at the package root. Payload paths should stay inside the package. Do not include game files, patched game files, secrets, or files you do not have permission to redistribute.

## Step 3. Write a small manifest first

Start with one disabled feature.

```toml
format_version = 1
id = "example.quick-start"
version = "1.0.0"
name = "Quick Start Example"
author = "Your name"
description = "One optional gameplay change."
resolver = "declarative"
save_compatibility = "shared"

[[target]]
game_id = "SLUS-00000"
disc_sha256 = "0000000000000000000000000000000000000000000000000000000000000000"

[[feature]]
id = "quick-start"
name = "Quick Start"
description = "Skips the startup delay."
group = "Gameplay"
default_enabled = false
```

Replace every placeholder before sharing it.

## Step 4. Use the narrowest operation

| Change | Better shape |
|---|---|
| A few known bytes change. | Guarded patch. |
| A choice like speed, language, or difficulty. | One option with valid values. |
| A large asset changes. | Overlay with hashes. |
| Host-side behavior changes. | Built-in plugin reviewed into the port. |
| Several features fight over the same bytes. | Project-owned resolver. |

Guarded patches should include the expected original bytes. That gives the launcher a chance to stop before a wrong or conflicting write happens.

## Step 5. Expose options as options

Do not create five features for five values of the same setting.

Use one feature with a typed option:

```toml
[[option]]
feature = "battle-tuning"
id = "starting-ap"
label = "Starting AP"
type = "integer"
min = 0
max = 30
step = 1
default = 4
```

The stock value should produce no change when possible. That keeps the faithful path easy to reason about.

## Step 6. Keep code trusted

A mod package should not load arbitrary native code.

If a feature needs host code, that code belongs in the port repository, reviewed and compiled ahead of time. The package can then select it by a stable plugin id.

This is a trust boundary. A mod can still change game code and assets, so players should install packages only from authors they trust. But the package format should avoid downloaded DLLs, scripts, or executables.

## Step 7. Pack and test

Pack the archive with the tool the project provides.

Then test:

- clean install;
- feature off;
- feature on;
- every option boundary;
- wrong game file;
- wrong expected bytes;
- two mods touching the same range;
- uninstall and reinstall;
- save compatibility;
- a real gameplay path past the first visible result.

A title screen check is not enough. A mod can work at boot and still break a later load, battle, save, or transition.

## Common failures

| Symptom | Likely cause |
|---|---|
| Package does not install. | Missing root manifest, bad TOML, unsafe path, or archive too large. |
| Feature appears but does nothing. | It is disabled, its condition does not match, or it resolves to the stock value. |
| Wrong target error. | The game id, executable hash, or disc hash does not match. |
| Expected bytes mismatch. | Wrong address, wrong revision, wrong endian order, or already patched input. |
| Two features conflict. | They claim different bytes in the same range. |
| Plugin unavailable. | The port did not compile in that plugin id. |

## Next

- [Mod manifest](/docs/reference/mod-manifest), for field-level details.
- [Add widescreen](/docs/guides/add-widescreen), for a common enhancement that often ships as a feature.
- [Determinism](/docs/concepts/determinism), for why netplay and rollback constrain mods.
