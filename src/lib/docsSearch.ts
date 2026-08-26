import { extractToc, headingText } from "./toc";

/**
 * Documentation search: the index shape, the markdown to plain text pass that
 * fills it, and the query engine that reads it.
 *
 * This file is deliberately pure and free of both React and node builtins,
 * because BOTH sides use it:
 *
 *  - `vite.config.ts` (the `docsDataPlugin`) calls `buildDocsSearchIndex()` at
 *    build time over the published documentation and serves the result as the
 *    virtual module `virtual:docs-search-index`. Nothing is fetched at runtime.
 *  - `src/components/DocsSearch.tsx` lazy-imports that module on the first open
 *    and calls `searchDocs()` on every keystroke.
 *
 * Keeping one home for both means the text a page was indexed with and the text
 * a snippet is cut from can never be produced by two different rules.
 *
 * Why the plain text pass exists at all: a reference page here puts its whole
 * substance in a GFM table (the port registry, the configuration keys, the
 * command tables, the glossary). Searching the raw markdown would work but
 * would show a snippet full of pipes and link targets, and searching the
 * rendered DOM is not available at build time. So the markdown is reduced once,
 * at build time, to the words a reader sees, table cells included.
 */

/** One heading, and where its text starts inside the page's plain text. */
export interface DocsSearchHeading {
  /** The id rehype-slug puts on the heading, so a result can link into it. */
  id: string;
  text: string;
  /** Character offset of this heading's text within `text`. */
  at: number;
}

/** One published documentation page, as the search index holds it. */
export interface DocsSearchEntry {
  /** full path under /docs: "reference" or "reference/tcp-port-registry" */
  slug: string;
  title: string;
  /** the section's display title, e.g. "Reference" */
  section: string;
  summary: string;
  headings: DocsSearchHeading[];
  /** The whole page as plain text: headings, prose, list items, table cells. */
  text: string;
}

export interface DocsSearchIndex {
  /** Bumped when the shape changes, so a stale cached chunk is obvious. */
  version: number;
  entries: DocsSearchEntry[];
}

export const DOCS_SEARCH_INDEX_VERSION = 1;

/* -------------------------- markdown to plain text ------------------------ */

const FENCE_RE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const ATX_RE = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;
const QUOTE_RE = /^ {0,3}(?:> ?)+/;
const LIST_RE = /^\s*(?:[-*+]|\d+[.)])\s+/;
// A GFM table's separator row: only pipes, colons, dashes and spaces, and at
// least one dash. It carries alignment, which is presentation, not text.
const TABLE_RULE_RE = /^\s*\|?[\s|:-]*-[\s|:-]*\|?\s*$/;

/** Split one table row on its unescaped pipes and drop the outer empties. */
function tableCells(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "\\" && i + 1 < line.length) {
      current += line[i + 1];
      i++;
      continue;
    }
    if (ch === "|") {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current);
  // "| a | b |" splits to ["", " a ", " b ", ""]: the outer empties are the
  // row's own delimiters, not cells.
  if (cells.length && cells[0].trim() === "") cells.shift();
  if (cells.length && cells[cells.length - 1].trim() === "") cells.pop();
  return cells.map((c) => c.trim()).filter(Boolean);
}

function isTableRow(line: string): boolean {
  return line.includes("|") && !TABLE_RULE_RE.test(line);
}

export interface DocsSearchTextOptions {
  /**
   * Keep the contents of fenced code blocks. Default true: a reader searching
   * for a flag or a config key expects to find it where it is actually written,
   * and in this corpus that is usually inside a fence.
   */
  includeCode?: boolean;
}

export interface DocsSearchText {
  text: string;
  /** Every H2 to H4 outside a fence and outside a quotation, in source order. */
  headings: { text: string; at: number }[];
}

/**
 * One markdown body as the words a reader sees. Fences, quotations, lists and
 * tables are handled by a line walk; everything inline is handed to
 * `headingText()` from src/lib/toc.ts, which already strips images, keeps a
 * link's label, keeps a code span's contents and decodes entities. Reusing it
 * is the point: one inline stripper, not two that drift.
 */
