// Build-time generator for the machine-readable documentation surfaces. Emits,
// into the deployed dist root:
//   llms.txt        the llms.txt index: H1, blockquote, H2 sections of
//                   "- [Title](url): description" bullets, plus ## Optional
//   llms-full.txt   the whole documentation section as one markdown document
//   docs.md         the documentation landing page as markdown
//   docs/<slug>.md  the markdown source of every published documentation page
//   robots.txt      pointing at sitemap.xml and llms.txt
//
// Every link inside llms.txt points at the .md form, so an agent handed only
// that file never has to parse HTML.
//
// Self-contained on purpose (only node builtins + js-yaml, an existing dep) so
// it can run standalone for cheap verification:
//   node scripts/gen-llms.mjs [outDir]
// vite.config.ts imports renderAgentSurfaces() for the dev middleware, so dev
// and build serve identical bytes, the same arrangement gen-feeds.mjs uses.
//
// Brand strings come from src/lib/site.ts via site-config.mjs. Do not hardcode
// a site name, domain, or byline here (see AGENTS.md).
//
// This walk MIRRORS the docs slice of src/lib/content.ts (DOCS and
// DOCS_SECTIONS). Node cannot import that module: it is built on
// import.meta.glob, which only exists inside a Vite transform. The two walks
// therefore decide independently which documentation pages exist, exactly as
// scripts/vite-prerender.mjs already does, and src/lib/agentSurfaces.test.ts
// imports BOTH and asserts they agree. Change one, change the other.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import yaml from "js-yaml";
import { SITE, ROOT } from "./site-config.mjs";

const DATA_DIR = path.join(ROOT, "data");
const DOCS_DIR = path.join(DATA_DIR, "docs");

const SITE_URL = SITE.url;

// Sections whose pages are genuinely skippable when a model is short of
// context, and so belong under llms.txt's `## Optional` heading rather than in
// the body of the file. Credit, licensing and provenance are real content that
// almost never answers a technical question. A section slug not listed here is
// primary; an unknown slug listed here is simply never matched, so this cannot
// drop a section from the file.
const OPTIONAL_SECTIONS = new Set(["fleet"]);

// ---- content load (mirrors the docs slice of the content loader) ----

const FOLDER_RE = /^(\d+)_(.+)$/;

function splitFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: raw };
  return { fm: yaml.load(m[1]) ?? {}, body: m[2] ?? "" };
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function segmentInfo(folder) {
  const m = folder.match(FOLDER_RE);
  return m ? { order: parseInt(m[1], 10), slug: m[2] } : { order: 999, slug: folder };
}

function asString(v, fallback = "") {
  return typeof v === "string" ? v : fallback;
}

function asStringArray(v) {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
}

// A docs page is data/docs/<NN>_<section>/index.md (the section's own page) or
// data/docs/<NN>_<section>/<NN>_<page>/index.md. MAX_DEPTH for docs is 2 in
// both src/lib/content.ts and scripts/vite-prerender.mjs; anything outside that
// is dropped there and is dropped here.
const MAX_DEPTH = 2;

function docsPages() {
  if (!fs.existsSync(DOCS_DIR)) return [];
  const out = [];
  for (const file of walk(DOCS_DIR)) {
    if (path.basename(file) !== "index.md") continue;
    const rel = path.relative(DOCS_DIR, file).replaceAll("\\", "/");
    const segments = rel.split("/").slice(0, -1);
    if (segments.length < 1 || segments.length > MAX_DEPTH) continue;
    const parts = segments.map(segmentInfo);
    const leaf = parts[parts.length - 1];
    const { fm, body } = splitFrontmatter(fs.readFileSync(file, "utf8"));
    // A draft is published nowhere: not in llms.txt, not in llms-full.txt, and
    // no .md file is written for it. This is the same rule DOCS applies.
    if (fm.draft === true) continue;
    const slug = parts.map((p) => p.slug).join("/");
    out.push({
      slug,
      section: parts[0].slug,
      sectionOrder: parts[0].order,
      // An explicit `order:` wins over the folder's NN_ prefix, as in content.ts.
      order: typeof fm.order === "number" ? fm.order : leaf.order,
      isSectionIndex: parts.length === 1,
      title: asString(fm.title, slug),
      summary: asString(fm.summary),
      desc: asString(fm.desc),
      sectionTitle: asString(fm.sectionTitle),
      pageType: asString(fm.pageType),
      tags: asStringArray(fm.tags),
      repos: asStringArray(fm.repos),
      updated: asString(fm.updated),
      url: `${SITE_URL}/docs/${slug}`,
      mdUrl: `${SITE_URL}/docs/${slug}.md`,
      body: (body || "").trim(),
    });
  }
  return out;
}

