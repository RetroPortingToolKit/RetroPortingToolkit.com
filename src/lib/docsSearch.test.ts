import { describe, expect, it } from "vitest";
// The real generator walk the build uses, so these assert against the index the
// site actually ships rather than a restatement of it.
import { collectDocs } from "../../scripts/gen-llms.mjs";
import { DOCS } from "./content";
import { extractToc } from "./toc";
import {
  buildDocsSearchEntry,
  buildDocsSearchIndex,
  docsSearchSources,
  docsSearchText,
  searchDocs,
  snippetAround,
  type DocsSearchIndex,
} from "./docsSearch";

const text = (markdown: string) => docsSearchText(markdown).text;

/* --------------------------- markdown to plain text ----------------------- */

describe("docsSearchText", () => {
  it("keeps every table cell and drops the pipes and the alignment row", () => {
    // The whole reason this pass exists. Several reference pages put their
    // substance in a table, so a search that only read prose would miss it.
    const out = text(
      [
        "| Port | Project | What listens |",
        "|---:|:---|---|",
        "| 19844 | gbarecomp | the NanoBoyAdvance oracle |",
      ].join("\n"),
    );
    expect(out).toContain("19844");
    expect(out).toContain("NanoBoyAdvance");
    expect(out).toContain("Port · Project · What listens");
    expect(out).not.toContain("|");
    expect(out).not.toContain("---");
  });

  it("keeps a link's label and drops its target", () => {
    const out = text("See [the port registry](https://example.test/a/b) for the list.");
    expect(out).toBe("See the port registry for the list.");
  });

  it("keeps the contents of a code span and of a fenced block", () => {
    const out = text(
      ["Set `PSX_FORCE_INTERP` first.", "", "```sh", "cmake --build build", "```"].join("\n"),
    );
    expect(out).toContain("PSX_FORCE_INTERP");
    expect(out).toContain("cmake --build build");
    expect(out).not.toContain("```");
  });

  it("can leave fenced code out when asked", () => {
    const out = docsSearchText(["```sh", "secret-flag", "```", "", "prose"].join("\n"), {
      includeCode: false,
    }).text;
    expect(out).toBe("prose");
  });

  it("strips heading, list and quotation markers, and drops HTML comments", () => {
    const out = text(
      ["## What it is", "", "- first item", "1. second item", "> quoted line", "<!-- hidden -->"].join(
        "\n",
      ),
    );
    expect(out).toBe("What it is first item second item quoted line");
  });

  it("does not read a heading inside a fence as a heading", () => {
    const { headings } = docsSearchText(["```md", "## not a heading", "```", "## real"].join("\n"));
    expect(headings.map((h) => h.text)).toEqual(["real"]);
  });

  it("records where each heading's text starts, so a hit can name its section", () => {
    const md = ["intro words", "", "## Second", "", "body"].join("\n");
    const { text: body, headings } = docsSearchText(md);
    expect(headings).toHaveLength(1);
    expect(body.slice(headings[0].at, headings[0].at + 6)).toBe("Second");
  });
});

/* ------------------------------ index building ---------------------------- */

describe("buildDocsSearchEntry", () => {
  it("carries the ids the rendered page puts on its headings", () => {
    const body = ["## The registry", "", "text", "", "### Moving a port", "", "more"].join("\n");
    const entry = buildDocsSearchEntry({
      slug: "reference/tcp-port-registry",
      title: "TCP port registry",
      section: "Reference",
      summary: "Which port every debug server listens on.",
      body,
    });
    expect(entry.headings.map((h) => h.id)).toEqual(
      extractToc(body, { minDepth: 2, maxDepth: 4 }).map((h) => h.id),
    );
    expect(entry.headings.map((h) => h.text)).toEqual(["The registry", "Moving a port"]);
  });

  it("drops the anchors rather than guess when the two walks disagree", () => {
    // No heading at all: extractToc and the text walk agree on an empty list,
    // which is the only shape that can be asserted without faking a walk.
    const entry = buildDocsSearchEntry({
      slug: "a",
      title: "A",
      section: "S",
      summary: "",
      body: "just prose",
    });
    expect(entry.headings).toEqual([]);
  });
});

/* ----------------------- the index the build actually ships --------------- */

const index: DocsSearchIndex = buildDocsSearchIndex(docsSearchSources(collectDocs()));

