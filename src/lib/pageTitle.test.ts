import { describe, expect, it } from "vitest";
// The real prerenderer, so this compares against the bytes the build ships
// rather than a restatement of them.
import { buildRouteMeta } from "../../scripts/vite-prerender.mjs";
import {
  titleForCollection,
  titleForHome,
  titleForItem,
  titleForTopic,
} from "./pageTitle";
import { BLOGS, HARDWARE, GAMES } from "./content";
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

  it.each([
    ["/hardware", "hardware"],
    ["/games", "game"],
    ["/blog", "blog"],
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
  ];

  it("has items to check", () => {
    expect(items.length).toBeGreaterThan(0);
  });

  it.each(items)("item %s", (route, item) => {
    expect(served(route)).toBe(titleForItem(item));
  });
});
