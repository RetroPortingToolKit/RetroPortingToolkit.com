import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
// The real generator walk the build uses for the documentation, so the docs
// half of the index a tool searches is the one the site actually ships.
import { collectDocs } from "../../scripts/gen-llms.mjs";
import { BLOGS, DOCS, GAMES, HARDWARE } from "./content";
import { buildDocsSearchIndex, docsSearchSources } from "./docsSearch";
import { buildSiteSearchIndex, type SiteSearchIndex } from "./siteSearch";
import {
  checkGamePorted,
  consoleRoutes,
  defineTerm,
  docsPathFor,
  draftPage,
  FRAMEWORK_CLONE_COMMAND,
  getPageMarkdown,
  GLOSSARY_SLUG,
  glossaryEntries,
  glossaryPage,
  HARDWARE_DOCS_PLATFORM,
  listPlatforms,
  modelPorts,
  planMyPort,
  platformTiers,
  PORT_PLAN_SOURCES,
  resolveConsoleSlug,
  SCAFFOLD_COMMAND,
  searchSiteTool,
  SEARCH_LIMIT,
  SITE_TOOLS_SLUG,
  siteUrl,
  titleMatchScore,
  type Fetcher,
  type HttpResponse,
} from "./siteTools";

const index: SiteSearchIndex = buildSiteSearchIndex({
  items: [...GAMES, ...HARDWARE, ...BLOGS],
  docs: buildDocsSearchIndex(docsSearchSources(collectDocs())),
});

const CONTENT = { games: GAMES, hardware: HARDWARE, docs: DOCS };

/** Fail the test rather than narrow by hand at every call site. */
function ok<T>(result: { ok: boolean }): T {
  expect(result.ok, JSON.stringify(result)).toBe(true);
  return result as unknown as T;
}

/* -------------------------------- search_site ----------------------------- */

describe("search_site", () => {
  it("puts the game first for its own name, with an absolute URL", () => {
    const r = ok<{ results: { title: string; kind: string; url: string; description: string }[] }>(
      searchSiteTool(index, "tomba"),
    );
    expect(r.results[0].title).toBe("Tomba!");
    expect(r.results[0].kind).toBe("Game");
    expect(r.results[0].url).toBe("https://retroportingtoolkit.com/games/tomba");
    expect(r.results[0].description.length).toBeGreaterThan(0);
  });

  it("anchors a documentation hit to the heading that matched", () => {
    const r = ok<{ results: { url: string }[] }>(searchSiteTool(index, "fingerprint-mismatch"));
    const hit = r.results.find((x) => x.url.includes("/docs/start/quickstart"));
    expect(hit).toBeDefined();
    expect(hit!.url).toMatch(/#.+$/);
  });

  it("answers with content only, never the palette's commands", () => {
    const r = ok<{ results: { url: string }[] }>(searchSiteTool(index, "theme"));
    for (const hit of r.results) expect(hit.url.startsWith(siteUrl("/"))).toBe(true);
  });

  it("bounds the answer at ten results", () => {
    const r = ok<{ count: number; results: unknown[] }>(searchSiteTool(index, "the"));
    expect(r.results.length).toBeLessThanOrEqual(SEARCH_LIMIT);
    expect(r.count).toBe(r.results.length);
  });

  it("refuses an empty query with a sentence, not an exception", () => {
    const r = searchSiteTool(index, "  ");
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/query/i);
  });
});

/* ----------------------------- check_game_ported -------------------------- */

