import { DOCS, GAMES, HARDWARE, pathFor } from "./content";
import { docsSearchText } from "./docsSearch";
import { docsMarkdownPath } from "./paletteCommands";
import { SITE } from "./site";
import { searchSite, type SiteSearchIndex } from "./siteSearch";
import { extractToc } from "./toc";
import type { Item } from "./types";

/**
 * What this site can DO for an agent, as seven plain functions.
 *
 * src/lib/webmcp.ts wraps each of these in a WebMCP tool definition and hands
 * them to an agentic browser. Nothing in this file touches the DOM, and every
 * input a handler needs is passed in, so the whole surface can be asserted in
 * src/lib/siteTools.test.ts without a browser.
 *
 * TWO RULES run through all of it.
 *
 * ONE ENVELOPE. Every handler resolves to `{ ok: true, ... }` or
 * `{ ok: false, error }`, and never throws. An agent reading a result should
 * never have to tell an exception from an answer, and a tool that throws into
 * the host browser is a tool the host stops trusting.
 *
 * EVERY CLAIM CARRIES ITS URL. A result that says a game is ported gives the
 * page that says so; a plan that quotes a command gives the page the command
 * was read from. The absolute form is deliberate: an agent can hand the link
 * straight to a person, and a person can check the claim.
 *
 * REUSE, NOT RESTATEMENT. Nothing here is a second copy of something the site
 * already has. Ranking is src/lib/siteSearch.ts, the same engine the command
 * palette uses. Markdown twin paths are docsMarkdownPath() from
 * src/lib/paletteCommands.ts, the same rule the palette's command uses. The
 * facts a port plan quotes are parsed out of the published documentation at
 * call time, so a documentation edit changes what the tool says. The one
 * command that could not be parsed safely is a constant with a parity test
 * pinning it to the page it came from.
 */

/* ------------------------------ the envelope ------------------------------ */

export type ToolOk<T> = { ok: true } & T;
export interface ToolFail {
  ok: false;
  /** One plain sentence. Written for a model to act on, not a code. */
  error: string;
}
export type ToolResult<T> = ToolOk<T> | ToolFail;

export function toolError(error: string): ToolFail {
  return { ok: false, error };
}

/** A site path as the absolute URL an agent can hand to a person. */
export function siteUrl(path: string): string {
  return `${SITE.url}${path}`;
}

/** The page that documents this whole surface, for the footer link and for
    anything that needs to point a person at it. */
export { SITE_TOOLS_PATH, SITE_TOOLS_SLUG } from "./siteToolPaths";

/* ------------------------------ text matching ----------------------------- */

/**
 * A title reduced to the letters and digits in it. This is what makes a loose
 * title match work: "Pokémon Ruby & Sapphire" and "pokemon ruby and sapphire"
 * become the same string, and so do "Tomba!" and "tomba".
 */
