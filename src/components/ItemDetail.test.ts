import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
// The byline links each author to /team, and a link navigates through the
// router, so the component renders inside one here as it does in the app.
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { Item } from "@/lib/types";
import { ItemDetail } from "./ItemDetail";

const base: Item = {
  kind: "blog",
  slug: "covered-media-test",
  title: "Covered media test",
  kicker: "Article",
  desc: "A fixture.",
  cover: "/cover.webp",
  gallery: [],
  links: [],
  body: "",
  order: 999,
  meta: [],
  tags: [],
};

const render = (item: Item, mediaActive: boolean) =>
  renderToStaticMarkup(createElement(MemoryRouter, null, createElement(ItemDetail, { item, mediaActive })));

describe("ItemDetail covered media", () => {
  it("replaces a covered video embed with its poster", () => {
    const item: Item = {
      ...base,
      kicker: "Video",
      videoUrl: "https://youtu.be/dQw4w9WgXcQ",
    };

    expect(render(item, true)).toContain("youtube.com/embed/dQw4w9WgXcQ");
    const covered = render(item, false);
    expect(covered).not.toContain("<iframe");
    expect(covered).toContain("/cover.webp");
  });

  it("does not mount a covered interactive demo", () => {
    const item: Item = {
      ...base,
      kicker: "Case study",
      demo: "https://example.com/demo",
      layout: "split",
    };

    expect(render(item, true)).toContain('src="https://example.com/demo"');
    const covered = render(item, false);
    expect(covered).not.toContain("<iframe");
    expect(covered).toContain("/cover.webp");
  });
});

describe("ItemDetail byline", () => {
  it("names every author, links each team member to their card, and joins them the way a byline reads", () => {
    const html = render({ ...base, authors: ["Shokunin", "Matthew Stanley"] }, false);
    expect(html).toContain('href="/team#shokunin"');
    expect(html).toContain('href="/team#matthew-stanley"');
    const text = html.replace(/<[^>]+>/g, "");
    expect(text).toContain("Shokunin and Matthew Stanley");
    // The sign-off at the foot names them all too.
    expect(text).toContain("Written by Shokunin and Matthew Stanley");
  });

  it("keeps a guest author as written, without a card to link to", () => {
    const html = render({ ...base, authors: ["Shokunin", "A Guest"] }, false);
    expect(html).toContain('href="/team#shokunin"');
    expect(html).not.toContain("/team#a-guest");
    expect(html.replace(/<[^>]+>/g, "")).toContain("Shokunin and A Guest");
  });

  it("still reads the older single author field, and links it", () => {
    const html = render({ ...base, author: "Matthew Stanley" }, false);
    expect(html).toContain('href="/team#matthew-stanley"');
    expect(html.replace(/<[^>]+>/g, "")).not.toContain(" and ");
  });
});
