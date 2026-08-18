import { describe, expect, it } from "vitest";
// The real prerenderer, so this compares against the bytes the build ships
// rather than a restatement of them.
import { buildRouteMeta } from "../../scripts/vite-prerender.mjs";
import {
  titleForCollection,
  titleForHome,
  titleForItem,
  titleForTopic,
  titleForWork,
} from "./pageTitle";
import { BLOGS, PROJECTS, TALKS, WRITING } from "./content";
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

  it("work", () => {
    expect(served("/work")).toBe(titleForWork());
  });

  it.each([
    ["/blog", "blog"],
    ["/projects", "project"],
    ["/talks", "talk"],
    ["/writing", "writing"],
  ] as const)("collection %s", (route, kind) => {
    expect(served(route)).toBe(titleForCollection(kind));
  });

  it.each(TOPICS.map((t) => [t.id, t] as const))("topic %s", (id, topic) => {
    expect(served(`/topic/${id}`)).toBe(titleForTopic(topic));
  });

  const items: Array<[string, Item]> = [
    ...PROJECTS.map((i) => [`/projects/${i.slug}`, i] as [string, Item]),
    ...TALKS.map((i) => [`/talks/${i.slug}`, i] as [string, Item]),
    ...WRITING.map((i) => [`/writing/${i.slug}`, i] as [string, Item]),
    ...BLOGS.map((i) => [`/blog/${i.slug}`, i] as [string, Item]),
  ];

  it("has items to check", () => {
    expect(items.length).toBeGreaterThan(0);
  });

  it.each(items)("item %s", (route, item) => {
    expect(served(route)).toBe(titleForItem(item));
  });
});