export function normalizeTitle(value: string): string {
  return value
    .normalize("NFD")
    // The combining marks NFD just split off, so an accent cannot decide a match.
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** The part of a title before a subtitle or a parenthesis. */
function baseOf(title: string): string {
  return normalizeTitle(title.split(/[:(]/)[0]);
}

function words(value: string): string[] {
  return value.split(" ").filter(Boolean);
}

/** True when every word of `query` starts a word of `title`. */
function coversWords(title: string, query: string): boolean {
  const have = words(title);
  const want = words(query);
  if (!want.length) return false;
  return want.every((w) => have.some((h) => h.startsWith(w)));
}

/**
 * How well a query names a title, 0 for not at all. The tiers, highest first:
 * the whole title, the title without its subtitle, the title starting with
 * what was typed, what was typed starting with the title (someone typed the
 * full subtitle for a page filed under the short name), and finally every word
 * of the query appearing in the title.
 */
/**
 * The tiebreak inside one tier: the title closest in length to what was typed.
 *
 * "Tomba! 2: The Evil Swine Return" starts with both "Tomba!" and "Tomba! 2",
 * so both score the same tier, and the one the person meant is plainly the
 * longer of the two. Alphabetical order got this wrong.
 */
export function titleCloseness(title: string, query: string): number {
  return Math.abs(normalizeTitle(title).length - normalizeTitle(query).length);
}

export function titleMatchScore(title: string, query: string): number {
  const full = normalizeTitle(title);
  const q = normalizeTitle(query);
  if (!q || !full) return 0;
  if (full === q) return 5;
  const base = baseOf(title);
  if (base && base === q) return 4;
  if (full.startsWith(`${q} `)) return 3;
  if (base && q.startsWith(`${base} `)) return 2;
  if (coversWords(full, q)) return 1;
  return 0;
}

/* ------------------------------- search_site ------------------------------ */

/** How many results one search answers with. Bounded so a result stays
    readable in an agent's context rather than filling it. */
export const SEARCH_LIMIT = 10;

export interface SiteSearchToolHit {
  title: string;
  /** Game, Platform, Article or Docs: what the thing IS. */
  kind: string;
  /** The absolute page URL. Documentation hits carry the #anchor of the
      heading that matched, so the agent lands on the paragraph. */
  url: string;
  description: string;
}

/**
 * The whole site, ranked. This is the command palette's own engine
 * (src/lib/siteSearch.ts) with the palette's commands left out: an agent
 * wants the site's content, not the site's keyboard shortcuts.
 */
export function searchSiteTool(
  index: SiteSearchIndex | undefined,
  query: unknown,
): ToolResult<{ query: string; count: number; results: SiteSearchToolHit[] }> {
  const q = typeof query === "string" ? query.trim() : "";
  if (!q) return toolError("Pass a query: a word or phrase to look for on this site.");
  const results = searchSite(index, q, { limit: SEARCH_LIMIT })
    .filter((hit) => hit.group === "result" && hit.path)
    .map((hit) => ({
      title: hit.title,
      kind: hit.label,
      url: siteUrl(hit.path as string),
      description: hit.description.map((part) => part.text).join(""),
    }));
  return { ok: true, query: q, count: results.length, results };
}

/* --------------------------- check_game_ported ---------------------------- */

/** How many candidates a loose title match answers with. */
export const MATCH_LIMIT = 5;

export interface GameMatch {
  title: string;
  url: string;
  /** The maturity label the catalogue page carries, e.g. "Playable alpha". */
  status: string;
  desc: string;
}

/**
 * The catalogue check the starter kit tells every agent to run first: does a
 * port of this game already exist, so nobody rebuilds one that is done?
 *
 * The match is loose on purpose. People type a game's short name, forget its
 * subtitle, drop the accent and drop the punctuation, and a catalogue check
 * that only answered to the exact filed title would answer "no" far too often.
 */
export function checkGamePorted(
  games: Item[],
  title: unknown,
): ToolResult<{ query: string; ported: boolean; matches: GameMatch[] }> {
  const q = typeof title === "string" ? title.trim() : "";
  if (!q) return toolError("Pass a title: the name of the game to look for.");
  const scored = games
    .map((game) => ({ game, score: titleMatchScore(game.title, q) }))
    .filter((row) => row.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        titleCloseness(a.game.title, q) - titleCloseness(b.game.title, q) ||
        a.game.title.localeCompare(b.game.title),
    )
    .slice(0, MATCH_LIMIT);
  const matches = scored.map(({ game }) => ({
    title: game.title,
    url: siteUrl(pathFor("game", game.slug)),
    status: game.status ?? "",
    desc: game.desc,
  }));
  return { ok: true, query: q, ported: matches.length > 0, matches };
}

/* ----------------------------- list_platforms ----------------------------- */

export interface PlatformEntry {
  title: string;
  url: string;
  /** How far the toolchain has got, e.g. "Playable alpha", "Research". */
  status: string;
  /** How far the ecosystem around it has got: "Beta" or "Alpha". */
  maturity: string;
  desc: string;
}

/** Every console this site covers, with the two labels its own pages carry. */
export function listPlatforms(
  hardware: Item[],
): ToolResult<{ count: number; platforms: PlatformEntry[] }> {
  const platforms = hardware.map((item) => ({
    title: item.title,
    url: siteUrl(pathFor("hardware", item.slug)),
    status: item.status ?? "",
    maturity: item.maturity ?? "",
    desc: item.desc,
  }));
  return { ok: true, count: platforms.length, platforms };
}

/* --------------------------- get_page_markdown ---------------------------- */

/** The documentation path a request resolved to, or why it did not. */
export function docsPathFor(input: unknown): ToolResult<{ path: string; markdownPath: string }> {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) {
    return toolError('Pass a documentation path, for example "/docs/start/quickstart".');
  }
  let path = raw;
  // An absolute URL is accepted only when it is this site's own, so a result
  // from search_site (which answers with absolute URLs) can be handed straight
  // back in. Any other origin is refused rather than fetched.
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith("//")) {
    let parsed: URL;
    try {
      parsed = new URL(raw, SITE.url);
    } catch {
      return toolError(`"${raw}" is not a path or a URL on this site.`);
    }
    if (parsed.origin !== new URL(SITE.url).origin) {
      return toolError(
        `This tool only reads pages on ${SITE.url}. "${raw}" is somewhere else.`,
      );
    }
    path = parsed.pathname;
  }
  if (!path.startsWith("/") || path.includes("\\") || path.includes("..")) {
    return toolError(`"${raw}" is not a path on this site.`);
  }
  path = path.split("#")[0].split("?")[0];
  const markdownPath = docsMarkdownPath(path);
  if (!markdownPath) {
    return toolError(
      `Only documentation pages are readable this way. "${path}" is not under /docs. ` +
        `Use search_site to find a documentation page first.`,
    );
  }
  return { ok: true, path, markdownPath };
}

