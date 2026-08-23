---
title: "Code you cannot see ahead of time"
summary: "PS1 games stream code off the disc into RAM while they run, so a build-time pass never sees it: psxrecomp captures those bytes at CD DMA, compiles them out of process, caches the result by address and checksum, and re-checks live memory against that checksum on every dispatch."
section: "concepts"
sectionTitle: "Concepts"
pageType: "concept"
tags: ["Overlays", "PlayStation", "Code discovery"]
repos:
  - "https://github.com/mstan/psxrecomp"
updated: "2026-08-23"
---

A static recompiler translates a game's machine code before the game runs, which means it can only translate code that exists before the game runs. On the PlayStation that is not all of it. A disc holds far more code than 2 MB of RAM can, so games load a chunk, run it, and overwrite it with the next one. Those chunks are called overlays, and no amount of analysis of the executable will find them, because they are not in the executable. [psxrecomp](https://github.com/mstan/psxrecomp) answers this by moving part of the recompiler into the running game: it records an overlay's bytes the moment the disc delivers them, compiles them to native code in a separate process, and keeps the result. The consequence is unusual for a game, and it is the part worth remembering: the more a game has been played, the faster it runs.

## The problem, in the project's own words

From [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md):

> "Games stream code off the disc into RAM at runtime and execute it, then
> overwrite it with the next overlay. That code does not exist in the executable
> at build time, so a pure ahead-of-time recompiler cannot see it."

This is a different failure from the one in [telling code from data](/docs/concepts/code-discovery). There, the bytes are present and the recompiler has to work out which of them are instructions. Here the bytes are absent, and no discovery heuristic can help, because there is nothing to be heuristic about. A cartridge console does not have this problem: the whole program is in the ROM when the recompiler runs.

## Capture, compile, cache

### Capture, at the moment the code arrives

