import { describe, expect, it } from "vitest";
// The real prerenderer, so this compares against the bytes the build ships
// rather than a restatement of them.
import { buildRouteMeta } from "../../scripts/vite-prerender.mjs";
import {
  titleForCollection,
  titleForHome,
  titleForItem,
  titleForTeam,
  titleForTopic,
} from "./pageTitle";
import { BLOGS, HARDWARE, GAMES, DOCS } from "./content";
import { TOPICS } from "./topics";
import type { Item } from "./types";

// The server title is what crawlers and social unfurls read; the client title
// replaces it after hydration. If they disagree, the tab (and any JS-rendering
// crawler) shows something other than the served markup, which is exactly the
// bug this suite exists to prevent regressing.
const meta = buildRouteMeta("https://example.test");

function served(route: string): string | undefined {
  return meta.get(route)?.title;
}

describe("client titles match the prerendered titles", () => {
  it("prerenders the routes under test", () => {
    // Guards the whole suite: if buildRouteMeta stopped emitting routes, every
    // other assertion would compare undefined to undefined and pass silently.
    expect(meta.size).toBeGreaterThan(10);
  });

  it("home", () => {
    expect(served("/")).toBe(titleForHome());
  });

  it("team", () => {
    expect(served("/team")).toBe(titleForTeam());
  });

  it("publishes the team page rather than hiding it", () => {
    // It was draft while it was one person's unconfirmed account of their
    // colleagues. It is announced now, so it is indexable and in the sitemap —
    // writeSitemap() filters on this flag, so this is what puts it there — and
    // the footer links it. It stays out of NAV_TABS, which is also the home
    // pager's pane order and would give it a swipeable pane.
    expect(meta.get("/team")?.draft).toBeFalsy();
  });

  it("gives image-less launch routes a real large-card preview", () => {
    for (const route of ["/", "/hardware", "/games", "/blog", "/docs"]) {
      expect(meta.get(route)).toMatchObject({
        image: "https://example.test/og/default.jpg",
        imageWidth: 1200,
        imageHeight: 674,
      });
    }
  });

  it.each([
    ["/hardware", "hardware"],
    ["/games", "game"],
    ["/blog", "blog"],
    ["/docs", "docs"],
  ] as const)("collection %s", (route, kind) => {
    expect(served(route)).toBe(titleForCollection(kind));
  });

  it.each(TOPICS.map((t) => [t.id, t] as const))("topic %s", (id, topic) => {
    expect(served(`/topic/${id}`)).toBe(titleForTopic(topic));
  });

  const items: Array<[string, Item]> = [
    ...HARDWARE.map((i) => [`/hardware/${i.slug}`, i] as [string, Item]),
    ...GAMES.map((i) => [`/games/${i.slug}`, i] as [string, Item]),
    ...BLOGS.map((i) => [`/blog/${i.slug}`, i] as [string, Item]),
    // Nested: a docs slug carries its section, so this also asserts the two
    // content walks derive the same address for the same folder.
    ...DOCS.map((i) => [`/docs/${i.slug}`, i] as [string, Item]),
  ];

  it("has items to check", () => {
    expect(items.length).toBeGreaterThan(0);
  });

  it.each(items)("item %s", (route, item) => {
    expect(served(route)).toBe(titleForItem(item));
  });
});