/** The little of `fetch` these tools use, so a test can pass a stub. */
export interface HttpResponse {
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
}
export interface HttpRequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  credentials?: "same-origin" | "include" | "omit";
}
export type Fetcher = (url: string, init?: HttpRequestInit) => Promise<HttpResponse>;

/** True when a body is the SPA shell rather than a markdown document. */
function looksLikeHtml(body: string): boolean {
  return /^\s*<(?:!|html\b|head\b|body\b|div\b)/i.test(body);
}

/**
 * A documentation page as the markdown the build wrote for it.
 *
 * THE NO-RUNTIME-FETCH RULE STILL HOLDS. This site prerenders every page from
 * data/ and fetches nothing to render itself. This fetch is not the page
 * rendering: it is an agent asking, through a tool, for a static file the
 * build already wrote to the deployed site (scripts/gen-llms.mjs writes
 * dist/docs/<slug>.md and dist/docs.md). Nothing on screen waits for it and no
 * page depends on it.
 *
 * vercel.json rewrites every unmatched path to the SPA with a 200, so a .md
 * that was never written answers with the home page's HTML rather than a 404.
 * That is the failure worth catching here: the body is checked, and a shell
 * that came back instead of a page is reported as a missing page.
 */
export async function getPageMarkdown(
  input: unknown,
  fetchImpl: Fetcher,
): Promise<ToolResult<{ path: string; url: string; markdownUrl: string; markdown: string }>> {
  const target = docsPathFor(input);
  if (!target.ok) return target;
  let res: HttpResponse;
  try {
    res = await fetchImpl(target.markdownPath, { credentials: "same-origin" });
  } catch {
    return toolError(`Could not reach ${target.markdownPath} from this page.`);
  }
  if (!res.ok) {
    return toolError(`No documentation page at ${target.path} (HTTP ${res.status}).`);
  }
  const body = await res.text();
  const type = res.headers.get("content-type") ?? "";
  const isMarkdown = /text\/(markdown|plain)/i.test(type);
  if (!body.trim() || (!isMarkdown && looksLikeHtml(body))) {
    return toolError(
      `No documentation page at ${target.path}. The site answered with its ` +
        `application shell, which is what an address with no page behind it returns.`,
    );
  }
  return {
    ok: true,
    path: target.path,
    url: siteUrl(target.path),
    markdownUrl: siteUrl(target.markdownPath),
    markdown: body,
  };
}

/* ------------------------------ define_term ------------------------------- */

/** Where the glossary lives. A page identity here is its folder path. */
export const GLOSSARY_SLUG = "concepts/glossary";
export const GLOSSARY_PATH = `/docs/${GLOSSARY_SLUG}`;

export interface GlossaryEntry {
  term: string;
  /** The anchor the rendered page puts on this entry's heading. */
  id: string;
  definition: string;
}

/**
 * The glossary as term and definition pairs.
 *
 * The ids come from extractToc(), which is the same walk (and the same
 * github-slugger sequence) that puts the ids on the rendered page, so a link
 * this returns lands on the entry rather than near it. src/lib/toc.test.ts
 * already asserts that walk against the real renderer across all of data/.
 *
 * Every term is an H3 under one H2, so the walk below takes H3 headings only
 * and stops each definition at the next heading of any level.
 */
