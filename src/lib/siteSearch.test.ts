import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { describe, expect, it } from "vitest";
// The real generator walk the build uses for the documentation, so the docs
// half of this index is the one the site actually ships.
import { collectDocs } from "../../scripts/gen-llms.mjs";
import { BLOGS, DOCS, GAMES, HARDWARE } from "./content";
import { buildDocsSearchIndex, docsSearchSources } from "./docsSearch";
import { buildPaletteCommands, docsMarkdownPath } from "./paletteCommands";
import {
  buildSiteSearchIndex,
  searchSite,
  type PaletteCommand,
  type SiteSearchIndex,
} from "./siteSearch";
import type { Item } from "./types";

/* ------------------------- the index the palette uses --------------------- */

const index: SiteSearchIndex = buildSiteSearchIndex({
  items: [...GAMES, ...HARDWARE, ...BLOGS],
  docs: buildDocsSearchIndex(docsSearchSources(collectDocs())),
});

const rendered = (hit: { description: { text: string }[] }) =>
  hit.description.map((p) => p.text).join("");

/** The heading ids the REAL render puts in the DOM: the same react-markdown
    with the same plugins src/components/Markdown.tsx mounts. A deep link is
    only worth shipping if the anchor it names is actually on the page. */
function renderedHeadingIds(md: string): string[] {
  const html = renderToStaticMarkup(
    createElement(ReactMarkdown, {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeSlug],
      urlTransform: (url: string) => url,
      children: md,
    }),
  );
  return [...html.matchAll(/<h[1-6]\b[^>]*\bid="([^"]*)"/g)].map((m) => m[1]);
}

describe("the site-wide index", () => {
  it("covers every published page of all four kinds, once each", () => {
    expect(index.entries.length).toBe(
      GAMES.length + HARDWARE.length + BLOGS.length + DOCS.length,
    );
    const paths = index.entries.map((e) => e.path);
    expect(new Set(paths).size).toBe(paths.length);
    // and no draft slipped in: the four lists are the published ones
    for (const entry of index.entries) expect(entry.title).not.toBe("");
  });

  it("carries the documentation's headings and nothing else's", () => {
    const withHeadings = index.entries.filter((e) => e.headings.length > 0);
    expect(withHeadings.length).toBeGreaterThan(0);
    for (const entry of withHeadings) expect(entry.kind).toBe("docs");
  });
});

/* ------------------------------ finding things ---------------------------- */

describe("searchSite over the published site", () => {
  it("finds a game by its title, and shows the game's own description", () => {
    const [top] = searchSite(index, "tomba");
    expect(top.path).toBe("/games/tomba");
    expect(top.label).toBe("Game");
    expect(top.group).toBe("result");
    const item = GAMES.find((g) => g.slug === "tomba")!;
    // The row shows the page's own desc (elided only if it is very long).
    expect(item.desc.startsWith(rendered(top).replace(/…$/, ""))).toBe(true);
  });

  it("finds a platform page", () => {
    const [top] = searchSite(index, "playstation");
    expect(top.path).toBe("/hardware/playstation");
    expect(top.label).toBe("Platform");
  });

  it("finds a news article", () => {
    const [top] = searchSite(index, "preservation");
    expect(top.path).toBe("/blog/decomp-annotated-recomps");
    expect(top.label).toBe("Article");
  });

  it("finds a documentation page, labelled with its section", () => {
    const hit = searchSite(index, "quickstart").find(
      (r) => r.path?.split("#")[0] === "/docs/start/quickstart",
    );
    expect(hit).toBeDefined();
    expect(hit!.label).toBe("Docs");
    expect(hit!.section).toBe("Start here");
  });

  it("deep-links a documentation heading to an anchor the rendered page has", () => {
    // "fingerprint-mismatch" is a heading on the quickstart and prose on one
    // other page, so the heading is what a search for it should land on.
    const hit = searchSite(index, "fingerprint-mismatch", { limit: 20 }).find((r) =>
      r.path?.startsWith("/docs/start/quickstart"),
    );
    expect(hit).toBeDefined();
    const [path, anchor] = hit!.path!.split("#");
    expect(path).toBe("/docs/start/quickstart");
    expect(anchor).toBeTruthy();
    expect(hit!.heading).toContain("fingerprint-mismatch");
    // the id really is in the DOM the page renders to
    const page = DOCS.find((d) => d.slug === "start/quickstart")!;
    expect(renderedHeadingIds(page.body)).toContain(anchor);
  });

  it("requires every term, not any of them", () => {
    expect(searchSite(index, "tomba nowheretobefound")).toEqual([]);
  });

  it("honours the limit", () => {
    expect(searchSite(index, "the", { limit: 3 })).toHaveLength(3);
  });
});

/* -------------------------------- the tiers ------------------------------- */

