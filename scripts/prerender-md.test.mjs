import { describe, expect, it } from "vitest";
import { mdToHtml } from "./vite-prerender.mjs";

// mdToHtml builds the crawlable text inside <div id="root">, which is what a
// search engine, an unfurler and any reader without JavaScript actually gets.
// A documentation page's tables and fenced code have to be in there.

describe("mdToHtml, fenced code", () => {
  it("emits a pre/code with the language class", () => {
    expect(mdToHtml("```c\nint main(void);\n```")).toBe(
      '<pre><code class="language-c">int main(void);\n</code></pre>',
    );
  });

  it("names the file the info string carries", () => {
    const html = mdToHtml('```c title="recompiler/translate.c"\nint x;\n```');
    expect(html).toContain('<figure class="md-code">');
    expect(html).toContain("<figcaption>recompiler/translate.c</figcaption>");
    expect(html).toContain('<pre><code class="language-c">int x;\n</code></pre>');
  });

  it("accepts a bare path, in the info string or on its own", () => {
    expect(mdToHtml("```sh scripts/build.sh\nmake\n```")).toContain(
      "<figcaption>scripts/build.sh</figcaption>",
    );
    expect(mdToHtml("```Makefile.local\nall:\n```")).toContain(
      "<figcaption>Makefile.local</figcaption>",
    );
  });

  it("leaves a fence with no language plain", () => {
    expect(mdToHtml("```\nplain\n```")).toBe("<pre><code>plain\n</code></pre>");
  });

  it("keeps blank lines inside the fence and escapes the source", () => {
    const html = mdToHtml("```c\nif (a < b) {\n\n  return &x;\n}\n```");
    expect(html).toBe(
      '<pre><code class="language-c">if (a &lt; b) {\n\n  return &amp;x;\n}\n</code></pre>',
    );
  });

  it("keeps the prose on both sides of a fence", () => {
    const html = mdToHtml("Before it.\n\n```sh\nmake\n```\n\nAfter it.");
    expect(html).toBe(
      "<p>Before it.</p>\n" +
        '<pre><code class="language-sh">make\n</code></pre>\n' +
        "<p>After it.</p>",
    );
  });

  it("runs an unclosed fence to the end of the page", () => {
    expect(mdToHtml("~~~sh\nmake\nstill code\n")).toBe(
      '<pre><code class="language-sh">make\nstill code\n</code></pre>',
    );
  });

  it("does not read a line of prose with backticks as a fence", () => {
    expect(mdToHtml("Type ``` to open a fence, then `make`.")).toContain("<p>Type");
  });
});

describe("mdToHtml, tables", () => {
  it("emits a header row and a body", () => {
    const md = [
      "| Flag | Type | Default |",
      "| --- | :-: | ---: |",
      "| `-v` | bool | none |",
      "| `-o` | path | `out/` |",
    ].join("\n");
    expect(mdToHtml(md)).toBe(
      "<table><thead><tr><th>Flag</th><th>Type</th><th>Default</th></tr></thead>" +
        "<tbody><tr><td><code>-v</code></td><td>bool</td><td>none</td></tr>" +
        "<tr><td><code>-o</code></td><td>path</td><td><code>out/</code></td></tr>" +
        "</tbody></table>",
    );
  });

  it("reads a table written without the outer pipes", () => {
    expect(mdToHtml("Name | Meaning\n--- | ---\nrom | the file you provide")).toContain(
      "<td>the file you provide</td>",
    );
  });

  it("pads a short row and keeps an escaped pipe", () => {
    const html = mdToHtml("| a | b |\n|---|---|\n| one |\n| x \\| y | z |");
    expect(html).toContain("<tr><td>one</td><td></td></tr>");
    expect(html).toContain("<td>x | y</td>");
  });

  it("formats inside a cell and escapes html", () => {
    const html = mdToHtml("| a |\n|---|\n| **bold** and <tag> |");
    expect(html).toContain("<td><strong>bold</strong> and &lt;tag&gt;</td>");
  });

  it("leaves a paragraph that merely contains a pipe alone", () => {
    expect(mdToHtml("Pipe | in prose\nand a second line")).toContain("<p>Pipe |");
  });
});

describe("mdToHtml, what it always did", () => {
  it("still renders headings, lists, quotes and paragraphs", () => {
    const md = [
      "## A heading",
      "",
      "A paragraph with **bold**.",
      "",
      "- one",
      "- two",
      "",
      "> A quotation.",
    ].join("\n");
    expect(mdToHtml(md)).toBe(
      "<h3>A heading</h3>\n" +
        "<p>A paragraph with <strong>bold</strong>.</p>\n" +
        "<ul><li>one</li><li>two</li></ul>\n" +
        "<blockquote><p>A quotation.</p></blockquote>",
    );
  });

  it("renders what a quotation contains, fenced code included", () => {
    const md = ["> Run it:", ">", "> ```sh", "> make", "> ```"].join("\n");
    expect(mdToHtml(md)).toBe(
      "<blockquote><p>Run it:</p>\n" +
        '<pre><code class="language-sh">make\n</code></pre></blockquote>',
    );
  });

  it("renders an inline code span, which it used to leave as backticks", () => {
    expect(mdToHtml("Run `npm run build` first.")).toBe(
      "<p>Run <code>npm run build</code> first.</p>",
    );
  });

  it("is empty for nothing", () => {
    expect(mdToHtml("")).toBe("");
    expect(mdToHtml(undefined)).toBe("");
  });
});
