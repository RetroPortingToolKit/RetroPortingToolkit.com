import { describe, expect, it } from "vitest";
import { resolveDocsPreviewItem } from "./docsCmsPreview";
import type { CmsDraft } from "./cmsPreviewCore";

describe("documentation CMS preview", () => {
  it("parses a brand-new docs draft that is absent from the static glob", () => {
    const draft: CmsDraft = {
      id: "data/docs/99_future/01_first-page/index.md",
      previewPath: "/docs/future/first-page",
      payload: {
        frontmatter: [
          "title: First future page",
          "summary: Visible before the first save.",
          "draft: true",
        ].join("\n"),
        body: "## It works\n\nUnsaved prose.",
      },
    };

    const item = resolveDocsPreviewItem(draft, "future/first-page");
    expect(item).toMatchObject({
      kind: "docs",
      slug: "future/first-page",
      section: "future",
      title: "First future page",
      summary: "Visible before the first save.",
      draft: true,
    });
    expect(item?.body).toContain("Unsaved prose.");
  });

  it("does not apply a draft intended for another URL", () => {
    const draft: CmsDraft = {
      id: "data/docs/99_future/01_first-page/index.md",
      previewPath: "/docs/future/first-page",
      payload: { frontmatter: "title: Wrong page", body: "Wrong body." },
    };
    expect(resolveDocsPreviewItem(draft, "start/quickstart")).toBeUndefined();
  });
});