export function glossaryEntries(page: Item | undefined): GlossaryEntry[] {
  if (!page) return [];
  const ids = extractToc(page.body, { minDepth: 3, maxDepth: 3 });
  const entries: { term: string; lines: string[] }[] = [];
  let fence: string | null = null;
  let current: { term: string; lines: string[] } | undefined;
  for (const line of page.body.replace(/\r\n/g, "\n").split("\n")) {
    const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      const ch = fenceMatch[1][0];
      if (!fence) fence = ch;
      else if (fence === ch) fence = null;
      current?.lines.push(line);
      continue;
    }
    if (fence) {
      current?.lines.push(line);
      continue;
    }
    const heading = line.match(/^ {0,3}(#{1,6})[ \t]+(.*?)[ \t]*#*[ \t]*$/);
    if (heading) {
      current = heading[1].length === 3 ? { term: heading[2].trim(), lines: [] } : undefined;
      if (current) entries.push(current);
      continue;
    }
    current?.lines.push(line);
  }
  // Zip the two walks by position, and drop the anchors entirely rather than
  // ship an id that points at nothing. This is the same defence
  // buildDocsSearchEntry() applies in src/lib/docsSearch.ts.
  const aligned =
    ids.length === entries.length &&
    ids.every((entry, i) => normalizeTitle(entry.text) === normalizeTitle(entries[i].term));
  return entries.map((entry, i) => ({
    term: entry.term,
    id: aligned ? ids[i].id : "",
    definition: docsSearchText(entry.lines.join("\n")).text,
  }));
}

export interface DefinedTerm {
  term: string;
  definition: string;
  /** The glossary entry's own anchor URL. */
  url: string;
}

/** One word as this site's repositories actually use it. */
export function defineTerm(
  page: Item | undefined,
  term: unknown,
): ToolResult<{ query: string; term: string; definition: string; url: string; related: DefinedTerm[] }> {
  const q = typeof term === "string" ? term.trim() : "";
  if (!q) return toolError("Pass a term: the word to look up in the glossary.");
  const entries = glossaryEntries(page);
  if (!entries.length) {
    return toolError(`The glossary at ${siteUrl(GLOSSARY_PATH)} could not be read.`);
  }
  const scored = entries
    .map((entry) => ({ entry, score: titleMatchScore(entry.term, q) }))
    .filter((row) => row.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        titleCloseness(a.entry.term, q) - titleCloseness(b.entry.term, q) ||
        a.entry.term.localeCompare(b.entry.term),
    );
  if (!scored.length) {
    return toolError(
      `"${q}" is not in this site's glossary. The whole glossary is at ` +
        `${siteUrl(GLOSSARY_PATH)}, and search_site finds words used elsewhere on the site.`,
    );
  }
  const url = (entry: GlossaryEntry) =>
    entry.id ? `${siteUrl(GLOSSARY_PATH)}#${entry.id}` : siteUrl(GLOSSARY_PATH);
  const best = scored[0].entry;
  return {
    ok: true,
    query: q,
    term: best.term,
    definition: best.definition,
    url: url(best),
    related: scored.slice(1, MATCH_LIMIT).map(({ entry }) => ({
      term: entry.term,
      definition: entry.definition,
      url: url(entry),
    })),
  };
}

/* ------------------------------ plan_my_port ------------------------------ */

/**
 * The two commands a PlayStation port starts with, as constants.
 *
 * They are NOT hand-copied prose: src/lib/siteTools.test.ts pulls the same two
 * fenced blocks out of data/docs/01_start/06_recomp-your-own-game/index.md and
 * asserts these match byte for byte. Edit that page and the test fails, which
 * is the point. A tool that quietly hands an agent last month's flags is worse
 * than a tool that does not exist.
 */
export const FRAMEWORK_CLONE_COMMAND = `git clone https://github.com/mstan/psxrecomp.git
cd psxrecomp
git submodule update --init --recursive`;

export const SCAFFOLD_COMMAND = `sh tools/new_project_layout/setup_project.sh \\
  --yes \\
  --name "Your Game" \\
  --disc /path/to/your/game.cue \\
  --dir ~/src \\
  --players 1 \\
  --generate \\
  --enable-build \\
  --no-github`;

/** Documentation this file reads at call time, by slug under /docs. */
export const PORT_PLAN_SOURCES = {
  recompYourOwnGame: "start/recomp-your-own-game",
  portAGame: "guides/port-a-game",
  gettingStarted: "start/what-you-need",
  gameFile: "concepts/the-game-file-you-supply",
  platforms: "platforms",
} as const;

/** The one place a hardware page is tied to its documentation page. The two
    trees are numbered and named independently, so this cannot be derived; the
    test asserts every pair on both sides still exists. */
export const HARDWARE_DOCS_PLATFORM: Record<string, string> = {
  playstation: "playstation",
  nes: "nes",
  "super-nintendo": "snes",
  "game-boy-advance": "game-boy-advance",
  "game-boy": "game-boy",
  "sega-genesis": "sega-genesis",
  "master-system-game-gear": "master-system-game-gear",
  "nintendo-ds": "nintendo-ds",
  "virtual-boy": "virtual-boy",
  "cd-i": "cd-i",
  "original-xbox": "xbox",
};

/** What people call these machines, so a plan can be asked for by any of them. */
export const CONSOLE_ALIASES: Record<string, string[]> = {
  playstation: ["playstation", "ps1", "psx", "psone", "ps one", "playstation 1", "sony playstation"],
  nes: ["nes", "famicom", "nintendo entertainment system"],
  "super-nintendo": ["snes", "super nes", "super nintendo", "super famicom"],
  "game-boy-advance": ["gba", "game boy advance", "gameboy advance"],
  "game-boy": ["gb", "gbc", "game boy", "gameboy", "game boy color"],
  "sega-genesis": ["genesis", "sega genesis", "mega drive", "megadrive"],
  "master-system-game-gear": [
    "sms",
    "master system",
    "sega master system",
    "game gear",
    "master system and game gear",
  ],
  "nintendo-ds": ["ds", "nds", "nintendo ds"],
  "virtual-boy": ["vb", "virtual boy"],
  "cd-i": ["cdi", "cd i", "philips cd i"],
  "original-xbox": ["xbox", "original xbox"],
  gamecube: ["gamecube", "game cube", "gcn", "ngc"],
  "nintendo-64": ["n64", "nintendo 64"],
};

/** The hardware slug a console name refers to, or "". */
export function resolveConsoleSlug(hardware: Item[], name: string): string {
  const q = normalizeTitle(name);
  if (!q) return "";
  for (const item of hardware) {
    if (normalizeTitle(item.title) === q || item.slug === name) return item.slug;
  }
  for (const [slug, aliases] of Object.entries(CONSOLE_ALIASES)) {
    if (aliases.some((alias) => normalizeTitle(alias) === q)) return slug;
  }
  // Last: a name that merely contains one, so "Sony PlayStation console" still
  // lands somewhere sensible rather than nowhere.
  for (const [slug, aliases] of Object.entries(CONSOLE_ALIASES)) {
    if (aliases.some((alias) => coversWords(q, normalizeTitle(alias)))) return slug;
  }
  return "";
}

/** One row of a GFM table, as its cells. */
function tableRows(markdown: string, header: string[]): string[][] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const cells = (line: string) =>
    line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());
  const want = header.map((h) => h.toLowerCase());
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes("|")) continue;
    const head = cells(lines[i]).map((c) => c.toLowerCase());
    if (head.length !== want.length || !want.every((w, j) => head[j] === w)) continue;
    const out: string[][] = [];
    for (let j = i + 2; j < lines.length; j++) {
      if (!lines[j].includes("|") || !lines[j].trim().startsWith("|")) break;
      out.push(cells(lines[j]));
    }
    return out;
  }
  return [];
}

