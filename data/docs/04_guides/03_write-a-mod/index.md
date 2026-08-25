---
title: "Write a mod"
summary: "Building a mod package for a recompiled port: how a package targets one exact game dump by hash, how features and typed options toggle independently, how collisions are diagnosed before boot, and why the game file you supply is never written."
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
updated: "2026-08-25"
---

A mod for a recompiled port does not change the game file you supplied. There is no patching step, no new disc image, and nothing to undo. A package declares what it wants changed. The runtime turns that declaration into guarded operations before the game boots, and applies them to the program image in memory and to disc reads as they happen. Turn every feature off and you get the original game back, because the original bytes were never overwritten.

## Your game file is never changed

> **You provide this.** You supply your own copy of the game. The project does not distribute one, and [the game file you supply](/docs/concepts/the-game-file-you-supply) is the page for that contract. A package must contain no part of it. The publication checklist requires "no stock game files, patched disc, secrets, or files without redistribution permission" ([`MOD_AUTHORING.md`](https://github.com/OpokXeno/xenogears-recomp/blob/master/MOD_AUTHORING.md)).

[psxrecomp](https://github.com/mstan/psxrecomp)'s package specification states the contract in one sentence:

> The player selects a verified stock BIN/CUE. Resolution produces guarded native operations and sparse disc overlays without rewriting or replacing that stock image.

Two mechanisms make that true. Writes go into the loaded program image, not into a file, and "untouched functions remain on the static native path", so a mod needs no rebuild. Disc changes are indexed lookups, not a rebuilt image.

The rule is fleet-wide. [cdirecomp](https://github.com/mstan/cdirecomp) writes down the shared version:

> Every enhancement is **opt-in**, **off by default**, and **byte-identical to the
> faithful path when off**.

The same document forbids the shortcut most people reach for first: "Generated `*.c` is rebuilt from the recompiler and must never be edited (the project's first law)." The next regeneration deletes a hand edit.

## Package, feature, operation

Three words carry the model, and [MegaManX6Recomp](https://github.com/mstan/MegaManX6Recomp) separates them cleanly:

> - A **package** is an installation, update, provenance, and trust boundary. A
>   `.psxmod` archive may contain one feature or many features.
> - A **feature** is a user-facing mod or tweak. It has its own enabled state and
>   may expose configuration values.
> - An **operation** is the runtime primitive produced by an enabled feature,
>   such as a guarded memory write, disc overlay, asset redirect, or function
>   hook.

A feature is identified by `(package_id, feature_id)`, and "Enabling one feature never enables, disables, or reconfigures another feature." The launcher shows features, not packages. Alternatives such as US versus Japanese artwork belong inside one feature as option values.

## Before you start

You need a built port for the game you are modding, which [Port a game](/docs/guides/port-a-game) covers. You need Python 3 for the packaging script. You need your own verified copy of the game, because a package is pinned to one exact dump. The [glossary](/docs/concepts/glossary) defines four words the manifest uses without explaining: guard, overlay, plan, resolver.

The steps below use the [PlayStation](/docs/platforms/playstation) toolchain, which has the fullest published specification.

## Step 1. Pin the exact stock revision

Ask the runtime for the mounted-disc digest. Hashing the container file is wrong. `disc_sha256` "is not the hash of the selected container file. The core runtime supplies a representation-neutral digest for the mounted disc, so equivalent CUE/BIN and CHD representations have the same identity."

From [`MOD_AUTHORING.md`](https://github.com/OpokXeno/xenogears-recomp/blob/master/MOD_AUTHORING.md):

```sh
./build-debug/XenogearsRecomp --disc-hash game/disc1.cue
```

For an `exe_sha256`, or for the hash of a payload file you ship, ordinary tools are correct:

```sh
sha256sum game/slus_006.64
sha256sum assets/retranslated-script.bin
```

**Checkpoint.** You have one 64-character lowercase hex digest, and it came from `--disc-hash` rather than from `sha256sum` on the `.bin`.

## Step 2. Lay out the package directory

A source package is the manifest plus payloads, nothing else. From [`MOD_AUTHORING.md`](https://github.com/OpokXeno/xenogears-recomp/blob/master/MOD_AUTHORING.md):

```text title="MOD_AUTHORING.md"
my-xenogears-mod/
|-- manifest.toml
|-- README.txt
|-- LICENSE.txt
`-- assets/
    |-- replacement-script.bin
    `-- title-screen.bin
```

`manifest.toml` must be at the archive root. Payload paths are relative to that root and must stay inside it. Installed packages land in a catalog beside the executable, one directory per version, so several versions can coexist and the player picks one. [nesrecomp](https://github.com/mstan/nesrecomp) shows that shape in [`docs/MOD_PACKAGES.md`](https://github.com/mstan/nesrecomp/blob/master/docs/MOD_PACKAGES.md):

```text title="docs/MOD_PACKAGES.md"
mods/
  state.toml
  packages/
    example.display/
      1.0.0/
        manifest.toml
```

A game may also ship reviewed, default-disabled packages, already unpacked under `mods/preloaded/packages/`. Framework packages live in the recompiler repository under `mods/builtin/packages/`.

**Checkpoint.** `manifest.toml` is at the top of your source folder, not inside a subdirectory.

## Step 3. Write the manifest

Start from the minimal skeleton and replace every placeholder. The header identifies the package and pins the target. From [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md):

```toml title="README.md"
format_version = 1
id = "example.quick-start"
version = "1.0.0"
name = "Quick-start example"
author = "Your name"
description = "One independently toggleable gameplay change."
resolver = "declarative"
save_compatibility = "shared"

[[target]]
game_id = "SLUS-00000"
# Replace this with the SHA-256 of the exact supported stock disc image.
disc_sha256 = "0000000000000000000000000000000000000000000000000000000000000000"
```

The rest of the same file declares one feature and the single guarded write it owns. `expected` is a complete instruction, not just the byte being changed:

```toml title="README.md"
[[feature]]
id = "quick-start"
name = "Quick Start"
description = "Skips the game's startup delay."
group = "Gameplay"
default_enabled = false

[[patch]]
feature = "quick-start"
target = "main_exe"
address = 0x80041234
expected = "2a 00 02 24"
replace = "00 00 02 24"
```

That skeleton shows the structure and is not a real change: "Do not publish it until every placeholder is replaced and tested against the declared stock target." Every field is catalogued on the [mod manifest](/docs/reference/mod-manifest) page.

**Checkpoint.** The launcher lists your package with one feature row, disabled.

## Step 4. Pick the narrowest mechanism that describes your change

Several mechanisms can produce the same bytes, and only one of them describes what you meant. From [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md):

| Change | Package mechanism |
|---|---|
| Fixed code or data bytes | Guarded `[[patch]]` on `main_exe`, `disc_raw`, or `disc_user` |
| A player-selectable boolean, choice, or number | Feature-local `[[option]]` plus `when`, `replace_from`, sparse `fields`, or `when_integer` |
| Artwork, script, audio, or another large disc asset | Hashed file-backed `[[overlay]]`; do not rebuild the player's stock image |
| Host setting or live game behavior | Trusted static `[[plugin]]`, compiled into the game and selected by a stable id |
| Several features composing one shared table, bitfield, routine, or allocation | Game-owned `resolver = "builtin:<id>"`, only when declarative operations cannot express the composition |

Two rules catch people out. Guard the whole MIPS instruction, not only its immediate bytes, because "This detects opcode/register differences and gives collision checking an accurate ownership range". And use `disc_user` for offsets in the 2048-byte data stream. Use `disc_raw` only when the change is defined in raw 2352-byte sectors.

## Step 5. Expose choices as typed options, not as more features

A feature that ships one patch per possible value is the wrong shape. Declare a bounded option and drive the bytes from it. From [`MOD_AUTHORING.md`](https://github.com/OpokXeno/xenogears-recomp/blob/master/MOD_AUTHORING.md):

```toml title="MOD_AUTHORING.md"
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

```toml title="MOD_AUTHORING.md"
format_version = 2

[[patch]]
feature = "battle-tuning"
target = "main_exe"
address = 0x80041234
expected = "04 00 02 24"
replace_from = { option = "starting-ap", encoding = "u16le", offset = 0 }
```

Encoding is deliberately minimal: `u8`, `u16le`, `u32le`, an optional checked `addend`, and a byte `offset` into the guard.

**Checkpoint.** Setting the option to its stock value produces no write at all. A value equal to the stock guard "produces no write and claims no bytes", and `omit_when_default` suppresses a whole patch when the selected value equals the option default.

## Step 6. Behaviour lives in the executable, and a package only switches it on

A mod package cannot carry native code. It "cannot ship DLLs, shared objects, scripts or arbitrary native code, and it cannot select a symbol by name". A `[[plugin]]` entry names a registry key for behaviour that is already compiled into the game executable. Adding a new plugin id, or a `builtin:` resolver, is a source change to the game repository and needs project review. An ordinary author uses patches, options and overlays.

That is a trust decision. The alternative is a downloaded archive loading native libraries into the process, and none of these projects have a sandbox that would make that safe. So trusted code is reviewed into the build ahead of time, where a human reads it, and the archive is limited to declarations a validator can check.

That still does not make installing mods safe, and the projects say so. From [`MODS.md`](https://github.com/OpokXeno/xenogears-recomp/blob/master/MODS.md): "Only install packages from authors you trust. The package loader validates the archive and does not allow a package to load arbitrary native libraries, but a mod can intentionally change game code, data, and assets."

## Step 7. Pack the archive

The packer is deliberately dumb: reproducible bytes in, reproducible archive out. From [`MOD_AUTHORING.md`](https://github.com/OpokXeno/xenogears-recomp/blob/master/MOD_AUTHORING.md):

```sh
python psxmod_pack.py my-xenogears-mod my-xenogears-mod-1.0.0.psxmod
```

[`tools/psxmod_pack.py`](https://github.com/mstan/psxrecomp/blob/master/tools/psxmod_pack.py) is 32 lines. It requires `manifest.toml`, sorts entries, fixes timestamps to 1980-01-01 and file modes to `0o100644`, and writes a DEFLATE ZIP. It checks nothing else: "It does not prove that your addresses or expected bytes are correct."

The installer enforces the trust boundary. It validates CRCs, rejects encrypted entries and unsafe paths, limits an archive to 4096 files and 256 MiB expanded, validates the manifest, and publishes the version atomically.

**Checkpoint.** Packing the same source directory twice produces two identical files.

## Step 8. Install, then test against the checklist

Install through the launcher's Mods page. "Do not ask players to rename it to `.zip`, extract it manually, patch their disc, or run a separate executable."

The publication checklist, verbatim from [`MOD_AUTHORING.md`](https://github.com/OpokXeno/xenogears-recomp/blob/master/MOD_AUTHORING.md):

```text title="MOD_AUTHORING.md"
- The package installs from a clean launcher state.
- Every feature defaults to the intended state.
- All features disabled produce stock behavior.
- Each feature works alone.
- Representative feature combinations work.
- Every option boundary, choice, and boolean branch resolves correctly.
- Stock-valued options produce no unnecessary writes.
- Incorrect game IDs, EXE bytes, disc hashes, and payload hashes fail closed.
- An intentionally overlapping test package produces a clear collision
  diagnostic rather than silently winning.
- Relaunch preserves the selected version, enabled features, and option values.
- Removing and reinstalling the package behaves predictably.
- Save compatibility is tested and declared accurately; testers keep backups
  for progression-changing features.
- FMV, CD audio, scene transitions, battles, and disc reads near modified data
  still work.
```

One warning comes with it: "For gameplay changes, test farther than the first visible result. A patch that works at the title screen can still break a later overlay, save migration, or timing-sensitive transition."

## A complete real example

Tomba's frame-interpolation package ships in [TombaRecomp](https://github.com/mstan/TombaRecomp) and uses everything a modder needs: a hash-pinned target, one feature, a typed choice option, and a plugin selector. The header, from [its `manifest.toml`](https://github.com/mstan/TombaRecomp/blob/master/mods/preloaded/packages/tomba.enhancement.frame-interpolation/1.0.0/manifest.toml):

```toml title="mods/preloaded/packages/tomba.enhancement.frame-interpolation/1.0.0/manifest.toml"
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

The feature and its option follow. Five more `[[option.choice]]` blocks after this one give 90, 120, 144, 165 and 240 FPS:

```toml title="mods/preloaded/packages/tomba.enhancement.frame-interpolation/1.0.0/manifest.toml"
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

The last three lines of the manifest are the only link to code:

```toml title="mods/preloaded/packages/tomba.enhancement.frame-interpolation/1.0.0/manifest.toml"
[[plugin]]
feature = "frame-interpolation"
id = "tomba.frame-interpolation"
```

The implementation that id resolves to is 42 lines. From [`src/mods/tomba_frame_interpolation_plugin.c`](https://github.com/mstan/TombaRecomp/blob/master/src/mods/tomba_frame_interpolation_plugin.c):

```c title="src/mods/tomba_frame_interpolation_plugin.c"
static void tomba_frame_interpolation_activate(void) {
    char rate[16];
    unsigned long fps = 0ul;   /* 0 = follow measured display refresh */

    /* An unreadable or unrecognised value falls back to the manifest default
     * ("display"), which is the conservative choice: it follows the monitor
     * instead of pinning a rate the panel may not support. */
    if (psx_mod_option_value(PKG, FEATURE, "rate", rate, sizeof rate) &&
        strcmp(rate, "display") != 0) {
        char* end = rate;
        const unsigned long parsed = strtoul(rate, &end, 10);
        if (end != rate && *end == '\0') fps = parsed;
    }

    (void)psx_mod_set_frame_interpolation((uint32_t)fps);
}

PSX_MOD_CONSTRUCTOR(tomba_register_frame_interpolation_plugin) {
    (void)psx_mod_register_activation_plugin(
        "tomba.frame-interpolation", tomba_frame_interpolation_activate);
}
```

Tomba ships five packages in all: widescreen, FMV skip, frame interpolation, a hybrid controller mode, and a debug warp.

## How toggling and conflicts work

Enabled state and option values live in `mods/state.toml`, which stores selected package versions separately from feature state. Everything is resolved once, before boot:

```text
Before boot, the manager:

1. verifies the selected stock game and revision;
2. expands only enabled features and their selected options;
3. orders active packages deterministically by dependencies;
4. verifies enabled payloads and operation bounds;
5. collision-checks the complete owned byte-range plan and guard
   compatibility;
6. coalesces only truly identical target/range/expected/replacement writes or
   identical overlays; and
7. produces a canonical SHA-256 plan fingerprint.
```

Because resolution happens once and disabled features expand to nothing, "Hundreds of installed but disabled features add no meaningful in-game cost."

A conflict is a differing owned byte, not an overlapping operation. Two operations over the same range compose when their expected and replacement bytes agree throughout. When they do not, nothing launches: "Incompatible overlaps fail before launch. Structured diagnostics identify both `(package, feature)` owners and the exact contested target range. The launcher marks both feature rows and lets the user decide what to disable. It never silently chooses a winner." Any error clears the whole plan rather than launching part of it.

One more toggle worth knowing: netplay clears the in-session mod plan entirely, without touching your offline selection. [Determinism](/docs/concepts/determinism) explains why rollback cannot tolerate an unsynchronised plan.

## The low-friction path on NES

Not every port uses packages. The NES tile and text override systems came before the package format and are still the documented path there. No manifest, no hashes, no packaging step: drop `text_overrides.json` and a `tiles/` directory next to the executable. Dump the tiles first:

```text
FaxanaduRecomp.exe --tile-dump
```

Edit the PNGs in `tiles/` using the fixed four-colour grayscale palette, where `#000000`, `#555555`, `#AAAAAA` and `#FFFFFF` are palette indices 0 to 3. Hot reload works here: "Edit a PNG while the game is running and save -- the change appears within ~1 second." Keep the companion `.bin` files. They carry the partial-tile lead and trail bytes a PNG cannot represent. Text overrides are a JSON array, from [`MODDING.md`](https://github.com/mstan/FaxanaduRecomp/blob/master/MODDING.md):

```json title="MODDING.md"
[
  {
    "bank": 12,
    "addr": "9DBC",
    "encoding": "FAXANADU_1",
    "source": "START",
    "replacement": "BEGIN"
  }
]
```

## Troubleshooting

From [`MOD_AUTHORING.md`](https://github.com/OpokXeno/xenogears-recomp/blob/master/MOD_AUTHORING.md):

| Symptom | Likely cause |
|---|---|
| Package does not install | Missing root `manifest.toml`, malformed TOML, invalid ID/version, unsafe archive path, or archive limits exceeded. |
| Package appears but feature does not | Feature disabled, condition does not match, selected package version is different, or operation is a stock-valued no-op. |
| Launch reports wrong target | `game_id`, `exe_sha256`, or `disc_sha256` does not match the selected executable and mounted disc. |
| Expected bytes mismatch | Wrong guest address, wrong revision, incorrect endianness, or bytes taken from an already patched image. |
| Overlay is rejected | Missing exact target `disc_sha256`, wrong payload hash, wrong stock-range hash, or path escapes the archive. |
| Two features conflict | They own at least one differing byte/range or provide incompatible guards. |
| Plugin is unavailable | The ID is not registered in this build. A package cannot provide the implementation. |
| Option cannot be enabled | Bounds, step, or an ordered constraint is invalid. |

## Known limits

Option encoding is narrow on purpose: "There is deliberately no host-endian encoding, signed inference, mask, shift, scale, expression language, or partial-field merge."

Mod support is not on everywhere. On NES it is off at the framework level and is a per-game build opt-in, and SNES is the same.

The documented operations are also ahead of what is demonstrably in use. Every mod manifest in the surveyed clone of the fleet, three psxrecomp builtins and five TombaRecomp preloaded packages, is `format_version = 5` and uses only `[[plugin]]`. The integer, sparse-field and overlay examples in the specifications are placeholders, so treat those paths as documented rather than as proven by a shipped package.

## Source

- [psxrecomp](https://github.com/mstan/psxrecomp): [`docs/MOD_PACKAGES.md`](https://github.com/mstan/psxrecomp/blob/master/docs/MOD_PACKAGES.md) is the specification; [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md) has the skeleton and the mechanism table; [`tools/psxmod_pack.py`](https://github.com/mstan/psxrecomp/blob/master/tools/psxmod_pack.py) is the packer; [`runtime/include/mod_plugins.h`](https://github.com/mstan/psxrecomp/blob/master/runtime/include/mod_plugins.h) is the plugin API.
- [xenogears-recomp](https://github.com/OpokXeno/xenogears-recomp): [`MOD_AUTHORING.md`](https://github.com/OpokXeno/xenogears-recomp/blob/master/MOD_AUTHORING.md) is the authoring workflow, [`MODS.md`](https://github.com/OpokXeno/xenogears-recomp/blob/master/MODS.md) the player-facing half.
- [MegaManX6Recomp](https://github.com/mstan/MegaManX6Recomp): [`MOD_LOADER.md`](https://github.com/mstan/MegaManX6Recomp/blob/master/MOD_LOADER.md) for the three-word split and the cost model.
- [TombaRecomp](https://github.com/mstan/TombaRecomp): [`mods/preloaded/packages/`](https://github.com/mstan/TombaRecomp/blob/master/mods/preloaded/packages) holds the five shipped packages.
- [nesrecomp](https://github.com/mstan/nesrecomp): [`docs/MOD_PACKAGES.md`](https://github.com/mstan/nesrecomp/blob/master/docs/MOD_PACKAGES.md) and [`MODDING.md`](https://github.com/mstan/nesrecomp/blob/master/MODDING.md). [FaxanaduRecomp](https://github.com/mstan/FaxanaduRecomp): [`MODDING.md`](https://github.com/mstan/FaxanaduRecomp/blob/master/MODDING.md) for the file-drop path.
- [cdirecomp](https://github.com/mstan/cdirecomp): [`ENHANCEMENTS.md`](https://github.com/mstan/cdirecomp/blob/master/ENHANCEMENTS.md) for the shared enhancement rules.

## Next

- [Mod manifest](/docs/reference/mod-manifest), every field with its type and default.
- [Add widescreen](/docs/guides/add-widescreen), the hardest enhancement to build.
- [Translate a game](/docs/guides/translate-a-game), which uses a table format instead.
- [Determinism](/docs/concepts/determinism), for why netplay and rewind constrain a mod.