describe("check_game_ported", () => {
  it("finds a game from a loose title with no subtitle", () => {
    const r = ok<{ ported: boolean; matches: { title: string; url: string; status: string }[] }>(
      checkGamePorted(GAMES, "street fighter alpha"),
    );
    expect(r.ported).toBe(true);
    expect(r.matches[0].title).toBe("Street Fighter Alpha 3");
    expect(r.matches[0].url).toBe(
      "https://retroportingtoolkit.com/games/street-fighter-alpha-3",
    );
    expect(r.matches[0].status).toBe("Released");
  });

  it("ignores punctuation and an accent", () => {
    expect(ok<{ matches: { title: string }[] }>(checkGamePorted(GAMES, "tomba")).matches[0].title)
      .toBe("Tomba!");
    expect(
      ok<{ matches: { title: string }[] }>(checkGamePorted(GAMES, "pokemon emerald")).matches[0]
        .title,
    ).toBe("Pokémon Emerald");
    expect(
      ok<{ matches: { title: string }[] }>(checkGamePorted(GAMES, "Dr Mario")).matches[0].title,
    ).toBe("Dr. Mario");
  });

  it("finds a page filed under the short name when the full subtitle is typed", () => {
    const r = ok<{ matches: { title: string }[] }>(
      checkGamePorted(GAMES, "Tomba! 2: The Evil Swine Return"),
    );
    expect(r.matches[0].title).toBe("Tomba! 2");
  });

  it("says no rather than guessing, and does not answer to an initialism", () => {
    // The site's matching is over words, not initials. "sfa3" is honestly a
    // miss, and a tool that invented a match here would be worse than one that
    // says it found nothing.
    const r = ok<{ ported: boolean; matches: unknown[] }>(checkGamePorted(GAMES, "sfa3"));
    expect(r.ported).toBe(false);
    expect(r.matches).toEqual([]);
    expect(ok<{ ported: boolean }>(checkGamePorted(GAMES, "Halo")).ported).toBe(false);
  });

  it("bounds the candidate list", () => {
    const r = ok<{ matches: unknown[] }>(checkGamePorted(GAMES, "mario"));
    expect(r.matches.length).toBeGreaterThan(1);
    expect(r.matches.length).toBeLessThanOrEqual(5);
  });
});

describe("titleMatchScore", () => {
  it("ranks the exact title above the base title above a prefix", () => {
    expect(titleMatchScore("Tomba!", "tomba")).toBeGreaterThan(
      titleMatchScore("Klonoa: Door to Phantomile", "klonoa"),
    );
    expect(titleMatchScore("Klonoa: Door to Phantomile", "klonoa")).toBeGreaterThan(
      titleMatchScore("Street Fighter Alpha 3", "street fighter"),
    );
  });
});

/* ------------------------------ list_platforms ---------------------------- */

describe("list_platforms", () => {
  it("returns every console with its status, maturity and URL", () => {
    const r = ok<{ count: number; platforms: { title: string; url: string; status: string; maturity: string }[] }>(
      listPlatforms(HARDWARE),
    );
    expect(r.count).toBe(HARDWARE.length);
    expect(r.platforms.length).toBeGreaterThan(10);
    for (const p of r.platforms) {
      expect(p.title).toBeTruthy();
      expect(p.url.startsWith("https://retroportingtoolkit.com/hardware/")).toBe(true);
      expect(p.status, p.title).toBeTruthy();
      expect(p.maturity, p.title).toBeTruthy();
    }
    const psx = r.platforms.find((p) => p.title === "PlayStation")!;
    expect(psx.status).toBe("Playable alpha");
    expect(psx.maturity).toBe("Beta");
  });
});

/* ---------------------------- get_page_markdown --------------------------- */

function stubFetch(
  routes: Record<string, { status?: number; type?: string; body: string }>,
  seen?: { url: string; init?: unknown }[],
): Fetcher {
  return async (url, init) => {
    seen?.push({ url, init });
    const hit = routes[url];
    if (!hit) throw new Error(`no stub for ${url}`);
    const res: HttpResponse = {
      ok: (hit.status ?? 200) < 400,
      status: hit.status ?? 200,
      headers: {
        get: (name) =>
          name.toLowerCase() === "content-type" ? (hit.type ?? "text/markdown") : null,
      },
      text: async () => hit.body,
    };
    return res;
  };
}

describe("get_page_markdown path validation", () => {
  it("accepts a documentation path and names the .md the build writes", () => {
    const r = ok<{ path: string; markdownPath: string }>(docsPathFor("/docs/start/quickstart"));
    expect(r.path).toBe("/docs/start/quickstart");
    expect(r.markdownPath).toBe("/docs/start/quickstart.md");
    expect(ok<{ markdownPath: string }>(docsPathFor("/docs")).markdownPath).toBe("/docs.md");
  });

  it("rejects a page that is not documentation", () => {
    const r = docsPathFor("/games/tomba");
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toContain("/docs");
  });

  it("rejects another origin", () => {
    for (const bad of ["https://evil.example", "https://evil.example/docs/start", "//evil.example/docs"]) {
      const r = docsPathFor(bad);
      expect(r.ok, bad).toBe(false);
      expect(r.ok === false && r.error).toContain("retroportingtoolkit.com");
    }
  });

  it("accepts this site's own absolute URL, so a search result composes", () => {
    const r = ok<{ path: string }>(docsPathFor("https://retroportingtoolkit.com/docs/start/quickstart#anchor"));
    expect(r.path).toBe("/docs/start/quickstart");
  });

  it("rejects traversal, a relative path and an empty one", () => {
    for (const bad of ["/docs/../../etc/passwd", "docs/start", "", "   "]) {
      expect(docsPathFor(bad).ok, JSON.stringify(bad)).toBe(false);
    }
  });
});

