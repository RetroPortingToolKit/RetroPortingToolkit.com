import { pathFor } from "./content";
import {
  docsSearchText,
  headingAt,
  searchTerms,
  snippetAround,
  type DocsSearchHeading,
  type DocsSearchIndex,
  type SnippetPart,
} from "./docsSearch";
import type { Item } from "./types";

/**
 * The command palette's engine: one index over everything the site publishes,
 * one ranked list over that index AND over the commands the palette can run.
 *
 * This file is pure and free of React, so the ranking can be asserted without a
 * DOM (src/lib/siteSearch.test.ts). src/components/SearchPalette.tsx is the only
 * thing that renders it.
 *
 * WHERE THE WORDS COME FROM. Nothing is fetched at runtime, which is the rule
 * for this whole site:
 *
 *  - Games, Platforms and News are already in the bundle. src/lib/content.ts
 *    reads data/ at build time with import.meta.glob, bodies included, so the
 *    palette reduces those bodies to plain text on the first open and keeps the
 *    result. No second copy is shipped.
 *  - Documentation comes from `virtual:docs-search-index`, the build-time index
 *    that already exists for the documentation search, dynamically imported so
 *    it stays its own chunk. Its entries carry the heading ids the rendered
 *    page puts on its headings, which is what lets a hit deep-link to #anchor.
 *
 * The markdown to plain text pass is docsSearchText() from src/lib/docsSearch
 * .ts, deliberately: one reduction, so a table cell is as findable in a game
 * page as it is in a reference page and a snippet is cut by one set of rules.
 */

/* ------------------------------ the index --------------------------------- */

/** The four kinds, as a search row labels them. */
export type SiteSearchKind = "game" | "hardware" | "blog" | "docs";

/** The small label a row shows. Singular: it names ONE thing, not a section. */
export const SITE_SEARCH_KIND_LABEL: Record<SiteSearchKind, string> = {
  game: "Game",
  hardware: "Platform",
  blog: "Article",
  docs: "Docs",
};

// Only reached when two entries score exactly the same, which happens most
// often when a game, a platform and a documentation page share a name (there is
// a /hardware/playstation AND a /docs/platforms/playstation, both titled
// "PlayStation"). The thing itself first, then the page about it, then the news
// about that.
const KIND_RANK: Record<SiteSearchKind, number> = {
  game: 0,
  hardware: 1,
  docs: 2,
  blog: 3,
};

export interface SiteSearchEntry {
  kind: SiteSearchKind;
  /** the page's own URL: "/games/tomba", "/docs/start/quickstart" */
  path: string;
  title: string;
  /** docs: the section's display title. Everything else: the page's kicker. */
  section: string;
  /** The page's own one-line description: `desc`, or `summary` on docs. */
  summary: string;
  /** The whole body as the words a reader sees, table cells included. */
  text: string;
  /** docs only: every heading, with the id the rendered page carries. */
  headings: DocsSearchHeading[];
  /** Words that should match but are never shown: tags, meta, platform. */
  keywords: string;
}

export interface SiteSearchIndex {
  entries: SiteSearchEntry[];
}

/** One published page of the three flat kinds. Docs never come through here:
    their entries carry headings and a summary the walk above already built. */
function itemEntry(item: Item): SiteSearchEntry {
  return {
    kind: item.kind as Exclude<SiteSearchKind, "docs">,
    path: pathFor(item.kind, item.slug),
    title: item.title,
    section: item.kicker,
    summary: item.desc,
    text: docsSearchText(item.body).text,
    headings: [],
    keywords: [
      ...item.tags,
      ...item.meta,
      item.group ?? "",
      item.platform ?? "",
      item.arch ?? "",
      item.venue ?? "",
      item.status ?? "",
    ]
      .filter(Boolean)
      .join(" "),
  };
}

export interface SiteSearchInput {
  /** The published items of the three flat kinds (GAMES, HARDWARE, BLOGS). */
  items: Item[];
  /** The documentation's build-time index, once its chunk has arrived. */
  docs?: DocsSearchIndex;
}

/** The whole site as one list. Docs are appended as they are: the build already
    reduced them, and rebuilding them here would be a second set of rules. */
export function buildSiteSearchIndex(input: SiteSearchInput): SiteSearchIndex {
  const entries: SiteSearchEntry[] = [];
  for (const item of input.items) {
    // A docs page reaching this list would arrive without its headings, so its
    // results could not deep-link. They come from input.docs instead.
    if (item.kind === "docs") continue;
    entries.push(itemEntry(item));
  }
  for (const entry of input.docs?.entries ?? []) {
    entries.push({
      kind: "docs",
      path: `/docs/${entry.slug}`,
      title: entry.title,
      section: entry.section,
      summary: entry.summary,
      text: entry.text,
      headings: entry.headings,
      keywords: "",
    });
  }
  return { entries };
}

