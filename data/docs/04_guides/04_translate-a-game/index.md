---
title: "Translate a game"
summary: "Translating a recompiled port with human-editable TOML tables: the three substitution layers, the exact table keys, how a table is reloaded into a running game, and the capture, author, verify, re-capture loop a translator actually works in."
section: "guides"
sectionTitle: "Guides"
pageType: "guide"
tags: ["Translation", "Localization", "PlayStation", "NES"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/TsumuLightRecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/FaxanaduRecomp"
updated: "2026-08-23"
---

Translating a game on a recompiled port does not mean editing the game file, rebuilding it, or regenerating the port. It means writing a table of source bytes and target strings in TOML, and letting the runtime substitute the translated text as the game draws it. The substitution happens at a single chokepoint every guest call passes through, so no generated code changes and no regeneration is needed, and a translator can edit a line and see it in the running game. This guide covers the table format, where tables live, how they are loaded and reloaded, and the loop a translator actually works in.

## What the layer does

From [psxrecomp](https://github.com/mstan/psxrecomp)'s [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md):

> A general localization layer captures the game's own strings out of memory and
> substitutes translated bytes as it runs. Any source language to any target — the
> mechanism has no built-in notion of a "default" language, so a Japanese-only
> release can be played in English just as readily as an English one can be played
> in another language.
>
> Switching is live. Tables are human-editable TOML under `translations/`, one
> column per language, hot-reloaded while the game is running — and the launcher
> carries a language picker. A translator can edit a line and see it in-game
> without rebuilding anything.
>
> The hard part is glyphs, not strings. Substituted text is drawn through the
> game's *own* glyph routine with per-character proportional advances calibrated
> by measuring the real ink width of each glyph tile in VRAM, plus auto-fit
> condensing so longer translations still fit a box sized for the original. That
> means no engine changes and no regeneration to add a language.

The implementation is `runtime/src/text_xlate.cpp`, about 970 lines, behind `runtime/include/text_xlate.h`. Its entry points are `text_xlate_init(project_root, language)`, `text_xlate_set_language(language)`, `text_xlate_on_dispatch(cpu, target)`, `text_xlate_vram_upload(x, y, w, h)` and `text_xlate_debug_json(subcmd, out, cap)`. The [glossary](/docs/concepts/glossary) defines the fleet's terms for the surfaces those touch, including overlay and dispatch.

The mechanism is a direct port of prior art from the author's n64recomp fork for Pocket Monsters Stadium (Japan). The published advantage of the PlayStation version is that the N64 one needed `TRACE_ENTRY()` emitted per function and therefore a regeneration with `trace_mode=true`, whereas the PlayStation version hangs off `psx_dispatch`: "one install site, no regen, works in Release."

## Three substitution layers, because games draw text three ways

The design document describes capture, table and apply. In the shipped code the apply side has grown into three distinct layers, and knowing which one your text needs is the first real decision you make.

1. **Pointer swap**, at the dispatch chokepoint. The runtime scans `a0` through `a3` for a pointer to a text record, hashes it, and on a table hit writes the transcoded replacement into transient guest scratch below `$sp`, repoints the argument register, and lets the game's own draw routine run unchanged.
2. **`[[glyph_label]]` RAM source patch**, for labels the game draws per glyph from a fixed executable address. The discriminator is stated crisply: "The RAM source-patch works for **any** label the game draws from a fixed EXE address, *regardless of draw path* (per-glyph sprite loop OR string formatter) ... It CANNOT touch text that is **composed at runtime**."
3. **`[[vram_patch]]` upload-time pixel patch**, for labels that are pre-rendered pixel strips baked into the font asset and are not glyph codes at all. On completion of every CPU-to-VRAM transfer, any configured rectangle fully contained in the upload is verified halfword for halfword against `src_hex` and "only on an exact match rewritten with `<lang>_hex`", through the renderer facade the upload itself uses so software, OpenGL and supersampling mirrors stay coherent. It re-applies on every matching re-upload, so it survives scene reloads, and "a different asset at the same coords fails verify and is left alone."

Layer 1 is the whole capture-and-substitute mechanism, and it is short. From [`runtime/src/text_xlate.cpp`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/text_xlate.cpp):

```cpp title="runtime/src/text_xlate.cpp"
    uint32_t* argregs[4] = { &cpu->gpr[4], &cpu->gpr[5], &cpu->gpr[6], &cpu->gpr[7] };
    for (int a = 0; a < 4; ++a) {
        uint32_t va = *argregs[a];
        if (!va_in_ram(va)) continue;
        if (!g_prof->first_byte_textish(grb(ram, va))) continue;
        if (scratch_recent(va)) continue;  // don't recapture our own English scratch
        uint8_t buf[kSrcMax]; uint32_t len = 0; Term term = Term::None;
        if (!g_prof->read_record(ram, va, buf, &len, &term)) continue;
        uint64_t key = fnv1a(buf, len);
```

## Where tables live, and what one looks like

One multilingual TOML file per title, under `translations/` in the port repository. Every `translations/*.toml` under the project root is read at startup. The shipped table for [TsumuLightRecomp](https://github.com/mstan/TsumuLightRecomp) is 1990 lines. Its header and two real message entries, from [`translations/tsumu.toml`](https://github.com/mstan/TsumuLightRecomp/blob/master/translations/tsumu.toml):

```toml title="translations/tsumu.toml"
# Tsumu Light (SLPS-02253) - English translations. Framework: docs/STRING_TRANSLATION.md
# Non-glyphed string-pointer message text (in-EXE message table, LE Shift-JIS).
# Keyed by FNV-1a64 of the exact source-record bytes. \n=line break, \f=page, \r=prompt.
schema = 1
default_lang = "en"

[[entry]]
src_hex = "51835b818083c982c882ea82e982bd82df82cc82feffa982f182bd82f182c882fb974b8fc582b7824281feffdc82b882cd82b182b182a982e7824981"
term = "ffff"
en = "Simple practice to get\nused to the game.\nStart here!"

[[entry]]
src_hex = "588365835b815783f0824e838a834183b582c482a282ad82feffc68241814991d782e982588365835b815783aa82d382a682feffdc82b7824281df82b482b9827282898393834e834981"
term = "ffff"
en = "Clear stages to unlock\nmore to choose from.\nAim for S rank!"
```

A `[[glyph_label]]` entry carries the fixed address and the exact slot width it may overwrite. `src_jp` is documentation for the human reading the file and is never used for matching:

```toml
[[glyph_label]]
addr    = 0x80070300
width   = 26
src_hex = "bf82e3825b81c682e882a082e982cc825082"
src_jp  = "ちゅーとりあるの１"
en = "TUTORIAL 1"
```

A `[[vram_patch]]` entry is a rectangle plus expected and replacement pixels. The two pixel-hex strings are about 900 characters each and are elided here:

```toml
# hud_stage: "STAGE" over the JP HUD label strip (game compose-blit unit)
[[vram_patch]]
x = 834
y = 352
w = 18
h = 16
src_hex = "<src_hex omitted>"
en_hex  = "<en_hex omitted>"
```

### The table keys

| Key | Type | Meaning |
|---|---|---|
| `schema` | int | Table schema version. |
| `default_lang` | string | Language used when none is selected. |
| `langs` | array | Declared language columns; drives the launcher dropdown. |
| `[[entry]].src_hex` | hex string | Raw source-record bytes. FNV-1a64 of these bytes is the lookup key. |
| `[[entry]].src_jp` | string | Documentation only, never used for matching. |
| `[[entry]].src_addr` | int | Optional disambiguator when two records collide on hash. |
| `[[entry]].term` | string | `"nul"`, `"ffff"`, or `"none"` for a mid-blob sub-record with no terminator write. |
| `[[entry]].ram_addr` | int | Optional. Overwrites the source bytes in place, for records the game addresses only through a pointer table. |
| `[[entry]].<lang>` | string | UTF-8 target text. A missing language falls back to the source, so a gap never breaks the game. |
| `[[entry]].orig_w` / `max_w` | int | Glyph-cell footprint and hard width cap. |
| `[[glyph_label]].addr` / `width` | int | Fixed EXE address and exact slot width to overwrite. |
| `[[vram_patch]].x/y/w/h` | int | Rectangle in VRAM. |
| `[[vram_patch]].src_hex` / `<lang>_hex` | hex | Expected and replacement pixels, as little-endian halfwords. |

Configuration is `[localization].language`, with `[localization].languages` driving the launcher dropdown. Setting the language to `jp`, `off` or empty disables substitution while leaving capture running. See the [configuration reference](/docs/reference/configuration).

## Before you start

Two operational facts decide whether your working loop is pleasant or painful.

**Capture is off by default in shipped builds.** The always-on Shift-JIS inventory scan "costs 26-35% of whole-lane throughput on streaming-heavy titles (measured across three GT2 race lanes; reproduced fleet-wide)". `PSX_XLATE_CAPTURE=1` re-enables it. Substitution is unaffected by this, so a player never pays for it.

**Live reload lives on the debug server.** The reload verb is `xlate` on the TCP debug server, and "title Release builds default `PSX_DEBUG_TOOLS=OFF` (no TCP)". Work against a build with debug tools enabled, or you will be restarting the game after every edit.

> **You provide this.** You supply your own copy of the game. See [the game file you supply](/docs/concepts/the-game-file-you-supply). A translation table contains your own text plus hex digests of the game's bytes; it is not a copy of the game.

## Step 1. Capture pass

Start a fresh run with capture enabled and drive every screen, menu, tutorial, dialogue and ending. The capture ring logs every distinct record it sees to a stringdump log.

**Checkpoint.** The stringdump log has grown, and the record count is in the tens rather than the tens of thousands. A relaxed reader "admits vertex/coordinate binary that passes by chance (~20k records)"; the shipped gate requires at least two hiragana, katakana or fullwidth characters, which "keeps the always-on inventory a clean enumeration (~52 real records)".

## Step 2. Decode and author

`text_xlate_decode.py` produces a master TSV with the Japanese visible. Fill in translations there. `text_xlate_build.py` joins them into the TOML, merging so hand-authored entries survive. These tools are described as living in psxrecomp's `tools/` directory; their presence under those exact names was not confirmed when this page was written, so check the directory before scripting around them.

**Checkpoint.** Your table parses, and every entry you filled in has both a `src_hex` and a `<lang>` value.

## Step 3. Apply and verify

Re-run with the table in place and the hook substitutes. The project's instruction is specific about what counts as verification, from [`docs/STRING_TRANSLATION.md`](https://github.com/mstan/psxrecomp/blob/master/docs/STRING_TRANSLATION.md):

```text title="docs/STRING_TRANSLATION.md"
3. **Apply + verify.** Re-run with the table; the hook substitutes. **Verify
   visually** (screenshot both windows — never infer from a counter), per the
   project's verification rules.
```

**Checkpoint.** You have a screenshot showing the translated line on screen. A counter saying the entry was applied is not the checkpoint.

## Step 4. Edit a line and reload it into the running game

This is the part that makes the workflow worth using, and it is worth being precise about how it actually fires, because the documents and the code do not agree.

The reload that exists in the shipped code is **triggered, not automatic**. `text_xlate_debug_json` handles `sub == "reload"` by re-running the table loader and reporting the new entry count, and the debug server exposes that as the TCP verb `xlate`. Selecting a different language also reloads. There is a second live verb for the pixel layer, `xlate vpatch`, which force-applies configured VRAM patches against current VRAM without waiting for the game to re-upload the asset, described as being "for config iteration".

Two of psxrecomp's own documents describe the table as "Hot-reloaded on mtime change". No mtime or `last_write_time` check was found in `runtime/src/text_xlate.cpp` when this page was written. The player-visible claim that tables are "hot-reloaded while the game is running" holds in the sense that matters, which is that no rebuild and no regeneration are needed, but you should expect to send the reload rather than to have the file watched. This page will be corrected if a file watcher lands.

The [NES](/docs/platforms/nes) side genuinely does poll. [nesrecomp](https://github.com/mstan/nesrecomp)'s text and tile overrides are re-read from `game_on_frame` by `text_override_reload_if_changed()` and `chr_override_reload_if_changed()`: "Hot reload is supported: save the JSON file and changes appear in-game within ~1 second." [FaxanaduRecomp](https://github.com/mstan/FaxanaduRecomp) says the same of its PNG tiles.

**Checkpoint.** Edit one `en` value, send the reload, and the new text is on screen without the game restarting.

## Step 5. Re-capture to find the gaps

`text_xlate_todo.py` diffs the live inventory against the table and lists untranslated records sorted by draw count, so the lines a player sees most get done first.

**Checkpoint, and the definition of done.** The project's own coverage bar: "'We've found them all' = a full playthrough adds zero new records to the inventory."

For scale, the coverage actually achieved on Tsumu Light was 138 message entries, statically enumerated from the pointer table at `0x80071474` plus the block `0x80070900` to `0x80073700` and cross checked by hashing against the runtime capture ring; 59 `[[glyph_label]]` stage and tutorial slots; and 37 `[[vram_patch]]` strips covering the title menu, pause menu, results screen, mode menu, data slots, high-score headers and prompts.

## What does not work

The project documents its own gaps carefully, and a translator will hit these.

- **Only one of two draw paths is interceptable.** "the title prompt, HUD ... and menu labels are drawn per-glyph as sprites (glyph index, no string pointer) -- **NOT reachable by arg-scanning**." That is exactly what the `[[glyph_label]]` and `[[vram_patch]]` layers exist for.
- **Struct-embedded strings crash if naively replaced.** "Replacing the whole record corrupts the struct and derails the game (observed `PC=0`). **Apply is therefore gated to standalone 0xFFFF-framed messages by default**".
- **The reader has a known blind spot.** "the byte-based reader rejects a record whose first byte isn't 'textish' ... Those few stay Japanese until the reader is made LE-word-aware".
- **Capture is noisy without the gate**, as covered in step 1.
- **A partial fix was deliberately not shipped.** "Per project Rule 5 (pixels or it's not done) and the no-fragile-hacks rule, no partial was shipped."
- **The design document was mislabelled for a long time.** It "was left marked 'SPEC (design only -- no implementation yet)' long after the feature shipped", which is worth knowing if you find an older copy.
- **The launcher language picker was not verified.** The README says the launcher carries one and `[localization].languages` drives it, but the launcher lives in a separate repository that was not surveyed, so treat the picker as documented rather than confirmed.

## Source

- [psxrecomp](https://github.com/mstan/psxrecomp): [`docs/STRING_TRANSLATION.md`](https://github.com/mstan/psxrecomp/blob/master/docs/STRING_TRANSLATION.md) is the design and workflow document; [`runtime/src/text_xlate.cpp`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/text_xlate.cpp) is the implementation; [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md) is the player-facing summary; [`runtime/src/debug_server.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/debug_server.c) carries the `xlate` verb.
- [TsumuLightRecomp](https://github.com/mstan/TsumuLightRecomp): [`translations/tsumu.toml`](https://github.com/mstan/TsumuLightRecomp/blob/master/translations/tsumu.toml) is the only complete shipped table in the fleet.
- [nesrecomp](https://github.com/mstan/nesrecomp): [`MODDING.md`](https://github.com/mstan/nesrecomp/blob/master/MODDING.md) for the polling text and tile override path. [FaxanaduRecomp](https://github.com/mstan/FaxanaduRecomp): [`MODDING.md`](https://github.com/mstan/FaxanaduRecomp/blob/master/MODDING.md) for the manifest-free file-drop version of the same idea.

## Next

- [Write a mod](/docs/guides/write-a-mod), for changes that need a package, a hash-pinned target and a launcher toggle rather than a table.
- [Mod manifest](/docs/reference/mod-manifest), the schema a package uses, which is separate from the table format above.
- [PlayStation](/docs/platforms/playstation), the toolchain this layer belongs to.
- [Port a game](/docs/guides/port-a-game), if the game you want to translate does not have a port yet.
