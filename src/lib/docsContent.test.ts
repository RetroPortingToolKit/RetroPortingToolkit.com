import { describe, expect, it } from "vitest";
// The real prerenderer, so these compare against the routes the build ships
// rather than a restatement of them.
import { buildRouteMeta } from "../../scripts/vite-prerender.mjs";
import { generateFeeds, renderFeeds } from "../../scripts/gen-feeds.mjs";
import {
  BLOGS,
  DOCS,
  DOCS_SECTIONS,
  GAMES,
  HARDWARE,
  isDocsSectionIndex,
  itemsForKind,
  parseItem,
  pathFor,
  COLLECTION_KIND,
} from "./content";
import type { Kind } from "./types";

const KINDS: Kind[] = ["hardware", "game", "blog", "docs"];

const fixture = (path: string, fm = "") =>
  parseItem(path, `---\ntitle: "Fixture"\n${fm}\n---\n\nBody.\n`);

describe("nested slug derivation", () => {
  it("keeps the section in a docs page's slug", () => {
    const item = fixture("/data/docs/01_start/01_quickstart/index.md");
    expect(item?.kind).toBe("docs");
    expect(item?.slug).toBe("start/quickstart");
    expect(item?.section).toBe("start");
    expect(item?.sectionOrder).toBe(1);
    expect(item?.order).toBe(1);
    expect(pathFor("docs", item!.slug)).toBe("/docs/start/quickstart");
  });

  it("gives a section's own page the bare section slug", () => {
    const item = fixture("/data/docs/03_reference/index.md");
    expect(item?.slug).toBe("reference");
    expect(item?.section).toBe("reference");
    expect(isDocsSectionIndex(item!)).toBe(true);
    expect(pathFor("docs", item!.slug)).toBe("/docs/reference");
  });

  it("leaves the flat kinds exactly as they were", () => {
    const item = fixture("/data/blog/30_a-post/index.md");
    expect(item?.slug).toBe("a-post");
    expect(item?.section).toBeUndefined();
    expect(pathFor("blog", item!.slug)).toBe("/blog/a-post");
  });

  it("drops a page nested deeper than the kind allows", () => {
    // Would otherwise be published at a URL no route matches, which the
    // vercel.json catch-all serves as the home page rather than a 404.
    expect(fixture("/data/blog/a/b/index.md")).toBeNull();
    expect(fixture("/data/docs/a/b/c/index.md")).toBeNull();
    expect(fixture("/data/docs/index.md")).toBeNull();
  });

  it("lets frontmatter override the folder's order", () => {
    const item = fixture("/data/docs/01_start/09_late/index.md", "order: 2");
    expect(item?.order).toBe(2);
    expect(item?.slug).toBe("start/late");
  });
});

describe("itemsForKind is exhaustive", () => {
  it("returns the right list for every kind, docs included", () => {
    expect(itemsForKind("hardware")).toBe(HARDWARE);
    expect(itemsForKind("game")).toBe(GAMES);
    expect(itemsForKind("blog")).toBe(BLOGS);
    // The bug this replaces: a ternary chain whose last branch was BLOGS, so
    // any kind that was not hardware or game paged through the blog.
    expect(itemsForKind("docs")).toBe(DOCS);
    expect(itemsForKind("docs")).not.toBe(BLOGS);
  });

  it("maps every kind to a URL segment and back", () => {
    for (const kind of KINDS) {
      const segment = pathFor(kind, "x").split("/")[1];
      expect(COLLECTION_KIND[segment], segment).toBe(kind);
    }
  });
});

describe("the docs tree", () => {
  it("has the seed content", () => {
    expect(DOCS.length).toBeGreaterThan(0);
    expect(DOCS_SECTIONS.length).toBeGreaterThan(0);
  });

  it("excludes drafts from every section, while the page itself still parses", () => {
    const draft = fixture("/data/docs/01_start/05_draft-page/index.md", "draft: true");
    expect(draft?.draft).toBe(true);
    for (const item of DOCS) expect(item.draft).not.toBe(true);
    for (const section of DOCS_SECTIONS) {
      for (const page of section.pages) expect(page.draft).not.toBe(true);
      expect(section.index?.draft).not.toBe(true);
    }
  });

  it("files every page under the section its folder names", () => {
    for (const section of DOCS_SECTIONS) {
      for (const page of section.pages) {
        expect(page.slug.startsWith(`${section.slug}/`)).toBe(true);
        expect(isDocsSectionIndex(page)).toBe(false);
      }
    }
  });

  it("orders sections and their pages by folder number", () => {
    const orders = DOCS_SECTIONS.map((s) => s.order);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
    for (const section of DOCS_SECTIONS) {
      const pageOrders = section.pages.map((p) => p.order);
      expect([...pageOrders].sort((a, b) => a - b)).toEqual(pageOrders);
    }
  });
});

describe("docs routes", () => {
  const meta = buildRouteMeta("https://example.test");

  it("prerenders one route per docs page, plus the section index", () => {
    // The assertion that matters: vercel.json rewrites an unmatched path to
    // "/", so a docs page missing from this map serves the HOME page's markup
    // to every crawler while looking correct to a human. buildRouteMeta throws
    // on a mismatch; this restates the count so a failure names it.
    const routes = [...meta.keys()].filter((r) => r.startsWith("/docs/"));
    expect(routes.sort()).toEqual(DOCS.map((i) => `/docs/${i.slug}`).sort());
    expect(meta.has("/docs")).toBe(true);
  });

  it("keeps docs out of the blog feeds", () => {
    // A wiki edit is not a news item. gen-feeds.mjs reads data/blog only, and
    // this is what stops someone widening it by accident.
    const feeds = renderFeeds();
    for (const body of [feeds.rss, feeds.atom, feeds.json]) {
      expect(body).not.toContain("/docs/");
    }
    expect(typeof generateFeeds).toBe("function");
  });
});
