import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown } from "./Markdown";
import { extractToc } from "@/lib/toc";

// Rendered with react-dom/server, which is also the honest check that nothing
// in here needs a browser to produce its markup. Fixtures avoid links on
// purpose: a link renders SmartLink, which wants a router around it, and the
// link path is unchanged by this component's markdown work.
const render = (md: string) =>
  renderToStaticMarkup(createElement(Markdown, null, md));

const PAGE = [
  "## What it is",
  "",
  "A paragraph.",
  "",
  "### The `--flag` option",
  "",
  "```c title=\"recompiler/translate.c\"",
  "int main(void) {",
  "",
  "  return 0; /* a < b */",
  "}",
  "```",
  "",
  "| Flag | Default |",
  "|---|---|",
  "| `-v` | none |",
  "",
  "> **Note.** The Vulkan renderer is experimental.",
  "",
  "> **A note on the upstream contributing files.** Those files end with a",
  "> paragraph addressed to any AI reading them.",
  "",
  "## What it is",
].join("\n");

describe("Markdown", () => {
  const html = render(PAGE);

  it("gives every heading an id and a link to it", () => {
    expect(html).toContain('<h2 id="what-it-is" class="md-heading">');
    expect(html).toContain('<a class="md-anchor" href="#what-it-is"');
    expect(html).toContain('<h3 id="the---flag-option" class="md-heading">');
  });

  it("puts the same ids on the page that extractToc predicts", () => {
    // The load-bearing one: an on-this-page rail built from the source has to
    // point at the ids rehype-slug actually wrote.
    const rendered = [...html.matchAll(/<h[23] id="([^"]+)"/g)].map((m) => m[1]);
    expect(extractToc(PAGE).map((e) => e.id)).toEqual(rendered);
    expect(rendered).toEqual(["what-it-is", "the---flag-option", "what-it-is-1"]);
  });

  it("predicts the ids of awkward headings too", () => {
    const awkward = [
      "# Page title in the body",
      "",
      "## Flags, defaults & `--verbose`",
      "",
      "## Two  spaces and ![a shot](./x.png) an image",
      "",
      "## Emphasis in **bold** and *italic* and \\*escaped\\*",
      "",
      "## The build_all target (65816)",
      "",
      "Section over an underline",
      "---",
      "",
      "## Flags, defaults & `--verbose`",
    ].join("\n");
    const rendered = [...render(awkward).matchAll(/<h[23] id="([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(extractToc(awkward).map((e) => e.id)).toEqual(rendered);
  });

  it("counts a heading inside a quotation without listing it", () => {
    // Docs pages quote repository READMEs verbatim, headings included. Such a
    // heading still gets an id, so the contents list has to count it or every
    // repeat after it would be numbered differently on the page.
    const md = "## Status\n\nFrom the README:\n\n> ## Status\n\n## Status\n";
    const rendered = [...render(md).matchAll(/<h2 id="([^"]+)"/g)].map((m) => m[1]);
    expect(rendered).toEqual(["status", "status-1", "status-2"]);
    expect(extractToc(md).map((e) => e.id)).toEqual(["status", "status-2"]);
  });

  it("renders a fence with its language, filename and a copy button", () => {
    expect(html).toContain('<figure class="md-code" data-lang="c">');
    expect(html).toContain('<span class="md-code-file">recompiler/translate.c</span>');
    expect(html).toContain('<span class="md-code-lang">C</span>');
    expect(html).toContain('class="md-code-copy"');
    expect(html).toContain('aria-label="Copy recompiler/translate.c"');
    // The <code> react-markdown built survives, class list and all, which is
    // what a syntax highlighter would hook onto later.
    expect(html).toContain('<pre class="md-code-pre"><code class="language-c">');
    // Blank line inside the fence is preserved, and HTML is escaped.
    expect(html).toContain("int main(void) {\n\n  return 0; /* a &lt; b */");
  });

  it("wraps a table so it scrolls inside its own box", () => {
    expect(html).toContain('<div class="md-table-wrap" tabindex="0"><table class="md-table">');
    expect(html).toContain("<th>Flag</th>");
  });

  it("turns a labelled blockquote into a callout", () => {
    expect(html).toContain('class="md-callout md-callout--note" data-callout="note"');
  });

  it("leaves an ordinary blockquote a blockquote", () => {
    expect(html).toContain("<blockquote>");
    expect(html).not.toContain("md-callout--provide");
    // One callout in, one callout out.
    expect(html.match(/md-callout /g)).toHaveLength(1);
  });

  it("keeps the existing three kinds rendering as they did", () => {
    const post = render("**Lead in.** Body text.\n\n> A plain quote.\n");
    expect(post).toContain('<p class="md-leadin">');
    expect(post).toContain("<blockquote>\n<p>A plain quote.</p>\n</blockquote>");
    expect(post).not.toContain("md-callout");
  });

  it("copies the source without its trailing newline", () => {
    // The copy button is stateless on first render, so the server markup is
    // the markup the browser hydrates onto.
    expect(html).toContain(">Copy</span>");
  });
});