const byOrder = (a, b) => a.order - b.order || a.slug.localeCompare(b.slug);

function titleFromSlug(slug) {
  return slug.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
}

// The docs tree, one entry per section, mirroring DOCS_SECTIONS in
// src/lib/content.ts: built from the published pages only, so a draft cannot
// reach navigation, and a section with no index page of its own is still
// nameable from its slug.
function docsSections(pages) {
  const sections = new Map();
  const bySlug = (slug, order) => {
    let s = sections.get(slug);
    if (!s) {
      s = {
        slug,
        path: `/docs/${slug}`,
        url: `${SITE_URL}/docs/${slug}`,
        title: titleFromSlug(slug),
        summary: "",
        order,
        pages: [],
      };
      sections.set(slug, s);
    }
    return s;
  };
  for (const page of pages) {
    const s = bySlug(page.section, page.sectionOrder ?? 999);
    if (page.isSectionIndex) {
      s.index = page;
      s.title = page.sectionTitle || page.title;
      s.summary = page.summary || page.desc;
      s.order = page.order;
    } else {
      s.pages.push(page);
    }
  }
  for (const s of sections.values()) s.pages.sort(byOrder);
  return [...sections.values()].sort(byOrder);
}

/** The published documentation, in sidebar order. Mirrors DOCS and
    DOCS_SECTIONS; src/lib/agentSurfaces.test.ts asserts the two agree. */
export function collectDocs() {
  const pages = docsPages().sort(byOrder);
  const sections = docsSections(pages);
  return { pages, sections };
}

// ---- markdown helpers ----

/** Collapse a frontmatter string to one line, so it can be a bullet. */
function oneLine(s) {
  return String(s).replace(/\s+/g, " ").trim();
}

/** The description that helps a model decide whether to fetch this page. It is
    the page's own `summary`, which is written for exactly this; `desc` is the
    fallback. A page with neither gets a bullet with no description rather than
    an invented one, and reportMissing() names it in the build log. */
function chooseDescription(page) {
  return oneLine(page.summary || page.desc);
}

function bullet(page) {
  const desc = chooseDescription(page);
  return desc ? `- [${page.title}](${page.mdUrl}): ${desc}` : `- [${page.title}](${page.mdUrl})`;
}

function splitHash(href) {
  const i = href.indexOf("#");
  return i === -1 ? [href, ""] : [href.slice(0, i), href.slice(i)];
}