describe("get_page_markdown fetching", () => {
  it("returns the markdown, with both URLs it came from", async () => {
    const r = ok<{ path: string; url: string; markdownUrl: string; markdown: string }>(
      await getPageMarkdown(
        "/docs/start/quickstart",
        stubFetch({ "/docs/start/quickstart.md": { body: "# Quickstart\n\nreal markdown\n" } }),
      ),
    );
    expect(r.markdown).toContain("# Quickstart");
    expect(r.url).toBe("https://retroportingtoolkit.com/docs/start/quickstart");
    expect(r.markdownUrl).toBe("https://retroportingtoolkit.com/docs/start/quickstart.md");
  });

  it("reports a missing page when the SPA shell comes back with a 200", async () => {
    // vercel.json rewrites every unmatched path to the application shell, so a
    // .md that was never written answers 200 with HTML. That is the failure
    // that would otherwise hand an agent a plausible document about the wrong
    // thing.
    const r = await getPageMarkdown(
      "/docs/nonexistent-xyz",
      stubFetch({
        "/docs/nonexistent-xyz.md": {
          type: "text/html; charset=utf-8",
          body: "<!DOCTYPE html>\n<html lang=\"en\"><head><title>Retro Porting Toolkit</title>",
        },
      }),
    );
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toContain("No documentation page");
  });

  it("reports a real 404 and an unreachable server without throwing", async () => {
    const missing = await getPageMarkdown(
      "/docs/gone",
      stubFetch({ "/docs/gone.md": { status: 404, body: "" } }),
    );
    expect(missing.ok).toBe(false);
    const dead = await getPageMarkdown("/docs/gone", async () => {
      throw new Error("offline");
    });
    expect(dead.ok).toBe(false);
  });

  it("reads every published documentation page's own .md name", () => {
    // scripts/gen-llms.mjs writes dist/docs/<slug>.md for each page. The tool
    // must never offer a path that file is not at.
    for (const page of DOCS) {
      const r = ok<{ markdownPath: string }>(docsPathFor(`/docs/${page.slug}`));
      expect(r.markdownPath).toBe(`/docs/${page.slug}.md`);
    }
  });
});

/* -------------------------------- define_term ----------------------------- */

describe("define_term", () => {
  const page = glossaryPage(DOCS);

  it("reads all forty-eight terms out of the glossary, each with an anchor", () => {
    const entries = glossaryEntries(page);
    expect(entries.length).toBe(48);
    for (const entry of entries) {
      expect(entry.term, entry.term).toBeTruthy();
      expect(entry.id, entry.term).toBeTruthy();
      expect(entry.definition.length, entry.term).toBeGreaterThan(20);
    }
  });

  it("defines a term and links to its own entry", () => {
    const r = ok<{ term: string; definition: string; url: string }>(defineTerm(page, "dispatch miss"));
    expect(r.term).toBe("Dispatch miss");
    expect(r.definition).toContain("no generated function");
    expect(r.url).toBe(
      "https://retroportingtoolkit.com/docs/concepts/glossary#dispatch-miss",
    );
  });

  it("does not care about case, hyphens or punctuation", () => {
    for (const spelling of ["Dispatch Miss", "dispatch-miss", "DISPATCH   MISS"]) {
      const r = ok<{ term: string }>(defineTerm(page, spelling));
      expect(r.term, spelling).toBe("Dispatch miss");
    }
    expect(ok<{ term: string }>(defineTerm(page, "aot")).term).toBe("AOT (ahead of time)");
  });

  it("says a word is not in the glossary rather than inventing a meaning", () => {
    const r = defineTerm(page, "flux capacitor");
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toContain("glossary");
  });

  it("keeps the glossary where the tool looks for it", () => {
    expect(DOCS.some((d) => d.slug === GLOSSARY_SLUG)).toBe(true);
  });
});