/* ----------------------------- the commands ------------------------------- */

/**
 * One thing the palette can do. The catalog itself is src/lib/paletteCommands
 * .ts; this file only knows how to rank one against a query, because a command
 * and a page compete for the same list.
 */
export interface PaletteCommand {
  id: string;
  /** what the row reads as, e.g. "Theme: dark" */
  label: string;
  /** the line under the label, and the second tier this command matches on */
  hint: string;
  /** the small label at the end of the row, e.g. "Go" */
  group: string;
  /** matched but never shown */
  keywords?: string;
  /** Runs it. A promise is awaited before `confirm` is shown, so a command can
      only claim it worked once it has. */
  run: () => void | Promise<unknown>;
  /** shown in the row for a moment instead of closing straight away */
  confirm?: string;
}

/* ------------------------------- ranking ---------------------------------- */

/**
 * Three tiers, in this order:
 *
 *   1. TITLE. What the thing IS. A command's label is a title.
 *   2. SUMMARY. The page's own one-line description (`desc`, or `summary` on
 *      docs); a command's hint. What the thing is ABOUT.
 *   3. BODY. The page mentions it somewhere.
 *
 * A documentation heading sits between 2 and 3: a heading names a part of a
 * page, which is closer to a title than to prose, but it is not what the page
 * is. Tags, the section name and the other frontmatter words sit just under it,
 * because they are how a page is filed rather than what it says.
 *
 * Inside the title tier, a prefix beats a substring: someone typing "tom" means
 * Tomba far more often than they mean a page with "bottom" in the title.
 */
const WEIGHT_TITLE = 12;
const WEIGHT_SUMMARY = 6;
const WEIGHT_HEADING = 4;
const WEIGHT_KEYWORD = 3;
const WEIGHT_TEXT = 1;

/** The whole title IS the term. */
const BONUS_EXACT = 8;
/** The title starts with it. */
const BONUS_PREFIX = 4;
/** A word inside the title starts with it. */
const BONUS_WORD = 2;

const WORD_CHAR = /[a-z0-9]/;

/** True when `term` starts a word anywhere in `text` (both lowercased). */
function startsAWord(text: string, term: string): boolean {
  for (let i = text.indexOf(term); i !== -1; i = text.indexOf(term, i + 1)) {
    if (i === 0 || !WORD_CHAR.test(text[i - 1])) return true;
  }
  return false;
}

/** The title tier for one term, prefix bonuses included. 0 when it is absent. */
function titleScore(title: string, term: string): number {
  if (!title.includes(term)) return 0;
  if (title === term) return WEIGHT_TITLE + BONUS_EXACT;
  if (title.startsWith(term)) return WEIGHT_TITLE + BONUS_PREFIX;
  if (startsAWord(title, term)) return WEIGHT_TITLE + BONUS_WORD;
  return WEIGHT_TITLE;
}

interface ScoredEntry {
  entry: SiteSearchEntry;
  score: number;
  /** true when any term matched the title, the summary, a heading or a tag:
      the row can then show the page's own description rather than a snippet */
  above: boolean;
  /** offset of the first body hit, or -1 */
  textAt: number;
  headingIndex: number;
}

function scoreEntry(entry: SiteSearchEntry, terms: string[]): ScoredEntry | null {
  const title = entry.title.toLowerCase();
  const summary = entry.summary.toLowerCase();
  const section = entry.section.toLowerCase();
  const keywords = entry.keywords.toLowerCase();
  const text = entry.text.toLowerCase();
  const headings = entry.headings.map((h) => h.text.toLowerCase());

  let score = 0;
  let above = false;
  let textAt = -1;
  let headingIndex = -1;

  for (const term of terms) {
    let best = titleScore(title, term);
    if (best > 0) above = true;

    if (summary.includes(term)) {
      best = Math.max(best, WEIGHT_SUMMARY);
      above = true;
    }

    for (let i = 0; i < headings.length; i++) {
      if (!headings[i].includes(term)) continue;
      best = Math.max(best, WEIGHT_HEADING + (headings[i].startsWith(term) ? 1 : 0));
      above = true;
      if (headingIndex === -1) headingIndex = i;
      break;
    }

    if (section.includes(term) || keywords.includes(term)) {
      best = Math.max(best, WEIGHT_KEYWORD);
      above = true;
    }

    const hit = text.indexOf(term);
    if (hit !== -1) {
      best = Math.max(best, WEIGHT_TEXT);
      if (textAt === -1 || hit < textAt) textAt = hit;
    }

    // Every term has to appear somewhere on the page, the same AND the
    // documentation search uses: an OR ranks a page that matched only "the"
    // above one that matched the words that mattered.
    if (best === 0) return null;
    score += best;
  }
  return { entry, score, above, textAt, headingIndex };
}

