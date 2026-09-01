import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { describe, expect, it } from "vitest";
import { extractToc, headingText, tocTree } from "./toc";

const DATA_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "data",
);

/**
 * The heading ids the REAL render puts in the DOM: the same react-markdown with
 * the same plugins src/components/Markdown.tsx mounts, which is the authority
 * every id in this file has to match. A heading inside a blockquote is flagged
 * rather than dropped, because rehype-slug gives it an id and a place in the
 * dedupe sequence while extractToc counts it and does not list it.
 */
function realHeadings(md: string): { id: string; depth: number; quoted: boolean }[] {
  const html = renderToStaticMarkup(
    createElement(ReactMarkdown, {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeSlug],
      urlTransform: (url: string) => url,
      children: md,
    }),
  );
  const out: { id: string; depth: number; quoted: boolean }[] = [];
  let quotes = 0;
  for (const [, closing, tag, attrs] of html.matchAll(
    /<(\/?)(blockquote|h[1-6])\b([^>]*)>/g,
  )) {
    if (tag === "blockquote") {
      quotes += closing ? -1 : 1;
      continue;
    }
    if (closing) continue;
    out.push({
      id: /id="([^"]*)"/.exec(attrs)?.[1] ?? "",
      depth: Number(tag.slice(1)),
      quoted: quotes > 0,
    });
  }
  return out;
}

/** Every page body under data/, frontmatter removed. */
function everyBody(): { file: string; body: string }[] {
  const out: { file: string; body: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".md")) {
        const raw = fs.readFileSync(full, "utf8");
        const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
        out.push({
          file: path.relative(DATA_DIR, full),
          body: (m ? m[2] : raw).trim(),
        });
      }
    }
  };
  walk(DATA_DIR);
  return out;
}

describe("headingText", () => {
  it("keeps the text of links and code spans", () => {
    expect(headingText("The `--flag` option")).toBe("The --flag option");
    expect(headingText("See [the recompiler](/docs/start)")).toBe(
      "See the recompiler",
    );
    expect(headingText("**Bold** and *italic* and ~~struck~~")).toBe(
      "Bold and italic and struck",
    );
  });

  it("keeps a <placeholder> that a code span makes literal", () => {
    // Raw HTML used to be stripped before code spans were parked, so the
    // <id> in a path came off inside the backticks too and the heading slugged
    // to an id the rendered page does not carry.
    expect(headingText("`titles/<id>.json`: identity")).toBe(
      "titles/<id>.json: identity",
    );
    // Outside a code span it really is a tag, and contributes no text.
    expect(headingText("A <span>tagged</span> heading")).toBe("A tagged heading");
  });

  it("leaves an underscore inside an identifier alone", () => {
    expect(headingText("The build_all target")).toBe("The build_all target");
    expect(headingText("A _stressed_ word")).toBe("A stressed word");
  });

  it("drops images, closing hashes and escapes", () => {
    // Two spaces: an image contributes no text, and the spaces around it are
    // exactly what rehype-slug sees, so they are kept rather than collapsed.
    expect(headingText("Before ![shot](./a.png) after")).toBe("Before  after");
    expect(headingText("Closed heading ##")).toBe("Closed heading");
    expect(headingText("Literal \\*stars\\*")).toBe("Literal *stars*");
    expect(headingText("Ampersand &amp; entity")).toBe("Ampersand & entity");
  });
});