/** The label and target of the first markdown link in a cell. */
function firstLink(cell: string): { name: string; url: string } | undefined {
  const m = cell.match(/\[([^\]]+)\]\(([^)\s]+)\)/);
  return m ? { name: m[1].replace(/`/g, ""), url: m[2] } : undefined;
}

/** How a console's port is started, read from the table on
    /docs/start/recomp-your-own-game rather than restated here. */
export type PortRoute = "scaffold" | "copy" | "research" | "unknown";

export interface ConsoleRoute {
  route: PortRoute;
  /** The table's own words for what starting a port means here. */
  means: string;
  /** The table's own words in the Scaffolding column. */
  scaffolding: string;
}

export function consoleRoutes(hardware: Item[], recompPage: Item | undefined): Map<string, ConsoleRoute> {
  const out = new Map<string, ConsoleRoute>();
  if (!recompPage) return out;
  for (const row of tableRows(recompPage.body, [
    "Console",
    "Scaffolding",
    "What starting a port means",
  ])) {
    const [consoles, scaffolding, means] = row;
    const route: PortRoute =
      /^yes$/i.test(scaffolding) ? "scaffold" : /^none$/i.test(scaffolding) ? "copy" : "research";
    for (const name of consoles.split(",")) {
      const slug = resolveConsoleSlug(hardware, name.trim());
      if (slug) out.set(slug, { route, means, scaffolding });
    }
  }
  return out;
}

export interface ModelPort {
  framework: string;
  port: { name: string; url: string };
}

/** Which working port to copy for each console, read from the table on
    /docs/guides/port-a-game. */
export function modelPorts(hardware: Item[], guide: Item | undefined): Map<string, ModelPort> {
  const out = new Map<string, ModelPort>();
  if (!guide) return out;
  for (const row of tableRows(guide.body, ["Console", "Framework", "Example port"])) {
    const [console_, framework, example] = row;
    const slug = resolveConsoleSlug(hardware, console_);
    const port = firstLink(example);
    if (slug && port) out.set(slug, { framework: framework.replace(/`/g, ""), port });
  }
  return out;
}

export interface PlatformTier {
  /** The heading the platforms index files this console under. */
  tier: string;
  /** The sentence that index writes about it. */
  note: string;
  /** "/docs/platforms/<slug>" */
  path: string;
}

/** Where the platforms index puts each console, and what it says about it. */
export function platformTiers(index: Item | undefined): Map<string, PlatformTier> {
  const out = new Map<string, PlatformTier>();
  if (!index) return out;
  let tier = "";
  for (const line of index.body.replace(/\r\n/g, "\n").split("\n")) {
    const heading = line.match(/^ {0,3}##[ \t]+(.*?)[ \t]*#*[ \t]*$/);
    if (heading) {
      tier = heading[1].trim();
      continue;
    }
    const bullet = line.match(/^\s*[-*]\s+\[([^\]]+)\]\((\/docs\/platforms\/[^)\s]+)\)\.?\s*(.*)$/);
    if (!bullet || !tier) continue;
    out.set(bullet[2].replace("/docs/platforms/", ""), {
      tier,
      note: bullet[3].trim(),
      path: bullet[2],
    });
  }
  return out;
}

