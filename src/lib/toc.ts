import GithubSlugger from "github-slugger";

// The "on this page" data, derived from the MARKDOWN SOURCE rather than from
// the rendered DOM: a page component can build its table of contents during
// render, before anything is mounted, and the prerendered HTML carries the same
// list the browser does.
//
// The ids here must be the ids `rehype-slug` puts on the headings in
// src/components/Markdown.tsx, or every link in the contents misses. That is
// why this uses the same github-slugger, fed the same plain text, over the same
// headings in the same order. rehype-slug slugs EVERY heading it finds and
// dedupes repeats with a "-1" suffix, so this walks every heading too and
// filters by depth only at the end. Dropping an H1 from the walk would shift
// the suffix on a later duplicate and break exactly the links a reader clicks.

export interface TocEntry {
  /** 1 for `#`, 2 for `##`, and so on. */
  depth: number;
  /** The heading with its inline markup removed, as it reads on the page. */
  text: string;
  /** The heading's `id`, and the fragment to link to. */
  id: string;
}

export interface TocNode extends TocEntry {
  children: TocNode[];
}

export interface TocOptions {
  /** Shallowest heading to include. Default 2: the H1 is the page title. */
  minDepth?: number;
  /** Deepest heading to include. Default 3, the house style's floor. */
  maxDepth?: number;
}

const FENCE_RE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const ATX_RE = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;
const SETEXT_RE = /^ {0,3}(=+|-+)[ \t]*$/;
// A line that starts another block: it cannot be the text of a setext heading.
const BLOCK_START_RE = /^ {0,3}(?:[-*+>#]|\d+[.)]|```|~~~|\|)/;

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#\d+|#[xX][0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X"
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[body.toLowerCase()] ?? whole;
  });
}

/**
 * The plain text of one heading, matching what `hast-util-to-string` gives
 * rehype-slug once remark has parsed the same line: links keep their text,
 * code spans keep their contents, emphasis markers and images go away.
 */