describe("the three tiers, on the published site", () => {
  // "xenogears" is the corpus's own example of all three at once: it is the
  // TITLE of a game, it is named in the SUMMARY of the PlayStation platform
  // page, and it appears only in the BODY of the fleet's license census.
  const results = searchSite(index, "xenogears", { limit: 20 });
  const at = (path: string) => results.findIndex((r) => r.path?.split("#")[0] === path);

  it("ranks the title match first", () => {
    expect(results[0].path).toBe("/games/xenogears");
  });

  it("ranks a summary match under the title and above a body-only mention", () => {
    const summaryHit = at("/hardware/playstation");
    const bodyHit = at("/docs/fleet/licenses");
    expect(summaryHit).toBeGreaterThan(0);
    expect(bodyHit).toBeGreaterThan(summaryHit);
    expect(results[summaryHit].score).toBeGreaterThan(results[bodyHit].score);
  });

  it("shows the description for a summary match and a body snippet for a body one", () => {
    const summaryHit = results[at("/hardware/playstation")];
    const bodyHit = results[at("/docs/fleet/licenses")];
    const platform = HARDWARE.find((h) => h.slug === "playstation")!;
    expect(platform.desc.startsWith(rendered(summaryHit).replace(/…$/, ""))).toBe(true);
    // A page that matched only in its body says WHY it surfaced instead, with
    // the match highlighted inside the window.
    const licenses = DOCS.find((d) => d.slug === "fleet/licenses")!;
    expect(rendered(bodyHit)).not.toBe(licenses.summary);
    expect(bodyHit.description.some((p) => p.mark)).toBe(true);
    expect(rendered(bodyHit).toLowerCase()).toContain("xenogears");
  });
});

/* ------------------------ the tiers, without the corpus ------------------- */

const ITEM: Item = {
  kind: "game",
  slug: "",
  title: "",
  kicker: "",
  desc: "",
  gallery: [],
  links: [],
  body: "",
  order: 1,
  meta: [],
  tags: [],
};

const fixture: SiteSearchIndex = buildSiteSearchIndex({
  items: [
    { ...ITEM, slug: "widescreen-warrior", title: "Widescreen Warrior", desc: "A port." },
    { ...ITEM, slug: "second", title: "Second", desc: "Runs in widescreen at last." },
    { ...ITEM, slug: "third", title: "Third", desc: "A port.", body: "It has a widescreen hack." },
    { ...ITEM, slug: "fourth", title: "Sidewidescreen", desc: "A port." },
    { ...ITEM, kind: "blog", slug: "tagged", title: "Tagged", desc: "A post.", tags: ["Widescreen"] },
  ],
});

describe("ranking, tier by tier", () => {
  it("puts a title match above a summary match above a body mention", () => {
    const order = searchSite(fixture, "widescreen").map((r) => r.path);
    expect(order.indexOf("/games/widescreen-warrior")).toBeLessThan(
      order.indexOf("/games/second"),
    );
    expect(order.indexOf("/games/second")).toBeLessThan(order.indexOf("/games/third"));
  });

  it("puts a tag above a body mention and below a summary", () => {
    const order = searchSite(fixture, "widescreen").map((r) => r.path);
    expect(order.indexOf("/games/second")).toBeLessThan(order.indexOf("/blog/tagged"));
    expect(order.indexOf("/blog/tagged")).toBeLessThan(order.indexOf("/games/third"));
  });

  it("puts a prefix match above a substring match inside the same tier", () => {
    const order = searchSite(fixture, "widescreen").map((r) => r.path);
    expect(order.indexOf("/games/widescreen-warrior")).toBeLessThan(
      order.indexOf("/games/fourth"),
    );
  });

  it("matches case insensitively", () => {
    expect(searchSite(fixture, "WIDESCREEN")[0].path).toBe("/games/widescreen-warrior");
  });

  it("returns nothing for a missing index or an unmatched term", () => {
    expect(searchSite(undefined, "widescreen")).toEqual([]);
    expect(searchSite(fixture, "letterbox")).toEqual([]);
  });
});

/* ------------------------------ the commands ------------------------------ */

const COMMANDS: PaletteCommand[] = [
  {
    id: "go:games",
    label: "Games",
    hint: "Every port, and what state it is in",
    group: "Go",
    run: () => {},
  },
  {
    id: "theme:dark",
    label: "Theme: Dark",
    hint: "Always the dark palette",
    group: "Theme",
    keywords: "appearance colour mode",
    run: () => {},
  },
];

