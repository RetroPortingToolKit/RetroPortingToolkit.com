---
title: "Mod manifest"
summary: "Field-by-field reference for the `manifest.toml` that psxrecomp, nesrecomp and snesrecomp mod packages share: types, requiredness, defaults, the operation blocks, and the clearly marked places where projects in the fleet genuinely differ."
section: "reference"
sectionTitle: "Reference"
pageType: "reference"
tags: ["Modding", "Schema", "PlayStation", "NES"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/OpokXeno/xenogears-recomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/TombaRecomp"
  - "https://github.com/N64Recomp/N64Recomp"
  - "https://github.com/Zelda64Recomp/Zelda64Recomp"
  - "https://github.com/mstan/PokemonStadiumRecomp"
updated: "2026-08-23"
---

A mod package for a PlayStation, NES or SNES port is a ZIP archive with a `manifest.toml` at its root, carrying data only. The manifest declares which exact game it targets, which independently toggleable features it contributes, which typed options each feature exposes, and which guarded operations those features produce. This page documents that schema. It is not the only mod design in the fleet, so the shared shape comes first and the real per-project differences are in a clearly marked section at the end, rather than being flattened into one schema that no project implements.

## Scope and reading conventions

The field tables below describe the TOML manifest used by [psxrecomp](https://github.com/mstan/psxrecomp) and its downstream ports, with [nesrecomp](https://github.com/mstan/nesrecomp) and [snesrecomp](https://github.com/mstan/snesrecomp) sharing the same vocabulary. The most complete published field list is [xenogears-recomp](https://github.com/OpokXeno/xenogears-recomp)'s [`MOD_AUTHORING.md`](https://github.com/OpokXeno/xenogears-recomp/blob/master/MOD_AUTHORING.md); the normative operation semantics are in psxrecomp's [`docs/MOD_PACKAGES.md`](https://github.com/mstan/psxrecomp/blob/master/docs/MOD_PACKAGES.md).

**Required** reads `Yes`, `No`, `Conditional`, or `Not documented`. `Not documented` means the projects have not stated it in the material this page was written from, and it is recorded that way rather than guessed. The same applies to `Default`.

A package contains data only. It cannot ship DLLs, shared objects, scripts or arbitrary native code, and it cannot select a symbol by name. It must also contain no part of the game: the publication checklist requires that "The archive contains no stock game files, patched disc, secrets, or files without redistribution permission". See [the game file you supply](/docs/concepts/the-game-file-you-supply).

## Format versions

`format_version` is a cumulative feature level. The authoring guidance is to "Use the lowest version that provides the operations you need, from 1 through 7."

| Version | Adds |
|---|---|
| 1 | Features, boolean/choice/integer options, literal patches, overlays and conditions |
| 2 | Integer-generated patch bytes |
| 3 | Ordered integer constraints and linked MIPS `LUI`/`ORI` encoding |
| 4 | Sparse owned fields and integer predicates |
| 5 | Trusted static plugin selectors |
| 6 | Authenticated replacement of game-specific indexed files |

Xenogears' own catalog also references format 8 for its Perfect Works composition work. Formats 7 and 8 are not itemised in the material this page was written from.

## Top-level fields

| Field | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `format_version` | integer | Yes | none | Manifest feature level, per the table above. |
| `id` | string | Yes | none | Stable package identity. Lowercase letters, digits, `.`, `-`, `_`; maximum 96 characters. Never changes between releases. |
| `version` | string | Yes | none | Semantic package version such as `1.0.0`. |
| `name` | string | Not documented | none | Player-facing package name. |
| `author` | string | Not documented | none | Player-facing author credit. Shipped packages use it to credit reverse engineering separately from implementation, for example `author = "T4g1 (discovery), mstan (implementation)"`. |
| `description` | string | Not documented | none | Player-facing description. |
| `license` | string | No | none | Player-facing licence. It "does not grant rights to Square assets." |
| `source_name` | string | No | none | Optional project link label. |
| `source_url` | string | No | none | Optional project URL. Must use HTTP or HTTPS. |
| `resolver` | string | Not documented | not documented | Normally `declarative`. `builtin:<id>` selects a resolver compiled into the game, for compositions declarative operations cannot express. |
| `save_compatibility` | string | Not documented | not documented | `shared` or `isolated`. |
| `conflicts` | array of strings | No | none | Package ids that cannot coexist with this one at all. |

Invalid `id` or `version` is one of the documented causes of a package failing to install.

## `[[target]]`

A target pins the package to one exact stock revision. Resolution verifies the selected game and revision before boot, and a mismatch fails closed.

| Field | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `game_id` | string | Yes | none | Game identity, for example `SCUS-94236`. |
| `exe_sha256` | hex string | No | none | Narrows the target to one exact loose executable. |
| `disc_sha256` | hex string | Conditional | none | Identity of the canonical mounted disc content. Mandatory and exact on every target used by a feature that carries a disc overlay. |

`disc_sha256` "is not the hash of the selected container file. The core runtime supplies a representation-neutral digest for the mounted disc, so equivalent CUE/BIN and CHD representations have the same identity". Get it from the runtime, not from a file hasher:

```sh
./build-debug/XenogearsRecomp --disc-hash game/disc1.cue
```

## `[[feature]]`

Features are the rows the launcher shows. Identity is always `(package_id, feature_id)`, and "Enabling one feature never enables, disables, or reconfigures another feature."

| Field | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `id` | string | Yes | none | Unique within the package. Need not be globally unique, but should stay stable across versions. |
| `name` | string | Not documented | none | Launcher row label. |
| `description` | string | Not documented | none | Launcher row description. |
| `group` | string | No | none | Grouping label in the launcher, for example `Display` or `Gameplay`. |
| `default_enabled` | boolean | No | `false` | New features default to disabled. |

Do not model alternatives as rival features: "Mutually exclusive choices such as US versus Japanese artwork belong inside one feature as option values."

## `[[option]]`

Options are feature-owned and typed. The launcher renders, validates and persists them, and a trusted plugin can read the committed value back through one narrow accessor.

| Field | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `feature` | string | Yes | none | The `feature.id` this option belongs to. |
| `id` | string | Yes | none | Option identity within the feature. |
| `label` | string | Not documented | none | Launcher control label. |
| `description` | string | No | none | Launcher control help text. |
| `group` | string | No | none | Grouping label in the launcher. |
| `type` | string | Yes | none | `boolean`, `choice`, or `integer`. |
| `default` | string or integer | Not documented | none | For `boolean`, the strings `"true"` / `"false"`. For `choice`, must match a declared `value`. For `integer`, canonical decimal text; the published example writes `default = 4`. |
| `min` | integer | Conditional | none | Lower bound. `integer` only. |
| `max` | integer | Conditional | none | Upper bound. `integer` only. |
| `step` | integer | Conditional | none | Increment. `integer` only. |
| `disabled_by` | string | No | none | Names a different boolean option in the same feature. When that option overrides this one, the launcher greys this control and its value becomes inert. |

### `[[option.choice]]`

One block per selectable value, for `type = "choice"`.

| Field | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `value` | string | Yes | none | The stored value. The option's `default` must match one of these. |
| `label` | string | Not documented | none | Player-facing label for this value. |

Typed options exist because an activation callback takes no arguments. The runtime header states the reasoning directly, from [`runtime/include/mod_plugins.h`](https://github.com/mstan/psxrecomp/blob/master/runtime/include/mod_plugins.h):

```c
/*
 * Why this exists: the manifest schema already carries typed, validated,
 * launcher-rendered, persisted options ([[option]] boolean/choice/integer), but
 * an activation callback takes no arguments and had no way to read them, so a
 * trusted plugin could only ever be an on/off switch. A parameterised feature
 * then had to be modelled as one feature per value — and `constraint` only
 * expresses ordered_integer WITHIN a feature, so those pseudo-features could
 * not even be made mutually exclusive. This closes that gap: one feature, one
 * option, the plugin reads what was chosen.
 */
```

## `[[patch]]`

A guarded write. The guard is checked before the plan is applied, and a mismatch fails closed.

| Field | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `feature` | string | Yes | none | The owning `feature.id`. |
| `target` | string | Yes | none | `main_exe`, `disc_raw`, or `disc_user`. |
| `address` | integer | Yes | none | For `main_exe`, a PSX guest virtual address. For `disc_raw`, `lba * 2352 + byte_in_sector`. For `disc_user`, `lba * 2048 + byte_in_sector`. |
| `expected` | hex byte string | Yes | none | The complete stock bytes at `address`. For MIPS, guard the complete instruction rather than only its immediate bytes: "This detects opcode/register differences and gives collision checking an accurate ownership range". |
| `replace` | hex byte string | Conditional | none | Literal replacement, equal in length to `expected`. Mutually exclusive with `replace_from`. |
| `replace_from` | inline table | Conditional | none | Generates the replacement bytes from a bounded integer option. Format 2 and above. See below. |
| `encoding` | string | No | none | `mips_lui_ori_u32` targets one aligned, fully guarded eight-byte `LUI`/`ORI` pair. Format 3 and above. |
| `fields` | array | No | none | Sparse owned fields: separates the guard from the bytes this feature actually owns, so two features can own adjacent bytes in one record. Format 4 and above. |
| `when` | inline table | No | none | `{ option = "value", ... }`. All entries must hold. |
| `when_integer` | inline table | No | none | One `{ option, op, value }` predicate, ANDed with `when`. `op` is one of `eq`, `ne`, `lt`, `le`, `gt`, `ge`. Format 4 and above. |
| `omit_when_default` | boolean | No | not documented | Suppresses the whole patch when the selected value equals the option default, modelling source tools whose default means "make no writes". |

A `disc_raw` or `disc_user` patch may not cross a sector boundary. Use `disc_user` for offsets in the 2048-byte data stream and `disc_raw` only when the change is defined in raw 2352-byte sectors: "Verify the coordinate against the exact target image; do not infer it from a filesystem extraction without mapping it back."

### `replace_from`

| Key | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `option` | string | Yes | none | A bounded integer option on the same feature. |
| `encoding` | string | Yes | none | `u8`, `u16le`, or `u32le`. |
| `offset` | integer | Not documented | not documented | Byte offset into the guarded range. |
| `addend` | integer | No | none | Checked addend applied to the option value. |

The design is deliberately minimal: "There is deliberately no host-endian encoding, signed inference, mask, shift, scale, expression language, or partial-field merge." The `mips_lui_ori_u32` loader verifies the opcodes and register linkage and "does not apply signed-`ADDIU` carry adjustment".

A generated value that equals the stock guard produces no write and claims no bytes.

## `[[constraint]]`

| Field | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `kind` | string | Yes | none | `ordered_integer`. Format 3 and above. |
| `direction` | string | Yes | none | `nondecreasing` or `nonincreasing`, across several integer options on one feature. |

A constraint expresses ordering only within a single feature. It cannot make options in different features mutually exclusive. The keys that name the constrained options are in [`docs/MOD_PACKAGES.md`](https://github.com/mstan/psxrecomp/blob/master/docs/MOD_PACKAGES.md) and are not recorded here.

## `[[overlay]]`

For large assets: artwork, script, audio, or another sizeable disc asset. An overlay replaces a range as it is read, and does not rebuild the player's stock image.

| Field | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `sha256` | hex string | Yes | none | Hash of the payload file carried in the archive. |
| `expected_sha256` | hex string | No | none | Hash of the stock range being replaced. |

The key naming the payload file inside the archive is not recorded in the material this page was written from; see the specification. Every `[[target]]` used by a feature with a disc overlay must carry an exact `disc_sha256`. Payloads are "loaded and reverified during resolution, then indexed by target and LBA before boot. A CD read performs a direct indexed lookup rather than scanning every installed mod."

`derived_disc` is "legacy conversion scaffolding only" and is rejected by feature-style manifests. Do not ship a prepatched disc.

## `[[plugin]]`

Format 5 and above. Selects behaviour that is already statically linked into the game executable.

| Field | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `feature` | string | Yes | none | The owning `feature.id`. |
| `id` | string | Yes | none | A stable registry key registered by the build. |

"The package archive supplies no native code." A plugin id that is not registered in the build makes the plugin unavailable, and a package cannot supply the implementation. Adding a new plugin id or a `builtin:` resolver is a source change to the port and requires project review. On NES the same boundary is described precisely: "Native plugins are intentionally trusted code, so this is an activation-scope gate rather than a sandbox between plugins."

## `[[indexed_file]]`

Format 6 and above, and specific to Xenogears' hidden disc index. It replaces a file in that index without requiring a fixed-size payload: the runtime appends replacements to a virtual extension of the data track and rebuilds complete Mode 2 Form 1 sectors with valid EDC and ECC. Field names are in [`MOD_AUTHORING.md`](https://github.com/OpokXeno/xenogears-recomp/blob/master/MOD_AUTHORING.md) and are not recorded here.

An active `[[indexed_file]]` plan cannot be combined with `disc_raw` or `disc_user` writes, file-backed overlays, or a legacy `derived_disc`, "even when their ranges would be disjoint or they come from different packages".

## A complete real manifest

Tomba's frame-interpolation package, shipped in [TombaRecomp](https://github.com/mstan/TombaRecomp). The header and target, from [`mods/preloaded/packages/tomba.enhancement.frame-interpolation/1.0.0/manifest.toml`](https://github.com/mstan/TombaRecomp/blob/master/mods/preloaded/packages/tomba.enhancement.frame-interpolation/1.0.0/manifest.toml):

```toml
format_version = 5
id = "tomba.enhancement.frame-interpolation"
version = "1.0.0"
name = "Tomba Frame Interpolation"
author = "mstan"
description = "Presents blended intermediate frames above the game's 60Hz output. Guest VBlank, game logic, timers, and audio stay at their stock cadence."
resolver = "declarative"
save_compatibility = "shared"

[[target]]
game_id = "SCUS-94236"
disc_sha256 = "25ada3dd51e70eb9f9218cd83fb02d73139750229fb44b012d62d183ab32eb13"
```

The single feature and its choice option, from the same file:

```toml
# Presentation only: this does NOT change machine speed. The distinct
# native-VBlank-rate mechanism does, and is deliberately not exposed here.
[[feature]]
id = "frame-interpolation"
name = "Frame Interpolation"
description = "Blend between completed guest frames to present above 60Hz. Presentation only — the game still simulates at its stock rate, so this changes smoothness, not speed or timing. Requires the OpenGL renderer, which it selects, and runs without vsync."
group = "Display"
default_enabled = false

[[option]]
feature = "frame-interpolation"
id = "rate"
label = "Output rate"
description = "Presentation rate. 'Display refresh' follows the measured monitor refresh; the fixed rates pace presentation at that many frames per second."
group = "Display"
type = "choice"
default = "display"

[[option.choice]]
value = "display"
label = "Display refresh"
```

And the remaining choices and the plugin selector that closes the file:

```toml
[[option.choice]]
value = "90"
label = "90 FPS"

[[option.choice]]
value = "120"
label = "120 FPS"

[[option.choice]]
value = "144"
label = "144 FPS"

[[option.choice]]
value = "165"
label = "165 FPS"

[[option.choice]]
value = "240"
label = "240 FPS"

[[plugin]]
feature = "frame-interpolation"
id = "tomba.frame-interpolation"
```

## `mods/state.toml`

The companion file, written by the launcher, holding selected package versions separately from per-feature enabled state and values. Format 2, from [`docs/MOD_PACKAGES.md`](https://github.com/mstan/psxrecomp/blob/master/docs/MOD_PACKAGES.md):

```toml
format_version = 2

[[package]]
id = "example.localization"
version = "1.2.0"

[[feature]]
package_id = "example.localization"
id = "title-screen"
enabled = true

[feature.values]
variant = "rockman"
```

Installed and preloaded packages share one executable-relative catalog, `mods/packages/<package-id>/<version>/manifest.toml`. A game may ship reviewed, default-disabled packages unpacked at `mods/preloaded/packages/<package-id>/<version>/manifest.toml`, staged beside the executable at build time; [Port a game](/docs/guides/port-a-game) covers where `mods/` sits in a port repository. Framework packages live in the recompiler repository at `mods/builtin/packages/<package-id>/<version>/manifest.toml`.

## Where projects differ

There is one shared package design across PlayStation, NES and SNES, a genuinely different design on N64, and an older file-drop layer on some 8-bit ports. Everything above describes the first of the three.

### NES

- **Target identity is not a disc hash.** A `[[target]]` identifies "the lowercase CRC32 of all bytes after the 16-byte iNES header". SHA-1, where used, "is used as a ROM-revision identity, not as a security primitive."
- **`exclusive_group`** makes features from different packages mutually exclusive. The launcher auto-disables the other, and validation rejects a hand-edited state that enables both. PlayStation has no equivalent.
- **`[[external_rom]]`** lets a feature require a second user-owned ROM by normalized SHA-1 and size. It is never copied into the package.
- **`[[mod_function_hook]]`**, declared in `game.toml` rather than the manifest, makes codegen emit `if (nes_mod_function_entry(0xB0E9u)) return;` as the first statement of a named guest subroutine, so a mod can take over one routine while enabled and leave it untouched otherwise.
- **A conditional `[[plugin]]`** can be selected by one of its feature's option values through `when_option` and `when_value`.
- **Mods can extend save states.** `mod_savestate.h` is an id-keyed registry for architectural state a mod keeps outside guest RAM. A record whose id has no registered hook "is skipped with a stderr warning -- never a load failure".
- **Mod support is off at the framework level** and is a per-game build opt-in.

### SNES

The same package vocabulary and the same per-game build opt-in posture. snesrecomp keeps its own `docs/MOD_PACKAGES.md`; its format level is not recorded here.

### N64

N64 mods are compiled code, which makes this a different design in kind rather than a variant. The tooling is a four-stage pipeline over a mod ELF, and the manifest is `mod.json`. [N64Recomp](https://github.com/N64Recomp/N64Recomp)'s [`RecompModTool/main.cpp`](https://github.com/N64Recomp/N64Recomp/blob/main/RecompModTool/main.cpp) declares `symbol_filename = "mod_syms.bin"`, `binary_filename = "mod_binary.bin"`, `manifest_filename = "mod.json"`, and a `ModManifest` carrying `mod_id`, `version_string`, `authors`, `game_id`, `minimum_recomp_version`, `native_libraries`, `custom_gamemode`, `config_options`, `dependencies` and `optional_dependencies`.

[PokemonStadiumRecomp](https://github.com/mstan/PokemonStadiumRecomp) describes the same shape as its plan: "Modding will follow the N64Recomp four-tool pattern: mod manifest schema (`mod.json`), RecompModTool (mod ELF → symbol tables), OfflineModRecomp (mod recompiler), RecompModMerger (multi-mod conflict resolution)." Its own status is "**Status: deferred.** Modding is intentionally out of scope until the base game boots and is playable."

Player-facing, [Zelda64Recomp](https://github.com/Zelda64Recomp/Zelda64Recomp) mods are `.nrm` files installed by dragging onto the window and distributed through Thunderstore, and built-in mods can be overridden by dropping a newer `.nrm` into the appdata mods folder.

> **Note.** N64Recomp and Zelda64Recomp prohibit AI-generated contributions. This page documents their manifest shape as published; it is not an invitation to open a pull request against them.

### The file-drop layer

Some NES ports predate packages entirely and still document a manifest-free path: drop `text_overrides.json` and a `tiles/` directory beside the executable and the game auto-detects them. No manifest, no hashes, no packaging step. [Write a mod](/docs/guides/write-a-mod) covers it.

## What this schema does not pin down

- **The operations in shipped use are narrower than the ones documented.** Every manifest present in the surveyed clone of the fleet, three psxrecomp builtins and five TombaRecomp preloaded packages, is `format_version = 5` and uses only `[[plugin]]`. The integer, sparse-field and overlay examples in the specifications are explicitly placeholders.
- **Validation is not endorsement.** "Passing archive validation does not establish authorship, legality, gameplay correctness, or compatibility."
- **The packer checks almost nothing.** `psxmod_pack.py` requires `manifest.toml`, sorts entries, fixes timestamps and modes, and writes a DEFLATE ZIP. "It does not prove that your addresses or expected bytes are correct. Full manifest and target validation happens when the package is installed/resolved by the runtime."
- **Netplay clears the plan.** Mods are disabled for every netplay session, lobby, LAN, direct and rematch, without touching the offline selection. [Determinism](/docs/concepts/determinism) explains why an unsynchronised plan is intolerable to rollback.

## Source

- [psxrecomp](https://github.com/mstan/psxrecomp): [`docs/MOD_PACKAGES.md`](https://github.com/mstan/psxrecomp/blob/master/docs/MOD_PACKAGES.md), [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md), [`runtime/include/mod_plugins.h`](https://github.com/mstan/psxrecomp/blob/master/runtime/include/mod_plugins.h), [`tools/psxmod_pack.py`](https://github.com/mstan/psxrecomp/blob/master/tools/psxmod_pack.py), [`docs/NETPLAY.md`](https://github.com/mstan/psxrecomp/blob/master/docs/NETPLAY.md).
- [xenogears-recomp](https://github.com/OpokXeno/xenogears-recomp): [`MOD_AUTHORING.md`](https://github.com/OpokXeno/xenogears-recomp/blob/master/MOD_AUTHORING.md) and [`MODS.md`](https://github.com/OpokXeno/xenogears-recomp/blob/master/MODS.md).
- [nesrecomp](https://github.com/mstan/nesrecomp): [`docs/MOD_PACKAGES.md`](https://github.com/mstan/nesrecomp/blob/master/docs/MOD_PACKAGES.md) and [`MODDING.md`](https://github.com/mstan/nesrecomp/blob/master/MODDING.md). [snesrecomp](https://github.com/mstan/snesrecomp): [`README.md`](https://github.com/mstan/snesrecomp/blob/main/README.md).
- [TombaRecomp](https://github.com/mstan/TombaRecomp): the shipped manifests under [`mods/preloaded/packages/`](https://github.com/mstan/TombaRecomp/blob/master/mods/preloaded/packages).
- [N64Recomp](https://github.com/N64Recomp/N64Recomp): [`RecompModTool/main.cpp`](https://github.com/N64Recomp/N64Recomp/blob/main/RecompModTool/main.cpp). [Zelda64Recomp](https://github.com/Zelda64Recomp/Zelda64Recomp): [`README.md`](https://github.com/Zelda64Recomp/Zelda64Recomp/blob/dev/README.md). [PokemonStadiumRecomp](https://github.com/mstan/PokemonStadiumRecomp): [`MODDING.md`](https://github.com/mstan/PokemonStadiumRecomp/blob/main/MODDING.md).

## Next

- [Write a mod](/docs/guides/write-a-mod), the authoring workflow these fields sit inside, with checkpoints and a troubleshooting table.
- [Configuration reference](/docs/reference/configuration), for the settings that are runner policy rather than package content.
- [PlayStation](/docs/platforms/playstation), the toolchain most of this schema belongs to.
- [Glossary](/docs/concepts/glossary), for guard, overlay, plan and resolver as the fleet uses them.