export interface PlanStep {
  step: string;
  detail: string;
  /** The exact command, where the documentation gives one. */
  command?: string;
  /** The page this step was read from. */
  source: string;
}

export interface PlanRule {
  rule: string;
  source: string;
}

export interface PortPlan {
  game: string;
  console: { title: string; url: string; docs?: string } | null;
  alreadyPorted: boolean;
  existing: GameMatch[];
  /** One honest sentence about what this plan is. */
  verdict: string;
  framework: string;
  maturity: { tier: string; note: string; status: string; source: string } | null;
  scaffolding: string;
  steps: PlanStep[];
  prerequisites: { title: string; url: string }[];
  rules: PlanRule[];
}

export interface PortPlanContent {
  games: Item[];
  hardware: Item[];
  docs: Item[];
}

/** The published pages this plan is built out of, by slug. */
function docBy(docs: Item[], slug: string): Item | undefined {
  return docs.find((d) => d.slug === slug);
}

function docUrl(slug: string): string {
  return siteUrl(`/docs/${slug}`);
}

/**
 * This site's whole argument, as one call: is the game already done, and if
 * not, what does starting it actually look like on that console?
 *
 * Nothing here is invented. The catalogue answer is checkGamePorted(). Which
 * route a console takes, which port to copy, and where a console sits on the
 * maturity ladder are parsed out of the published documentation when the tool
 * runs. The two commands are constants pinned to their page by a parity test.
 */