/* ------------------------------- plan_my_port ----------------------------- */

describe("plan_my_port", () => {
  it("answers a game that is already ported by pointing at the port", () => {
    const r = ok<{
      alreadyPorted: boolean;
      existing: { title: string; url: string }[];
      steps: { step: string; source: string }[];
      verdict: string;
    }>(planMyPort(CONTENT, { game_title: "Tomba" }));
    expect(r.alreadyPorted).toBe(true);
    expect(r.existing[0].title).toBe("Tomba!");
    expect(r.existing[0].url).toBe("https://retroportingtoolkit.com/games/tomba");
    expect(r.steps[0].step).toContain("Play");
    expect(r.verdict).toContain("already");
  });

  it("plans a PlayStation port with the scaffold command the documentation gives", () => {
    const r = ok<{
      alreadyPorted: boolean;
      console: { title: string; docs: string };
      framework: string;
      maturity: { tier: string; note: string; source: string };
      scaffolding: string;
      steps: { step: string; command?: string; source: string }[];
    }>(planMyPort(CONTENT, { game_title: "A Game Nobody Has Ported", console: "PlayStation" }));
    expect(r.alreadyPorted).toBe(false);
    expect(r.console.title).toBe("PlayStation");
    expect(r.framework).toBe("psxrecomp");
    expect(r.maturity.tier).toBe("The standard");
    expect(r.maturity.note).toContain("gold standard");
    expect(r.scaffolding).toBe("Yes");
    const commands = r.steps.map((s) => s.command).filter(Boolean);
    expect(commands).toContain(SCAFFOLD_COMMAND);
    expect(commands).toContain(FRAMEWORK_CLONE_COMMAND);
    for (const step of r.steps) {
      expect(step.source.startsWith("https://retroportingtoolkit.com/"), step.step).toBe(true);
    }
  });

  it("answers to a nickname for the console", () => {
    for (const name of ["ps1", "PSX", "playstation"]) {
      const r = ok<{ console: { title: string } }>(
        planMyPort(CONTENT, { game_title: "Something", console: name }),
      );
      expect(r.console.title, name).toBe("PlayStation");
    }
  });

  it("sends a console with no scaffolding to the working port it should copy", () => {
    const r = ok<{ framework: string; steps: { step: string; detail: string; command?: string }[] }>(
      planMyPort(CONTENT, { game_title: "Some Cartridge Game", console: "SNES" }),
    );
    expect(r.framework).toBe("snesrecomp");
    expect(r.steps[0].step).toContain("Copy");
    expect(r.steps[0].detail).toContain("github.com/mstan/");
    // No scaffold command is offered where none exists.
    expect(r.steps.every((s) => s.command === undefined)).toBe(true);
  });

  it("says plainly when a console is a research project", () => {
    const r = ok<{ verdict: string; steps: { step: string }[] }>(
      planMyPort(CONTENT, { game_title: "Some Disc Game", console: "CD-i" }),
    );
    expect(r.verdict).toContain("research project");
    expect(r.steps[0].step).toContain("platform page");
  });

  it("asks for the console when it cannot tell", () => {
    const r = ok<{ console: null; steps: { step: string }[] }>(
      planMyPort(CONTENT, { game_title: "An Unknown Game" }),
    );
    expect(r.console).toBe(null);
    expect(r.steps[0].step).toContain("Name the console");
  });

  it("always carries the standing rules with the pages that state them", () => {
    const r = ok<{ rules: { rule: string; source: string }[]; prerequisites: { url: string }[] }>(
      planMyPort(CONTENT, { game_title: "Anything", console: "PlayStation" }),
    );
    expect(r.rules.some((x) => /supply the game file/i.test(x.rule))).toBe(true);
    expect(r.rules.some((x) => /--create-github/.test(x.rule))).toBe(true);
    for (const rule of r.rules) {
      expect(rule.source.startsWith("https://retroportingtoolkit.com/")).toBe(true);
    }
    expect(r.prerequisites[0].url).toBe(
      "https://retroportingtoolkit.com/docs/start/what-you-need",
    );
  });

  it("refuses an empty title", () => {
    expect(planMyPort(CONTENT, { game_title: "" }).ok).toBe(false);
  });
});

