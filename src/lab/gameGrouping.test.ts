import { describe, it, expect } from "vitest";
import { labAll } from "./labContent";
import { GAMES, HARDWARE } from "@/lib/catalogContent";

// The games tab filters on `group`, and editorial pages set it by hand. Pages
// created by /api/submissions set `platform` and never `group`, so a submitted
// game showed on its platform page and in the full list but vanished the
// moment anyone picked its console: Franz reported exactly that for SimCity
// (UrbanRecomp) on 2026-09-25. The group is derived from the platform now,
// and this holds for every game rather than the one that was reported.
describe("the games filter", () => {
  const byPlatform = new Map(HARDWARE.map((hardware) => [hardware.slug, hardware.title]));
  const cardFor = (slug: string) => labAll.game.find((media) => media.slug === slug);

  it("gives every game the group of the console it runs on", () => {
    const wrong: string[] = [];
    for (const game of GAMES) {
      if (!game.platform) continue;
      const expected = byPlatform.get(game.platform);
      if (!expected) continue; // a platform with no published page groups by hand
      const card = cardFor(game.slug);
      if (!card) continue; // not every game has a card on the shelf
      if (card.group !== expected) wrong.push(`${game.title}: group ${JSON.stringify(card.group)}, platform ${game.platform} is ${JSON.stringify(expected)}`);
    }
    expect(wrong).toEqual([]);
  });

  it("does not leave a submitted game out of its console's filter", () => {
    // A submitted page carries `platform` and no `group` of its own.
    const submitted = GAMES.filter((game) => game.provenance === "community" && game.platform);
    expect(submitted.length).toBeGreaterThan(0);
    for (const game of submitted) {
      const card = cardFor(game.slug);
      if (!card) continue;
      expect(card.group, `${game.title} is missing from its platform filter`).toBe(byPlatform.get(game.platform!));
    }
  });
});
