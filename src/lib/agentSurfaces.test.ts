import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
// The real generator, so these assert against the bytes the build ships rather
// than a restatement of them.
import {
  collectDocs,
  generateAgentSurfaces,
  renderAgentSurfaces,
} from "../../scripts/gen-llms.mjs";
import { DOCS, DOCS_SECTIONS } from "./content";

const surfaces = renderAgentSurfaces();
const walked = collectDocs();

// scripts/gen-llms.mjs cannot import src/lib/content.ts: that module is built on
// import.meta.glob, which only exists inside a Vite transform, so the generator
// walks data/docs itself the way scripts/vite-prerender.mjs already does. These
// two walks decide independently which documentation pages exist, and a
// disagreement means llms.txt advertises a page the site does not have, or
// misses one it does. This block is the only thing holding them together.
describe("the generator's walk agrees with DOCS", () => {
  it("publishes exactly the pages DOCS holds", () => {
    expect(walked.pages.map((p) => p.slug).sort()).toEqual(
      DOCS.map((d) => d.slug).sort(),
    );
  });

  it("writes one .md per published page and no more", () => {
    expect(surfaces.pageFiles.size).toBe(DOCS.length);
    for (const item of DOCS) {
      expect(surfaces.pageFiles.has(`docs/${item.slug}.md`)).toBe(true);
    }
  });

  it("derives the same sections, in the same sidebar order", () => {
    expect(walked.sections.map((s) => s.slug)).toEqual(
      DOCS_SECTIONS.map((s) => s.slug),
    );
    expect(walked.sections.map((s) => s.title)).toEqual(
      DOCS_SECTIONS.map((s) => s.title),
    );
  });

  it("orders the pages inside each section the same way", () => {
    for (const [i, section] of walked.sections.entries()) {
      expect(section.pages.map((p) => p.slug)).toEqual(
        DOCS_SECTIONS[i].pages.map((p) => p.slug),
      );
      expect(Boolean(section.index)).toBe(Boolean(DOCS_SECTIONS[i].index));
    }
  });

  it("carries the same title and summary on every page", () => {
    const bySlug = new Map(DOCS.map((d) => [d.slug, d]));
    for (const page of walked.pages) {
      const item = bySlug.get(page.slug);
      expect(item, `no DOCS item for ${page.slug}`).toBeDefined();
      expect(page.title).toBe(item!.title);
      expect(page.summary).toBe(item!.summary ?? "");
    }
  });
});

// A draft is rendered at its own URL so it can be previewed, and appears in no
// listing, feed or sitemap. The markdown surfaces are a listing, so the same
// rule holds: no draft in llms.txt, none in llms-full.txt, and no .md file.
describe("drafts stay out", () => {
  const drafts = draftDocsSlugs();

  it("does not write a .md for a draft", () => {
    for (const slug of drafts) {
      expect(surfaces.pageFiles.has(`docs/${slug}.md`)).toBe(false);
    }
  });

  it("does not list a draft in llms.txt or llms-full.txt", () => {
    for (const slug of drafts) {
      expect(surfaces.llms).not.toContain(`/docs/${slug}.md`);
      expect(surfaces.llmsFull).not.toContain(`/docs/${slug}\n`);
    }
  });

  it("builds from the published list, so the counts cannot include one", () => {
    // DOCS is already draft-filtered; the walk agreeing with it above is what
    // proves the drafts on disk were dropped.
    expect(walked.pages.length + drafts.length).toBe(docsIndexFilesOnDisk());
  });
});

describe("llms.txt", () => {
  const lines = surfaces.llms.split("\n");

  it("opens with an H1 and a blockquote summary, per the spec", () => {
    expect(lines[0].startsWith("# ")).toBe(true);
    const firstProse = lines.slice(1).find((l) => l.trim() !== "");
    expect(firstProse?.startsWith("> ")).toBe(true);
  });

  it("has H2 sections, one per documentation section", () => {
    const headings = lines.filter((l) => l.startsWith("## ")).map((l) => l.slice(3));
    for (const section of walked.sections) {
      if (section.slug === "fleet") continue; // deliberately under ## Optional
      expect(headings).toContain(section.title);
    }
  });

  it("carries a real Optional section with entries in it", () => {
    const at = lines.indexOf("## Optional");
    expect(at).toBeGreaterThan(-1);
    const after = lines.slice(at + 1).filter((l) => l.startsWith("- ["));
    expect(after.length).toBeGreaterThan(0);
  });

  it("states plainly what is not supported", () => {
    expect(surfaces.llms).toContain("## Scope and limits");
    expect(surfaces.llms).toMatch(/no MCP server/);
    // Must not contradict public/agent.md, which says tokens are not issued.
    expect(surfaces.llms).toMatch(/tokens are not currently\s+issued/);
  });

  it("points every link at the .md form, so nothing has to parse HTML", () => {
    const links = [...surfaces.llms.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);
    expect(links.length).toBeGreaterThan(0);
    for (const href of links) {
      expect(href, `${href} is not a .md link`).toMatch(/\.md$/);
      expect(href.startsWith("https://"), `${href} is not absolute`).toBe(true);
    }
  });

  it("links every published page exactly once", () => {
    const links = [...surfaces.llms.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);
    for (const page of walked.pages) {
      expect(links.filter((l) => l === page.mdUrl).length).toBe(1);
    }
  });

  it("writes a description that is not a restatement of the title", () => {
    const bullets = surfaces.llms
      .split("\n")
      .filter((l) => /^- \[[^\]]+\]\([^)]+\): /.test(l));
    // Every page carrying a summary or a desc gets one; the build log names any
    // page that has neither rather than inventing a sentence for it.
    const described = walked.pages.filter((p) => p.summary || p.desc);
    expect(bullets.length).toBeGreaterThanOrEqual(described.length);
    for (const line of bullets) {
      const m = line.match(/^- \[([^\]]+)\]\([^)]+\): (.+)$/)!;
      expect(m[2].toLowerCase()).not.toBe(m[1].toLowerCase());
      expect(m[2].length).toBeGreaterThan(m[1].length);
    }
  });
});