/* ------------------------- parity with the documentation ------------------ */

const RECOMP_PAGE = path.join(
  process.cwd(),
  "data/docs/01_start/06_recomp-your-own-game/index.md",
);

/** Every fenced block's contents, in source order. */
function fencedBlocks(markdown: string): string[] {
  const out: string[] = [];
  let fence: string | null = null;
  let buffer: string[] = [];
  for (const line of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const m = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (m && !fence) {
      fence = m[1];
      buffer = [];
      continue;
    }
    if (m && fence && m[1][0] === fence[0] && m[1].length >= fence.length && !m[2].trim()) {
      out.push(buffer.join("\n"));
      fence = null;
      continue;
    }
    if (fence) buffer.push(line);
  }
  return out;
}

describe("the commands plan_my_port quotes", () => {
  const blocks = fencedBlocks(fs.readFileSync(RECOMP_PAGE, "utf8"));

  it("keeps the scaffold command byte for byte as the page writes it", () => {
    // The page carries two setup_project.sh blocks: the interactive one and
    // the non interactive one it names as "the form an agent should use". The
    // second is the one an agent is handed, so it is the one pinned here.
    const scaffold = blocks.filter(
      (b) => b.includes("setup_project.sh") && b.includes("--yes"),
    );
    expect(scaffold.length, "exactly one non interactive scaffold block").toBe(1);
    expect(SCAFFOLD_COMMAND).toBe(scaffold[0]);
  });

  it("keeps the clone command byte for byte as the page writes it", () => {
    const clone = blocks.filter(
      (b) => b.includes("git clone") && b.includes("psxrecomp.git"),
    );
    expect(clone.length, "exactly one clone block").toBe(1);
    expect(FRAMEWORK_CLONE_COMMAND).toBe(clone[0]);
  });

  it("still names the flags the plan tells an agent to pass", () => {
    for (const flag of ["--yes", "--generate", "--enable-build", "--no-github"]) {
      expect(SCAFFOLD_COMMAND, flag).toContain(flag);
    }
  });
});

