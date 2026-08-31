---
title: "Rampage Through Time"
kicker: "PlayStation"
tags: ["Netplay", "Multiplayer"]
featured: false
desc: "Three monsters, three pads, and three online slots declared in the launcher catalogue, on a project that ships a new build most weeks."
year: "2026"
status: "Tech demo"
availability: "Public build"
provenance: "community"
platform: "playstation"
repo: "https://github.com/TechnicallyComputers/Rampage---Through-Time-Recomp"
group: "PlayStation"
verified: "2026-08-20"
updated: "2026-08-18"
added: "2026-08-10"
cover: "./boxart.png"
---

Rampage Through Time Recompiled is a community project by TechnicallyComputers that rebuilds Midway's 2000 city-smashing sequel as a native program on [PSXRecomp](/hardware/playstation). It is one of the few PS1 recomps where the game's three-player count survives all the way into netplay: the launcher catalogue lists three online slots, over a LAN or across the internet.

## Playable status

Builds are published, but nobody has said yet how far the game gets. Zips for Windows, macOS on Intel and Apple silicon, and Linux land often, and the repository carries no status section and no issue log to read alongside them.

Each zip is a setup host rather than a finished binary: it builds the game locally from a dump you provide, through the same Generate and Build flow the other TechnicallyComputers titles use. The disc it wants is the USA release, SLUS-01065, as a cue plus bin.

## What the recomp adds

Netplay, declared through the launcher catalogue: the recomp-net stack, three slots, and both LAN and ICE transports, so a match can be on the same network or routed across the internet. The game's own configuration carries the matching pieces, multitap in analog mode for three pads and a netplay gate built from the disc digests, the track count, and a disc fingerprint. Peers who do not hold the same dump do not get into the match.

The repository also carries a widescreen site analysis, a list of the places in the game's code that a wider view would have to touch. That is groundwork rather than a feature: the shipped configuration still renders 4:3.

Like the rest of the TechnicallyComputers catalogue, the title can be installed, updated, and rebuilt through the RetComM Launcher instead of running its wizard by hand.


## Sources

- [Project README and releases (GitHub)](https://github.com/TechnicallyComputers/Rampage---Through-Time-Recomp)
- [RetComM Launcher catalogue entry (GitHub)](https://github.com/TechnicallyComputers/retcomm-catalog/blob/main/titles/rampage-through-time-psx.json)
