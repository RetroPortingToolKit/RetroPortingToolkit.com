---
title: "Common tricks"
summary: "Reusable patterns that show up in port after port: Fit to screen widescreen, HUD anchoring, camera anchoring, edge fill, wider spawn and cull bounds, and spending performance headroom on resolution."
sectionTitle: "Common tricks"
pageType: "reference"
tags: ["Tricks", "Widescreen", "Enhancements"]
order: 4.5
updated: "2026-11-05"
---

A trick here is a pattern that solved the same problem in more than one port. Each page names the problem, the trick, how to keep the faithful path untouched, what tends to go wrong, and a port that uses it.

Every trick follows the same rules as any enhancement:

- It is optional, and the original 4:3 path stays faithful when it is off.
- It lives in runtime code, configuration or a mod layer, never in hand-edited generated code.
- It changes presentation where it can. When it has to touch the simulation, such as spawning, it is tested like a correctness change.

## Widescreen

- [Fit to screen widescreen](/docs/tricks/fit-to-screen-widescreen). The default way to do widescreen: follow the window's shape, up to a limit each game sets.
- [HUD anchoring](/docs/tricks/hud-anchoring). Sort each HUD piece into left, center or right, and pin it to that edge of the wider view.
- [Camera anchoring](/docs/tricks/camera-anchoring). Near a room edge, slide the wide view inward so it never shows the empty space past the edge. Shipped in Mega Man Maverick Hunter X on PSPLLR.
- [Fill the edges](/docs/tricks/fill-the-edges). When the view cannot move, fill margins that have no real map data instead of leaving them blank.
- [Widen spawn and cull bounds](/docs/tricks/widen-spawn-and-culling). Make enemies, items and sprites exist across the whole wide view, not just the old 4:3 window.

## Performance

- [Spend headroom on resolution](/docs/tricks/spend-headroom-on-resolution). Use the time host-native HLE saves for higher internal resolution and supersampling.

For the step-by-step widescreen process, start with [Add widescreen](/docs/guides/add-widescreen). For where the headroom comes from, read [How does host-native HLE make a port faster?](/docs/concepts/host-native-hle).
