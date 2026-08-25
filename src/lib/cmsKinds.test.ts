import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { CMS_KINDS, FOLDER_KIND, MAX_FOLDER_DEPTH, NEW_LABEL } from "./cmsKinds";
import { KINDS, KIND_NOUN, PUBLISH_FIELDS, PUBLISH_LIST_FIELDS, PUBLISH_KIND_FIELDS, mdFields } from "../../api/cms";
import {
  KIND_DIRS,
  KIND_NOUN as DEV_KIND_NOUN,
  PUBLISH_FIELDS as DEV_PUBLISH_FIELDS,
  PUBLISH_LIST_FIELDS as DEV_PUBLISH_LIST_FIELDS,
  PUBLISH_KIND_FIELDS as DEV_PUBLISH_KIND_FIELDS,
  mdFields as devMdFields,
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

  it("copies the same publishable LIST fields in both backends", () => {
    // `repos` is a list. The scalar loop tests `typeof v === "string"`, so a
    // list named there is accepted by /post and never written.
    expect([...DEV_PUBLISH_LIST_FIELDS]).toEqual([...PUBLISH_LIST_FIELDS]);
    expect([...PUBLISH_LIST_FIELDS]).toContain("tags");
    expect([...PUBLISH_LIST_FIELDS]).toContain("repos");
  });

  it("gates the same fields per kind in both backends", () => {
    expect(DEV_PUBLISH_KIND_FIELDS).toEqual(PUBLISH_KIND_FIELDS);
  });

  it("gives every kind an allow list, of fields both backends can copy", () => {
    const copyable = new Set<string>([...PUBLISH_FIELDS, ...PUBLISH_LIST_FIELDS]);
    for (const kind of CMS_KINDS) {
      const fields = PUBLISH_KIND_FIELDS[kind];
      expect(fields, kind).toBeTruthy();
      for (const field of fields) expect(copyable, `${kind}.${field}`).toContain(field);
    }
  });

  it("leaves no publishable field that no kind can receive", () => {
    // A field in the copy list that no kind allows is dead: /post would take it
    // and drop it, which is the shape of the bug the gate was added for.
    const allowed = new Set(Object.values(PUBLISH_KIND_FIELDS).flat());
    for (const field of [...PUBLISH_FIELDS, ...PUBLISH_LIST_FIELDS]) {
      expect(allowed, field).toContain(field);
    }
  });

  it("keeps a docs page free of the fields both documents say it does not take", () => {
    // docs/AUTHORING.md and public/agent.md: "It takes no date and no year: a
    // docs page is maintained, not published on a day."
    for (const field of ["date", "year", "status", "availability", "platform", "repo", "videoUrl", "venue", "authorBio"]) {
      expect(PUBLISH_KIND_FIELDS.docs, field).not.toContain(field);
    }
    // ...and carries the two it does: every docs page has `updated`, and the
    // pages inside sections have `repos`.
    expect(PUBLISH_KIND_FIELDS.docs).toContain("updated");
    expect(PUBLISH_KIND_FIELDS.docs).toContain("repos");
  });

  it("keeps `repos` to docs and `summary`/`pageType` off the other kinds", () => {
    for (const kind of ["blog", "hardware", "games"]) {
      expect(PUBLISH_KIND_FIELDS[kind], kind).not.toContain("repos");
      expect(PUBLISH_KIND_FIELDS[kind], kind).not.toContain("summary");
      expect(PUBLISH_KIND_FIELDS[kind], kind).not.toContain("pageType");
      expect(PUBLISH_KIND_FIELDS[kind], kind).not.toContain("sectionTitle");
    }
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

// The editor's structured fields come from mdFields(), and each backend keeps
// its own copy of that parser. Until now nothing held them together, which is
// the same gap PUBLISH_FIELDS had before its test above: they agreed by luck.
// So: identical output over every real page in the tree, and over the awkward
// inputs where a copy could quietly diverge, the failure path included.
describe("mdFields parity between the two backends", () => {
  const ROOT = path.resolve(__dirname, "../..");
  const frontmatterOf = (file: string) => {
    const raw = fs.readFileSync(file, "utf8");
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    return m ? m[1] : "";
  };
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) return walk(p);
      return e.name === "index.md" ? [p] : [];
    });

  it("parses every page in data/ identically", () => {
    const pages = walk(path.join(ROOT, "data"));
    // A wrong glob returning nothing would pass vacuously.
    expect(pages.length).toBeGreaterThan(150);
    for (const p of pages) {
      const fm = frontmatterOf(p);
      expect(devMdFields(fm), path.relative(ROOT, p)).toEqual(mdFields(fm));
    }
  });

  it("agrees on wrong-typed values, unknown keys and empty input", () => {
    const awkward = [
      "",
      "title: 42\ntags: not-a-list\ndraft: yes\nfeatured: 1",
      'title: "T"\nunknownKey: kept?\ntags: [a, 3, b]\nsectionTitle: ["not", "a", "string"]',
      "date: 2026-08-25\n", // YAML date object, not a string
    ];
    for (const fm of awkward) {
      expect(devMdFields(fm), JSON.stringify(fm)).toEqual(mdFields(fm));
    }
  });

  it("agrees on invalid YAML, catch path included", () => {
    const broken = 'title: "unterminated\n  [: {';
    const prod = mdFields(broken);
    expect(devMdFields(broken)).toEqual(prod);
    // The catch must yield the zeroed shape, not a bare {}: the editor reads
    // fields.title off it unconditionally.
    expect(prod.title).toBe("");
    expect(prod.tags).toEqual([]);
    expect(prod.draft).toBe(false);
  });
});
