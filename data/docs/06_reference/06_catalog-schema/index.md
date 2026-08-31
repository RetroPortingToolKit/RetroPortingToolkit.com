---
title: "Catalog schema"
summary: "How the launcher catalog describes ports, required game files, releases, launch settings, and compatibility in a form tools can read."
pageType: "reference"
tags: ["Schema", "Catalog", "Launcher"]
repos:
  - "https://github.com/TechnicallyComputers/retcomm-catalog"
updated: "2026-08-31"
---

The catalog is the list a launcher can read when it wants to know what ports exist.

It is not the port itself. It is not a game database for every retro game. It is a small set of JSON files that answer practical questions:

- What is this port called?
- What system is it for?
- What game file does the user need to provide?
- Does it need a BIOS or firmware file?
- Where can the launcher get a release?
- How should the launcher start it?

The catalog should be boring on purpose. If a launcher has to guess, the schema did not do its job.

## The two file types

The catalog has one root file and one file per title.

| File | What it does |
|---|---|
| `index.json` | Lists the catalog version, platform defaults, and every title id. |
| `titles/<id>.json` | Describes one port. |

The title id should match in three places:

- the entry in `index.json`
- the filename under `titles/`
- the `id` field inside that title file

That keeps launcher behavior simple. A tool should not need fuzzy matching to load a catalog entry.

## `index.json`

`index.json` is the catalog table of contents.

| Field | Meaning |
|---|---|
| `schema_version` | The catalog format version. |
| `name` | A display name for the catalog. |
| `catalog_date` | When this catalog was published. |
| `release_tag` | The release tag that produced this catalog. |
| `platform_defaults` | Defaults shared by entries on the same platform. |
| `titles` | The list of title ids. Each id should have a matching `titles/<id>.json`. |

Platform defaults are useful when many ports on the same system need the same BIOS identity. A title can override that default, or opt out when it does not apply.

## Title identity

Every title manifest needs enough identity to show a human what the port is.

| Field | Meaning |
|---|---|
| `id` | Stable slug. Use lowercase letters, numbers, and hyphens. |
| `name` | Human-readable title. |
| `kind` | Usually `recomp`. Some entries may be `decomp`. |
| `platform` | The system family, such as `psx`, `snes`, `nes`, `gba`, `nds`, `genesis`, `smsgg`, `vb`, or `cdi`. |
| `description` | Short description for launchers and catalog views. |
| `homepage` | Project or release page. |
| `author_notes` | Optional note from the port author. |
| `notes` | Maintainer notes for the catalog. |

Keep descriptions short. The catalog is not where the project history belongs.

## Game file identity

The catalog uses hashes, sizes, serials, and filename hints to recognize the game file the user provides.

It does not include that game file. The user supplies their own legally obtained dump. This site does not provide game files and does not tell users how to get them.

| Field | Meaning |
|---|---|
| `rom_identity` | The checks used to recognize the correct game file. |
| `rom_identity.crc32` | CRC32 hashes, if useful. |
| `rom_identity.md5` | MD5 hashes, if useful. |
| `rom_identity.sha1` | SHA-1 hashes, if useful. |
| `rom_identity.sha256` | SHA-256 hashes, if useful. |
| `rom_identity.disc_serials` | Disc serials for systems where that is useful. |
| `rom_identity.sizes` | Expected file sizes. Useful before hashing large files. |
| `rom_identity.filenames` | Filename hints. These help the user, but should not be the only match rule. |
| `rom_identity.track_counts` | Expected track counts for disc images. |
| `rom_identity.require_cue` | Whether the entry requires a cue sheet. |
| `rom_extensions` | File extensions the launcher should scan for this entry. |

A manifest should contain at least one real identity check. A filename alone is not enough.

## BIOS identity

Some systems need a BIOS or firmware file.

Use a legally obtained BIOS if one is required. This site does not provide retail BIOS files. Some projects may provide open source BIOS alternatives where that makes sense.

| Field | Meaning |
|---|---|
| `bios_identity` | The checks used to recognize the BIOS or firmware file. |
| `bios_identity.required` | Whether the file is required. |
| `bios_identity.crc32`, `md5`, `sha1`, `sha256` | Hashes for known good files. |
| `bios_identity.sizes` | Expected file sizes. |
| `bios_identity.filenames` | Filename hints shown to the user. |

A platform default can define common BIOS rules. A title manifest should only override it when that specific title needs something different.

## Release information

Release fields tell a launcher where to find the build.

| Field | Meaning |
|---|---|
| `release.github` | Repository that publishes the release. |
| `release.tag` | Release tag to use, when fixed. |
| `release.asset_patterns` | Asset names the launcher should look for. |
| `release.prerelease` | Whether prereleases are allowed. |
| `release.source_only` | Whether users must build it themselves. |

Be careful with release wording. Some projects can ship a ready-to-run build. Some require the user to build locally after providing their own game file. The catalog should describe the distribution model without making legal claims beyond what the project actually does.

## Build and launch information

Build fields are for source-only entries. Launch fields are for installed builds.

| Field | Meaning |
|---|---|
| `build` | How a launcher or tool should build the port. |
| `build.system` | The build system, such as CMake. |
| `build.commands` | Commands to run. |
| `launch` | How to start the installed port. |
| `launch.executable` | Main executable or relative executable path. |
| `launch.args` | Arguments the launcher should pass. |
| `launch.working_dir` | Working directory to use. |

Do not hide important setup inside prose. If a launcher needs it, make it structured.

## Compatibility and extras

Optional sections describe features that a launcher may show or use.

| Field | Meaning |
|---|---|
| `status` | Short status label for the port. |
| `availability` | Whether a build is public, source-only, or unavailable. |
| `saves` | Save file locations or save behavior. |
| `enhancements` | Optional features such as widescreen, renderer work, or quality settings. |

These fields should stay factual. A launcher needs to know what exists, not why the project is exciting.

## Safe schema rules

Use structured fields for anything a tool must act on.

Keep human notes short.

Do not use markdown files in random repositories as the authority for catalog behavior. They are useful clues, but the catalog should carry the actual data a launcher needs.

When in doubt, prefer a smaller manifest that is correct over a large manifest full of guesses.