// Site-relative links in a page body are rewritten for the markdown surfaces:
// a link to another PUBLISHED documentation page becomes that page's absolute
// .md URL, so an agent following links inside a .md file stays in markdown and
// never lands on HTML. Anything else site-relative is merely absolutized, since
// a relative href is meaningless once the file is fetched on its own. A link to
// a draft or a missing page is left as its HTML URL rather than pointed at a
// .md that was deliberately not written.
//
// Fenced code blocks are skipped: a path in a shell transcript is not a link.
function rewriteBodyLinks(body, mdSlugs) {
  let fence = null;
  return body
    .split("\n")
    .map((line) => {
      const f = line.match(/^\s*(```+|~~~+)/);
      if (f) {
        const ch = f[1][0];
        if (!fence) fence = ch;
        else if (fence === ch) fence = null;
        return line;
      }
      if (fence) return line;
      return line.replace(/\]\((\/[^)\s]*)\)/g, (_m, href) => {
        const [p, hash] = splitHash(href);
        if (p.startsWith("/docs/")) {
          const slug = p.slice("/docs/".length).replace(/\/+$/, "");
          if (mdSlugs.has(slug)) return `](${SITE_URL}/docs/${slug}.md${hash})`;
        }
        return `](${SITE_URL}${p}${hash})`;
      });
    })
    .join("\n");
}

// Frontmatter is CONVERTED to a readable header, not stripped: the H1 and the
// summary blockquote are what the rendered page shows anyway, and the rest of
// the frontmatter (section, page type, tags, last updated, source repositories)
// is exactly the metadata an agent would otherwise have to guess at. The same
// header shape is used in the per-page .md files and in llms-full.txt.
function pageHeader(page, sectionTitle) {
  const lines = [`# ${page.title}`, ""];
  const summary = oneLine(page.summary || page.desc);
  if (summary) lines.push(`> ${summary}`, "");
  lines.push(`- Canonical URL: ${page.url}`);
  lines.push(`- Markdown: ${page.mdUrl}`);
  if (sectionTitle) lines.push(`- Section: ${sectionTitle}`);
  if (page.pageType) lines.push(`- Page type: ${page.pageType}`);
  if (page.tags.length) lines.push(`- Tags: ${page.tags.join(", ")}`);
  if (page.updated) lines.push(`- Last updated: ${page.updated}`);
  if (page.repos.length) {
    lines.push(`- Source repositories:`);
    for (const r of page.repos) lines.push(`  - ${r}`);
  }
  lines.push("");
  return lines.join("\n");
}

/** One documentation page as a standalone markdown document. */
export function renderPageMarkdown(page, sectionTitle, mdSlugs) {
  const body = rewriteBodyLinks(page.body, mdSlugs);
  return `${pageHeader(page, sectionTitle)}\n---\n\n${body}\n`;
}

// ---- llms.txt ----

function preamble(sections) {
  const lines = [
    `# ${SITE.title}`,
    "",
    `> ${oneLine(SITE.description)}`,
    "",
    "This file indexes the documentation section of this site. Every link below",
    "points at raw markdown, not HTML: append `.md` to any documentation URL here",
    "and the page's own source comes back as `text/markdown`.",
    "",
    "Two other fetches are worth knowing about. `/llms-full.txt` is this entire",
    "documentation section concatenated into one document, which is one request",
    "instead of one per page. `/sitemap.xml` lists every published page on the",
    "site, documentation included.",
    "",
  ];
  // Only claim the agent orientation page exists when it actually does. The
  // documentation tree is edited through a CMS, so nothing here may be assumed.
  const agents = sections.find((s) => s.slug === "agents");
  const first = agents?.index || agents?.pages[0];
  if (first) {
    lines.push(
      "If you are working inside one of the repositories this site documents, read",
      `${first.mdUrl}`,
      "first. It is written for you rather than about you.",
      "",
    );
  }
  lines.push(
    "These projects statically recompile console games into C or C++. This site",
    "distributes no game files, and nothing documented here runs without a disc",
    "image, cartridge dump or system ROM that you supply yourself. The section",
    "headed Scope and limits, below, states what else is not here, so you do not",
    "have to guess at it.",
    "",
  );
  return lines.join("\n");
}

// Benchmark item 25: say plainly what is NOT here, so an agent does not invent
// it. The bullets are deliberately plain text, not links: a parser reading this
// file for "- [Title](url): description" entries finds none in this section and
// skips it cleanly, while a model reading the prose gets the scoping statement.
// Keep this consistent with public/agent.md, which is the publishing API's own
// document and says the same thing about tokens.
function scopeSection() {
  return [
    "## Scope and limits",
    "",
    "- This site is documentation and a catalogue. It hosts no game files, no disc",
    "  images, no BIOS or system ROMs, and no built binaries.",
    "- There is no public read API for this content. The machine-readable surfaces",
    "  are exactly these: `/llms.txt`, `/llms-full.txt`, any documentation URL with",
    "  `.md` appended, `/sitemap.xml`, and the blog feeds at `/rss.xml`, `/atom.xml`",
    "  and `/feed.json`.",
    "- There IS a write API for publishing pages, documented at `/agent.md`. It needs",
    "  a bearer token, and tokens are not currently issued, so unless someone hands",
    "  you one you cannot publish over HTTP. Working in the repository, or signing in",
    "  at `/admin`, is the path that works.",
    "- There is no hosted MCP server, no HTTP search API, no OpenAPI document and",
    "  no client library for this site. Browser agents are the exception: pages",
    "  register WebMCP site tools in the browser, including search and a port",
    "  planner, documented at `/docs/reference/site-tools`. An agent reading this",
    "  file over HTTP cannot call those; use the surfaces above instead.",
    "- A documentation page describes what its repositories contained when the page",
    "  was last updated, and each page carries that date. Where a project has",
    "  written a design it has not shipped, the page says so. Do not read a",
    "  described architecture as a released feature.",
    "",
  ].join("\n");
}

/** The llms.txt index. */
export function renderLlmsTxt() {
  const { sections } = collectDocs();
  const out = [preamble(sections)];

  const optional = [];
  for (const section of sections) {
    const entries = [];
    if (section.index) entries.push(section.index);
    entries.push(...section.pages);
    if (!entries.length) continue;
    if (OPTIONAL_SECTIONS.has(section.slug)) {
      optional.push(...entries);
      continue;
    }
    const lines = [`## ${section.title}`, ""];
    if (section.summary) lines.push(oneLine(section.summary), "");
    lines.push(...entries.map(bullet), "");
    out.push(lines.join("\n"));
  }

  out.push(scopeSection());

  // A real Optional section, per the llms.txt spec: material a model may skip
  // when it is short of context. Credit and licensing pages, plus the
  // publishing API document, which matters only if you are writing to the site.
  const optionalLines = ["## Optional", ""];
  optionalLines.push(...optional.map(bullet));
  optionalLines.push(
    `- [Publishing to this site](${SITE_URL}/agent.md): How to post a page over the HTTP API, which fields each kind of page takes, and the house style. Only useful if you are writing to the site rather than reading it.`,
  );
  optionalLines.push("");
  out.push(optionalLines.join("\n"));

  return out.join("\n");
}

// ---- llms-full.txt ----

/** Every published documentation page concatenated, in sidebar order. */
export function renderLlmsFull() {
  const { pages, sections } = collectDocs();
  const mdSlugs = new Set(pages.map((p) => p.slug));
  const total = pages.length;
  const out = [
    `# ${SITE.title} documentation`,
    "",
    `> The complete documentation section of ${SITE_URL} as one document, in sidebar order. ${total} page${total === 1 ? "" : "s"}, generated at build time from the same source the site renders.`,
    "",
    "Each page below is preceded by a horizontal rule and its canonical URL, and",
    "carries the metadata from its own frontmatter. Draft pages are excluded. The",
    "one line per page index of the same material is at `/llms.txt`.",
    "",
    `Sections, in order: ${sections.map((s) => s.title).join(", ")}.`,
    "",
  ];
  for (const section of sections) {
    const entries = [];
    if (section.index) entries.push(section.index);
    entries.push(...section.pages);
    for (const page of entries) {
      out.push("---", "");
      out.push(renderPageMarkdown(page, section.title, mdSlugs));
    }
  }
  return out.join("\n");
}

// ---- docs.md ----

// The documentation landing page, /docs, is a generated collection route with
// no markdown source of its own. It still needs a .md: the vercel.json
// catch-all rewrites an unmatched path to "/", so /docs.md would otherwise
// answer 200 with the HOME page's HTML, which is worse than a 404 for an agent
// that appended .md to a URL it had.
export function renderDocsIndexMarkdown() {
  const { sections } = collectDocs();
  const out = [
    "# Documentation",
    "",
    `> The documentation section of ${SITE_URL}. Every page below is linked as raw`,
    "> markdown.",
    "",
    `- Canonical URL: ${SITE_URL}/docs`,
    `- Index for agents: ${SITE_URL}/llms.txt`,
    `- The whole section in one file: ${SITE_URL}/llms-full.txt`,
    "",
    "---",
    "",
  ];
  for (const section of sections) {
    const entries = [];
    if (section.index) entries.push(section.index);
    entries.push(...section.pages);
    if (!entries.length) continue;
    out.push(`## ${section.title}`, "");
    if (section.summary) out.push(oneLine(section.summary), "");
    out.push(...entries.map(bullet), "");
  }
  return out.join("\n");
}

// ---- robots.txt ----

// scripts/vite-prerender.mjs writes its own robots.txt during ITS closeBundle,
// carrying the sitemap only. This plugin runs after it and writes the file
// again, so what ships also names the agent surfaces (benchmark item 24). If
// the two ever disagree about the crawl rules, this one is what is deployed.
export function renderRobots() {
  return [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
    "# Machine-readable documentation, for anything reading this site with a model",
    "# rather than a browser. The index of the documentation section, one line per",
    "# page, every link pointing at markdown:",
    `#   ${SITE_URL}/llms.txt`,
    "# The whole documentation section concatenated into one document:",
    `#   ${SITE_URL}/llms-full.txt`,
    "# Any documentation URL also serves its own markdown source with .md appended,",
    `# for example ${SITE_URL}/docs.md`,
    "",
  ].join("\n");
}

// ---- render + write ----

/** Everything this generator produces, in memory, so the dev server can serve
    the same bytes the build writes. */
export function renderAgentSurfaces() {
  const { pages, sections } = collectDocs();
  const mdSlugs = new Set(pages.map((p) => p.slug));
  const sectionTitle = new Map(sections.map((s) => [s.slug, s.title]));
  const files = new Map();
  for (const page of pages) {
    files.set(
      `docs/${page.slug}.md`,
      renderPageMarkdown(page, sectionTitle.get(page.section) || "", mdSlugs),
    );
  }
  return {
    pages,
    sections,
    llms: renderLlmsTxt(),
    llmsFull: renderLlmsFull(),
    docsIndex: renderDocsIndexMarkdown(),
    robots: renderRobots(),
    /** relative dist path -> markdown, one entry per published page */
    pageFiles: files,
  };
}

// The count check, in the spirit of assertDocsRoutes() in
// scripts/vite-prerender.mjs. vercel.json rewrites every unmatched path to "/",
// so a .md file that was never written does NOT 404: it answers 200 with the
// home page's HTML, and an agent that fetched it gets a plausible-looking
// document about the wrong thing. That failure is invisible without a count, so
// count it. Three numbers have to agree: the index.md files on disk under
// data/docs that are not drafts, the pages this walk produced, and the .md
// files actually written into dist.
function assertMarkdownFiles(pages, written) {
  const onDisk = fs.existsSync(DOCS_DIR)
    ? walk(DOCS_DIR).filter((f) => {
        if (path.basename(f) !== "index.md") return false;
        const rel = path.relative(DOCS_DIR, f).replaceAll("\\", "/");
        const depth = rel.split("/").length - 1;
        if (depth < 1 || depth > MAX_DEPTH) return false;
        const { fm } = splitFrontmatter(fs.readFileSync(f, "utf8"));
        return fm.draft !== true;
      }).length
    : 0;
  const problems = [];
  if (onDisk !== pages.length) {
    problems.push(
      `data/docs holds ${onDisk} published index.md file(s) but the walk produced ` +
        `${pages.length} page(s). A page is being dropped: check the folder layout is ` +
        `data/docs/<NN>_<section>/index.md or ` +
        `data/docs/<NN>_<section>/<NN>_<page>/index.md, no deeper.`,
    );
  }
  if (written.length !== pages.length) {
    problems.push(
      `${pages.length} published page(s) but ${written.length} .md file(s) written.`,
    );
  }
  const expected = new Set(pages.map((p) => `docs/${p.slug}.md`));
  const missing = [...expected].filter((f) => !written.includes(f));
  const extra = written.filter((f) => !expected.has(f));
  if (missing.length) problems.push(`no .md written for: ${missing.join(", ")}`);
  if (extra.length) problems.push(`.md written with no page behind it: ${extra.join(", ")}`);
  if (problems.length) {
    throw new Error(
      "Documentation markdown does not match data/docs:\n  - " + problems.join("\n  - "),
    );
  }
}

/** Pages with no summary and no desc, which get a bullet with no description
    in llms.txt. Named in the build log rather than papered over with an
    invented sentence. */
export function pagesMissingDescription(pages) {
  return pages.filter((p) => !chooseDescription(p)).map((p) => `/docs/${p.slug}`);
}

export function generateAgentSurfaces(distDir = path.join(ROOT, "dist")) {
  const s = renderAgentSurfaces();
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, "llms.txt"), s.llms);
  fs.writeFileSync(path.join(distDir, "llms-full.txt"), s.llmsFull);
  fs.writeFileSync(path.join(distDir, "docs.md"), s.docsIndex);
  fs.writeFileSync(path.join(distDir, "robots.txt"), s.robots);
  const written = [];
  for (const [rel, text] of s.pageFiles) {
    const dest = path.join(distDir, ...rel.split("/"));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, text);
    written.push(rel);
  }
  assertMarkdownFiles(s.pages, written);
  return {
    pages: s.pages.length,
    sections: s.sections.length,
    missingDescription: pagesMissingDescription(s.pages),
  };
}

// CLI: `node scripts/gen-llms.mjs [outDir]` for standalone verification.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, "dist");
  const r = generateAgentSurfaces(out);
  console.log(
    `[gen-llms] wrote llms.txt + llms-full.txt + robots.txt + docs.md + ` +
      `${r.pages} page .md across ${r.sections} section(s) -> ${out}`,
  );
  if (r.missingDescription.length) {
    console.warn(`[gen-llms] no summary or desc on: ${r.missingDescription.join(", ")}`);
  }
}
