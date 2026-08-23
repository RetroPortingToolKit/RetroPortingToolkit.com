import { describe, expect, it } from "vitest";
import { extractToc, headingText, tocTree } from "./toc";

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