describe("extractToc", () => {
  const body = [
    "Intro paragraph.",
    "",
    "## What it is",
    "",
    "Text.",
    "",
    "### The `--flag` option",
    "",
    "#### Too deep for the rail",
    "",
    "## What it is",
    "",
    "Text.",
  ].join("\n");

  it("returns depth, text and id for H2 and H3 by default", () => {
    expect(extractToc(body)).toEqual([
      { depth: 2, text: "What it is", id: "what-it-is" },
      { depth: 3, text: "The --flag option", id: "the---flag-option" },
      { depth: 2, text: "What it is", id: "what-it-is-1" },
    ]);
  });

  it("takes a depth range", () => {
    expect(extractToc(body, { minDepth: 2, maxDepth: 4 }).map((e) => e.depth)).toEqual(
      [2, 3, 4, 2],
    );
    expect(extractToc(body, { minDepth: 3, maxDepth: 3 })).toHaveLength(1);
  });

  it("is empty for an empty body", () => {
    expect(extractToc("")).toEqual([]);
    expect(extractToc("Just a paragraph.\n")).toEqual([]);
  });

  it("ignores a comment inside a fenced code block", () => {
    const md = [
      "## Build it",
      "",
      "```sh",
      "# not a heading",
      "",
      "make",
      "```",
      "",
      "~~~c",
      "## also not a heading",
      "~~~",
      "",
      "## Run it",
    ].join("\n");
    expect(extractToc(md).map((e) => e.text)).toEqual(["Build it", "Run it"]);
  });

  it("keeps a heading's id stable when an unrelated heading is added", () => {
    const before = extractToc("## Alpha\n\n## Beta\n");
    const after = extractToc("## Alpha\n\n## Gamma\n\n## Beta\n");
    const idOf = (entries: ReturnType<typeof extractToc>, text: string) =>
      entries.find((e) => e.text === text)?.id;
    expect(idOf(before, "Beta")).toBe("beta");
    expect(idOf(after, "Beta")).toBe("beta");
    expect(idOf(after, "Alpha")).toBe(idOf(before, "Alpha"));
  });

  it("counts a heading it does not return, so a repeat's suffix still matches", () => {
    // rehype-slug slugs every heading in the document. An H1 above an H2 of the
    // same name takes the bare slug, so the H2 must be the "-1" one.
    expect(extractToc("# Setup\n\n## Setup\n")).toEqual([
      { depth: 2, text: "Setup", id: "setup-1" },
    ]);
  });

  it("counts a heading inside a quotation but does not list it", () => {
    const md = "## Status\n\n> ## Status\n>\n> Quoted from a README.\n\n## Status\n";
    expect(extractToc(md).map((e) => e.id)).toEqual(["status", "status-2"]);
  });

  it("reads setext headings, which remark also treats as headings", () => {
    expect(extractToc("Section title\n---\n\nText.\n")).toEqual([
      { depth: 2, text: "Section title", id: "section-title" },
    ]);
    // A rule after a list item is a rule, not a heading.
    expect(extractToc("- item\n---\n")).toEqual([]);
  });

  it("does not mistake a table's delimiter row for a heading", () => {
    const md = "## Flags\n\n| Flag | Meaning |\n|---|---|\n| `-v` | Verbose |\n";
    expect(extractToc(md).map((e) => e.text)).toEqual(["Flags"]);
  });

  // The six headings on the site that carry a <placeholder> inside a code span:
  // five in data/docs/06_reference/06_catalog-schema/index.md and one in
  // data/docs/06_reference/05_configuration/index.md. Each of these used to
  // come out without its placeholder ("titlesjson-identity"), which is a
  // contents entry and a search result that jump nowhere.
  it("ids the reference headings the way the page ids them", () => {
    const cases: [string, string][] = [
      ["## `titles/<id>.json`: identity", "titlesidjson-identity"],
      ["## `titles/<id>.json`: verification", "titlesidjson-verification"],
      ["## `titles/<id>.json`: release", "titlesidjson-release"],
      ["## `titles/<id>.json`: build", "titlesidjson-build"],
      [
        "## `titles/<id>.json`: launch, saves and netplay",
        "titlesidjson-launch-saves-and-netplay",
      ],
      ["## BIOS profile: `bios/<STEM>.toml`", "bios-profile-biosstemtoml"],
    ];
    for (const [md, id] of cases) {
      expect(extractToc(md).map((e) => e.id), md).toEqual([id]);
      expect(extractToc(md).map((e) => e.id), md).toEqual(
        realHeadings(md).map((h) => h.id),
      );
    }
  });
});

describe("tocTree", () => {
  it("nests deeper headings under the one above them", () => {
    const tree = tocTree(extractToc("## One\n\n### One a\n\n### One b\n\n## Two\n"));
    expect(tree.map((n) => n.text)).toEqual(["One", "Two"]);
    expect(tree[0].children.map((n) => n.text)).toEqual(["One a", "One b"]);
    expect(tree[1].children).toEqual([]);
  });

  it("promotes an orphan to the top rather than dropping it", () => {
    const tree = tocTree(extractToc("### Orphan\n\n## Parent\n", { minDepth: 2, maxDepth: 3 }));
    expect(tree.map((n) => n.text)).toEqual(["Orphan", "Parent"]);
  });
});

// The whole published corpus, through this extractor and through the renderer
// that actually mounts. scripts/prerender-md.test.mjs holds the same check for
// the static shell; this is the other half of the same guarantee, because the
// ids here are what the contents rail links to and what every docsSearch result
// deep-links into. An id this file invents that the page does not carry is a
// link that lands nowhere, and nothing else in the suite would notice.
describe("extractToc against the real renderer", () => {
  it("gives every heading in data/ the id rehype-slug gives it", () => {
    const disagree: { file: string; mine: string[]; theirs: string[] }[] = [];
    let headings = 0;
    for (const { file, body } of everyBody()) {
      const real = realHeadings(body);
      headings += real.length;
      // Every depth, so the H1 is compared too. What extractToc drops after
      // counting it is a quoted heading and an empty one, so the real list
      // drops exactly those before the two are lined up.
      const mine = extractToc(body, { minDepth: 1, maxDepth: 6 }).map((e) => e.id);
      const theirs = real.filter((h) => !h.quoted && h.id).map((h) => h.id);
      if (mine.join("|") !== theirs.join("|")) disagree.push({ file, mine, theirs });
    }
    // A mismatch is a dead anchor on a published page, so the count is asserted
    // too: a walk that silently found nothing would prove nothing.
    expect(headings).toBeGreaterThan(700);
    expect(disagree).toEqual([]);
  });
});
