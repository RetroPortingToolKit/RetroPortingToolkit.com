import { describe, it, expect } from "vitest";
import { CMS_KINDS, FOLDER_KIND, MAX_FOLDER_DEPTH, NEW_LABEL } from "./cmsKinds";
import { KINDS, KIND_NOUN, PUBLISH_FIELDS } from "../../api/cms";
import {
  KIND_DIRS,
  KIND_NOUN as DEV_KIND_NOUN,
  PUBLISH_FIELDS as DEV_PUBLISH_FIELDS,
  itemParts,
} from "../../scripts/cms-dev.mjs";

// The editor sends `kind` to POST /api/cms/new, and both backends reject
// anything they do not recognise with "unknown_kind". Nothing else holds the
// three lists together, and a mismatch is invisible until someone clicks Add:
// FOLDER_KIND once mapped Games -> "game" while both backends wanted "games",
// so creating a game failed everywhere.
describe("CMS kind vocabulary", () => {
  it("matches the prod function's accepted kinds", () => {
    expect([...CMS_KINDS].sort()).toEqual([...KINDS].sort());
  });

  it("matches the dev middleware's accepted kinds", () => {
    expect([...CMS_KINDS].sort()).toEqual([...KIND_DIRS].sort());
  });

  it("maps every sidebar folder to a kind a backend accepts", () => {
    for (const [folder, kind] of Object.entries(FOLDER_KIND)) {
      expect(CMS_KINDS, `folder "${folder}"`).toContain(kind);
    }
  });

  it("labels every kind, so the Add field never reads 'New undefined title'", () => {
    for (const kind of CMS_KINDS) expect(NEW_LABEL[kind]).toBeTruthy();
  });

  it("covers the folder labels both backends actually emit", () => {
    // prod capitalises the directory name; dev uses its own KIND_GROUP labels.
    for (const label of ["Blog", "Hardware", "Games", "Articles", "Docs"]) {
      expect(FOLDER_KIND[label], `label "${label}"`).toBeTruthy();
    }
  });

  it("nouns every kind in both backends, identically", () => {
    // A missing key reads as "One line describing this undefined." in a stub.
    for (const kind of CMS_KINDS) expect(KIND_NOUN[kind], kind).toBeTruthy();
    expect(DEV_KIND_NOUN).toEqual(KIND_NOUN);
  });

  it("copies the same publishable frontmatter fields in both backends", () => {
    // Two hand-maintained copies of one list: /post on dev would silently drop
    // a field prod keeps, and the page would differ by where it was written.
    expect([...DEV_PUBLISH_FIELDS]).toEqual([...PUBLISH_FIELDS]);
  });

  it("gives every kind a folder depth", () => {
    for (const kind of CMS_KINDS) expect(MAX_FOLDER_DEPTH[kind], kind).toBeGreaterThan(0);
  });
});

// The id vocabulary is what every CMS route takes apart: read, save, rename,
// duplicate, delete, upload. Docs are the one kind whose folders nest, and
// nothing else may, or a two-segment blog id would be accepted by the CMS and
// dropped by the site.
describe("CMS item ids", () => {
  it("reads a flat item id", () => {
    expect(itemParts("data/blog/30_a-post/index.md")).toMatchObject({
      kind: "blog",
      parent: "",
      leaf: "30_a-post",
      slug: "a-post",
    });
  });

  it("reads a nested docs id, keeping the section in the slug", () => {
    expect(itemParts("data/docs/01_start/01_quickstart/index.md")).toMatchObject({
      kind: "docs",
      parent: "01_start",
      leaf: "01_quickstart",
      slug: "start/quickstart",
    });
  });

  it("reads a docs section's own id", () => {
    expect(itemParts("data/docs/01_start/index.md")).toMatchObject({
      kind: "docs",
      parent: "",
      slug: "start",
    });
  });

  it("refuses nesting for the kinds that do not nest", () => {
    expect(itemParts("data/blog/a/b/index.md")).toBeNull();
    expect(itemParts("data/games/a/b/index.md")).toBeNull();
  });

  it("refuses anything deeper than a docs section and its page", () => {
    expect(itemParts("data/docs/a/b/c/index.md")).toBeNull();
  });

  it("refuses a non-item path", () => {
    expect(itemParts("data/about.md")).toBeNull();
    expect(itemParts("data/docs/index.md")).toBeNull();
  });
});
