import { describe, expect, it } from "vitest";
import DOCS_MANIFEST from "virtual:docs-manifest";
import { docsManifest, collectDocs } from "../../scripts/gen-llms.mjs";
import { DOCS, DOCS_SECTIONS } from "./docsContent";

describe("the body-free documentation manifest", () => {
  it("is the exact manifest produced by the shared filesystem walk", () => {
    expect(DOCS_MANIFEST).toEqual(docsManifest(collectDocs()));
  });

  it("covers published pages only and carries no prose or media fields", () => {
    expect(DOCS_MANIFEST.map((entry) => entry.slug).sort()).toEqual(
      DOCS.map((item) => item.slug).sort(),
    );
    for (const entry of DOCS_MANIFEST) {
      expect(entry).not.toHaveProperty("body");
      expect(entry).not.toHaveProperty("cover");
      expect(entry).not.toHaveProperty("gallery");
      expect(entry).not.toHaveProperty("links");
    }
  });

  it("retains the section identity and order used by navigation", () => {
    const sections = DOCS_MANIFEST
      .filter((entry) => entry.isSectionIndex)
      .sort(
        (a, b) =>
          a.sectionOrder - b.sectionOrder ||
          a.order - b.order ||
          a.slug.localeCompare(b.slug),
      );
    expect(sections.map((entry) => entry.section)).toEqual(
      DOCS_SECTIONS.map((section) => section.slug),
    );
    expect(
      sections.map((entry) => entry.sectionTitle || entry.title),
    ).toEqual(DOCS_SECTIONS.map((section) => section.title));
  });
});
