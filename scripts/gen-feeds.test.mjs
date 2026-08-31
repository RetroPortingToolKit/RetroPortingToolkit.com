import { describe, expect, it } from "vitest";
import { buildRouteMeta } from "./vite-prerender.mjs";
import { renderFeeds, renderFeedsFromPosts } from "./gen-feeds.mjs";

function post(overrides = {}) {
  return {
    slug: "example",
    url: "https://retroportingtoolkit.com/blog/example",
    title: "Example",
    desc: "Example post",
    date: "2026-01-01",
    tags: [],
    body: "Body",
    image: null,
    ...overrides,
  };
}

describe("feed rendering", () => {
  it("escapes a query link exactly once per HTML/XML layer", () => {
    const feeds = renderFeedsFromPosts([post({ body: "[search](/search?a=1&b=2)" })]);
    expect(JSON.parse(feeds.json).items[0].content_html).toContain(
      'href="https://retroportingtoolkit.com/search?a=1&amp;b=2"',
    );
    expect(feeds.rss).toContain('href="https://retroportingtoolkit.com/search?a=1&amp;b=2"');
    expect(feeds.rss).not.toContain("&amp;amp;");
    expect(feeds.atom).toContain(
      'href="https://retroportingtoolkit.com/search?a=1&amp;amp;b=2"',
    );
    expect(feeds.atom).not.toContain("&amp;amp;amp;");
  });

  it("sorts equal dates by slug without mutating the caller", () => {
    const input = [
      post({ slug: "zeta", url: "https://retroportingtoolkit.com/blog/zeta" }),
      post({ slug: "alpha", url: "https://retroportingtoolkit.com/blog/alpha" }),
    ];
    const original = [...input];
    const first = renderFeedsFromPosts(input);
    expect(renderFeedsFromPosts([...input].reverse())).toEqual(first);
    expect(input).toEqual(original);
    expect(JSON.parse(first.json).items.map((item) => item.url)).toEqual([
      "https://retroportingtoolkit.com/blog/alpha",
      "https://retroportingtoolkit.com/blog/zeta",
    ]);
  });

  it("rejects empty, invalid, and duplicate entries", () => {
    expect(() => renderFeedsFromPosts([])).toThrow(/empty blog feed/i);
    expect(() => renderFeedsFromPosts([post({ date: "not-a-date" })])).toThrow(/invalid publication date/i);
    expect(() => renderFeedsFromPosts([post(), post({ slug: "duplicate" })])).toThrow(/duplicate feed URL/i);
  });

  it("excludes drafts from every feed format", () => {
    const feeds = renderFeedsFromPosts([
      post(),
      post({ slug: "draft", url: "https://retroportingtoolkit.com/blog/draft", draft: true }),
    ]);
    expect(feeds.count).toBe(1);
    expect(`${feeds.rss}${feeds.atom}${feeds.json}`).not.toContain("/blog/draft");
  });

  it("matches every concrete published blog article route", () => {
    const feedPaths = JSON.parse(renderFeeds().json).items
      .map((item) => new URL(item.url).pathname).sort();
    const routePaths = [...buildRouteMeta("https://retroportingtoolkit.com")]
      .filter(([route, meta]) => route.startsWith("/blog/") && !meta.draft)
      .map(([route]) => route).sort();
    expect(feedPaths).toEqual(routePaths);
  });
});
