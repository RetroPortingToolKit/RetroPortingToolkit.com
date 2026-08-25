import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { mdToHtml } from "./vite-prerender.mjs";

const DATA_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "data",
);

// The heading ids the REAL render puts in the DOM, from the same react-markdown
// with the same plugins src/components/Markdown.tsx mounts (its custom
// components only wrap what is rendered; the ids come from rehype-slug). This
// is the authority the static shell has to match, because the "#anchor" links
// the pages write point at these and nothing else.
function realHeadingIds(md) {
  const html = renderToStaticMarkup(
    createElement(ReactMarkdown, {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeSlug],
      urlTransform: (url) => url,
      children: md,
    }),
  );
  return [...html.matchAll(/<h\d id="([^"]*)"/g)].map((m) => m[1]);
}

const shellHeadingIds = (md) =>
  [...mdToHtml(md).matchAll(/<h\d id="([^"]*)"/g)].map((m) => m[1]);

/** Every page body under data/, frontmatter removed. */
function everyBody() {
  const out = [];
  const walk = (dir) => {
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
      '<h3 id="a-heading">A heading</h3>\n' +
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

// The numbered steps in the guides. These used to fall through to the
// paragraph branch and come out as "<p>2. **The GPU side...", which is the
// most important content on the site rendered as literal text.
describe("mdToHtml, ordered lists", () => {
  it("makes an ol of numbered steps", () => {
    const md = [
      "1. Boot and soak the game, fixing missing seeds, overlays and runtime quirks",
      "2. Test netplay, if the title has it",
      "3. Tag and ship",
    ].join("\n");
    expect(mdToHtml(md)).toBe(
      "<ol><li>Boot and soak the game, fixing missing seeds, overlays and runtime quirks</li>" +
        "<li>Test netplay, if the title has it</li>" +
        "<li>Tag and ship</li></ol>",
    );
  });

  // data/docs/04_guides/05_add-widescreen/index.md: step 1 ends in a fenced
  // block, so the fence splits the list and steps 2-4 arrive as their own
  // block. Numbering them from 1 again would renumber the guide's argument.
  it("resumes at the step number a split list starts on", () => {
    const md = [
      "2. **The GPU side sets the same identity.** `gpu_ws_configure` sets both terms to 1.",
      "3. **The cull margin is exactly zero at 4:3.** `psx_ws_x_margin()`, quoted above, returns 0.",
    ].join("\n");
    const html = mdToHtml(md);
    expect(html).toContain('<ol start="2">');
    expect(html).toContain(
      "<li><strong>The GPU side sets the same identity.</strong> <code>gpu_ws_configure</code>",
    );
    expect(html).not.toContain("<p>2.");
  });

  it("keeps a step's continuation line and a bullet list's ul", () => {
    expect(mdToHtml("1. One step\n   wrapped over two lines")).toBe(
      "<ol><li>One step\n   wrapped over two lines</li></ol>",
    );
    expect(mdToHtml("- one\n- two")).toBe("<ul><li>one</li><li>two</li></ul>");
  });

  it("renders a numbered list inside a quotation", () => {
    expect(mdToHtml("> 1. Read it\n> 2. Then run it")).toBe(
      "<blockquote><ol><li>Read it</li><li>Then run it</li></ol></blockquote>",
    );
  });
});

describe("mdToHtml, code spans are literal", () => {
  // data/docs/04_guides/05_add-widescreen/index.md:236. The emphasis rules ran
  // over the substituted code spans and ate both multiplications out of a C
  // expression: "ws_cfg_num <em> 3 &gt; ws_cfg_den </em> 4".
  it("does not emphasise inside a code span", () => {
    const md =
      "native-wide requires `ws_mode == 2 && ws_cfg_num * 3 > ws_cfg_den * 4`, which at 4:3 is `12 > 12` and false.";
    expect(mdToHtml(md)).toBe(
      "<p>native-wide requires <code>ws_mode == 2 &amp;&amp; ws_cfg_num * 3 &gt; ws_cfg_den * 4</code>, " +
        "which at 4:3 is <code>12 &gt; 12</code> and false.</p>",
    );
  });

  it("leaves markdown punctuation inside a code span alone", () => {
    expect(mdToHtml("Pass `--flag **not bold** [not a link](x)` verbatim.")).toBe(
      "<p>Pass <code>--flag **not bold** [not a link](x)</code> verbatim.</p>",
    );
  });

  it("still formats a code span in a link label and emphasis around it", () => {
    expect(mdToHtml("See [`ACCURACY.md`](https://example.com/A.md) and **`-v`**.")).toBe(
      '<p>See <a href="https://example.com/A.md"><code>ACCURACY.md</code></a> and ' +
        "<strong><code>-v</code></strong>.</p>",
    );
  });
});

// Every heading carries the id rehype-slug gives the React render, or the
// "#anchor" links a page writes to its own sections land nowhere without
// JavaScript (the glossary alone writes 29 of them).
describe("mdToHtml, heading ids", () => {
  it("gives a heading the id the real renderer gives it", () => {
    const html = mdToHtml("## The terms\n\n### Always-on ring");
    expect(html).toBe(
      '<h3 id="the-terms">The terms</h3>\n<h4 id="always-on-ring">Always-on ring</h4>',
    );
  });

  it("agrees with rehype-slug on punctuation, parentheses and code spans", () => {
    const cases = [
      "## `titles/<id>.json`: identity",
      "## BIOS profile: `bios/<STEM>.toml`",
      "## Where the Limits Are (& Aren't)",
      "## Is authentic 4:3 output still byte-identical?",
      "## psxrecomp_cli.py verify-disc",
      "## Em *phasis*, **bold** and a [link](https://example.com)",
      "## Configure fails with `Cannot find source file: .../generated/OpenBIOS_full.c`",
      "#### Deep heading",
    ];
    for (const md of cases) {
      expect(shellHeadingIds(md), md).toEqual(realHeadingIds(md));
    }
  });

  it("numbers a repeated heading the way one slugger per page does", () => {
    const md = "## Notes\n\n## Notes\n\n### Notes";
    expect(shellHeadingIds(md)).toEqual(["notes", "notes-1", "notes-2"]);
    expect(shellHeadingIds(md)).toEqual(realHeadingIds(md));
  });

  it("counts a quoted heading, because rehype-slug does", () => {
    const md = "## Notes\n\n> ## Notes\n\n## Notes";
    expect(shellHeadingIds(md)).toEqual(realHeadingIds(md));
  });

  it("matches the real renderer on every heading in data/", () => {
    const disagree = [];
    let headings = 0;
    for (const { file, body } of everyBody()) {
      const shell = shellHeadingIds(body);
      const real = realHeadingIds(body);
      headings += real.length;
      if (shell.join("|") !== real.join("|")) disagree.push(file);
    }
    // A mismatch here is a dead anchor on a published page, so the count is
    // asserted too: a walk that silently found nothing would prove nothing.
    expect(headings).toBeGreaterThan(1000);
    expect(disagree).toEqual([]);
  });
});

// ![alt](src). The alt on a documentation figure is a whole sentence carrying
// the diagram's argument; dropping the image dropped that with it.
describe("mdToHtml, images", () => {
  // data/docs/01_start/02_how-a-port-is-made/index.md:29
  it("keeps the caption of an asset it cannot name a URL for", () => {
    const md =
      "![Each stage hands the next one something to work with, so this is a chain rather than a list of steps.](./pipeline.svg)";
    expect(mdToHtml(md)).toBe(
      '<p><span class="md-figcaption">Each stage hands the next one something to work with, ' +
        "so this is a chain rather than a list of steps.</span></p>",
    );
    expect(mdToHtml("![A diagram](/data/docs/01_start/x/pipeline.svg)")).toBe(
      '<p><span class="md-figcaption">A diagram</span></p>',
    );
  });

  // data/games/08_super-mario-world/index.md:50, a public/ asset: served at
  // that exact path, so it can be a real image.
  it("emits an img for a public asset", () => {
    expect(mdToHtml("![Character replacement test](/covers/smw-character.jpg)")).toBe(
      '<p><img src="/covers/smw-character.jpg" alt="Character replacement test" /></p>',
    );
    expect(mdToHtml("![Remote](https://example.com/a.png)")).toContain(
      '<img src="https://example.com/a.png" alt="Remote" />',
    );
  });

  it("links a video embed rather than pointing an img at it", () => {
    expect(
      mdToHtml("![Save states and rewind, shown off in Tomba](https://www.youtube.com/watch?v=L36ppNkuJG0)"),
    ).toBe(
      '<p><a href="https://www.youtube.com/watch?v=L36ppNkuJG0">Save states and rewind, ' +
        "shown off in Tomba</a></p>",
    );
    expect(mdToHtml("![Green Hill Zone, running as a native build.](/previews/sonic.mp4)")).toBe(
      '<p><span class="md-figcaption">Green Hill Zone, running as a native build.</span></p>',
    );
  });

  it("reads a code span in the alt as text", () => {
    expect(mdToHtml("![The `--wide` flag](./shot.png)")).toBe(
      '<p><span class="md-figcaption">The --wide flag</span></p>',
    );
  });
});

// data/docs/02_concepts/06_accuracy-and-burndowns/index.md:50-53. Stripping
// "> " with \s? ate the newline off a lone ">" line, which closed the blank
// line the nested quotation needed and left it as literal "&gt;" text.
describe("mdToHtml, nested quotations", () => {
  it("nests a quotation inside a quotation", () => {
    const md = [
      "> Every item gets: **status**, the **external comparative(s)** to cross-reference",
      "> it against, and a **validation method**. \"Looks good\" is NOT a status",
      ">",
      "> > **An item is only GREEN once it is BOTH (a) cross-referenced against a",
      "> > reference (GBATEK / NanoBoyAdvance source / mGBA source / a hardware test ROM)",
      "> > AND (b) runtime-validated against an accurate oracle.**",
    ].join("\n");
    const html = mdToHtml(md);
    expect(html).toContain("<blockquote><p>Every item gets:");
    expect(html).toContain("<blockquote><p><strong>An item is only GREEN");
    expect(html).not.toContain("&gt;");
    expect(html.match(/<blockquote>/g)).toHaveLength(2);
  });

  it("still separates the paragraphs of a single-level quotation", () => {
    expect(mdToHtml("> One paragraph.\n>\n> Another one.")).toBe(
      "<blockquote><p>One paragraph.</p>\n<p>Another one.</p></blockquote>",
    );
  });
});

// data/docs/01_start/06_recomp-your-own-game/index.md:52-53, inside the block
// meant to be pasted to an agent: the two URLs it must read.
describe("mdToHtml, autolinks", () => {
  it("links a bare <https://...>", () => {
    expect(
      mdToHtml("> Read <https://retroportingtoolkit.com/docs/start/recomp-your-own-game> and"),
    ).toBe(
      "<blockquote><p>Read <a href=\"https://retroportingtoolkit.com/docs/start/recomp-your-own-game\">" +
        "https://retroportingtoolkit.com/docs/start/recomp-your-own-game</a> and</p></blockquote>",
    );
    expect(mdToHtml("Write to <mailto:x@example.com>.")).toContain(
      '<a href="mailto:x@example.com">mailto:x@example.com</a>',
    );
  });

  it("leaves an autolink inside a code span alone", () => {
    expect(mdToHtml("Paste `<https://example.com>` as is.")).toBe(
      "<p>Paste <code>&lt;https://example.com&gt;</code> as is.</p>",
    );
  });
});
