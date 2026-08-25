---
title: "recomp-net API"
summary: "The public C surface of recomp-net: the four-pointer host vtable a port fills in, the session config every peer must agree on, the admission loop, the three transports, the rollback layer, and the wire format."
pageType: "reference"
tags: ["Netplay", "Rollback", "API", "Schema"]
repos:
  - "https://github.com/TechnicallyComputers/recomp-net"
  - "https://github.com/TechnicallyComputers/retcomm-rbengine"
  - "https://github.com/TechnicallyComputers/recomp-net-server"
updated: "2026-08-25"
---

[recomp-net](https://github.com/TechnicallyComputers/recomp-net) is the netcode library the console toolchains in this fleet share instead of each writing their own. It is portable delay-sync netcode for recompilation and modern-runtime hosts, it reports version `0.1.0`, and it is MIT licensed.

Delay-sync means your own input is not used at once. It is scheduled a fixed number of ticks ahead, which gives the other player's input time to arrive. A port fills in one struct of four function pointers, two of them required. Rollback adds a second vtable of six.

The library never looks inside a pad. All it knows about an input is a tick, a size and an opaque block of bytes.

## The public headers

Everything below is declared in `include/recomp_net/`. A host includes the umbrella header and links the static target `recomp_net` (alias `recomp_net::recomp_net`).

| Header | Covers |
|---|---|
| `recomp_net.h` | Version string and `rnet_checksum`, the umbrella include |
| `types.h` | `rnet_u8` to `rnet_u64` and `rnet_s8` to `rnet_s64` over `<stdint.h>` |
| `config.h` | `RNetConfig` and the compile-time limits |
| `input.h` | `RNetInputSample` and the sim to wire tick helpers |
| `session.h` | `RNetHostVTable`, the session lifecycle, liveness, delay, state transfer, rollback wire helpers |
| `ice.h` | `RNetIceConfig`, `RNetIceState`, `RNetSignal` |
| `rollback.h` | `RNetRbConfig`, `RNetRollbackVTable`, the episode FSM |
| `input_contract.h` | The pure rewind-or-promote decision core and its parameters |
| `address.h` | Local IPv4 enumeration, STUN external address discovery, UDP port probing |
| `lan_lobby.h`, `lan_direct.h`, `lan_beacon.h` | Same-machine room file registry, cross-machine UDP seat claim over `RNETDJ1`, and LAN broadcast discovery over `RNETBC1` on default port 48777 |
| `rtt_probe.h`, `ice_rtt.h` | UDP PING/PONG latency probe on the `RNETDJ1` wire, and its ICE equivalent |
| `ice_xfer.h` | Reliable blob transfer over its own ICE agent |

Three compile-time constants bound everything: `RNET_MAX_SLOTS` is 8, `RNET_INPUT_MAX` is 32 bytes per pad sample, and `RNET_HISTORY_LENGTH` is 128 ring rows.

## What a port implements: `RNetHostVTable`

Four function pointers. `sample_local` and `publish` are required. `now_ms` is optional and falls back to platform monotonic milliseconds. `on_signal` is optional and may be NULL for a LAN-only host.

From [`include/recomp_net/session.h`](https://github.com/TechnicallyComputers/recomp-net/blob/main/include/recomp_net/session.h):

```c title="include/recomp_net/session.h"
typedef struct RNetHostVTable
{
    /* Fill local pad sample for the given sim tick (called during try_admit). */
    void (*sample_local)(rnet_u32 tick, RNetInputSample *out, void *ctx);
    /* Publish resolved inputs for all slots after admission succeeds. */
    void (*publish)(rnet_u32 tick, const RNetInputSample *by_slot, int slots, void *ctx);
    /* Optional wall/monotonic clock; NULL uses platform monotonic ms. */
    rnet_u64 (*now_ms)(void *ctx);
    /* Emit ICE signaling toward the host lobby (may be NULL for LAN-only). */
    void (*on_signal)(const RNetSignal *msg, void *ctx);
    void *ctx;
} RNetHostVTable;
```

The pad data crossing that boundary is opaque on purpose: "Host-defined pad layout lives in `bytes`. The library never interprets the payload, only tick ownership and presence matter for delay-sync admission." Nothing about the emulated machine reaches the library.

`RNetInputSample` is `tick:u32`, `size:u16`, `bytes[RNET_INPUT_MAX]`, `valid:u8`.

### What that looks like in a shipping engine

One engine layer implements the two required callbacks once, for every title on its platform. This is [snesrecomp](https://github.com/mstan/snesrecomp)'s. Its pad data is two bytes of buttons plus two game-defined sync bytes, and slot 0 owns those sync bytes.

From [`runner/src/netplay/snes_netplay.c`](https://github.com/mstan/snesrecomp/blob/main/runner/src/netplay/snes_netplay.c):

```c title="runner/src/netplay/snes_netplay.c"
static void host_sample_local(rnet_u32 tick, RNetInputSample *out, void *ctx)
{
    NetplayState *st = (NetplayState *)ctx;
    uint16_t buttons = st->staged_valid ? st->staged_buttons : 0;
    encode_pad(buttons, out, tick);
}

static void host_publish(rnet_u32 tick, const RNetInputSample *by_slot, int slots, void *ctx)
{
    NetplayState *st = (NetplayState *)ctx;
    int i;
    (void)tick;
    st->published[0] = 0;
    st->published[1] = 0;
    st->host_sync_valid = 0;
    if (!by_slot || slots <= 0) return;
    for (i = 0; i < slots && i < 2; ++i)
        st->published[i] = decode_pad(&by_slot[i]) & 0x0FFFu;
    /* Slot 0 carries the authoritative game-defined sync bytes. */
    if (by_slot[0].valid && by_slot[0].size >= 4) {
        st->host_sync[0] = by_slot[0].bytes[2];
        st->host_sync[1] = by_slot[0].bytes[3];
        st->host_sync_valid = 1;
    }
}
```

A game repository on top of that engine writes much less: a hooks struct with a pad capture function and two timeouts, plus one line of CMake. [`MetalWarriorsSNESRecomp`](https://github.com/TechnicallyComputers/MetalWarriorsSNESRecomp) turns the whole stack on with `snesrecomp_enable_recomp_net(MetalWarriorsSNESRecomp)`. The library README sets out that split. The library owns session, ICE, TURN fallback, bundle size and protocol. The engine layer owns barrier admit, starvation latch, catch-up budget and soft exit. The title owns identity, the pad sample hook and the connect-timeout dialog.

## Session configuration: `RNetConfig`

`rnet_session_create` reads `RNetConfig`. `rnet_config_init_defaults` fills every field, so a host that takes the defaults has to set nothing. What matters is that the peers agree. Five of these fields must be identical on every peer, `local_slot` is the one that differs, and the documented rule says nothing either way about `occupied_mask`.

| Field | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `slot_count` | `rnet_u8` | No | 2 | "Number of player slots in the session (2..RNET_MAX_SLOTS)." Must match on every peer. |
| `local_slot` | `rnet_u8` | No | 0 | "Local player slot index (0..slot_count-1)." This is the one field that differs per peer. Slot 0 is the sim authority. |
| `input_delay` | `rnet_u8` | No | 2 | "Fixed input delay D in sim ticks (wire_tick = sim_tick + D)." Must match on every peer. |
| `bundle_redundancy` | `rnet_u8` | No | 3 | "How many prior INPUT frames to retransmit per packet." Must match on every peer. |
| `session_id` | `rnet_u32` | No | 1 | "Opaque session id negotiated out-of-band (must match peers)." |
| `protocol_magic` | `rnet_u32` | No | `0x524E4554` | "Host-defined protocol magic (default 0x524E4554 "RNET")." Must match on every peer. |
| `occupied_mask` | `rnet_u32` | No | 0 | Bit `i` set means lobby seat `i` holds a real peer. 0 means every seat in `[0, slot_count)` is occupied. |

The rule is stated once, in [`docs/host_integration.md`](https://github.com/TechnicallyComputers/recomp-net/blob/main/docs/host_integration.md):

> `RNetConfig` fields (`slot_count`, `local_slot`, `input_delay`, `bundle_redundancy`, `session_id`, `protocol_magic`) must match across peers except `local_slot`. Negotiate them out-of-band (lobby) before `create`.

That sentence names six fields and never mentions `occupied_mask`. The header says what the mask is for instead of giving a matching rule. A room with gaps in it, say seats 0 and 2 in a four-seat lobby, "must clear empty bits so READY/admit do not wait forever on a phantom remote". Empty seats are filled with neutral samples that every peer generates identically.

`rnet_session_request_delay_change` can change `D` during a session. It sends a `DELAY_SYNC` packet, and the new value "is clamped to 2..20".

## The session lifecycle

Create, start exactly one transport, then loop. `rnet_session_pump` moves the network, `rnet_session_try_admit` decides whether this tick may run, the host runs exactly one authoritative sim step, and `rnet_session_advance` closes the tick.

| Function | Returns | What it does |
|---|---|---|
| `rnet_session_create(const RNetConfig*, const RNetHostVTable*)` | `RNetSession*` | Build a session |
| `rnet_session_destroy(RNetSession*)` | void | Free it |
| `rnet_session_start_lan(s, bind_hostport, peer_hostport)` | int | Raw UDP peer session; a NULL or empty peer learns the first inbound client |
| `rnet_session_start_lan_hub(s, bind_hostport)` | int | Host acts as a relay star for `slot_count >= 3` without the server SFU |
| `rnet_session_start_ice(s, const RNetIceConfig*)` | int | ICE session; requires the `RNET_ENABLE_ICE` build |
| `rnet_session_pump(s)` | void | "Recv datagrams, poll ICE, send pending INPUT, drive bootstrap." |
| `rnet_session_wait_recv(s, timeout_ms)` | int | Park until readable; 1 readable, 0 timeout |
| `rnet_session_try_admit(s, sim_tick)` | int | 1 when every remote row is present, the confirm hashes agree, and `publish` ran |
| `rnet_session_advance(s)` | void | "Call after the host completes one authoritative sim step." |
| `rnet_session_sim_tick(s)` | `rnet_u32` | The session clock |
| `rnet_session_is_running(s)` | int | Phase is `RUNNING` |
| `rnet_session_get_stats(s, RNetSessionStats*)` | void | Fill the stats struct |

`rnet_session_local_slot` and `rnet_session_committed_delay` report this peer's seat and the delay currently in force. The session has four phases, `IDLE`, `LINKING`, `READY` and `RUNNING`. Slot 0 is the sim authority: "Slot **0** is the sim authority: it sends `START` once every slot has signaled ready."

### The loop, verbatim

This is the whole host loop from the shipped two-peer example. A working LAN session needs nothing else.

From [`examples/lan_delay_2p/main.c`](https://github.com/TechnicallyComputers/recomp-net/blob/main/examples/lan_delay_2p/main.c):

```c title="examples/lan_delay_2p/main.c"
    while (ctx.published_count < (int)target_ticks && wait_iters < 60000U)
    {
        rnet_session_pump(session);
        if (rnet_session_is_running(session))
        {
            rnet_u32 sim = rnet_session_sim_tick(session);
            if (rnet_session_try_admit(session, sim))
            {
                rnet_session_advance(session);
            }
        }
        sleep_ms(1);
        wait_iters++;
    }

    printf("done: published=%d final_sim=%u running=%d\n", ctx.published_count,
           rnet_session_sim_tick(session), rnet_session_is_running(session));
    rnet_session_destroy(session);
    return (ctx.published_count > 0) ? 0 : 2;
```

### What try_admit does

For sim tick `T` with committed delay `D`, in order:

1. If the local ring has no row for wire `T+D`, call `sample_local` and store the result.
2. Send the input bundle, resending `bundle_redundancy` earlier rows.
3. Refresh the confirm window.
4. Require a remote ring row at wire `T` for every occupied slot.
5. Hash the resolved per-slot samples and compare them against the peer's `INPUT_CONFIRM`.

If the hashes agree, `publish` runs and the call returns 1. On any miss it records a stall reason and returns 0.

Five rules the integration document calls mandatory:

1. "only one authoritative sim tick may advance after a successful `try_admit`. Do not sample pads for tick `T+1` until `advance` has run."
2. "Prefer a single thread that owns both `pump` and sim advance, or protect the session with an external mutex (API is not internally locked)."
3. "use `publish` as the sole source of pads for locked ticks."
4. "On host shutdown call `rnet_session_send_bye` before destroy".
5. Bind listeners to `0.0.0.0:port` and advertise a concrete address obtained from `rnet_ipv4_enumerate`.

### Stall reasons

`rnet_session_try_admit` returning 0 sets one of these, and `rnet_admit_stall_name` turns it into a string.

| Value | Meaning |
|---|---|
| `RNET_ADMIT_OK` | No stall |
| `RNET_ADMIT_NOT_RUNNING` | Session phase is not `RUNNING` |
| `RNET_ADMIT_STATE_XFER` | A chunked state transfer is in progress |
| `RNET_ADMIT_SIM_MISMATCH` | Sim tick disagreement |
| `RNET_ADMIT_DESYNC` | A latched `INPUT_CONFIRM` hash disagreement |
| `RNET_ADMIT_WAIT_LOCAL_INPUT` | Local row missing |
| `RNET_ADMIT_WAIT_REMOTE_INPUT` | A remote row is missing |
| `RNET_ADMIT_WAIT_CONFIRM` | Confirm window not satisfied |

`RNET_ADMIT_DESYNC` lasts for the rest of the session. Call `rnet_session_input_desync` for the tick and the two hashes, then leave the session cleanly. The documented reading is that the cause is a determinism bug in the host, not in the library. See [Determinism](/docs/concepts/determinism).

## Liveness, delay and state transfer

| Function | Returns | What it does |
|---|---|---|
| `rnet_session_input_desync(s, *tick, *local_hash, *remote_hash)` | int | 1 if a confirm hash disagreement was flagged |
| `rnet_session_send_bye(s)` | int | Best effort BYE so the peer drops immediately |
| `rnet_session_peer_disconnected(s, timeout_ms)` | int | BYE or silence; pass about 1500 for snappy, 0 for BYE only |
| `rnet_session_push_signal(s, const RNetSignal*)` | void | Deliver an inbound lobby signal |
| `rnet_session_request_delay_change(s, new_delay)` | int | Schedule a mid-session change, clamped 2..20 |
| `rnet_session_state_begin(s, op, slot, data, size)` | int | Host-only chunked transfer; stalls admission |
| `rnet_session_state_take_ready(s, *op, *slot, **data, *size)` | int | 1 when a blob is ready to apply or store |
| `rnet_session_hard_resync(s)` | void | Clear both rings and the confirm state, set `sim_tick` to 0 |
| `rnet_session_prime_delay_inputs(s, bytes, size)` | void | Seed the local delay tip after a hard resync |

State transfer ops are `RNET_STATE_OP_SAVE 0`, `LOAD 1`, `SRAM 2`, `RB_KF 3`, `BOOT 4`. A host announces a blob with `rnet_session_state_probe` and its reply pair, suppresses INPUT emits during a LOAD apply with `rnet_session_set_input_send_suppress`, and stamps peer liveness without clearing `peer_gone` using `rnet_session_touch_peer_liveness`.

## Transports

Three ways to start a session. The library ships no lobby of its own: "This library has no lobby binary." Signalling for the ICE path normally comes from [`recomp-net-server`](https://github.com/TechnicallyComputers/recomp-net-server). The shipped `ice_manual_signaling` example does the same exchange through two files instead.

| Start call | Topology | Notes |
|---|---|---|
| `rnet_session_start_lan` | Two peers, direct UDP | An empty peer string accepts the first inbound peer |
| `rnet_session_start_lan_hub` | LAN star, three or more seats | The lobby owner fans out to the other guests |
| `rnet_session_start_ice` | ICE, with signals delivered through `on_signal` and `rnet_session_push_signal` | Requires `-DRNET_ENABLE_ICE=ON`, which pulls libjuice v1.7.2 |

Online lobbies always use the server's UDP SFU: "Online WebSocket lobbies always dial the lobby server's UDP SFU on `start`. Every peer sends to one advertise endpoint; the server fans out opaque datagrams (magic + `session_id`) to every other registered seat. There is no guest to guest mesh." The relay reads exactly one byte of a packet body, only to learn which seat sent it, and never decodes a pad.

### `RNetIceConfig`

`RNetIceConfig` is read by `rnet_session_start_ice`, `rnet_ice_rtt_open` and `rnet_ice_xfer_open`; `rnet_ice_config_init_defaults` fills it.

| Field | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `stun_host` | `const char *` | No | `"stun.l.google.com"` | STUN server |
| `stun_port` | `rnet_u16` | No | 19302 | STUN port |
| `turn_host` / `turn_user` / `turn_pass` | `const char *` | No | NULL | TURN server and credentials |
| `turn_port` | `rnet_u16` | No | 0 | TURN port |
| `bind_address` | `const char *` | No | NULL | "Optional bind address (NULL = any)." |
| `bind_port` | `rnet_u16` | No | 0 | Local bind port |
| `controlling` | `rnet_u8` | No | 1 | "Non-zero = offerer: gather immediately. Zero = answerer: wait for remote SDP." |
| `force_relay` | `rnet_u8` | No | 0 | "Non-zero = only use typ relay candidates (requires TURN in this config)." |

### ICE relay fallback variables

Four environment variables tune the automatic relay fallback. They are the only environment variables recomp-net reads.

| Variable | Type | Default | Meaning |
|---|---|---|---|
| `RNET_ICE_NO_RELAY_FALLBACK` | any value other than empty or `0` | unset | Disable the automatic relay retry entirely |
| `RNET_ICE_RELAY_FALLBACK_MS` | int, clamped 2000..60000 | 5000 | General stall before a relay-only retry |
| `RNET_ICE_RELAY_PRIVATE_MS` | int, clamped 1000..30000 | 2500 | Early retry when remotes stay RFC1918 only |
| `RNET_ICE_RELAY_DEAD_MS` | int, clamped 2000..30000 | 6000 | Completed non-relay path carrying no session packets |

## The rollback layer

One thing before you read this section. [`docs/rollback.md`](https://github.com/TechnicallyComputers/recomp-net/blob/main/docs/rollback.md) marks all three of its layers "Landed", and on `main` the rollback headers, sources, wire opcodes and tests are all there. The README's Modes section still says rollback lives on a `feat/rollback` branch. That section is out of date.

`RNetRbSession` "owns the episode FSM (`Live → SealInputs → AwaitingBaseline → Replay → Verify → Commit|Abort`), the correction tuple, the sealed input table, and the resolved-through (shared frontier) watermark. The host owns snapshots, the deterministic sim step, state digests, and the wire transport."

### `RNetRbConfig`

`RNetRbConfig` is read by `rnet_rb_create`.

| Field | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `local_slot` | `uint32_t` | Yes | none | This host's player slot |
| `delay` | `uint32_t` | Yes | none | Committed input delay D |
| `seal_max_span` | `uint32_t` | No | 0 means the default | Must be at or under `RNET_RB_SEAL_MAX_SPAN` (128) |
| `slot_count` | `uint32_t` | No | 0 means 2 | Active seats, 1 to `RNET_RB_MAX_SLOTS` (8) |
| `tip_runway` | `uint32_t` | No | 0 finalizes immediately | TipHold quiet window; `RNET_RB_TIP_RUNWAY_DEFAULT` is 12 and is recommended for digital hosts |
| `tip_seal_slack` | `uint32_t` | No | becomes 2 when `tip_runway > 0` | Set `UINT32_MAX` to force zero slack |
| `light_tip_max_depth` | `uint32_t` | No | 0 becomes 16 | "Clamped like tip_runway (max 32)." |

### `RNetRollbackVTable`

Six callbacks plus one optional set of gates. The comments in the header are the specification.

From [`include/recomp_net/rollback.h`](https://github.com/TechnicallyComputers/recomp-net/blob/main/include/recomp_net/rollback.h):

```c title="include/recomp_net/rollback.h"
typedef struct RNetRollbackVTable
{
    void *ctx;
    /* Persist a snapshot at sim tick (library requests the deepest needed). */
    int (*save_state)(void *ctx, uint32_t tick);
    /* Restore the snapshot captured at sim tick before replay. */
    int (*load_state)(void *ctx, uint32_t tick);
    /* Advance exactly one deterministic sim tick using resolved inputs the
     * host published (sealed local + confirmed/peer-sealed remote rows). */
    int (*advance_sim)(void *ctx, uint32_t tick);
    /* Digest of canonical state at tick for agreement comparison; partition
     * selects a subsystem (0 = master). Must be identical across peers. */
    uint32_t (*state_digest)(void *ctx, uint32_t tick, uint32_t partition);
    /* 1 when the peer state/master-hash watermark has agreed through tick
     * (frame-commit). Backs input-contract hash_confirm_promote. */
    uint8_t (*hash_confirm_through)(void *ctx, uint32_t tick);
    /* Sample the authoritative row for a slot at a wire tick from the host's
     * input history (for sealing + self-seal fallback). */
    uint8_t (*get_input_row)(void *ctx, int32_t slot, uint32_t tick, RNetRbFrame *out_frame);
    /* Stick-replace contract gates; NULL = portable defaults. */
    RNetInputContractHostGates stick_gates;
} RNetRollbackVTable;
```

Episode phases are `Live`, `SealInputs`, `AwaitingBaseline`, `Replay`, `Verify`, `TipHold`, `Commit`, `Abort`. Roles are `Initiator` and `Follower`. Event types are `None`, `InputMismatch`, `PeerSymmetric`, `StateDiverge` and `FrameCommit`. `RB_SYNC` ops are `NACK 0`, `BEGIN 1`, `ABORT 2`, `COMMIT 3`, and its flags are `LIGHT_TIP 0x01`, `REREPLAY 0x02`, `MEDIA_KF 0x04`.

The host gates in `RNetInputContractHostGates` are all optional, "NULL = portable default = gate never fires". One is different: `hash_confirm_promote` says "Fail closed when NULL." The library's own advice is to "bind only `hash_confirm_promote` ... and leave the rest NULL (portable defaults)", which is what psxrecomp does in its rollback vtable.

Pacing is deliberately not in this library. [`retcomm-rbengine`](https://github.com/TechnicallyComputers/retcomm-rbengine) is the sibling C library that decides when to guess an input, when to stall and what `D` should be. It links `recomp_net` publicly, will not configure without it, and it "never advances sim".

## Wire format

Little endian throughout. Every packet ends with a 32 bit FNV-1a checksum over all preceding bytes. The common header is `magic:u32`, `type:u16`, `session_id:u32`, which is the 10 bytes the relay parses.

### Packet types

| Id | Packet | Payload |
|---|---|---|
| 1 | `HELLO` | `local_slot:u8`, `slot_count:u8`, `delay:u8`, `pad:u8` |
| 2 | `READY` | `local_slot:u8`, `pad:u8x3` |
| 3 | `START` | `start_tick:u32`, emitted by slot 0 |
| 4 | `INPUT` | `local_slot:u8`, `frame_count:u8`, `input_epoch:u16`, `ack_tick:u32`, then frames of `tick:u32`, `size:u16`, `bytes[size]` |
| 5 | `DELAY_SYNC` | `new_delay:u8`, `pad:u8x3`, `effective_tick:u32` |
| 6 | `INPUT_CONFIRM` | `local_slot:u8`, `input_epoch:u16`, `pad:u8`, `sim_tick:u32`, `input_hash:u32` |
| 7 | `BYE` | `local_slot:u8`, `pad:u8x3` |
| 8, 9, 10 | `STATE_BEGIN`, `STATE_CHUNK`, `STATE_ACK` | Chunked blob transfer, keyed on `xfer_id:u32`, with `total_size` and `payload_crc` up front |
| 11, 12 | `STATE_PROBE`, `STATE_PROBE_REPLY` | `op`, `slot`, `total_size:u32`, `payload_crc:u32`; the reply adds `match:u8` and echoes both |
| 13 | `SIO_MULTI_XFER` | Game Boy Advance link cable Multi barrier: `unit_id`, `seq:u32`, `send:u16`, `confirm_pad:u16` |
| 20 | `RB_SYNC` | Correction tuple `(epoch, mismatch, load, target, slot, op, flags)` |
| 21 | `RB_SEAL_ROWS` | Peer-authority sealed row chunk |
| 22 | `RB_BASELINE` | Post-load digests, master plus three partitions |
| 23 | `RB_POST` | Post-replay digests plus a match flag |
| 24 | `RB_FRAME_COMMIT` | State or master hash watermark token |
| 25 | `RB_RESOLVED` | Resolved-through frontier advertise |

Opcodes 20 to 25 were added for rollback. A delay-sync host never sends or reads them.

### Protocol limits

| Limit | Value | Why |
|---|---|---|
| `RNET_MAX_PACKET` | 1200 | Datagram ceiling with ICE and TURN framing headroom |
| `RNET_MAX_BUNDLE` | 21 | "Must be >= max input_delay (20) + 1 so the neutral delay prefix can fit in one INPUT bundle." Truncating it "deadlocks admit at `sim_tick==0`" |
| `RNET_STATE_CHUNK_MAX` | 1120 | 28 byte header plus 4 byte trailer inside `RNET_MAX_PACKET` |
| `RNET_STATE_MAX` | 8 MiB | Largest blob a state transfer may carry |
| `RNET_RB_PEER_SEAL_MASK_BITS` | 64 | Hard ceiling on a tip-extended span regardless of `seal_max_span` |

### `rnet_proto_checksum`

`INPUT_CONFIRM.input_hash` is specified exactly, as "`rnet_proto_checksum` over `sim_tick` (LE u32) followed by each slot's `size` (LE u16) and `bytes`". Every packet depends on this function, so a port that rewrites it has to match byte for byte.

From [`src/protocol/rnet_protocol.c`](https://github.com/TechnicallyComputers/recomp-net/blob/main/src/protocol/rnet_protocol.c):

```c title="src/protocol/rnet_protocol.c"
rnet_u32 rnet_proto_checksum(const rnet_u8 *data, size_t len)
{
    rnet_u32 sum = 0x811c9dc5u;
    size_t i;
    for (i = 0; i < len; ++i)
    {
        sum ^= data[i];
        sum *= 0x01000193u;
    }
    return sum;
}
```

Three line-based UTF-8 text protocols sit beside the binary one: `RNETBC1` for LAN beacon announces, `RNETDJ1` for direct join and RTT, and `RNET_LAN_LOBBY_3` for the same-machine room file. [Machine-readable surfaces](/docs/agents/machine-surfaces) collects the fleet's other programmable interfaces.

## Building it

| CMake option | Type | Default | What it does |
|---|---|---|---|
| `RNET_ENABLE_ICE` | BOOL | OFF | Build the libjuice ICE transport |
| `RNET_ICE_BUNDLE_STATIC` | BOOL | ON | FetchContent a static libjuice into `recomp_net`; `RNET_LIBJUICE_ROOT` uses local sources instead |
| `RNET_ICE_FORCE_TURN` | BOOL | OFF | Testing only: emit and accept `typ relay` candidates only |
| `RNET_BUILD_EXAMPLES` | BOOL | ON | Build `lan_delay_2p` and `ice_manual_signaling` |
| `RNET_BUILD_TESTS` | BOOL | ON | Build the eleven ctest binaries |

```sh
cmake -S . -B build -DRNET_ENABLE_ICE=OFF
cmake --build build -j
ctest --test-dir build --output-on-failure
```

Then run the two-peer demo, one command per terminal:

```sh
./build/lan_delay_2p 0 7777
```

```sh
./build/lan_delay_2p 1 0 127.0.0.1:7777
```

`lan_delay_2p` takes the local slot, the bind port and an optional `host:port` peer, and reads `RNET_DELAY` (default 2), `RNET_SESSION_ID` (default 1) and `RNET_TICKS` (default 120). It exits 1 on bad usage or a failed create or start, 0 when at least one tick published, and 2 otherwise. Add the library to a host with:

```cmake
add_subdirectory(path/to/recomp-net)
target_link_libraries(your_host PRIVATE recomp_net)
```

## Where the documents contradict the code

The repository's own documentation is wrong here, and it changes what a host needs in hand before it may run a tick.

[`docs/architecture.md`](https://github.com/TechnicallyComputers/recomp-net/blob/main/docs/architecture.md) and [`docs/protocol.md`](https://github.com/TechnicallyComputers/recomp-net/blob/main/docs/protocol.md) both say that admitting sim tick `T` needs remote rows at wire `T + D`. The shipped code does not do that. It reads at `play_wire = sim_tick` while sampling local input for `sample_wire = sim_tick + D`, so `D` sits behind the simulation as a cushion, not ahead of it. The public header agrees with the code: `rnet_session_try_admit` "Returns 1 when gameplay inputs for sim_tick (wire=sim) are present for every remote".

**Trust the code and `session.h`, not those two document pages.** retcomm-rbengine calls the code behaviour REAL-DELAY and the documented behaviour the legacy ZERO-DELAY mode, which is now opt-in through `RBE_RB_ZERO_DELAY=1`. For a host writer this means peer input for the tick you are about to run normally arrived `D` frames ago. That is why the stall path keeps resending the input bundle while the simulation is frozen.

## Source

- [recomp-net](https://github.com/TechnicallyComputers/recomp-net): [`README.md`](https://github.com/TechnicallyComputers/recomp-net/blob/main/README.md), the headers under [`include/recomp_net/`](https://github.com/TechnicallyComputers/recomp-net/blob/main/include/recomp_net), [`docs/host_integration.md`](https://github.com/TechnicallyComputers/recomp-net/blob/main/docs/host_integration.md), [`docs/architecture.md`](https://github.com/TechnicallyComputers/recomp-net/blob/main/docs/architecture.md), [`docs/protocol.md`](https://github.com/TechnicallyComputers/recomp-net/blob/main/docs/protocol.md), [`docs/rollback.md`](https://github.com/TechnicallyComputers/recomp-net/blob/main/docs/rollback.md), [`src/protocol/rnet_protocol.c`](https://github.com/TechnicallyComputers/recomp-net/blob/main/src/protocol/rnet_protocol.c), [`examples/lan_delay_2p/main.c`](https://github.com/TechnicallyComputers/recomp-net/blob/main/examples/lan_delay_2p/main.c), [`CMakeLists.txt`](https://github.com/TechnicallyComputers/recomp-net/blob/main/CMakeLists.txt).
- [retcomm-rbengine](https://github.com/TechnicallyComputers/retcomm-rbengine): [`README.md`](https://github.com/TechnicallyComputers/retcomm-rbengine/blob/main/README.md), [`src/sched/rbe_sched.c`](https://github.com/TechnicallyComputers/retcomm-rbengine/blob/main/src/sched/rbe_sched.c). [recomp-net-server](https://github.com/TechnicallyComputers/recomp-net-server): [`src/input_relay.rs`](https://github.com/TechnicallyComputers/recomp-net-server/blob/main/src/input_relay.rs).
- Consumers: [snesrecomp](https://github.com/mstan/snesrecomp) [`runner/src/netplay/snes_netplay.c`](https://github.com/mstan/snesrecomp/blob/main/runner/src/netplay/snes_netplay.c), [psxrecomp](https://github.com/mstan/psxrecomp) [`runtime/src/psx_netplay_rb.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/psx_netplay_rb.c), [MetalWarriorsSNESRecomp](https://github.com/TechnicallyComputers/MetalWarriorsSNESRecomp) [`src/main.c`](https://github.com/TechnicallyComputers/MetalWarriorsSNESRecomp/blob/main/src/main.c).

## Next

- [Determinism](/docs/concepts/determinism) is the property `advance_sim` and `state_digest` demand, and the reason a desync latch is a host bug.
- [Catalog schema](/docs/reference/catalog-schema) is where a title declares `netplay.game_name` and `netplay.game_version`, the pair the lobby keys rooms on.
- [PlayStation](/docs/platforms/playstation) and [SNES](/docs/platforms/snes) are the two toolchains that consume this library today.
- [Machine-readable surfaces](/docs/agents/machine-surfaces) for the rest of the fleet's programmable interfaces, and [Glossary](/docs/concepts/glossary) for delay-sync, wire tick, admission and episode as the fleet uses them.