/** A command's three tiers: label, hint, then the words it also answers to. */
function scoreCommand(command: PaletteCommand, terms: string[]): number | null {
  const label = command.label.toLowerCase();
  const hint = command.hint.toLowerCase();
  const keywords = `${command.keywords ?? ""} ${command.group}`.toLowerCase();
  let score = 0;
  for (const term of terms) {
    let best = titleScore(label, term);
    if (hint.includes(term)) best = Math.max(best, WEIGHT_SUMMARY);
    if (keywords.includes(term)) best = Math.max(best, WEIGHT_KEYWORD);
    if (best === 0) return null;
    score += best;
  }
  return score;
}

/* -------------------------------- results --------------------------------- */

/** Which of the palette's two lists a row belongs to. */
export type SiteSearchGroup = "command" | "result";

export interface SiteSearchHit {
  group: SiteSearchGroup;
  /** stable across keystrokes, so React keeps the row it is reusing */
  id: string;
  title: string;
  /** the small label: Game, Platform, Article, Docs, or a command's group */
  label: string;
  /** docs: the section it is in */
  section?: string;
  /** docs: the heading the match sits under, which the path anchors to */
  heading?: string;
  /** the line under the title: the page's own description, or, when the match
      was only in the body, a window of the body around it */
  description: SnippetPart[];
  /** a content row navigates here */
  path?: string;
  /** a command row runs this */
  command?: PaletteCommand;
  score: number;
}

export interface SiteSearchOptions {
  /** How many content results to return. Default 8. */
  limit?: number;
  /** How many commands to return once a query narrows them. Default 5. */
  commandLimit?: number;
  /** The commands to rank alongside the content. */
  commands?: PaletteCommand[];
}

function commandHit(command: PaletteCommand, terms: string[], score: number): SiteSearchHit {
  return {
    group: "command",
    id: `command:${command.id}`,
    title: command.label,
    label: command.group,
    description: snippetAround(command.hint, 0, terms),
    command,
    score,
  };
}

/**
 * The palette's whole list: matching commands first, then matching pages.
 *
 * An empty query is the palette's resting state and answers with the command
 * list alone, which is what makes this a command palette that also searches
 * rather than a search box with extras.
 */
export function searchSite(
  index: SiteSearchIndex | undefined,
  query: string,
  options: SiteSearchOptions = {},
): SiteSearchHit[] {
  const commands = options.commands ?? [];
  const terms = searchTerms(query);
  if (terms.length === 0) return commands.map((c) => commandHit(c, terms, 0));

  const scoredCommands = commands
    .map((command) => ({ command, score: scoreCommand(command, terms) }))
    .filter((c): c is { command: PaletteCommand; score: number } => c.score !== null)
    // A stable sort, so commands that tie stay in catalog order.
    .sort((a, b) => b.score - a.score)
    .slice(0, options.commandLimit ?? 5)
    .map((c) => commandHit(c.command, terms, c.score));

  if (!index) return scoredCommands;

  const scored: ScoredEntry[] = [];
  for (const entry of index.entries) {
    const hit = scoreEntry(entry, terms);
    if (hit) scored.push(hit);
  }
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      KIND_RANK[a.entry.kind] - KIND_RANK[b.entry.kind] ||
      a.entry.title.localeCompare(b.entry.title) ||
      a.entry.path.localeCompare(b.entry.path),
  );

  const results = scored.slice(0, options.limit ?? 8).map((hit): SiteSearchHit => {
    const entry = hit.entry;
    // A term that matched a heading names that part of the page outright;
    // otherwise the heading is whichever one the body hit sits under.
    const which =
      hit.headingIndex !== -1
        ? hit.headingIndex
        : hit.textAt !== -1
          ? headingAt(entry.headings, hit.textAt)
          : -1;
    const heading = which !== -1 ? entry.headings[which] : undefined;
    // Show the page's own description, which is what it is for, and from its
    // first word: a description read from the middle is no longer one. A page
    // that matched ONLY in its body gets a window of the body instead, so the
    // row says why it surfaced rather than leaving the reader to guess.
    const bodyOnly = !hit.above && hit.textAt !== -1;
    const description =
      bodyOnly || !entry.summary
        ? snippetAround(entry.text, Math.max(0, hit.textAt), terms)
        : snippetAround(entry.summary, 0, terms);
    return {
      group: "result",
      id: `result:${entry.path}`,
      title: entry.title,
      label: SITE_SEARCH_KIND_LABEL[entry.kind],
      // Only documentation shows a section: it is what tells one "Quickstart"
      // from another. Elsewhere the kind label is enough, and a second grey
      // word beside it only crowds the row.
      section: entry.kind === "docs" ? entry.section || undefined : undefined,
      heading: heading?.text,
      description,
      path: heading ? `${entry.path}#${heading.id}` : entry.path,
      score: hit.score,
    };
  });

  return [...scoredCommands, ...results];
}