describe("llms-full.txt", () => {
  it("precedes every published page with its canonical URL", () => {
    for (const page of walked.pages) {
      expect(surfaces.llmsFull).toContain(`- Canonical URL: ${page.url}\n`);
    }
  });

  it("carries every page's body, not just its metadata", () => {
    for (const page of walked.pages) {
      const firstLine = page.body.split("\n").find((l) => l.trim() !== "") ?? "";
      // The body's opening line survives link rewriting unless it holds a
      // site-relative link, which the opening line of a page never does.
      if (!firstLine.includes("](/")) {
        expect(surfaces.llmsFull, `body missing for ${page.slug}`).toContain(
          firstLine.slice(0, 60),
        );
      }
    }
  });

  it("runs in sidebar order", () => {
    const order = walked.sections.flatMap((s) => [
      ...(s.index ? [s.index] : []),
      ...s.pages,
    ]);
    let at = -1;
    for (const page of order) {
      const next = surfaces.llmsFull.indexOf(`- Canonical URL: ${page.url}\n`);
      expect(next).toBeGreaterThan(at);
      at = next;
    }
  });
});

describe("per-page markdown", () => {
  it("converts the frontmatter to a readable header rather than emitting it raw", () => {
    for (const [rel, text] of surfaces.pageFiles) {
      const page = walked.pages.find((p) => `docs/${p.slug}.md` === rel)!;
      expect(text.startsWith(`# ${page.title}\n`), rel).toBe(true);
      // No YAML fence survives into what is served.
      expect(text.startsWith("---"), rel).toBe(false);
      expect(text).toContain(`- Canonical URL: ${page.url}\n`);
    }
  });

  it("rewrites an internal documentation link to the .md form", () => {
    const withLink = [...surfaces.pageFiles.values()].filter((t) =>
      t.includes("retroportingtoolkit.com/docs/"),
    );
    expect(withLink.length).toBeGreaterThan(0);
    // A site-relative href would be meaningless once the file is fetched alone.
    for (const [rel, text] of surfaces.pageFiles) {
      expect(text, `${rel} still has a site-relative link`).not.toMatch(/\]\(\/docs\//);
    }
  });
});

describe("robots.txt", () => {
  it("names the sitemap and both agent entry points", () => {
    expect(surfaces.robots).toContain("Sitemap: https://");
    expect(surfaces.robots).toContain("sitemap.xml");
    expect(surfaces.robots).toContain("/llms.txt");
    expect(surfaces.robots).toContain("/llms-full.txt");
  });
});

// The guard against the silent 404. vercel.json rewrites every unmatched path
// to "/", so a .md that was never written answers 200 with the home page's
// HTML instead of failing. generateAgentSurfaces() counts, and throws.
describe("the emitted files are counted", () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "rpt-llms-"));
  afterAll(() => fs.rmSync(out, { recursive: true, force: true }));

  it("writes one .md per published page into a real directory", () => {
    const r = generateAgentSurfaces(out);
    expect(r.pages).toBe(DOCS.length);
    for (const item of DOCS) {
      const file = path.join(out, "docs", ...`${item.slug}.md`.split("/"));
      expect(fs.existsSync(file), file).toBe(true);
      expect(fs.readFileSync(file, "utf8")).toContain(item.title);
    }
    for (const name of ["llms.txt", "llms-full.txt", "robots.txt", "docs.md"]) {
      expect(fs.existsSync(path.join(out, name)), name).toBe(true);
    }
  });
});

// ---- helpers that read data/docs directly, so the assertions above are
// checked against the filesystem rather than against another derived list ----

function docsDir() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "..", "data", "docs");
}

function docsIndexFiles(): string[] {
  const dir = docsDir();
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (d: string, depth: number) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (depth < 2) walk(full, depth + 1);
      } else if (entry.name === "index.md" && depth >= 1) {
        out.push(full);
      }
    }
  };
  walk(dir, 0);
  return out;
}

function docsIndexFilesOnDisk(): number {
  return docsIndexFiles().length;
}

function draftDocsSlugs(): string[] {
  const dir = docsDir();
  return docsIndexFiles()
    .filter((f) => /^---\r?\n[\s\S]*?^draft:\s*true\s*$/m.test(fs.readFileSync(f, "utf8")))
    .map((f) =>
      path
        .relative(dir, path.dirname(f))
        .replaceAll("\\", "/")
        .split("/")
        .map((s) => s.replace(/^\d+_/, ""))
        .join("/"),
    );
}
