import { describe, expect, it } from "vitest";
import { DOCS } from "./docsContent";
import { previewForHref } from "./preview";

describe("documentation link previews", () => {
  it("retains page identity and description through the body-free manifest", () => {
    const item = DOCS.find((entry) => entry.slug === "start/quickstart");
    expect(item).toBeDefined();

    expect(previewForHref(`/docs/${item!.slug}`)).toMatchObject({
      kicker: item!.kicker || "Docs",
      title: item!.title,
      description: item!.summary || item!.desc,
      cta: "View",
      internal: true,
      isVideo: false,
    });
  });

  it("keeps the full nested slug when resolving a page", () => {
    const preview = previewForHref("/docs/concepts/recompiler-and-runtime");
    expect(preview?.title).toBe("What are the recompiler and runtime?");
  });
});