export function planMyPort(
  content: PortPlanContent,
  args: { game_title?: unknown; console?: unknown },
): ToolResult<PortPlan> {
  const gameTitle = typeof args.game_title === "string" ? args.game_title.trim() : "";
  if (!gameTitle) {
    return toolError("Pass game_title: the name of the game you want a port of.");
  }
  const asked = typeof args.console === "string" ? args.console.trim() : "";

  const catalogue = checkGamePorted(content.games, gameTitle);
  const existing = catalogue.ok ? catalogue.matches : [];
  const best = catalogue.ok && catalogue.matches.length ? content.games.find(
    (g) => siteUrl(pathFor("game", g.slug)) === catalogue.matches[0].url,
  ) : undefined;

  // The console: what was asked for, else the platform the catalogue already
  // files this game under.
  const slug =
    (asked ? resolveConsoleSlug(content.hardware, asked) : "") ||
    (best?.platform ? resolveConsoleSlug(content.hardware, best.platform) : "");
  const hardware = content.hardware.find((h) => h.slug === slug);

  const recompPage = docBy(content.docs, PORT_PLAN_SOURCES.recompYourOwnGame);
  const guidePage = docBy(content.docs, PORT_PLAN_SOURCES.portAGame);
  const platformsPage = docBy(content.docs, PORT_PLAN_SOURCES.platforms);

  const model = slug ? modelPorts(content.hardware, guidePage).get(slug) : undefined;
  const fromTable = slug ? consoleRoutes(content.hardware, recompPage).get(slug) : undefined;
  // The scaffolding table on /docs/start/recomp-your-own-game does not name
  // every console the port guide has a model port for. Where it is silent and
  // a model port exists, the route IS copy a working port, and the guide is
  // where that claim comes from. Where neither page says anything, say so
  // rather than guessing a route.
  const route: ConsoleRoute | undefined =
    fromTable ?? (model ? { route: "copy", means: "", scaffolding: "" } : undefined);
  const docsPlatform = slug ? HARDWARE_DOCS_PLATFORM[slug] : undefined;
  const tier = docsPlatform ? platformTiers(platformsPage).get(docsPlatform) : undefined;

  const recompUrl = docUrl(PORT_PLAN_SOURCES.recompYourOwnGame);
  const guideUrl = docUrl(PORT_PLAN_SOURCES.portAGame);

  const steps: PlanStep[] = [];
  if (existing.length && titleMatchScore(existing[0].title, gameTitle) >= 3) {
    steps.push({
      step: "Play the port that exists",
      detail:
        `${existing[0].title} is already in this site's catalogue, at ${existing[0].status || "an unlisted status"}. ` +
        `Read its page for what runs today and how to build it, and supply your own copy of the game.`,
      source: existing[0].url,
    });
  } else if (route?.route === "scaffold") {
    steps.push({
      step: "Get the framework",
      detail: "Clone the toolchain and its submodules.",
      command: FRAMEWORK_CLONE_COMMAND,
      source: recompUrl,
    });
    steps.push({
      step: "Scaffold the project",
      detail:
        "One non interactive command creates the project, probes your disc, generates the code " +
        "and builds it. With --yes the yes or no options default to off, so --generate and " +
        "--enable-build have to be passed or the scaffold writes the tree and stops.",
      command: SCAFFOLD_COMMAND,
      source: recompUrl,
    });
  } else if (route?.route === "copy") {
    steps.push({
      step: "Copy a working port",
      detail: model
        ? `There is no scaffolding for this console. Copy the structure of ${model.port.name} ` +
          `(${model.port.url}), which is built on ${model.framework}, and change what is game specific.`
        : "There is no scaffolding for this console. Copy the structure of an existing port on " +
          "the same framework and change what is game specific.",
      source: guideUrl,
    });
    steps.push({
      step: "Adapt the per game input",
      detail:
        "Each toolchain spells its per game recompiler input differently. The guide gives the " +
        "canonical repository layout and where per game fixes belong.",
      source: guideUrl,
    });
  } else if (route?.route === "research") {
    steps.push({
      step: "Read the platform page first",
      detail:
        `This console is a research project rather than a route to a playable port. ` +
        `${route.means}.`,
      source: tier ? siteUrl(tier.path) : recompUrl,
    });
  } else if (hardware) {
    steps.push({
      step: "Read the platform page first",
      detail:
        `This site documents ${hardware.title}, but neither the starting guide nor the port ` +
        `guide gives a route for it yet. Its own page is the honest answer about where it is.`,
      source: tier ? siteUrl(tier.path) : siteUrl(pathFor("hardware", hardware.slug)),
    });
  } else {
    steps.push({
      step: "Name the console",
      detail:
        "Pass the console this game is from, and this tool answers with that console's own " +
        "route. list_platforms gives every console this site covers.",
      source: docUrl(PORT_PLAN_SOURCES.platforms),
    });
  }

  if (route && route.route !== "research") {
    steps.push({
      step: "Expect the work after the first build",
      detail:
        "A build is not a finished port. Boot and soak the game, fix missing seeds, overlays and " +
        "runtime quirks, add symbols as you learn the binary, and only then tag and ship. Code " +
        "the analysis could not find ahead of time shows up well into the game, and finding it " +
        "is the bulk of the work.",
      source: recompUrl,
    });
  }

  const alreadyPorted = existing.length > 0 && titleMatchScore(existing[0].title, gameTitle) >= 3;
  const verdict = alreadyPorted
    ? `${existing[0].title} is already in this site's catalogue. Play or build that rather than starting again.`
    : route?.route === "scaffold"
      ? `No port of "${gameTitle}" is catalogued here. This console has scaffolding, so starting one is a command rather than an afternoon.`
      : route?.route === "copy"
        ? `No port of "${gameTitle}" is catalogued here. This console has no scaffolding, so starting one means copying a working port by hand.`
        : route?.route === "research"
          ? `No port of "${gameTitle}" is catalogued here, and this console is a research project rather than a route to a playable port.`
          : hardware
            ? `No port of "${gameTitle}" is catalogued here, and this site documents ${hardware.title} without yet giving a route for starting a port on it.`
            : `No port of "${gameTitle}" is catalogued here, and no console was named, so there is no route to give yet.`;

  return {
    ok: true,
    game: gameTitle,
    console: hardware
      ? {
          title: hardware.title,
          url: siteUrl(pathFor("hardware", hardware.slug)),
          docs: docsPlatform ? docUrl(`platforms/${docsPlatform}`) : undefined,
        }
      : null,
    alreadyPorted,
    existing,
    verdict,
    framework: model?.framework ?? "",
    maturity: tier
      ? {
          tier: tier.tier,
          note: tier.note,
          status: hardware?.status ?? "",
          source: docUrl(PORT_PLAN_SOURCES.platforms),
        }
      : null,
    scaffolding: route?.scaffolding ?? "",
    steps,
    prerequisites: [
      {
        title: docBy(content.docs, PORT_PLAN_SOURCES.gettingStarted)?.title ?? "Getting started",
        url: docUrl(PORT_PLAN_SOURCES.gettingStarted),
      },
    ],
    rules: [
      {
        rule:
          "You supply the game file yourself, from a copy you own. Nothing on this site " +
          "distributes game data and nothing here will help you obtain any.",
        source: docUrl(PORT_PLAN_SOURCES.gameFile),
      },
      {
        rule:
          "Never pass --create-github on your own initiative. Creating a repository, choosing " +
          "whether it is public, and pushing to it are the person's decisions, not the agent's.",
        source: siteUrl("/blog/tutorial-let-your-agent-do-the-recomp"),
      },
    ],
  };
}

/* ------------------------------- draft_page ------------------------------- */

/** The kinds an agent may draft. Games and platforms are curated catalogue
    entries, so they are not on this list. */
export const DRAFTABLE_KINDS = ["blog", "docs"] as const;
export type DraftableKind = (typeof DRAFTABLE_KINDS)[number];

