import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
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
  renderToStaticMarkup(createElement(ItemDetail, { item, mediaActive }));

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