export function docsSearchText(
  markdown: string,
  options: DocsSearchTextOptions = {},
): DocsSearchText {
  const includeCode = options.includeCode ?? true;
  const out: string[] = [];
  const headings: { text: string; at: number }[] = [];
  let length = 0;

  const push = (value: string): number => {
    const trimmed = value.trim();
    if (!trimmed) return length;
    if (length > 0) {
      out.push(" ");
      length += 1;
    }
    const at = length;
    out.push(trimmed);
    length += trimmed.length;
    return at;
  };

  // HTML comments carry authoring notes, never page text, and they span lines.
  const source = (markdown || "").replace(/\r\n/g, "\n").replace(/<!--[\s\S]*?-->/g, "");
  const lines = source.split("\n");
  let fence: string | null = null;

  for (const raw of lines) {
    const quoted = QUOTE_RE.test(raw);
    const line = raw.replace(QUOTE_RE, "");
    const fenceMatch = line.match(FENCE_RE);

    if (fence) {
      if (
        fenceMatch &&
        fenceMatch[1][0] === fence[0] &&
        fenceMatch[1].length >= fence.length &&
        !fenceMatch[2].trim()
      ) {
        fence = null;
      } else if (includeCode) {
        // Code is pushed verbatim: no inline pass, because a backtick or an
        // underscore inside a shell line is a character, not markup.
        push(line);
      }
      continue;
    }
    if (fenceMatch) {
      if (fenceMatch[1][0] === "`" && fenceMatch[2].includes("`")) {
        // Not a fence: a backtick fence's info string cannot hold a backtick.
      } else {
        fence = fenceMatch[1];
        continue;
      }
    }

    const atx = line.match(ATX_RE);
    if (atx) {
      const text = headingText(atx[2] ?? "");
      const at = push(text);
      // A heading inside a quotation belongs to whoever is being quoted, which
      // is exactly the rule extractToc applies, so the two lists line up.
      if (!quoted && text && atx[1].length >= 2 && atx[1].length <= 4) {
        headings.push({ text, at });
      }
      continue;
    }

    if (isTableRow(line)) {
      const cells = tableCells(line).map((cell) => headingText(cell)).filter(Boolean);
      // The middle dot keeps a row readable in a snippet without inventing
      // punctuation the page does not have.
      if (cells.length) push(cells.join(" · "));
      continue;
    }
    if (TABLE_RULE_RE.test(line) && line.includes("|")) continue;

    push(headingText(line.replace(LIST_RE, "")));
  }

  return { text: out.join(""), headings };
}

/* ------------------------------ index building ---------------------------- */

/** The fields `buildDocsSearchEntry` needs from a published page. */
export interface DocsSearchSource {
  slug: string;
  title: string;
  /** the section's display title */
  section: string;
  summary: string;
  body: string;
}

/**
 * One index entry. Heading ids come from `extractToc`, which is the same walk
 * (and the same github-slugger sequence) that puts the ids on the rendered
 * page, so a result can link into a heading and land on it.
 *
 * The two walks are zipped by text, and any disagreement drops the anchors for
 * that page rather than shipping an id that points at nothing. `docsSearch.test
 * .ts` asserts they agree across the whole published corpus.
 */
export function buildDocsSearchEntry(page: DocsSearchSource): DocsSearchEntry {
  const { text, headings } = docsSearchText(page.body);
  const toc = extractToc(page.body, { minDepth: 2, maxDepth: 4 });
  const aligned =
    toc.length === headings.length && toc.every((t, i) => t.text === headings[i].text);
  return {
    slug: page.slug,
    title: page.title,
    section: page.section,
    summary: page.summary,
    headings: aligned
      ? toc.map((entry, i) => ({ id: entry.id, text: entry.text, at: headings[i].at }))
      : [],
    text,
  };
}

/** The whole index, in the order the pages are given (sidebar order). */
export function buildDocsSearchIndex(pages: DocsSearchSource[]): DocsSearchIndex {
  return {
    version: DOCS_SEARCH_INDEX_VERSION,
    entries: pages.map(buildDocsSearchEntry),
  };
}

