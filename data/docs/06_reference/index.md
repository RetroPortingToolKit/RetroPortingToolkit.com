---
title: "Reference"
summary: "Nine lookup pages: every command line flag, the TCP debug protocol and its port registry, the mod manifest and configuration schemas, the catalog and netcode APIs, the status words and the exit codes."
sectionTitle: "Reference"
pageType: "reference"
tags: ["Reference"]
updated: "2026-08-23"
---

Tables, not narrative. Open one of these when you know what you are doing and need the exact name, type, default or code. Every entry has its own row and its own anchor, and where projects in the fleet genuinely differ, the difference is a marked row rather than a smoothed-over average. Two of these pages are not summaries of existing documentation: the TCP debug protocol is described nine separate times across the fleet with no single specification, and the port registry exists because ports are assigned per project and collide.

- [Command line reference](/docs/reference/cli). Every tool, every flag, with type, default and meaning.
- [TCP debug protocol](/docs/reference/tcp-protocol). One wire format and one command table, with per-console extensions marked as extensions.
- [TCP port registry](/docs/reference/tcp-port-registry). Which project listens on which port, and the ports claimed by more than one at once.
- [Mod manifest](/docs/reference/mod-manifest). Field by field for the `manifest.toml` three toolchains share.
- [Configuration reference](/docs/reference/configuration). Every TOML and JSON key the toolchains read at build time and at run time.
- [Catalog schema](/docs/reference/catalog-schema). The title catalogue the launcher downloads, as a typed reference.
- [recomp-net API](/docs/reference/recomp-net-api). The netcode library's public surface.
- [Status vocabulary](/docs/reference/status-vocabulary). What playable alpha, bring-up and the rest mean as this fleet uses them.
- [Errors and exit codes](/docs/reference/errors-and-exit-codes). What a failing process is telling you, including the skip code a test harness returns.