describe("the documentation the plan is parsed out of", () => {
  it("still has every page plan_my_port reads", () => {
    for (const slug of Object.values(PORT_PLAN_SOURCES)) {
      expect(DOCS.some((d) => d.slug === slug), slug).toBe(true);
    }
  });

  it("still has the scaffolding table, with PlayStation as the only scaffolded console", () => {
    const routes = consoleRoutes(HARDWARE, DOCS.find((d) => d.slug === PORT_PLAN_SOURCES.recompYourOwnGame));
    expect(routes.size).toBeGreaterThan(8);
    const scaffolded = [...routes.entries()].filter(([, r]) => r.route === "scaffold");
    expect(scaffolded.map(([slug]) => slug)).toEqual(["playstation"]);
  });

  it("still has the model port table, every row pointing at a real repository", () => {
    const models = modelPorts(HARDWARE, DOCS.find((d) => d.slug === PORT_PLAN_SOURCES.portAGame));
    expect(models.size).toBeGreaterThan(8);
    for (const [slug, model] of models) {
      expect(model.framework, slug).toMatch(/recomp/);
      expect(model.port.url, slug).toMatch(/^https:\/\/github\.com\//);
    }
  });

  it("still has the two maturity tiers the platforms index sets out", () => {
    const tiers = platformTiers(DOCS.find((d) => d.slug === PORT_PLAN_SOURCES.platforms));
    expect(tiers.get("playstation")?.tier).toBe("The standard");
    expect(tiers.get("snes")?.tier).toBe("The standard");
    expect(tiers.get("nes")?.tier).toBe("Earlier on the same road");
  });

  it("ties every hardware page to a documentation page that exists", () => {
    for (const [hardwareSlug, docsSlug] of Object.entries(HARDWARE_DOCS_PLATFORM)) {
      expect(HARDWARE.some((h) => h.slug === hardwareSlug), hardwareSlug).toBe(true);
      expect(DOCS.some((d) => d.slug === `platforms/${docsSlug}`), docsSlug).toBe(true);
    }
  });

  it("resolves every console this site catalogues", () => {
    for (const item of HARDWARE) {
      expect(resolveConsoleSlug(HARDWARE, item.title), item.title).toBe(item.slug);
    }
    // and every platform a game page is filed under
    for (const game of GAMES) {
      if (!game.platform) continue;
      expect(resolveConsoleSlug(HARDWARE, game.platform), game.platform).toBeTruthy();
    }
  });

  it("keeps the page the footer link and the tools point at", () => {
    expect(DOCS.some((d) => d.slug === SITE_TOOLS_SLUG)).toBe(true);
  });
});

/* -------------------------------- draft_page ------------------------------ */

const AUTHED = { body: JSON.stringify({ authed: true, required: false, env: "test" }) };
const POSTED = {
  body: JSON.stringify({
    ok: true,
    id: "data/blog/99_a-draft/index.md",
    slug: "a-draft",
    kind: "blog",
    draft: true,
    url: "/blog/a-draft",
  }),
};

const DRAFT_ARGS = {
  kind: "blog",
  title: "A draft",
  desc: "One line.",
  body: "## Something\n\nWords.",
};

describe("draft_page", () => {
  it("refuses a kind that is curated, before touching the network", async () => {
    const seen: { url: string }[] = [];
    const r = await draftPage({ ...DRAFT_ARGS, kind: "games" }, stubFetch({}, seen));
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toContain("blog");
    expect(seen).toEqual([]);
  });

  it("refuses a page with nothing in it", async () => {
    for (const missing of [{ title: "" }, { body: "" }, { desc: "" }]) {
      const r = await draftPage({ ...DRAFT_ARGS, ...missing }, stubFetch({}));
      expect(r.ok, JSON.stringify(missing)).toBe(false);
    }
  });

  it("asks a docs page which section it belongs to", async () => {
    const r = await draftPage({ ...DRAFT_ARGS, kind: "docs" }, stubFetch({}));
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toContain("section");
  });

  it("writes nothing when nobody is signed in, and says where to sign in", async () => {
    const seen: { url: string }[] = [];
    const r = await draftPage(
      DRAFT_ARGS,
      stubFetch(
        {
          "/api/cms/auth": { body: JSON.stringify({ authed: false, required: true }) },
          "/api/cms/post": POSTED,
        },
        seen,
      ),
    );
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toContain("https://retroportingtoolkit.com/admin");
    expect(seen.map((s) => s.url)).toEqual(["/api/cms/auth"]);
  });

  it("forces draft: true even when the caller asks to publish", async () => {
    const seen: { url: string; init?: unknown }[] = [];
    const r = ok<{ draft: boolean; url: string; adminUrl: string; note: string }>(
      await draftPage(
        { ...DRAFT_ARGS, draft: false, featured: true } as Record<string, unknown>,
        stubFetch({ "/api/cms/auth": AUTHED, "/api/cms/post": POSTED }, seen),
      ),
    );
    const post = seen.find((s) => s.url === "/api/cms/post")!;
    const sent = JSON.parse((post.init as { body: string }).body) as Record<string, unknown>;
    expect(sent.draft).toBe(true);
    expect(sent.featured).toBeUndefined();
    expect(r.draft).toBe(true);
    expect(r.url).toBe("https://retroportingtoolkit.com/blog/a-draft");
    expect(r.adminUrl).toBe("https://retroportingtoolkit.com/admin");
    expect(r.note).toContain("draft");
  });

  it("sends the request with the page's own session, not a token", async () => {
    const seen: { url: string; init?: unknown }[] = [];
    await draftPage(DRAFT_ARGS, stubFetch({ "/api/cms/auth": AUTHED, "/api/cms/post": POSTED }, seen));
    for (const call of seen) {
      const init = (call.init ?? {}) as { credentials?: string; headers?: Record<string, string> };
      expect(init.credentials, call.url).toBe("same-origin");
      expect(JSON.stringify(init.headers ?? {})).not.toMatch(/authorization/i);
    }
  });

  it("passes the site's own refusal back in one sentence", async () => {
    const r = await draftPage(
      DRAFT_ARGS,
      stubFetch({
        "/api/cms/auth": AUTHED,
        "/api/cms/post": {
          status: 400,
          body: JSON.stringify({ ok: false, error: '"a-draft" already exists in blog.' }),
        },
      }),
    );
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toContain("already exists");
  });
});