The runtime hooks every CD DMA completion that lands in game-code RAM and stores the bytes as delivered, which [`docs/FEATURES.md`](https://github.com/mstan/psxrecomp/blob/master/docs/FEATURES.md) describes as an unpatched copy, taken before the game can modify them. Timing is the point: capture after the game has relocated or patched itself and you have recorded something the recompiler cannot reason about.

Separately, the interpreter that runs this code before it is native keeps two bitmaps, of which program counters were executed and which were entered through dispatch. Those become the seed list, so a seed is an address execution really reached rather than a guess. The record goes next to the executable as `overlay_captures.json`, a JSON array of `"psxrecomp overlay capture v2"` objects carrying `load_addr`, `size`, `bytes_b64`, `executed_pcs`, `dispatch_entry_pcs`, `function_entry_pcs` and `seeds`.

### Compile, out of process

Compilation is not a just-in-time compiler inside the runtime. [`tools/compile_overlays.py`](https://github.com/mstan/psxrecomp/blob/master/tools/compile_overlays.py) wraps the captured bytes in a synthetic PS-X EXE header, spawns the same `psxrecomp-game` binary that recompiled the main executable, post-processes the emitted C and compiles it to a shared library with either `gcc` or the bundled TinyCC. From [`docs/ARCHITECTURE.md`](https://github.com/mstan/psxrecomp/blob/master/docs/ARCHITECTURE.md):

> "When an overlay needs compiling, the runtime spawns a C compiler on the
> recompiler-emitted C and loads the resulting DLL — it does not JIT in-process."

The same tool runs by hand, which is how a project pre-builds the cache it ships:

```sh
python psxrecomp/tools/compile_overlays.py \
    --captures        <exe-dir>/overlay_captures.json \
    --game-toml       game.toml \
    --recompiler      psxrecomp/recompiler/build/psxrecomp-game.exe \
    --runtime-include psxrecomp/runtime/include \
    --out-dir         <exe-dir>/cache \
    --gcc             C:/msys64/mingw64/bin/gcc.exe \
    --cps
```

`<exe-dir>` is the directory holding the built game. Backends resolve once at startup in the order static, then `gcc`, then TinyCC. An in-process JIT tier did exist and was removed in July 2026.

### Cache, keyed by address and content

Each build lands as two files, `<phys>_<crc>.dll` and `<phys>_<crc>.ranges`, under a deeply namespaced directory:

`<cache-root>/<game-id>/<gcc|tcc>/<os>-<arch>/cg<CODEGEN_VER>_<emitter-hash>_gc<config-hash>_f<flavor>/`

Every component stops two caches mixing that should not: a different game, compiler, host architecture, emitter or configuration. The runtime and the compiler build that path independently and must agree exactly, a deliberate double implementation. It is also where a stale document will mislead you: [`docs/COMPILING_OVERLAYS.md`](https://github.com/mstan/psxrecomp/blob/master/docs/COMPILING_OVERLAYS.md) gives the path one component short, without the config hash and flavour. The two implementations agree with each other; the prose has not caught up.

The `.ranges` file beside each library is the manifest, in two line kinds. From [`tools/compile_overlays.py`](https://github.com/mstan/psxrecomp/blob/master/tools/compile_overlays.py):

> "Manifest v2 line format:
>       F <entry_hex> <code_crc_hex>     one per function
>       R <lo_hex> <len_hex>             one per coalesced code range"

The pair of entry address and code checksum is the identity of a compiled function. The offline CRC32 that writes it is bit-identical to the one the runtime computes, which is what makes the next step possible.

## Validating on every dispatch

Cached native code is safe only while the RAM it was compiled from still holds the same bytes, and that RAM is exactly the RAM the game overwrites with the next overlay. So the loader re-checks, every time. The expensive part is a hash, so a page-generation counter bumped by writes does the work in the common case, and the hash runs only when something in the page has moved.

From [`runtime/src/overlay_loader.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/overlay_loader.c):

```c
    /* A reused address can have several range-owning variants. Select the
     * one whose compiled code bytes match live RAM instead of returning the
     * first range hit and letting one stale variant mask every later match. */
    uint32_t gen = cand_gensum(c);
    if (c->state == ENTRY_VALID && gen == c->val_gen) {
        s_gen_fastpath++;
        return 1;
    }
    if (c->state == ENTRY_INVALID && gen == c->val_gen)
        return 0;                    /* known mismatch, no watched write */
    uint32_t live = cand_crc(c);
    s_rehashes++;
    s_last_crc = live;
    c->val_gen = gen;
    if (live == c->crc_code && cand_delay_slots_hashed(c)) {
        if (c->state != ENTRY_VALID) {
            c->state = ENTRY_VALID;
            s_valid_count++;
        }
        return 1;
    }
    s_rehash_miss++;
```

Read the comment at the top as the design rule. One guest address holds several compiled variants at once, chained as candidates, because the same RAM window has held several overlays over a session. Selecting by content rather than by address means walking back into an area you visited an hour ago re-validates the variant that matches and flips back to native automatically.

A mismatch is not an error. It drops that address to the interpreter, which runs the code correctly and more slowly, and the capture path notices the new bytes. That is the bias the whole tier is built on, and [PlayStation](/docs/platforms/playstation) has the full dispatch order: nothing that might be compiled wrong is ever dispatched, so the failure direction is always speed.

## Two persisted artefacts, and why the difference matters

These are easy to collapse into one thing, and doing so will confuse you the first time a cache misbehaves.

| Artefact | What it is | Where it lives |
|---|---|---|
| `overlay_captures.json` | The discovery record: the raw overlay bytes as the disc delivered them, plus the program counters execution actually reached | Beside the game executable, redirectable with `PSX_OVERLAY_CAPTURE_ROOT` |
| `cache/` | The native code: compiled shared libraries and their `.ranges` manifests, namespaced by game, compiler, architecture, emitter, config and flavour | Under the cache root, rebuilt from the capture record when it is missing |

The capture record is the durable one. The compiled cache is derived, and a change to the emitter, the configuration or the compiler correctly invalidates all of it by changing the path, at which point it is rebuilt from captures rather than from another play session.

## Why a game gets faster the more it is played

Every fresh area a player reaches is an area that gets captured, compiled and cached, and nothing sends it back. From [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md):

> "**Your discoveries persist for you.** They are saved in a file written next to
> the game called `overlay_captures.json`, and your local cache is rebuilt from
> it automatically — areas you have visited stay fast on every later session."

The same property works across players, because the artefacts are files. [`docs/EXECUTION_MODEL.md`](https://github.com/mstan/psxrecomp/blob/master/docs/EXECUTION_MODEL.md) describes a release shipping a `cache/` folder of overlays already compiled from everywhere players have collectively visited, so a first-time player starts warm.

> **Note.** The repository asks players not to redistribute their capture files, because a capture contains verbatim game code. That is the same boundary described in [the game file you supply](/docs/concepts/the-game-file-you-supply) and [provenance](/docs/fleet/provenance).

The direction of travel is stated but not reached. The project's goal is that every executed instruction should have been translated ahead of time, leaving the interpreter idle, and no artefact in the repository shows a title in that state. What the tier buys today is that the gap costs frames rather than correctness.

## What this is, and what it is not

It is not a technique unique to this fleet. N64Recomp ships a runtime recompilation backend of its own, so the difference here is purpose rather than capability: upstream's serves mod support, and psxrecomp's exists because a PS1 disc streams code into RAM that no build-time pass can see. [Lineage and credit](/docs/fleet/lineage-and-credit) is careful about which relationships in this fleet are code and which are conceptual.

It also does not have a name. The repository describes the mechanism in stages and never gives the whole of it a single term, and neither does anything else in the fleet. This page's title is a description rather than a coinage, deliberately: labelling something the projects have not labelled would put a word in a reader's vocabulary that no repository will confirm.

## Source

From [psxrecomp](https://github.com/mstan/psxrecomp). Documents: [`docs/EXECUTION_MODEL.md`](https://github.com/mstan/psxrecomp/blob/master/docs/EXECUTION_MODEL.md), [`docs/FEATURES.md`](https://github.com/mstan/psxrecomp/blob/master/docs/FEATURES.md), [`docs/COMPILING_OVERLAYS.md`](https://github.com/mstan/psxrecomp/blob/master/docs/COMPILING_OVERLAYS.md), [`docs/ARCHITECTURE.md`](https://github.com/mstan/psxrecomp/blob/master/docs/ARCHITECTURE.md) and [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md). Code: [`runtime/src/overlay_capture.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/overlay_capture.c) for the DMA hook and the JSON schema, [`runtime/src/overlay_loader.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/overlay_loader.c) for validation and the cache path, [`runtime/src/overlay_backend.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/overlay_backend.c) for backend resolution, [`runtime/src/dirty_ram_interp.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/dirty_ram_interp.c) for the fallback and the seed bitmaps, and [`tools/compile_overlays.py`](https://github.com/mstan/psxrecomp/blob/master/tools/compile_overlays.py) for the manifest format and the compiler side of the cache path.

## Next

- [PlayStation](/docs/platforms/playstation), for the full dispatch order this tier sits inside.
- [Telling code from data](/docs/concepts/code-discovery), the build-time half of the same question.
- [Configuration](/docs/reference/configuration) for the overlay and cache keys, and the [command line reference](/docs/reference/cli) for every flag on the tool above.
- [High level and low level](/docs/concepts/hle-and-lle) for the other tier in this runtime, and the [glossary](/docs/concepts/glossary) for overlay, shard and capture as this fleet uses them.