describe("commands in the same list", () => {
  it("answers an empty query with the command list and nothing else", () => {
    const hits = searchSite(index, "", { commands: COMMANDS });
    expect(hits.map((h) => h.group)).toEqual(["command", "command"]);
    expect(hits.map((h) => h.title)).toEqual(["Games", "Theme: Dark"]);
    expect(rendered(hits[0])).toBe(COMMANDS[0].hint);
    expect(hits[0].command).toBe(COMMANDS[0]);
  });

  it("has nothing to say with an empty query and no commands", () => {
    expect(searchSite(index, "")).toEqual([]);
  });

  it("filters commands by their label and puts them above the content", () => {
    const hits = searchSite(index, "dark", { commands: COMMANDS });
    expect(hits[0].group).toBe("command");
    expect(hits[0].title).toBe("Theme: Dark");
    expect(hits.every((h) => h.group === "command" || h.path)).toBe(true);
  });

  it("matches a command on its hint and on its keywords too", () => {
    expect(searchSite(index, "palette", { commands: COMMANDS })[0].title).toBe("Theme: Dark");
    expect(searchSite(index, "appearance", { commands: COMMANDS })[0].title).toBe(
      "Theme: Dark",
    );
  });

  it("ranks a command label like a title, so it beats the same word in a hint", () => {
    const hits = searchSite(undefined, "games", { commands: COMMANDS });
    expect(hits.map((h) => h.title)).toEqual(["Games"]);
  });

  it("leaves the content search alone", () => {
    const hits = searchSite(index, "tomba", { commands: COMMANDS });
    expect(hits[0].group).toBe("result");
    expect(hits[0].path).toBe("/games/tomba");
  });
});

/* ------------------------------ the catalog ------------------------------- */

function catalog(pathname: string) {
  const calls: string[] = [];
  const commands = buildPaletteCommands({
    navigate: (to) => calls.push(`navigate:${to}`),
    load: (url) => calls.push(`load:${url}`),
    pathname,
    copyLink: () => {
      calls.push("copy");
    },
    setTheme: (choice) => calls.push(`theme:${choice}`),
  });
  return { commands, calls };
}

describe("the command catalog", () => {
  it("offers the bar's own row, and every documentation section", () => {
    const { commands, calls } = catalog("/");
    const ids = commands.map((c) => c.id);
    expect(ids).toContain("go:home");
    expect(ids).toContain("go:hardware");
    expect(ids).toContain("go:game");
    expect(ids).toContain("go:blog");
    expect(ids).toContain("go:docs");
    expect(ids).toContain("go:docs/start");
    commands.find((c) => c.id === "go:game")!.run();
    expect(calls).toEqual(["navigate:/games"]);
  });

  it("offers the three theme choices, driving the shared mechanism", () => {
    const { commands, calls } = catalog("/");
    for (const choice of ["light", "dark", "system"]) {
      const command = commands.find((c) => c.id === `theme:${choice}`);
      expect(command, choice).toBeDefined();
      command!.run();
    }
    expect(calls).toEqual(["theme:light", "theme:dark", "theme:system"]);
  });

  it("copies the link with a confirmation, and opens the editor with a real load", () => {
    const { commands, calls } = catalog("/games");
    const copy = commands.find((c) => c.id === "page:copy-link")!;
    expect(copy.confirm).toBeTruthy();
    copy.run();
    commands.find((c) => c.id === "site:admin")!.run();
    expect(calls).toEqual(["copy", "load:/admin"]);
  });

  it("offers the markdown twin on a documentation page and nowhere else", () => {
    expect(catalog("/games/tomba").commands.map((c) => c.id)).not.toContain("page:markdown");
    const { commands, calls } = catalog("/docs/start/quickstart");
    commands.find((c) => c.id === "page:markdown")!.run();
    expect(calls).toEqual(["load:/docs/start/quickstart.md"]);
  });
});

describe("docsMarkdownPath", () => {
  it("appends .md to a documentation URL", () => {
    expect(docsMarkdownPath("/docs/start/quickstart")).toBe("/docs/start/quickstart.md");
    expect(docsMarkdownPath("/docs/start/quickstart/")).toBe("/docs/start/quickstart.md");
  });

  it("names the landing page's own file, which is /docs.md", () => {
    expect(docsMarkdownPath("/docs")).toBe("/docs.md");
    expect(docsMarkdownPath("/docs/")).toBe("/docs.md");
  });

  it("has nothing to offer off /docs", () => {
    expect(docsMarkdownPath("/")).toBeUndefined();
    expect(docsMarkdownPath("/games/tomba")).toBeUndefined();
    expect(docsMarkdownPath("/documentation")).toBeUndefined();
  });

  it("names a file the build actually writes for every published page", () => {
    // scripts/gen-llms.mjs writes dist/docs/<slug>.md for each page; the
    // command must not offer a URL that is not there.
    const written = new Set(DOCS.map((d) => `/docs/${d.slug}.md`));
    for (const item of DOCS) {
      expect(docsMarkdownPath(`/docs/${item.slug}`)).toBe(`/docs/${item.slug}.md`);
      expect(written.has(docsMarkdownPath(`/docs/${item.slug}`)!)).toBe(true);
    }
  });
});