/** The published documentation, as this file wants it. The shape is what
    `collectDocs()` in scripts/gen-llms.mjs returns, which is the walk that
    mirrors the draft-filtered DOCS export. Living here rather than inline in
    vite.config.ts is what lets the test build the index the same way the build
    does. */
export function docsSearchSources(collected: {
  pages: { slug: string; title: string; section: string; summary: string; desc: string; body: string }[];
  sections: { slug: string; title: string }[];
}): DocsSearchSource[] {
  const titles = new Map(collected.sections.map((s) => [s.slug, s.title]));
  return collected.pages.map((page) => ({
    slug: page.slug,
    title: page.title,
    section: titles.get(page.section) ?? "",
    summary: page.summary || page.desc,
    body: page.body,
  }));
}

/* -------------------------------- querying -------------------------------- */

export interface SnippetPart {
  text: string;
  /** True for the part of the snippet that matched, so it can be highlighted. */
  mark: boolean;
}

export interface DocsSearchResult {
  slug: string;
  /** "/docs/<slug>", or "/docs/<slug>#<heading-id>" when a heading matched. */
  path: string;
  title: string;
  section: string;
  /** The heading the match sits under, when there is one. */
  heading?: string;
  snippet: SnippetPart[];
  score: number;
}

/** Query terms: lowercased, whitespace split, punctuation kept (`--flag`). */
export function searchTerms(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

const SNIPPET_BEFORE = 70;
const SNIPPET_LENGTH = 190;

/** Widen a slice to the nearest space, so a snippet never starts mid word. */
function widen(text: string, start: number, end: number): [number, number] {
  let from = start;
  let to = end;
  if (from > 0) {
    const space = text.lastIndexOf(" ", from);
    from = space === -1 ? 0 : space + 1;
  }
  if (to < text.length) {
    const space = text.indexOf(" ", to);
    to = space === -1 ? text.length : space;
  }
  return [from, to];
}

/** Split a slice of text into marked and unmarked parts, longest term first. */
function markParts(text: string, terms: string[]): SnippetPart[] {
  const lower = text.toLowerCase();
  const hits: [number, number][] = [];
  for (const term of terms) {
    let from = 0;
    for (;;) {
      const i = lower.indexOf(term, from);
      if (i === -1) break;
      hits.push([i, i + term.length]);
      from = i + term.length;
    }
  }
  if (!hits.length) return [{ text, mark: false }];
  hits.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const parts: SnippetPart[] = [];
  let cursor = 0;
  for (const [from, to] of hits) {
    if (from < cursor) continue;
    if (from > cursor) parts.push({ text: text.slice(cursor, from), mark: false });
    parts.push({ text: text.slice(from, to), mark: true });
    cursor = to;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), mark: false });
  return parts;
}

/** A window of `text` around `at`, with every term in it highlighted. */
export function snippetAround(text: string, at: number, terms: string[]): SnippetPart[] {
  if (!text) return [];
  const [from, to] = widen(
    text,
    Math.max(0, at - SNIPPET_BEFORE),
    Math.min(text.length, Math.max(0, at - SNIPPET_BEFORE) + SNIPPET_LENGTH),
  );
  const slice = text.slice(from, to);
  const parts = markParts(slice, terms);
  if (from > 0 && parts.length) parts[0] = { ...parts[0], text: `…${parts[0].text}` };
  if (to < text.length && parts.length) {
    const last = parts[parts.length - 1];
    parts[parts.length - 1] = { ...last, text: `${last.text}…` };
  }
  return parts;
}

// Field weights. A term in the title says the page is about it; a term in the
// body says the page mentions it. Everything else sits between the two.
const WEIGHT_TITLE = 12;
const WEIGHT_SECTION = 2;
const WEIGHT_HEADING = 6;
const WEIGHT_SUMMARY = 4;
const WEIGHT_TEXT = 1;

interface Scored {
  entry: DocsSearchEntry;
  score: number;
  /** offset of the first body hit, or -1 */
  at: number;
  /** offset of the first summary hit, or -1 */
  summaryAt: number;
  headingIndex: number;
}