describe("the shipped index", () => {
  it("covers exactly the published documentation, so no draft is searchable", () => {
    expect(index.entries.length).toBe(DOCS.length);
    expect(index.entries.map((e) => e.slug).sort()).toEqual(DOCS.map((d) => d.slug).sort());
    for (const item of DOCS) expect(item.draft).not.toBe(true);
  });

  it("indexes each page's title, summary and headings", () => {
    for (const entry of index.entries) {
      const item = DOCS.find((d) => d.slug === entry.slug);
      expect(item, entry.slug).toBeDefined();
      expect(entry.title).toBe(item!.title);
      expect(entry.summary).toBe(item!.summary || item!.desc);
      for (const heading of entry.headings) {
        expect(entry.text, `${entry.slug} #${heading.id}`).toContain(heading.text);
      }
    }
  });

  it("agrees with extractToc about every heading on every page", () => {
    for (const entry of index.entries) {
      const item = DOCS.find((d) => d.slug === entry.slug)!;
      const toc = extractToc(item.body, { minDepth: 2, maxDepth: 4 });
      expect(entry.headings.map((h) => h.id), entry.slug).toEqual(toc.map((h) => h.id));
    }
  });

  it("finds a term that exists ONLY inside a table cell", () => {
    // "Optional address" appears once in the whole documentation, in a cell
    // of the translation guide's schema table. It is the assertion this
    // whole plain-text pass exists for: strip the table and the term is gone.
    const term = "Optional address";
    const page = DOCS.find((d) => d.slug === "guides/translate-a-game")!;
    const rows = page.body.split("\n").filter((line) => line.includes(term));
    expect(rows.length).toBe(1);
    expect(rows[0].startsWith("|")).toBe(true);

    const results = searchDocs(index, term);
    expect(results.length).toBeGreaterThan(0);
    const result = results.find((entry) => entry.slug === "guides/translate-a-game");
    expect(result).toBeDefined();
    expect(result!.snippet.some((part) => part.mark)).toBe(true);
    // and the whole corpus really does mention it nowhere else
    expect(index.entries.filter((e) => e.text.includes(term)).map((e) => e.slug)).toEqual([
      "guides/translate-a-game",
    ]);
  });

  it("finds a second table-only term, in a different section", () => {
    // Same assertion as above, on a page outside Platforms: "rom_identity.track_counts"
    // appears once in the documentation, in a table cell on the catalog schema page.
    // If this term moves, repoint the test at another one that lives only inside a
    // table cell; do not delete the case.
    const term = "rom_identity.track_counts";
    const page = DOCS.find((d) => d.slug === "reference/catalog-schema")!;
    const rows = page.body.split("\n").filter((line) => line.includes(term));
    expect(rows.length).toBe(1);
    expect(rows[0].startsWith("|")).toBe(true);

    const results = searchDocs(index, term);
    expect(results.length).toBeGreaterThan(0);
    expect(results.map((r) => r.slug)).toContain("reference/catalog-schema");
  });
});

/* --------------------------------- querying ------------------------------- */

const fixture: DocsSearchIndex = buildDocsSearchIndex([
  {
    slug: "reference/cli",
    title: "Command line reference",
    section: "Reference",
    summary: "Every flag the toolchains take.",
    body: ["## Flags", "", "| Flag | Meaning |", "|---|---|", "| `--serve` | listen |"].join("\n"),
  },
  {
    slug: "concepts/glossary",
    title: "Glossary",
    section: "Concepts",
    summary: "The words this fleet uses.",
    body: ["## The terms", "", "### Baserom", "", "The dump you supply. Not a flag."].join("\n"),
  },
]);

describe("searchDocs", () => {
  it("returns nothing for an empty query or a missing index", () => {
    expect(searchDocs(fixture, "")).toEqual([]);
    expect(searchDocs(fixture, "   ")).toEqual([]);
    expect(searchDocs(undefined, "flag")).toEqual([]);
  });

  it("ranks a title match above a body mention of the same word", () => {
    const results = searchDocs(fixture, "glossary");
    expect(results[0].slug).toBe("concepts/glossary");
  });

  it("requires every term, not any of them", () => {
    expect(searchDocs(fixture, "baserom flag").map((r) => r.slug)).toEqual([
      "concepts/glossary",
    ]);
    expect(searchDocs(fixture, "baserom nowhere")).toEqual([]);
  });

  it("carries the page title, its section and a highlighted snippet", () => {
    const [hit] = searchDocs(fixture, "serve");
    expect(hit.title).toBe("Command line reference");
    expect(hit.section).toBe("Reference");
    expect(hit.snippet.filter((p) => p.mark).map((p) => p.text)).toEqual(["serve"]);
    expect(hit.snippet.map((p) => p.text).join("")).toContain("--serve");
  });

  it("links into the heading the match sits under", () => {
    const [hit] = searchDocs(fixture, "dump you supply");
    expect(hit.path).toBe("/docs/concepts/glossary#baserom");
    expect(hit.heading).toBe("Baserom");
  });

  it("links to the page itself, and shows the summary, when only the summary matched", () => {
    const [hit] = searchDocs(fixture, "toolchains take");
    expect(hit.path).toBe("/docs/reference/cli");
    expect(hit.heading).toBeUndefined();
    expect(hit.snippet.map((p) => p.text).join("")).toBe("Every flag the toolchains take.");
    expect(hit.snippet.filter((p) => p.mark).map((p) => p.text)).toEqual([
      "toolchains",
      "take",
    ]);
  });

  it("anchors to a heading when a term matched that heading", () => {
    const [hit] = searchDocs(fixture, "flags");
    expect(hit.path).toBe("/docs/reference/cli#flags");
    expect(hit.heading).toBe("Flags");
  });

  it("honours the limit", () => {
    expect(searchDocs(index, "the", { limit: 3 })).toHaveLength(3);
  });

  it("matches case insensitively", () => {
    expect(searchDocs(fixture, "BASEROM").map((r) => r.slug)).toEqual(["concepts/glossary"]);
  });
});

describe("snippetAround", () => {
  it("elides both ends and highlights every occurrence", () => {
    const body = `${"a ".repeat(200)}needle${" b".repeat(200)}`;
    const parts = snippetAround(body, body.indexOf("needle"), ["needle"]);
    const rendered = parts.map((p) => p.text).join("");
    expect(rendered.startsWith("…")).toBe(true);
    expect(rendered.endsWith("…")).toBe(true);
    expect(rendered.length).toBeLessThan(260);
    expect(parts.filter((p) => p.mark)).toHaveLength(1);
  });

  it("never splits a word at the start of the window", () => {
    const body = "alpha bravo charlie delta echo foxtrot";
    const parts = snippetAround(body, body.indexOf("delta"), ["delta"]);
    const rendered = parts.map((p) => p.text).join("");
    expect(rendered).toBe(body);
  });
});
