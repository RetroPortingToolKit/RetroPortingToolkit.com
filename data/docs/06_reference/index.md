---
title: "Reference"
summary: "Ten lookup pages: every command line flag, the debug protocol and its ports, the mod manifest and the config keys, the catalog and netcode schemas, the status words, the exit codes, and the tools this site offers a browser agent."
sectionTitle: "Reference"
pageType: "reference"
tags: ["Reference"]
updated: "2026-08-26"
---

Ten lookup pages, mostly tables. Each row is one flag, key, command or field, with its type, its default and what it does. Open one when you already know what you want and need the exact name.

Projects in this fleet do not always agree. Where they differ, the difference gets its own row instead of being averaged into one wrong answer.

- [Command line reference](/docs/reference/cli). Every tool, every flag, with type, default and meaning.
- [TCP debug protocol](/docs/reference/tcp-protocol). One wire format and one command table, with per-console extensions marked as extensions.
- [TCP port registry](/docs/reference/tcp-port-registry). Which project listens on which port, and the ports more than one project claims.
- [Mod manifest](/docs/reference/mod-manifest). Field by field for the `manifest.toml` three toolchains share.
- [Configuration reference](/docs/reference/configuration). Every TOML and JSON key the toolchains read at build time and at run time.
- [Catalog schema](/docs/reference/catalog-schema). The title list the launcher downloads, as a typed reference.
- [recomp-net API](/docs/reference/recomp-net-api). The netcode library's public surface.
- [Status vocabulary](/docs/reference/status-vocabulary). What playable alpha, bring-up and the rest mean in this fleet.
- [Errors and exit codes](/docs/reference/errors-and-exit-codes). What a failing process is telling you, including the skip code a test harness returns.
- [Site tools](/docs/reference/site-tools). The seven tools this site registers for a browser with an AI agent in it, and what the one that writes can and cannot do.