function scoreEntry(entry: DocsSearchEntry, terms: string[]): Scored | null {
  const title = entry.title.toLowerCase();
  const section = entry.section.toLowerCase();
  const summary = entry.summary.toLowerCase();
  const text = entry.text.toLowerCase();
  const headings = entry.headings.map((h) => h.text.toLowerCase());

  let score = 0;
  let at = -1;
  let summaryAt = -1;
  let headingIndex = -1;

  for (const term of terms) {
    let best = 0;
    if (title.includes(term)) {
      best = WEIGHT_TITLE + (title.startsWith(term) ? 4 : 0);
    }
    if (section.includes(term)) best = Math.max(best, WEIGHT_SECTION);
    const inSummary = summary.indexOf(term);
    if (inSummary !== -1) {
      best = Math.max(best, WEIGHT_SUMMARY);
      if (summaryAt === -1 || inSummary < summaryAt) summaryAt = inSummary;
    }
    for (let i = 0; i < headings.length; i++) {
      if (!headings[i].includes(term)) continue;
      best = Math.max(best, WEIGHT_HEADING);
      if (headingIndex === -1) headingIndex = i;
      break;
    }
    const hit = text.indexOf(term);
    if (hit !== -1) {
      best = Math.max(best, WEIGHT_TEXT);
      if (at === -1 || hit < at) at = hit;
    }
    // Every term has to appear somewhere on the page. An OR would rank a page
    // that matches only "the" above one that matches the words that mattered.
    if (best === 0) return null;
    score += best;
  }
  return { entry, score, at, summaryAt, headingIndex };
}

/** The heading a body offset sits under, or -1 when it sits above them all.
    Exported because the site-wide palette (src/lib/siteSearch.ts) anchors a
    documentation hit the same way, and one rule is the point. */
export function headingAt(headings: DocsSearchHeading[], at: number): number {
  let found = -1;
  for (let i = 0; i < headings.length; i++) {
    if (headings[i].at <= at) found = i;
    else break;
  }
  return found;
}

export interface DocsSearchOptions {
  /** How many results to return. Default 8. */
  limit?: number;
}

/**
 * Rank the index against a query. Substring matching, not stemming: the terms
 * people search a reference for here are identifiers, ports and flags, where a
 * stemmer is a liability and a partial word is usually what was typed.
 */
export function searchDocs(
  index: DocsSearchIndex | undefined,
  query: string,
  options: DocsSearchOptions = {},
): DocsSearchResult[] {
  const terms = searchTerms(query);
  if (!index || terms.length === 0) return [];
  const limit = options.limit ?? 8;

  const scored: Scored[] = [];
  for (const entry of index.entries) {
    const hit = scoreEntry(entry, terms);
    if (hit) scored.push(hit);
  }
  scored.sort(
    (a, b) => b.score - a.score || a.entry.slug.localeCompare(b.entry.slug),
  );

  return scored.slice(0, limit).map((hit) => {
    const entry = hit.entry;
    // A term that matched a heading names the section outright; otherwise the
    // heading is whichever one the body hit sits under.
    const which =
      hit.headingIndex !== -1
        ? hit.headingIndex
        : hit.at !== -1
          ? headingAt(entry.headings, hit.at)
          : -1;
    const heading = which !== -1 ? entry.headings[which] : undefined;
    // Show the reader where the match is. A body hit wins; a page matched only
    // through its title or summary shows the summary, which is what it is for.
    const snippet =
      hit.at !== -1
        ? snippetAround(entry.text, hit.at, terms)
        : hit.summaryAt !== -1
          ? snippetAround(entry.summary, hit.summaryAt, terms)
          : snippetAround(entry.summary || entry.text, 0, terms);
    return {
      slug: entry.slug,
      path: heading ? `/docs/${entry.slug}#${heading.id}` : `/docs/${entry.slug}`,
      title: entry.title,
      section: entry.section,
      heading: heading?.text,
      snippet,
      score: hit.score,
    };
  });
}
