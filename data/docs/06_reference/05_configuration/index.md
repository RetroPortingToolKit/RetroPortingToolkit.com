---
title: "Configuration"
summary: "Every psxrecomp configuration key this site can verify, grouped by the file it belongs to: the BIOS profile, game.toml, the widescreen block, player overrides, environment variables and build options, with types, defaults and the resolution order between them."
section: "reference"
sectionTitle: "Reference"
pageType: "reference"
tags: ["Configuration", "PlayStation", "TOML"]
repos:
  - "https://github.com/mstan/psxrecomp"
updated: "2026-08-23"
---

Configuration for [psxrecomp](https://github.com/mstan/psxrecomp) is almost all TOML, parsed with the vendored `toml11`, and it is split across distinct schemas that are read by different programs at different times. This page lists the keys, grouped by the file they belong to. Each row gives the exact dotted key path, its type, its default and what it does. Other toolchains in the fleet have their own configuration; this page is the PlayStation one. Flags belong to the [command line reference](/docs/reference/cli), and the mod package schema to the [mod manifest reference](/docs/reference/mod-manifest).

## How a setting resolves

At run time, later wins:

`environment > CLI > settings.toml > game.toml > compiled-in default`

Build-time settings do not participate. A BIOS profile is read only by the recompiler front ends, and a `[runtime]` block inside one is rejected outright, because a BIOS profile states facts about an image and never runtime preferences.

| File | Read by | When |
|---|---|---|
| `bios/<STEM>.toml` | `psxrecomp-bios`, `psxrecomp-game` (address model only), `tools/regen_bios.sh` | Build |
| `game.toml` | `psxrecomp-game`, `psx-runtime`, `psxrecomp_cli.py` | Build and run |
| `settings.toml` | `psx-runtime` | Run |
| `bios.cfg` | `psx-runtime` | Run |
| `mods/state.toml` | `psx-runtime` | Run |

## BIOS profile: `bios/<STEM>.toml`

A profile describes one BIOS image: where it loads, where it starts, and every bulk copy the boot code makes out of ROM into RAM. From [`bios/SCPH1001.toml`](https://github.com/mstan/psxrecomp/blob/master/bios/SCPH1001.toml):

```toml title="bios/SCPH1001.toml"
[program]
name         = "Sony SCPH-1001 BIOS"
id           = "SCPH-1001"
rom          = "bios/SCPH1001.BIN"
load_address = "0xBFC00000"
entry_pc     = "0xBFC00000"
text_size    = "0x80000"

# [snip] the [recompiler] block, and [[recompiler.install_slots]]

[recompiler.address_model]
normalize_mask = "0x1FFFFFFF"

[[recompiler.address_model.copy]]
name         = "Kernel Part 2"
rom_lo       = "0x1FC10000"
rom_hi       = "0x1FC18000"
ram_lo       = "0x00000500"
runtime_base = "0x00000500"
dispatch_key = "ram"
kernel_bless = true

[recompiler.runtime_exports]
shell_entry_phys  = "0x00030000"
deliver_event_ret = "0x80001720"
```

### `[program]`

| key | type | default | meaning |
|---|---|---|---|
| `program.name` | string | required | Display name |
| `program.id` | string | required | Canonical id, for example `"SCPH-1001"` |
| `program.rom` | path | required | Flat binary, relative to the project root |
| `program.load_address` | hex string | required | Virtual address of the first byte, `"0xBFC00000"` for a BIOS |
| `program.entry_pc` | hex string | required | First PC to execute |
| `program.text_size` | hex string | required | Static region size |
| `program.image.sha256` | hex string | `""`, unchecked | Pins the exact image; the recompiler refuses a mismatched ROM |
| `program.image.license` | string | absent | Informational |
| `program.image.redistributable` | bool | `false` | `true` means the BIOS ships with the build, and the runtime hides any requirement to supply one |

### `[recompiler]` in a BIOS profile

| key | type | default | meaning |
|---|---|---|---|
| `recompiler.seeds` | path | required | Function-start seed file |
| `recompiler.out_dir` | path | `generated` | Output directory |
| `recompiler.out_stem` | string | derived from the filename | Output stem, giving `<out_stem>_full.c` and `<out_stem>_dispatch.c` |
| `recompiler.strict` | bool | `true` | Strict translation. The schema notes it is currently always true |

### `[recompiler.address_model]`

| key | type | default | meaning |
|---|---|---|---|
| `recompiler.address_model.normalize_mask` | hex string | `"0x1FFFFFFF"` | KSEG mask. The loader rejects any other value |
| `[[recompiler.address_model.copy]].name` | string | required | Comment label emitted into the generated C |
| `[[recompiler.address_model.copy]].rom_lo` | hex string | required | Physical range start |
| `[[recompiler.address_model.copy]].rom_hi` | hex string | required | Physical range end, exclusive |
| `[[recompiler.address_model.copy]].ram_lo` | hex string | required | Physical RAM destination |
| `[[recompiler.address_model.copy]].runtime_base` | hex string | required | Virtual address the CPU executes the copy at |
| `[[recompiler.address_model.copy]].dispatch_key` | `"ram"` or `"rom"` | required | Which side of the copy owns the dispatch key. `ram` folds ROM to RAM, `rom` folds the RAM alias back to ROM |
| `[[recompiler.address_model.copy]].kernel_bless` | bool | `false` | The runtime may byte-verify the window and then run native code for it |

Semantic invariants are enforced at load and a violation refuses to build: copy windows must be disjoint, fold outputs must not intersect fold inputs, and there may be only one blessed window.

### `[[recompiler.install_slots]]`

| key | type | default | meaning |
|---|---|---|---|
| `[[recompiler.install_slots]].ram_addr` | hex string | none | A kernel-RAM PC the BIOS overwrites with a runtime stub. The emitter plants a dirty-check hook there |

### `[recompiler.runtime_exports]`

| key | type | default | meaning |
|---|---|---|---|
| `recompiler.runtime_exports.shell_entry_phys` | hex string | absent, meaning 0 | Boot-skip anchor. 0 means structurally unavailable on this image, not address zero |
| `recompiler.runtime_exports.deliver_event_ret` | hex string | absent, meaning 0 | Kernel-call HLE anchor. 0 means that tier cannot be turned on for this image |

### `[[recompiler.bios_vectors]]` and `[[recompiler.bios_aliases]]`

| key | type | default | meaning |
|---|---|---|---|
| `[[recompiler.bios_vectors]]` | table array | none | A0/B0/C0 table descriptors: `ram_addr`, `index_reg`, `table_rom_addr`, `table_count`, `table_ram_addr` |
| `[[recompiler.bios_aliases]]` | table array | none | Maps `ram_addr` to a `target_key` alias for a runtime trampoline |

## Game config: `game.toml`

One file per title. The scaffold writes a starting point with the optional keys commented out. From [`tools/new_project_layout/templates/game.toml.in`](https://github.com/mstan/psxrecomp/blob/master/tools/new_project_layout/templates/game.toml.in), where `@NAME@` tokens are substituted by the scaffold script:

```toml title="tools/new_project_layout/templates/game.toml.in"
[game]
name = "@GAME_NAME@"
# id = "SLUS-XXXXX"
players = @PLAYERS@
# exe = "disc/@BOOT_EXE@"
# disc = "disc/game.cue"
# load_address = "0x80010000"
# entry_pc = "0x800XXXXX"
# text_size = "0x00000000"
# stack_base = "0x801FFFF0"

[recompiler]
seeds = "seeds/ghidra_funcs.txt"
out_dir = "generated"
strict = true
```

### `[game]`

| key | type | default | meaning |
|---|---|---|---|
| `game.name` | string | required | Display name |
| `game.id` | string | required | Serial, for example `"SCUS-94236"`. Also the first component of the overlay cache path |
| `game.exe` | path | required | The PS-X EXE, relative to the project root |
| `game.disc` | path | single disc | A `.cue` path. Sugar for `discs = [disc]` |
| `game.discs` | array of paths | none | Multi-disc titles |
| `game.load_address` | hex string | typically `"0x80010000"` | Virtual load address |
| `game.entry_pc` | hex string | required | First PC |
| `game.text_size` | hex string | the header value | Bounds main-executable analysis and establishes the overlay floor. A bound smaller than the header's must be verified non-code and 4 KiB aligned |
| `game.stack_base` | hex string | required | Initial `$sp` |

### `[recompiler]` in `game.toml`

| key | type | default | meaning |
|---|---|---|---|
| `recompiler.seeds` | path | required | Seed file. Game seed files are not JSON today |
| `recompiler.out_dir` | path | `generated` | Output directory |
| `recompiler.bios_thunks` | path | none | Game-only thunk list |
| `recompiler.bios_config` | path | the SCPH1001 profile | The BIOS profile whose address model game codegen folds RAM aliases through. This does not choose the player's runtime BIOS |
| `recompiler.discovery` | `"whole-image"` or `"reachable"` | `"whole-image"` | `reachable` starts at the entry point plus evidence-backed seeds and follows direct `jal` targets only. Unresolved indirect targets fail closed to interpretation |
| `[[recompiler.patch]]` | table array | none | `id`, `address`, `expected`, `replacement`, optional `note`. Replaces one exact 32-bit word before discovery. Generation fails if the word is not `expected` |

### `[[data_shards]]`

`[[data_shards]]` is a top-level table array, not nested under `[recompiler]`.

| key | type | default | meaning |
|---|---|---|---|
| `[[data_shards]].funcs` | array of hex strings | none | Functions given a `psx_datashard_enter` memoization hook |

### `[runtime]`

| key | type | default | meaning |
|---|---|---|---|
| `runtime.debug_port` | int | `4370` | TCP debug server port. See the [TCP debug protocol](/docs/reference/tcp-protocol) |
| `runtime.window_title` | string | the target name | SDL window title |
| `runtime.controller` | `"digital"` or `"dualshock"` | `"digital"` | Pad type. `"hybrid"` throws if it appears in a `game.toml`; it is mod-only |
| `runtime.memcard_dir` | path | `"."` | Memory card location |
| `runtime.language` | string | `"en"` | Selects the column in `translations/*.toml`. `"jp"`, `"off"` and `""` disable applying translations. `PSX_LANG` overrides |
| `runtime.bios_hle` | bool | `true` | The high level BIOS tier. `false` is pure LLE. `PSX_BIOS_HLE` overrides. See [high level and low level](/docs/concepts/hle-and-lle) |
| `runtime.bios_hle_keep_intro` | bool | `false` | Keep the real boot intro while kernel-call HLE stays on |
| `runtime.openbios` | bool | `true` | Whether this title may run on the bundled OpenBIOS. `false` requires a retail dump. Not overridable by a player's `settings.toml` |
| `runtime.hle_scheduler` | bool | `true` | High level replacement for guest thread switching. `PSX_HLE_SCHEDULER` wins |
| `runtime.disc_speed` | `"1x"`, `"2x"`, `"4x"`, `"instant"` | `"1x"` | CD-ROM timing divisor. `instant` collapses seek and read delays to one cycle while keeping the correct INT sequence |
| `runtime.instant_max_per_frame` | int | the `cdrom.c` default | Per-frame sector-IRQ budget under `instant` |
| `runtime.idle_skip` | bool | off | Proof-gated fast-forward through idle polling loops |
| `runtime.turbo_audio_sink` | bool | off | Keeps the SPU timeline advancing through accelerated loads, discarding samples |
| `runtime.overlay_backend` | string | automatic | Overlay compile backend. Resolved once at init in the order `PSX_OVERLAY_BACKEND`, then this key, then automatic |
| `[[runtime.warm_cd_routes]]` | table array | none | `arm_lba`, `lbas` (1 to 64), `instant_max_per_frame` (default 32). Up to 16 routes. Any mismatch restores the configured timing |
| `runtime.fast_boot` | bool | `false` | Deprecated. See below |
| `runtime.turbo_loads`, `runtime.offer_turbo_loads` | bool | ignored | Deprecated. See below |

### `[video]`

| key | type | default | meaning |
|---|---|---|---|
| `video.renderer` | `"software"`, `"opengl"`, `"vulkan"` | `"opengl"` | Renderer selection |
| `video.offer_vulkan` | bool | `false` | Launcher visibility for Vulkan only. It does not select it |
| `video.supersampling` | int, 1 to 4 | `1` | Internal-resolution supersampling per axis |
| `video.aspect_ratio` | `"W:H"` within `[4:3, 32:9]` | `"4:3"` | `4:3` is the identity. Anything wider engages widescreen. See [add widescreen](/docs/guides/add-widescreen) |
| `video.perspective_texturing` | bool | `false` | Perspective-correct texture coordinates. Exposed on the launcher's Display row |
| `video.geometry_correction` | bool | `false` | Present in the config loader but not reachable. See the unreachable keys section below |
| `video.auto_skip_fmv` | bool | `false` | Legacy Settings default for skipping FMVs |
| `video.offer_skip_fmv` | bool | `true` | Launcher visibility for the above |

### `[audio]`

| key | type | default | meaning |
|---|---|---|---|
| `audio.buffer_ms` | int, 30 to 500 | `180` | Host playback cushion. A per-game developer choice, and deliberately not read from `settings.toml` |

### `[pgo]`

| key | type | default | meaning |
|---|---|---|---|
| `pgo.enabled` | bool | `false` | Opt in to local profile-guided optimization |
| `pgo.train_secs` | int | `60` when enabled | Training run length. `--train-secs` overrides |
| `pgo.train_runs` | int | `2` when enabled | Number of training runs. `--train-runs` overrides |
| `pgo.mute_host_audio` | bool | `true` when enabled | Mute host speakers during training |
| `pgo.hide_video` | bool | `true` when enabled | Train headless, with no on-screen video |

### `[netplay]`

| key | type | default | meaning |
|---|---|---|---|
| `netplay.require_cue` | bool | `false` | Reject a bare `.bin` mount |
| `netplay.required_tracks` | int | `0` | Exact `iso_track_count` when greater than 0 |
| `netplay.required_leadout_lba` | int | unset | Exact lead-out LBA |
| `netplay.required_disc_fp` | hex string | `""` | Exact lowercase SHA-256 TOC fingerprint |

### `[audit]`

| key | type | default | meaning |
|---|---|---|---|
| `[audit]` | table | none | Audit regions and address normalisation for `tools/audit_config.py` |

A `[prepare_disc]` section also exists and drives disc preparation, whose digest verification `psxrecomp_cli.py generate --skip-hash-check` skips. Its individual keys are not covered here.

## Widescreen: the `[widescreen]` block

Every key is optional and the block is inert if absent. It is read by `psxrecomp-game`, so changing a key that affects emitted code needs a regeneration. From [`WIDESCREEN.md`](https://github.com/mstan/psxrecomp/blob/master/WIDESCREEN.md):

```toml title="WIDESCREEN.md"
[video]
aspect_ratio = "16:9"   # "4:3" (default/identity) | "16:9" | "21:9" | any "W:H"
                        # in [4:3, 32:9]. Wider than 4:3 engages the hack.

[widescreen]            # all optional; inert if absent
sprite_tag_funcs   = ["0x8005E08C"]   # guest addrs of the per-prim helper(s)
sprite_anchor_addr = "0x1F800070"      # scratchpad holding the prim's
hud_sprt_squash    = true              # center/edge-squash untagged SPRTs
auto_ui_squash     = true              # pre-scan the current GPU linked list,
clear_reveal       = true              # clear synthetic native-wide side margins
offer_ultrawide    = true              # separate experimental 21:9 launcher row.
adaptive_view      = true              # expose live resize-driven aspect mode.

[[widescreen.cull.keep]]
address  = "0x8002B310"
expected = "0x28A21C01"                # SLT/SLTU/SLTI/SLTIU only
result   = 1                           # forced comparison result, 0 or 1
```

| key | type | default | meaning |
|---|---|---|---|
| `widescreen.sprite_tag_funcs` | array of hex strings | empty | Per-primitive helper functions. The recompiler emits `psx_ws_sprite_tag(cpu)` at their entry. Changing this requires a game regeneration |
| `widescreen.sprite_anchor_addr` | hex string | none | Scratchpad address holding the primitive's GTE-projected anchor SXY at tag time |
| `widescreen.hud_sprt_squash` | bool | `false` | Centre or edge squash for untagged screen-space SPRTs |
| `widescreen.auto_ui_squash` | bool | `false` | Runtime only. Groups eligible axis-aligned UI quads and shares one anchor. No regeneration needed |
| `widescreen.clear_reveal` | bool | `false` | Clear synthetic native-wide side margins at opted-in boundaries |
| `widescreen.nw_left_hud_packet_lo`, `_hi` | hex string | none | Half-open targeted left-HUD packet range |
| `widescreen.offer_ultrawide` | bool | `false` | Show the experimental 21:9 launcher row |
| `widescreen.adaptive_view` | bool | `false` | Live resize-driven aspect, clamped to 4:3 on the narrow side and to the widest offered mode |
| `widescreen.cull.guard_pixels` | int, 0 to 256 | `0` | Shared render and terrain participation guard |
| `widescreen.cull.activation_guard_pixels` | int, 0 to 256 | `0` | Added only at `bias_sites` and `range_sites`, and only while widescreen reveals extra world. Exactly zero at true 4:3 |
| `widescreen.cull.bias_sites` | array of hex strings | empty | `addi` and `addiu` sites widened by `psx_ws_x_margin()` |
| `widescreen.cull.range_sites` | array of hex strings | empty | `sltiu` sites widened by `psx_ws_x_margin()` |
| `widescreen.cull.auto_screen_x` | bool | `false` | Auto-detect the GTE render-funnel screen-extent reject and widen every width compare |
| `[[widescreen.cull.keep]]` | table array | empty | `address`, `expected` (must encode SLT, SLTU, SLTI or SLTIU), `result` (0 or 1). Forced only while `psx_ws_x_margin() > 0`; at true 4:3 the original comparison runs |
| `[[widescreen.cull.angle]]` | table array | empty | `address`, `expected` (must be `ADDI`/`ADDIU rt,zero,imm`, a positive 12-bit half-extent below a quarter turn). Widens `tan(angle)` by the live per-side horizontal extent. Exact at 4:3 |
| `[widescreen.cull.aspect_cone]` | table | none | Horizontal-only frustum envelope: `forward_addr`, `object_type_offset`, `object_reg`, `x_reg`, `z_reg`, `y_reg`, `hysteresis_pixels`, `queue_reserve`, `queue_count_addrs`, `queue_capacities`, `queue_type_masks`, plus `[[...sites]]` entries with `address`, `expected`, optional `cosine_threshold`, register overrides and `queue_guard` |
| `backdrop.x_sites`, `backdrop.unsquash_funcs` | array of hex strings | empty | 2D parallax backdrop screen-X squash sites, and the depth-gated GTE un-squash driver |

Every one of these defaults to inert, which is what makes `aspect_ratio = "4:3"` an output identity: the squash factor reduces to 1 and is short-circuited, and `psx_ws_x_margin()` returns exactly 0, so the widened comparisons produce the original results. [PlayStation](/docs/platforms/playstation) states that claim precisely.

## Choosing a BIOS

BIOS selection is spread over several keys and one file, so it is collected here.

| Setting | Where | Effect |
|---|---|---|
| `program.image.redistributable` | BIOS profile | Whether the image ships with the build |
| `PSXRECOMP_BIOS_STEMS` | CMake, default `OpenBIOS;SCPH1001` | Which recompiled BIOS backends a build links |
| `recompiler.bios_config` | `game.toml` | The address model game codegen folds RAM aliases through. Not the player's runtime BIOS |
| `runtime.openbios` | `game.toml` | Whether this title may run on bundled OpenBIOS. Not player-overridable |
| `--bios <path>` | `psx-runtime` | Select an image for one launch |
| `bios.cfg` | beside the executable | Remembers a retail BIOS choice. Clearing it or deleting the file returns to OpenBIOS |
| `recompiler.runtime_exports.*` | BIOS profile | Per-image anchors. An absent anchor means the dependent feature is structurally unavailable on that image |

Four profiles exist in the tree and they live in two places: `bios/OpenBIOS.toml` and `bios/SCPH1001.toml`, plus repo-root `SCPH1001.toml`, `SCPH101.toml` and `SCPH5552.toml`. The two SCPH1001 profiles differ in their `rom` path. `SCPH101.toml` and `SCPH5552.toml` describe the PSOne and European images and both record that boot and kernel are byte-identical to SCPH1001 while the shell differs and runs through the dirty-RAM interpreter.

Two things to know before relying on a non-default image. Savestates are BIOS specific and refuse to load across images, because kernel RAM layout differs; memory cards are unaffected. And [`docs/BIOS_SELECTION.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BIOS_SELECTION.md) says a build compiles in exactly one retail image, currently SCPH-1001, alongside OpenBIOS, while the CLI's own help advertises OpenBIOS, SCPH1001, SCPH101 and SCPH5552. Whether a build with a non-SCPH1001 retail stem is a supported configuration is not stated anywhere in the repository.

> **Note.** `SCPH5552.toml` sets `seeds = "seeds/phase2_ghidra_seeds_SCPH5552.json"` while the sibling `SCPH101.toml` uses a `recompiler/seeds/...` path for the same kind of file. This site did not verify whether some caller changes directory first, so treat that profile's seed path as unconfirmed.

## Player overrides: `settings.toml` and `bios.cfg`

`settings.toml` holds the player's own overrides and sits between `game.toml` and the CLI in precedence. The launcher persists the aspect selection and `[video] adaptive_view` there. Two keys are deliberately outside a player's reach: `runtime.openbios`, which is a compatibility statement by the title, and `audio.buffer_ms`, which is a per-game developer choice. `bios.cfg` beside the executable remembers a retail BIOS choice, and deleting it returns to OpenBIOS. Mod package state lives separately again, in `mods/state.toml`, format 2.

## Environment variables

Every variable here wins over the file it corresponds to.

| variable | values | affects |
|---|---|---|
| `PSX_BIOS_HLE` | `0` or `1` | `runtime.bios_hle` |
| `PSX_BIOS_HLE_KEEP_INTRO` | `0` or `1` | `runtime.bios_hle_keep_intro` |
| `PSX_HLE_SCHEDULER` | `0` or `1` | `runtime.hle_scheduler` |
| `PSX_LANG` | language code | `runtime.language` |
| `PSX_CPS` | `0` selects legacy nested emission | The recompiler's call convention. Must match between the runtime build and compiled overlays |
| `PSX_OVERLAY_BACKEND` | `gcc`, `tcc`, `auto`, `auto-no-gcc` | `runtime.overlay_backend` |
| `PSX_OVERLAY_CACHE_DIR` | path | The overlay cache root. Injected by the runtime into the compile child |
| `PSX_OVERLAY_CAPTURES` | path | The capture file the overlay compiler reads |
| `PSX_OVERLAY_CAPTURE_ROOT` | path | Where the runtime writes captures, instead of beside the executable |
| `PSX_NETPLAY` | `1` | Equivalent to `--netplay` |
| `PSX_WTRACE_BOOT` | `lo,hi[;lo,hi...]` | Retains the first writes to those half-open RAM ranges from guest instruction zero. Debug-tools builds only |
| `PSXRECOMP_BIOS_BUILD` | path | Recompiler build directory used by `tools/regen_bios.sh`, resolved relative to the framework root |
| `PSXRECOMP_BIOS_ROM`, `PSXRECOMP_BIOS_SEEDS`, `PSXRECOMP_BIOS_OUT`, `PSXRECOMP_BIOS_STEM` | paths and a string | Per-run overrides for `tools/regen_bios.sh` |
| `PSXRECOMP_NO_FORWARD` | set | Local codegen SDK forwarding |
| `RETCOMM_TOOLCHAIN_DIR`, `RETCOMM_TOOLCHAIN_MIN_VERSION` | path, version | Shared toolchain cache location and minimum version |
| `PSXRECOMP_SETUP_YES` | set | Answers the project scaffold's prompts |

## Build options

CMake options, set with `-D<name>=<value>`.

| option | default | effect |
|---|---|---|
| `PSX_DEBUG_TOOLS` | ON for Debug and RelWithDebInfo | Builds the debug tooling, including the TCP server |
| `PSX_SDL_BACKEND` | `SDL3` | `SDL2` is the fallback |
| `PSX_SDL3_FETCH` | ON | Fetch SDL3 rather than requiring a system copy |
| `PSX_STATIC_RUNTIME` | ON for MinGW Release | Static runtime linking |
| `PSX_RECOMP_UI` | ON | Build the shared launcher interface |
| `PSX_ENABLE_VULKAN` | ON | Compiles the Vulkan backend. Selecting it at run time also needs `video.offer_vulkan` and a user choice |
| `PSX_NETPLAY` | OFF | Netplay, via the `lib/recomp-net` submodule |
| `PSX_SETUP_WIZARD` | OFF | The setup wizard |
| `PSXRECOMP_FORCE_SETUP_HOST` | not set | Force a setup-host build, linked without game or BIOS generated C |
| `PSXRECOMP_BIOS_STEMS` | `OpenBIOS;SCPH1001` | Which BIOS backends the build links |

## Deprecated, ignored and unreachable keys

| key | state |
|---|---|
| `runtime.fast_boot` | Deprecated alias. It is boot-skip only and never enables kernel-call HLE. Use `runtime.bios_hle` |
| `runtime.turbo_loads`, `runtime.offer_turbo_loads` | Parsed so old configs still load, then ignored. The runtime logs a deprecation line and leaves acceleration off |
| `video.geometry_correction` | Present in the config loader with a default of `false`, and not reachable. [`ENHANCEMENTS.md`](https://github.com/mstan/psxrecomp/blob/master/ENHANCEMENTS.md) concludes it must not be offered and records the launcher control as withdrawn, with a standing constraint against adding one to any settings surface; the config loader source says the same. The README still lists it among opt-in enhancements and was not updated |

## Source

From [psxrecomp](https://github.com/mstan/psxrecomp): [`docs/config_schema.md`](https://github.com/mstan/psxrecomp/blob/master/docs/config_schema.md) is the schema document behind most of the tables above, and [`recompiler/src/config_loader.h`](https://github.com/mstan/psxrecomp/blob/master/recompiler/src/config_loader.h) and [`recompiler/src/config_loader.cpp`](https://github.com/mstan/psxrecomp/blob/master/recompiler/src/config_loader.cpp) are the parser and the defaults. Examples come from [`bios/SCPH1001.toml`](https://github.com/mstan/psxrecomp/blob/master/bios/SCPH1001.toml), [`bios/OpenBIOS.toml`](https://github.com/mstan/psxrecomp/blob/master/bios/OpenBIOS.toml) and [`tools/new_project_layout/templates/game.toml.in`](https://github.com/mstan/psxrecomp/blob/master/tools/new_project_layout/templates/game.toml.in). The widescreen block is documented in [`WIDESCREEN.md`](https://github.com/mstan/psxrecomp/blob/master/WIDESCREEN.md) and parsed in [`recompiler/src/main_psx.cpp`](https://github.com/mstan/psxrecomp/blob/master/recompiler/src/main_psx.cpp). BIOS selection comes from [`docs/BIOS_SELECTION.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BIOS_SELECTION.md), build options from [`docs/BUILDING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BUILDING.md), the PGO keys from [`docs/LOCAL_CODEGEN_SDK.md`](https://github.com/mstan/psxrecomp/blob/master/docs/LOCAL_CODEGEN_SDK.md), and the unreachable-key disposition from [`ENHANCEMENTS.md`](https://github.com/mstan/psxrecomp/blob/master/ENHANCEMENTS.md).

## Next

- [Command line reference](/docs/reference/cli), for the flags that override these keys.
- [PlayStation](/docs/platforms/playstation), for what the tiers, renderers and BIOS backends these keys select actually do.
- [Mod manifest schema](/docs/reference/mod-manifest) for `manifest.toml` inside a `.psxmod`, and [code you cannot see ahead of time](/docs/concepts/code-you-cannot-see-ahead-of-time) for the overlay cache the backend keys feed.
- [Port a game](/docs/guides/port-a-game) to see a `game.toml` written from scratch, with terms defined in the [glossary](/docs/concepts/glossary).
