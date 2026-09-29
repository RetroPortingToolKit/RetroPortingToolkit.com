---
title: "PokemonYellowRecomp"
desc: "Pokémon Yellow recompiled for the Game Boy using a fork of gb-recompiled (extended with the full National Dex #1–251) · Part of the R.A.I.D. community"
kicker: "Community submission"
tags: ["Community"]
provenance: "community"
repo: "https://github.com/mstan/PokemonYellowRecomp"
status: "Community submission"
links: [{"label":"Project on GitHub","href":"https://github.com/mstan/PokemonYellowRecomp"}]
added: "2026-09-28"
updated: "2026-06-26"
submissionId: "77d3c638dbbda74e"
draft: false
creator: {"github":"mstan"}
release: "v0.0.4"
download: "https://github.com/mstan/PokemonYellowRecomp/releases/tag/v0.0.4"
---

Pokémon Yellow recompiled for the Game Boy using a fork of gb-recompiled \(extended with the full National Dex \#1–251\) · Part of the R.A.I.D. community

## Project

An extended Pokémon Yellow built from the pret/pokeyellow decompilation, then run natively through our gbrecomp static recompiler and SDL/ANGLE runner.

Everything is done by editing the decomp source \(assembly + data + PNG sprites\) and reassembling a real ROM — not by binary-patching a .gbc. The Gen-2 content is pulled from pokecrystal's source at build time \(no Crystal ROM needed\), so the repo ships source only — no ROM, binary, or patch.
