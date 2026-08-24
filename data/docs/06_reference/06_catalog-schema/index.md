---
title: "Catalog schema"
summary: "Field-by-field reference for retcomm-catalog: the index file, the per-title manifest, how a title is verified, released, built, launched and matched online, and the two validators that no longer agree."
section: "reference"
sectionTitle: "Reference"
pageType: "reference"
tags: ["Schema", "Catalogue", "Agents", "PlayStation"]
repos:
  - "https://github.com/TechnicallyComputers/retcomm-catalog"
updated: "2026-08-23"
---

[retcomm-catalog](https://github.com/TechnicallyComputers/retcomm-catalog) is a machine-readable list of the ports a launcher can install. Its README describes it as the "Official title catalog for [RetComM Launcher](https://github.com/TechnicallyComputers/RetComM-Launcher). JSON manifests listing supported recomp/decomp titles, ROM/BIOS identity, and GitHub release asset patterns. The launcher downloads this catalog independently of app updates." That makes it the one place in this fleet where a program, rather than a person, can ask what has been ported, how to tell whether the user's game file is the right one, where the builds live, and whether the title has netplay. This page documents both files completely.

> **Note.** The repository has no LICENSE file. The terms under which these manifests or this schema may be mirrored are not stated anywhere in it, so this page does not claim any.

## What is in it today

At the time the fleet was surveyed the catalogue carried `schema_version: 1`, twelve titles, all of them `psx`, a `catalog_date` of `"2026-08-20T02:48:35Z"` and a `release_tag` of `"v2026.08.20.024835.20"`. Eight of the twelve declare a `netplay` object. The `snes`, `n64` and `genesis` paths that the schema describes had no live example.

## The two files

| File | What it is |
|---|---|
| `index.json` | The catalogue root: freshness stamps, per-platform defaults, and the list of title ids |
| `titles/<id>.json` | One manifest per title |

The three names have to agree: the `titles/<id>.json` filename, the `id` field inside it, and the entry in `index.json`. Publication CI fails when `index.json` lists a missing file, and approval CI fails when a title file is not in the index.

## `index.json`

| Field | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `schema_version` | number | Not documented | 1 in the live file | Present in the shipped file. `SCHEMA.md` shows it in its example but does not list it in its field table. |
| `name` | string | Not documented | `"RetComM supported titles"` | Catalogue display name |
| `catalog_date` | string | Stamped by CI | none | "UTC stamp from publish CI: `YYYY-MM-DDTHH:MM:SSZ` (preferred) or legacy `YYYY-MM-DD`" |
| `release_tag` | string | Stamped by CI | none | "GitHub release tag (e.g. `v2026.07.29.184100.12` = date + `HHMMSS` + issue)" |
| `platform_defaults` | object | No | absent | "Optional per-platform defaults keyed by catalog `platform`" |
| `platform_defaults.<platform>.bios_identity` | object | No | absent | "Applied to titles on that platform that omit `bios_identity`" |
| `titles` | array of strings | Yes | none | Title ids, each of which must have a matching `titles/<id>.json` |

The head of the shipped file, showing how a platform default is written.

From [`index.json`](https://github.com/TechnicallyComputers/retcomm-catalog/blob/main/index.json):

```json title="index.json"
{
  "schema_version": 1,
  "name": "RetComM supported titles",
  "platform_defaults": {
    "gba": {
      "bios_identity": {
        "required": true,
        "crc32": [
          "81977335"
        ],
        "md5": [],
        "sha1": [
          "300c20df6731a33952ded8c436f7f186d25d3492"
        ],
        "sha256": [],
        "sizes": [
          16384
        ],
        "filenames": [
          "gba_bios.bin",
          "gba_bios.rom",
          "bios.bin"
        ]
      }
    },
```

Inheritance has an explicit opt-out: "Title manifests may still set `bios_identity` to override the default, or `"bios_identity": null` to opt out of inheritance."

## `titles/<id>.json`: identity

| Field | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `id` | string | Yes | none | "Stable slug; matches filename". Must match `^[a-z0-9]+(?:-[a-z0-9]+)*$` |
| `name` | string | Yes | none | "Display name", non-empty |
| `kind` | `"recomp"` or `"decomp"` | Yes | `"recomp"` when normalized | Enum, enforced by both validators |
| `platform` | string | Yes | none | "`snes`, `psx`, `n64`, `gba`, … (RomM + folder map)" |
| `description` | string | No | absent | "Optional short blurb". Dropped when empty |
| `homepage` | string | No | `https://github.com/<release.github>` | "Optional URL (hub "GitHub Source")" |
| `author_notes` | string | No | absent | "Optional message from the recomp/decomp author to users; shown in the hub as **Author's Notes** (any length)" |
| `notes` | string | No | absent | "Optional catalog/maintainer footnotes (identity sources, pins); not shown in the hub" |
| `romm` | object | No | absent | "Optional match hints" |

## `titles/<id>.json`: verification

`rom_identity` is required, and it is how the launcher decides that the file a player already owns is the one this port was built for.

> **You provide this.** Every entry here describes a game file you supply yourself. The catalogue stores digests, sizes and filename hints so a scan can recognise your copy; it stores no game content, and this repository distributes none. See [the game file you supply](/docs/concepts/the-game-file-you-supply).

| Field | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `rom_identity` | object | Yes | none | "How we know the user owns the game (always include every digest field)" |
| `rom_identity.crc32` | array of strings | No | `[]` | "Hex, e.g. `"f2ab92d4"` (empty `[]` if unused)". Lowercased by the Worker |
| `rom_identity.md5` | array of strings | No | `[]` | "32-char lowercase hex (common in recomp README tables)" |
| `rom_identity.sha1` | array of strings | No | `[]` | "40-char lowercase hex" |
| `rom_identity.sha256` | array of strings | No | `[]` | "64-char lowercase hex" |
| `rom_identity.disc_serials` | array of strings | No | `[]` | "PSX/etc, e.g. `"SLUS-00562"`" |
| `rom_identity.sizes` | array of numbers | No | `[]` | "Optional byte lengths; when set, scan only hashes files of those sizes (disc dumps)". Non-positive entries are dropped |
| `rom_identity.filenames` | array of strings | No | `[]` | "Suggested basenames for the hub when unmatched (No-Intro / Redump); search hints, not hard matching" |
| `rom_identity.track_counts` | array of numbers | No | `[]` | "Optional exact cue `TRACK` counts". Integers of 1 or more |
| `rom_identity.require_cue` | boolean | No | false, and automatically true when any `track_counts` entry exceeds 1 | "PSX titles use `.cue` + `.bin` only, not `.iso`/`.chd`" |
| `rom_extensions` | array of strings | No | psx falls back to `[".cue", ".bin"]` | "Scan filter, e.g. `[".sfc",".smc"]`". On psx the Worker strips `.iso` and `.chd` |
| `bios_identity` | object or `null` | No | inherited from `platform_defaults` | "Optional host BIOS / firmware the title needs" |
| `bios_identity.required` | boolean | No | true when the object is present | Whether the BIOS must be found |
| `bios_identity.crc32` / `.md5` / `.sha1` / `.sha256` | array of strings | No | `[]` | "Preferred dump checksums (include all keys; unused = `[]`)" |
| `bios_identity.sizes` | array of numbers | No | `[]` | "Byte lengths to consider while scanning" |
| `bios_identity.filenames` | array of strings | No | `[]` | "Basename hints (e.g. `SCPH1001.BIN`)" |

The matching rule is generous by design and stated exactly once: "A title is considered to have a ROM identity when **any** of `crc32`, `md5`, `sha1`, `sha256`, or `disc_serials` is non-empty. Matching succeeds if **any** configured digest matches the scanned file". The CI validator enforces that same condition, so a manifest with every digest array empty is rejected.

## `titles/<id>.json`: release

Where a built binary comes from.

| Field | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `release` | object | Yes | none | "Where to fetch builds" |
| `release.github` | string, `owner/repo` | Yes | none | The repository whose releases hold the binaries |
| `release.allow_prerelease` | boolean | No | false | "Allow GitHub pre-releases when no stable latest exists" |
| `release.asset_glob.linux` / `.windows` / `.macos` | string | At least one | `""` | "Per-OS glob ... Prefer a pattern from the real asset name (`bpe-*linux*`, `*win64*`, …)" |

## `titles/<id>.json`: build

Optional. When present and enabled, the launcher prefers building over downloading.

| Field | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `build` | object | No | absent | "Optional local generate + cmake recipe. When `enabled`, RetComM **Install** prefers this path" |
| `build.enabled` | boolean | No | absent | Turns the recipe on |
| `build.source.github` | string | No | `release.github` | Source repository for the archive |
| `build.source.ref` | string | No | `"main"` | "Tag / branch / commit pin for the source archive" |
| `build.sdk` | object | No | absent | "Tools identity. Prefer harvesting emitters from the game release zip (`id` only)." |
| `build.toolchain` | object | No | absent | "Prefer downloading `cmake-clang-v1` ... Set `min_version` to a semver floor" |
| `build.generate` | object | No | absent | "Engine-specific generate args" |
| `build.generate.engine` | `"snesrecomp"`, `"psxrecomp"` or `"gbarecomp"` | No | derived from `platform` | Which recompiler to drive |
| `build.cmake` | object | No | absent | "`build_dir`, `target`, `config` (Release)" |

## `titles/<id>.json`: launch, saves and netplay

| Field | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `install_dir_name` | string | Yes | falls back to `id` | "Folder under `apps/`". The CI validator requires it; the Worker fills it in |
| `launch` | object | Yes | none | "Relative binary names: `linux`, `windows`, `macos`". At least one is required |
| `saves` | object | No | absent | "Optional paths relative to install for sync later" |
| `netplay` | object | No | absent | "Optional; omit when the title has no recomp-net lobby" |
| `netplay.supported` | boolean | No | absent | "Must be `true` to advertise in the hub lobby" |
| `netplay.stack` | string | No | `"recomp-net"` | "Currently only `"recomp-net"`". Any other value is rejected |
| `netplay.game_name` | string | Yes when supported | none | "Exact WS `create`/`join`/`list` wire name (may differ from catalog `name` / `id`)" |
| `netplay.game_version` | string | Yes when supported | none | "Lobby pin; align with baked `PSX_GAME_VERSION` / `SNES_GAME_VERSION` (empty → server `"dev"`)" |
| `netplay.max_slots` | number | No | 2 | Seat count, floored at 2 |
| `netplay.lobby_url` | string | No | the launcher's `config.netplay.lobby_url` | "Optional per-title WS override" |
| `netplay.transports` | array of strings | No | absent | "Optional UI hints: `"lan"`, `"ice"`, `"direct"`" |
| `netplay.match_caps_schema` | string | No | absent | "Optional host-settings family (`psx-v1`, `snes-v1`)" |

`game_name` and `game_version` are not decoration. The lobby server keys rooms on that pair, and `game_version` has to equal the version baked into the shipped binary or players will not see each other's rooms. [recomp-net API](/docs/reference/recomp-net-api) is the library behind it.

## A complete entry

The head of a shipped manifest, verbatim. The file continues to line 75 with `notes` and `build`.

From [`titles/tomba-psx.json`](https://github.com/TechnicallyComputers/retcomm-catalog/blob/main/titles/tomba-psx.json):

```json title="titles/tomba-psx.json"
{
  "id": "tomba-psx",
  "name": "Tomba!",
  "kind": "recomp",
  "platform": "psx",
  "description": "Tomba! (USA) recompiled for the Sony PlayStation using psxrecomp.",
  "homepage": "https://github.com/mstan/TombaRecomp",
  "rom_identity": {
    "crc32": ["b00ecb0d"],
    "md5": ["c80636a28de4abcfa34f9e57fb3b043d"],
    "sha1": ["c259ec7ff6ef4163913991f4e4db2eff71702818"],
    "sha256": [
      "25ada3dd51e70eb9f9218cd83fb02d73139750229fb44b012d62d183ab32eb13"
    ],
    "disc_serials": ["SCUS-94236"],
    "sizes": [280193760],
    "filenames": ["Tomba! (USA).cue", "tomba.cue", "Tomba! (USA).bin"],
    "track_counts": [1],
    "require_cue": true
  },
  "rom_extensions": [".cue", ".bin", ".car"],
```

And the `netplay` object from the same file:

```json title="titles/tomba-psx.json"
  "netplay": {
    "supported": true,
    "stack": "recomp-net",
    "game_name": "TombaRecomp",
    "game_version": "0.12.0-alpha",
    "max_slots": 2,
    "transports": ["lan", "ice"],
    "match_caps_schema": "psx-v1"
  },
```

The schema asks authors to ship every identity key even when it is empty, and publishes this block to copy.

From [`SCHEMA.md`](https://github.com/TechnicallyComputers/retcomm-catalog/blob/main/SCHEMA.md):

```json title="SCHEMA.md"
"rom_identity": {
  "crc32": [],
  "md5": [],
  "sha1": [],
  "sha256": [],
  "disc_serials": [],
  "sizes": [],
  "filenames": ["Game Name (USA).z64"],
  "track_counts": [],
  "require_cue": false
}
```

## How a manifest reaches the catalogue

The preferred path is the submission form, which "auto-fills digests and release globs from the source repo and opens a review issue. A maintainer with write access adds the **`approved`** label to merge `titles/<id>.json`, update `index.json`, and publish a new `catalog.zip` release (use **`approved-update`** only to overwrite an existing id)."

The label is what runs the machinery. `approve-submission.yml` calls `apply_submission.py`, which takes the **last** fenced `json` block in the issue body, validates it, writes `titles/<id>.json` with `indent=2`, and appends the id to `index.json` if it is absent. It prints `added:<id>` or `updated:<id>` on stdout, and exits non-zero on any validation failure or on a duplicate id without `--allow-update`. `stamp_catalog_release.py` then writes `catalog_date` and `release_tag`, and the workflow zips `index.json`, `titles`, `SCHEMA.md` and `README.md` into `catalog.zip` and creates the release.

| Script | Flag | Type | Default | What it does |
|---|---|---|---|---|
| `apply_submission.py` | `--body-file` | path | required | Path to the issue body markdown |
| `apply_submission.py` | `--allow-update` | flag | false | Overwrite an existing `titles/<id>.json` |
| `stamp_catalog_release.py` | `--tag` | string | required | Git tag and release name. Accepted grammar is `vYYYY.MM.DD` with an optional `.HHMMSS` or `.HHMM`, then an optional suffix |
| `stamp_catalog_release.py` | `--date` / `--datetime` | string | `""` | `YYYY-MM-DD` or `YYYY-MM-DDTHH:MM:SSZ`; empty derives from the tag, then from UTC now |

Validate locally before pushing anything:

```sh
python3 -c "import json; json.load(open('index.json'))"
for f in titles/*.json; do python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$f"; done
```

The manual route is six steps: create `titles/<id>.json`, append `"<id>"` to the `titles` array in `index.json`, fill `rom_identity` from the game's own launcher gate or README table, point `release.github` at the shipping repository, rely on `platform_defaults` for GBA and PSX BIOS identity unless the title overrides it, then tag `v*` or run the Publish catalog workflow.

## Two validators, and where they have drifted

There are two independent implementations of this schema, and the repository's own rule is that they must stay in agreement. They no longer do.

| Behaviour | `apply_submission.py` (CI) | `worker/src/index.js` (submission form) |
|---|---|---|
| Digest case | Left as written | Lowercased |
| `rom_extensions` on psx | Left as written | `.iso` and `.chd` stripped |
| `build.source.ref` | Left absent | Defaulted to `"main"` |
| `require_cue` | Left as written | Set automatically from `track_counts` |
| `kind`, `install_dir_name` | Enum checked, presence required | Coerced and defaulted |

`SCHEMA.md` documents the `require_cue` rule. It does not document the psx extension filter or the lowercasing, so those two normalisations exist only in the Worker's source.

**Neither document names one as authoritative, so this page will not either.** What can be determined is narrower and more useful: only `apply_submission.py` runs on the path that writes into the repository, so it decides what actually ships. The practical consequence is the one the survey recorded: a manifest hand-written into an issue body reaches `titles/` unnormalised, because the Worker that would have tidied it was never involved. If you are writing a manifest by hand, write it in the normalised form yourself.

## Documented fields with no live example

Across the twelve manifests present at survey time, `saves`, `bios_identity`, `romm.igdb_ids`, `netplay.lobby_url` and `build.sdk` never appear. BIOS identity for psx and gba is supplied through `index.json` `platform_defaults` instead. Treat those fields as specified but unexercised.

## Consuming the catalogue

Two stable entry points. The raw index file is `https://raw.githubusercontent.com/TechnicallyComputers/retcomm-catalog/main/index.json`, and the packaged artefact is the `catalog.zip` asset on the latest release, which the launcher fetches from `https://github.com/TechnicallyComputers/retcomm-catalog/releases/latest/download/catalog.zip`. `catalog_date` and `release_tag` are the freshness keys.

One publishing rule applies to anything built from this repository: "Never put ROM bytes or generated `src/gen` / `generated/` into catalog or pack artifacts."

## Source

- [retcomm-catalog](https://github.com/TechnicallyComputers/retcomm-catalog): [`SCHEMA.md`](https://github.com/TechnicallyComputers/retcomm-catalog/blob/main/SCHEMA.md), [`README.md`](https://github.com/TechnicallyComputers/retcomm-catalog/blob/main/README.md), [`index.json`](https://github.com/TechnicallyComputers/retcomm-catalog/blob/main/index.json), [`titles/tomba-psx.json`](https://github.com/TechnicallyComputers/retcomm-catalog/blob/main/titles/tomba-psx.json), [`submit/platform-defaults.json`](https://github.com/TechnicallyComputers/retcomm-catalog/blob/main/submit/platform-defaults.json).
- The two validators: [`.github/scripts/apply_submission.py`](https://github.com/TechnicallyComputers/retcomm-catalog/blob/main/.github/scripts/apply_submission.py) and [`worker/src/index.js`](https://github.com/TechnicallyComputers/retcomm-catalog/blob/main/worker/src/index.js). The workflows: [`.github/workflows/approve-submission.yml`](https://github.com/TechnicallyComputers/retcomm-catalog/blob/main/.github/workflows/approve-submission.yml), [`.github/workflows/publish.yml`](https://github.com/TechnicallyComputers/retcomm-catalog/blob/main/.github/workflows/publish.yml), [`.github/scripts/stamp_catalog_release.py`](https://github.com/TechnicallyComputers/retcomm-catalog/blob/main/.github/scripts/stamp_catalog_release.py).

## Next

- [Machine-readable surfaces](/docs/agents/machine-surfaces) collects the rest of what an agent can drive in this fleet.
- [recomp-net API](/docs/reference/recomp-net-api) is the library a title advertises through the `netplay` block.
- [Every repository](/docs/fleet/repositories) is the human-readable index this catalogue is the machine-readable half of.
- [PlayStation](/docs/platforms/playstation) is the toolchain every live entry currently belongs to, and [Glossary](/docs/concepts/glossary) defines ROM identity, disc image and title id as the fleet uses them.