export function headingText(raw: string): string {
  // Text that is already literal (an escape, the inside of a code span) is
  // parked here so the emphasis rules below cannot chew on it, and put back at
  // the end.
  const literals: string[] = [];
  const park = (value: string) => `\u0000${literals.push(value) - 1}\u0000`;

  let s = raw.trim();
  // A closing "##" sequence is decoration, not text.
  s = s.replace(/[ \t]+#+$/, "");
  s = s.replace(/\\([\\`*_{}[\]()#+\-.!|~<>])/g, (_, ch: string) => park(ch));
  // Images contribute nothing to a heading's text content.
  s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
  s = s.replace(/!\[[^\]]*\]\[[^\]]*\]/g, "");
  // Links and reference links keep their label, emphasis inside it included.
  s = s.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  s = s.replace(/\[([^\]]*)\]\[[^\]]*\]/g, "$1");
  // An autolink reads as its target; other raw HTML contributes no text.
  s = s.replace(/<((?:https?|mailto):[^>\s]+)>/g, (_, url: string) => park(url));
  s = s.replace(/<\/?[a-zA-Z][^>]*>/g, "");
  // Code spans: the delimiter run can be any length, and one leading and one
  // trailing space are dropped when both are present.
  s = s.replace(/(`+)([\s\S]*?)\1/g, (_, _ticks: string, code: string) =>
    park(/^ .* $/.test(code) ? code.slice(1, -1) : code),
  );
  s = s.replace(/~~([^~]+)~~/g, "$1");
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  s = s.replace(/__([^_]+)__/g, "$1");
  s = s.replace(/\*([^*]+)\*/g, "$1");
  // Underscore emphasis only at word boundaries, so build_all stays build_all.
  s = s.replace(/(^|[\s(])_([^_]+)_(?=[\s.,;:!?)]|$)/g, "$1$2");
  s = decodeEntities(s).replace(/\u0000(\d+)\u0000/g, (_, i: string) => literals[+i]);
  // Only the ends are trimmed. hast-util-to-string, which is what rehype-slug
  // slugs, concatenates the text nodes verbatim, so collapsing runs of spaces
  // here would produce an id the heading on the page does not have.
  return s.trim();
}

interface RawHeading {
  depth: number;
  text: string;
  /** Inside a blockquote: it gets an id, but it is someone else's heading. */
  quoted: boolean;
}

/** Every ATX and setext heading in source order, code fences excluded. */
function findHeadings(markdown: string): RawHeading[] {
  // Blockquote markers come off first. A page that quotes a repository's README
  // verbatim can quote its headings too, and remark gives those an id like any
  // other heading, so they have to be counted here even though they are not
  // this page's own sections.
  const rows = markdown
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => {
      const stripped = line.replace(/^ {0,3}(?:> ?)+/, "");
      return { text: stripped, quoted: stripped !== line };
    });
  const lines = rows.map((r) => r.text);
  const found: RawHeading[] = [];
  let fence: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fenceMatch = line.match(FENCE_RE);
    if (fence) {
      // Only a run of the same character, at least as long, closes a fence.
      if (
        fenceMatch &&
        fenceMatch[1][0] === fence[0] &&
        fenceMatch[1].length >= fence.length &&
        !fenceMatch[2].trim()
      ) {
        fence = null;
      }
      continue;
    }
    if (fenceMatch) {
      // A backtick fence's info string cannot itself contain a backtick.
      if (fenceMatch[1][0] === "`" && fenceMatch[2].includes("`")) continue;
      fence = fenceMatch[1];
      continue;
    }
    const atx = line.match(ATX_RE);
    if (atx) {
      found.push({
        depth: atx[1].length,
        text: headingText(atx[2] ?? ""),
        quoted: rows[i].quoted,
      });
      continue;
    }
    // Setext: `Title` over `====` (H1) or `----` (H2). Worth handling because
    // remark reads it as a heading whether or not the author meant one, so
    // ignoring it here would shift every later duplicate's id.
    const underline = line.match(SETEXT_RE);
    const prev = i > 0 ? lines[i - 1] : "";
    if (
      underline &&
      prev.trim() &&
      !BLOCK_START_RE.test(prev) &&
      !(i > 1 && SETEXT_RE.test(lines[i - 2]))
    ) {
      found.push({
        depth: underline[1][0] === "=" ? 1 : 2,
        text: headingText(prev),
        quoted: rows[i].quoted,
      });
    }
  }
  return found;
}

/**
 * The headings of one markdown body, with the id each one carries on the page.
 * Defaults to H2 and H3, which is what an "on this page" rail shows.
 */
export function extractToc(markdown: string, options: TocOptions = {}): TocEntry[] {
  const min = options.minDepth ?? 2;
  const max = options.maxDepth ?? 3;
  if (!markdown) return [];
  const slugger = new GithubSlugger();
  const out: TocEntry[] = [];
  for (const heading of findHeadings(markdown)) {
    // Slug EVERY heading, so the dedupe counter matches rehype-slug's, then
    // keep the ones asked for. A heading inside a blockquote is a quotation,
    // not one of this page's sections, so it is counted and not listed.
    const id = slugger.slug(heading.text);
    if (heading.quoted) continue;
    if (heading.depth < min || heading.depth > max) continue;
    if (!heading.text) continue;
    out.push({ depth: heading.depth, text: heading.text, id });
  }
  return out;
}

/**
 * The same entries nested by depth, for a contents list that indents. A deeper
 * heading with no parent above it becomes a top-level node rather than being
 * dropped.
 */
export function tocTree(entries: TocEntry[]): TocNode[] {
  const roots: TocNode[] = [];
  const stack: TocNode[] = [];
  for (const entry of entries) {
    const node: TocNode = { ...entry, children: [] };
    while (stack.length && stack[stack.length - 1].depth >= node.depth) stack.pop();
    if (stack.length) stack[stack.length - 1].children.push(node);
    else roots.push(node);
    stack.push(node);
  }
  return roots;
}
