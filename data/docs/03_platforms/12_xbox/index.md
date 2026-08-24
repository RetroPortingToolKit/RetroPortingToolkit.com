---
title: "Xbox"
summary: "xboxlle-probe is not a recompiler and runs no games: it is a small agent that answers fixed read-only measurement questions on a real original Xbox, wrapped in unusually strict safety documentation."
section: "platforms"
sectionTitle: "Platforms"
pageType: "project"
tags: ["Xbox", "Hardware probe", "Safety"]
repos:
  - "https://github.com/mstan/xboxlle-probe"
updated: "2026-08-23"
---

[xboxlle-probe](https://github.com/mstan/xboxlle-probe) is not a recompiler, and there is no Xbox port on this page. It is a measuring instrument: a small homebrew agent that runs on an original Xbox you already own and can already run unsigned code on, plus a Python client that asks it a fixed set of questions over a network socket. It exists because an emulator needs ground truth. In the repository's words, "It originated as the hardware-oracle component of `xboxlle`: emulator behavior could be compared with measurements from actual silicon instead of assumptions or another emulator." That emulator is a separate project and is not covered here, so nothing on this page runs, ports or plays anything.

## Status, in the project's own words

The README opens with a warning, in capitals, and repeats the point in two other places. Quoted exactly:

> THIS SOFTWARE CAN CRASH, CORRUPT, OR BRICK AN XBOX

> **There is no authentication or encryption. Never run it on an untrusted or
> internet-accessible network.**

> This project reduces accidental misuse; it does not make low-level hardware
> access safe.

That last sentence is the honest summary of the whole design. The guards described below reduce the chance of an accident. They are not a safety guarantee, and the repository does not present them as one.

## What a probe is scoped to do

The fleet uses three suffixes in repository names. A `recomp` project [translates guest machine code to C ahead of time](/docs/start/what-is-static-recompilation). An `lle` project makes a claim about running the machine's own firmware. A `probe` is neither: it produces no native executable of any guest program, and its entire output is measurements. The full distinction is set out on the [GameCube page](/docs/platforms/gamecube), and [high level and low level](/docs/concepts/hle-and-lle) covers the underlying argument.

Concretely, a probe here is a named, fixed, read-only measurement that returns one line of JSON. The README says the named probes "are the intended interface for humans and AI agents". Three exist: `cpu`, `nv2a` and `controller-s-hub`. This is the entire reply from the CPU probe, copied from the README:

```json
{"probe":"cpu","agent":"xboxlle-probe v0.3.1","vendor":"GenuineIntel","max_leaf":2,"signature":"0x0000068a","features_edx":"0x0383f9ff","features_ecx":"0x00000000"}
```

The machine behind that is an x86 console: `GenuineIntel`, signature `0x0000068a`, which is family 6, model 8, stepping 10, with the NV2A graphics part. The agent itself is an ordinary Xbox title built with nxdk, launched from a dashboard like any other homebrew.

The third probe is the interesting one, because it answers by refusing. Rather than return an empty or guessed capture, it reports that it cannot answer and why:

> `controller-s-hub` is currently only a capability sentinel. Its JSON reply
> sets `available`, `hardware_inspected`, and `usb_traffic` to `false`, with null
> descriptor/status/transcript fields and reason `agent_usb_stack_not_initialized`.
> It cannot satisfy a Controller S descriptor-capture request and does not touch
> USB/OHCI hardware.

The source comment says the same thing and gives the reason: the agent's USB stack is not initialized, so the probe "must not inspect a device list, issue a USB transfer, access OHCI, or infer hub/descriptors from any other source", and it exists "so callers can distinguish this unsupported capability from an empty or guessed hardware capture". That pattern is what this fleet calls a capability sentinel, one of the terms collected in the [glossary](/docs/concepts/glossary).

## What the safety documents constrain

The repository carries a `SECURITY.md` and a `NOTICE.md` alongside `AGENTS.md` and `CONTRIBUTING.md`, and of the fleet's three frontier targets it is the only one whose agent file is about physical consequences rather than debugging method. That file opens: "This repository controls real hardware. An incorrect action can freeze, corrupt, or brick an original Xbox. Treat network commands as physical side effects, not ordinary software tests."

Two mechanisms do the constraining. The first is arming. Every raw or state-changing command requires the client to send the exact phrase `ARM I_ACCEPT_THE_RISK` first, and that state belongs to one TCP connection: a new connection starts in `SAFE`. The documentation is explicit that "The phrase is an accident guard, **not authentication**."

The second is an address allowlist, which decides what may be read at all. Its own comment declines to overclaim.

From [`src/main.c`](https://github.com/mstan/xboxlle-probe/blob/main/src/main.c):

```c title="src/main.c"
// v0.2 guard retained from the hardware-tested ancestor. This is a crash-reduction measure,
// not a promise that every allowed read is harmless on every Xbox revision.
static int addr_readable(uint32_t address, uint32_t len) {
    uint32_t end = address + len;
    if (len == 0 || end < address) return 0;
    if (address >= 0xFD000000 && end <= 0xFE000000) return 1;
    if (address >= 0xFF000000 && end <= 0xFFFFFE00) return 1;
    if (end <= 0x08000000) {
        for (uint32_t page = address & ~0xFFFu; page < end; page += 0x1000) {
            if (!MmIsAddressValid((PVOID)(uintptr_t)page)) return 0;
        }
        return 1;
    }
    return 0;
}
```

The top 512 bytes of the flash mirror sit outside that range for a recorded reason: a prototype agent "froze real hardware while reading the top-of-memory MCPX region". Flash writes are refused outright.

`AGENTS.md` then binds anything automated. Its rules include "Do not scan a LAN, infer a host address, or search for an Xbox.", a requirement that a human explicitly authorize each dangerous operation in the current task, "Never add `--i-accept-the-risk` on the human's behalf based on implied consent.", "Never weaken or bypass the Xbox-side `ARM I_ACCEPT_THE_RISK` gate.", and a publication ban covering "BIOS, flash, EEPROM, HDD, dashboard, kernel, or game dumps; IP or MAC addresses; FTP/HTTP credentials; HDD serial numbers, console-unique keys, or other per-console identifiers; unsanitized probe logs." It also says to stop after any timeout, malformed reply, unexpected register value, freeze, or loss of video or network, and never to retry a failed hardware operation automatically.

`CONTRIBUTING.md` extends that to evidence: "Safety documentation is part of the product. Changes that add hardware access must explain the affected address space, expected side effects, tested Xbox revisions, failure behavior, and how results are sanitized." And, for a project whose job is ground truth, "Reports from emulators are useful comparisons but must not be represented as real-hardware observations."

`SECURITY.md` is where the scope of the testing is recorded, and it states that behaviour on console revisions other than the one tested is not known.

`NOTICE.md` handles origin. It records that this code was extracted from the parent emulator project and names the commits it came from, giving the "source repository commit at extraction: `213b080844d34b5ac581c24705f7a18a0314edad`", the two original agent commits, and the "original author: Matthew Stanley". It also scopes the build dependency: nxdk is "not included in this repository. Its components retain their respective licenses." [Provenance](/docs/fleet/provenance) covers how the fleet handles this kind of record generally.

## The commands

Most of this repository can be worked on with no console involved, and the repository says that is the default. Its own words: "Without a human-authorized hardware session, verification is limited to:"

```sh
python -m unittest discover -s tests -v
python -m py_compile host/xbox_probe.py
```

`AGENTS.md` requires the test suite to stay hardware-free and use only loopback mock servers, and those two commands are what CI runs, plus an XBE build against a pinned nxdk revision. "Building the XBE is safe if it does not deploy or launch it."

```sh
git clone --recursive https://github.com/XboxDev/nxdk.git
git clone https://github.com/mstan/xboxlle-probe.git
export NXDK_DIR="$PWD/nxdk"
eval "$("$NXDK_DIR/bin/activate" -s)"
make -C xboxlle-probe -j
```

The XBE lands at `xboxlle-probe/bin/default.xbe`. `make` aborts with an explicit message if `NXDK_DIR` is unset.

With the agent already launched on a console through your own homebrew workflow, the client's read-only subcommands are `ping`, `info`, `status` and `probe`. They need no arming:

```sh
export XBOX_PROBE_HOST=192.168.1.50
python host/xbox_probe.py ping
python host/xbox_probe.py info
python host/xbox_probe.py probe cpu
```

> **Warning.** The client also carries subcommands the repository itself labels DANGEROUS: raw and bulk memory reads, memory and MMIO writes, raw x86 execution, XBE launch, dashboard return, and FTP upload. Each requires `--i-accept-the-risk` and a freshly armed connection, and the repository's rules require a human to authorize each one explicitly. Read that list as a documented surface, not as a walkthrough.

## What runs today

Three named probes exist. Two return measurements, one returns a documented refusal. The NV2A set is described in the source as "Fixed read-only registers measured successfully on the original v1.1 test console", and whether the agent has been run against any other console is not recorded. The published evidence is one sanitized table in `docs/ORIGIN.md` plus the CPU reply above. There is no game, no port and no emulator in this repository, and the project these measurements were taken for is outside this documentation, so this page says nothing about its state.

## Known limits

- The Controller S probe is a capability sentinel only, as quoted above: it reports that it cannot answer, and touches no USB or OHCI hardware.
- "Named hardware probes use a small set of fixed registers tested on one Xbox v1.1", per the README. Other revisions are not covered, and `SECURITY.md` says so.
- No hardware session logs or captured dumps are kept in the repository, by design, so the only measurements published are one sanitized table and the example JSON above.
- Some one-off PCI and SMBus probe scripts written during an earlier session were not preserved and are not in the repository.
- The `deploy` subcommand uses plain FTP. The repository's answer to that appears to be that the LAN must be trusted, which is what the README asks for.
- Arming is an accident guard, not authentication, and it is per connection.

## Source

- [mstan/xboxlle-probe](https://github.com/mstan/xboxlle-probe), MIT.
- [`README.md`](https://github.com/mstan/xboxlle-probe/blob/main/README.md) for the warnings, prerequisites and the probe list.
- [`AGENTS.md`](https://github.com/mstan/xboxlle-probe/blob/main/AGENTS.md) for the rules binding anything automated, and [`CONTRIBUTING.md`](https://github.com/mstan/xboxlle-probe/blob/main/CONTRIBUTING.md) for what a hardware-access change must document.
- [`SECURITY.md`](https://github.com/mstan/xboxlle-probe/blob/main/SECURITY.md) for tested scope, [`NOTICE.md`](https://github.com/mstan/xboxlle-probe/blob/main/NOTICE.md) for the extraction record and the nxdk dependency.
- [`docs/PROTOCOL.md`](https://github.com/mstan/xboxlle-probe/blob/main/docs/PROTOCOL.md) for the wire contract and the allowlist, [`docs/ORIGIN.md`](https://github.com/mstan/xboxlle-probe/blob/main/docs/ORIGIN.md) for how the project came about.

## Next

- [Original Xbox in the hardware catalogue](/hardware/original-xbox), the shorter entry for this console.
- [GameCube](/docs/platforms/gamecube), where recomp, lle and probe are defined against each other.
- [Co-simulation](/docs/concepts/co-simulation), for the oracle role this project fills with hardware instead of a second emulator.
- [If you are an agent, start here](/docs/agents/start-here), before acting on any of the above.