export const ADMIN_PATH = "/admin";
const CMS_AUTH = "/api/cms/auth";
const CMS_POST = "/api/cms/post";

export interface DraftPageArgs {
  kind?: unknown;
  title?: unknown;
  body?: unknown;
  desc?: unknown;
  section?: unknown;
  summary?: unknown;
  tags?: unknown;
}

async function readJson(res: HttpResponse): Promise<Record<string, unknown>> {
  try {
    return JSON.parse(await res.text()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Write a DRAFT page through the site's own CMS API.
 *
 * This is the tool that shows what WebMCP's session model is for. There is no
 * API key here and no token for the agent to hold: the request goes out from
 * the page the person is already on, with the cookies they already have, and
 * the application's own authentication decides. Someone who is not signed in
 * gets a refusal from the site, not from a rule invented in this file.
 *
 * `draft: true` is forced here rather than accepted from the caller. A draft
 * has its own URL and appears in no listing, no feed and no sitemap, so the
 * worst an agent can do with this tool is leave a page nobody has approved
 * where a person can read it and decide.
 */
export async function draftPage(
  args: DraftPageArgs,
  fetchImpl: Fetcher,
): Promise<
  ToolResult<{
    id: string;
    kind: string;
    slug: string;
    draft: true;
    url: string;
    adminUrl: string;
    note: string;
  }>
> {
  const kind = typeof args.kind === "string" ? args.kind.trim() : "";
  if (!(DRAFTABLE_KINDS as readonly string[]).includes(kind)) {
    return toolError(
      `kind must be one of: ${DRAFTABLE_KINDS.join(", ")}. Game and platform pages are ` +
        `catalogue entries and are not written this way.`,
    );
  }
  const title = typeof args.title === "string" ? args.title.trim() : "";
  const body = typeof args.body === "string" ? args.body.trim() : "";
  const desc = typeof args.desc === "string" ? args.desc.trim() : "";
  if (!title) return toolError("Pass a title.");
  if (!body) return toolError("Pass a body: the page itself, as markdown.");
  if (!desc) return toolError("Pass a desc: the one line that shows under the title on a card.");
  const section = typeof args.section === "string" ? args.section.trim() : "";
  if (kind === "docs" && !section) {
    return toolError(
      "A docs page belongs to a section. Pass section, for example \"start\" or \"reference\".",
    );
  }

  let auth: HttpResponse;
  try {
    auth = await fetchImpl(CMS_AUTH, { credentials: "same-origin" });
  } catch {
    return toolError("Could not reach this site's editor API from this page.");
  }
  const authJson = await readJson(auth);
  if (!auth.ok || authJson.authed !== true) {
    return toolError(
      `You are not signed in to this site's editor, so nothing was written. Ask the person to ` +
        `sign in at ${siteUrl(ADMIN_PATH)} with their GitHub account, then run this again.`,
    );
  }

  const payload: Record<string, unknown> = {
    kind,
    title,
    body,
    desc,
    // Forced, not passed through. The caller cannot publish with this tool.
    draft: true,
  };
  if (section) payload.section = section;
  if (typeof args.summary === "string" && args.summary.trim()) payload.summary = args.summary.trim();
  if (Array.isArray(args.tags)) {
    payload.tags = args.tags.filter((t): t is string => typeof t === "string");
  }

  let res: HttpResponse;
  try {
    res = await fetchImpl(CMS_POST, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });
  } catch {
    return toolError("Could not reach this site's editor API from this page.");
  }
  const json = await readJson(res);
  if (!res.ok || json.ok !== true) {
    const why = typeof json.error === "string" ? json.error : `HTTP ${res.status}`;
    return toolError(`The site refused to write the draft: ${why}`);
  }
  const url = typeof json.url === "string" ? json.url : "";
  return {
    ok: true,
    id: typeof json.id === "string" ? json.id : "",
    kind,
    slug: typeof json.slug === "string" ? json.slug : "",
    draft: true,
    url: url ? siteUrl(url) : "",
    adminUrl: siteUrl(ADMIN_PATH),
    note:
      "This is a draft. It has its own URL and appears in no listing, no feed and no sitemap " +
      "until a person publishes it from the editor.",
  };
}

/* ---------------------------- the site's content -------------------------- */

/** The published content the tools read, as one object, so a test can pass a
    fixture in place of the real site. */
export interface SiteToolContent {
  games: Item[];
  hardware: Item[];
  docs: Item[];
}

export const SITE_CONTENT: SiteToolContent = {
  games: GAMES,
  hardware: HARDWARE,
  docs: DOCS,
};

export function glossaryPage(docs: Item[]): Item | undefined {
  return docs.find((d) => d.slug === GLOSSARY_SLUG);
}
