import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import GithubSlugger from "github-slugger";
import { SITE } from "./site-config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const PUBLIC_DIR = path.join(ROOT, "public");

const SITE_URL = SITE.url;
const SITE_NAME = SITE.title;
const SITE_TAGLINE = SITE.tagline;
const DEFAULT_DESC = SITE.description;

// The default Open Graph card. Optional: without it, pages fall back to their
// own item image, and pages with no image emit no og:image at all rather than
// pointing at a 404.
const DEFAULT_OG = fs.existsSync(path.join(PUBLIC_DIR, "og", "default.jpg"))
  ? "/og/default.jpg"
  : null;

const KIND_SEGMENT = {
  hardware: "hardware",
  game: "games",
  blog: "blog",
  docs: "docs",
};

// Keyed by URL SEGMENT here, by kind in src/lib/pageTitle.ts. The two are
// compared by src/lib/pageTitle.test.ts, so they cannot drift.
const COLLECTION_TITLE = {
  hardware: "Platforms",
  games: "Games",
  blog: "News and coverage",
  docs: "Documentation",
};

const IMG_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;

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

function kindFromPath(rel) {
  if (rel.startsWith("hardware/") || rel.startsWith("hardware\\")) return "hardware";
  if (rel.startsWith("games/") || rel.startsWith("games\\")) return "game";
  if (rel.startsWith("blog/") || rel.startsWith("blog\\")) return "blog";
  if (rel.startsWith("docs/") || rel.startsWith("docs\\")) return "docs";
  return null;
}

const FOLDER_RE = /^(\d+)_(.+)$/;
function folderSlug(folder) {
  const m = folder.match(FOLDER_RE);
  return m ? m[2] : folder;
}

// How deep a kind's folders may nest under data/<kind>/. Mirrors MAX_DEPTH in
// src/lib/content.ts: this walk and that one decide independently which pages
// the site has, and a disagreement means the prerendered HTML and the client
// disagree about which URLs exist. Docs are the only nested kind
// (data/docs/<section>/<page>/index.md, plus the section's own
// data/docs/<section>/index.md).
const MAX_DEPTH = { hardware: 1, game: 1, blog: 1, docs: 2 };

// The folder path under data/<kind>/ is the item's identity: one `NN_<slug>`
// segment per level, and the slugs joined by "/" are the URL. Returns null for
// anything outside the kind's depth, which is what keeps a stray
// data/docs/index.md or a third level from being published at an address the
// router cannot match.
function folderPathOf(rel, kind) {
  const segments = rel.split("/").slice(0, -1).slice(1);
  if (segments.length < 1 || segments.length > (MAX_DEPTH[kind] ?? 1)) return null;
  return {
    slug: segments.map(folderSlug).join("/"),
    section: kind === "docs" ? folderSlug(segments[0]) : "",
  };
}

function collectItems() {
  const items = [];
  if (!fs.existsSync(DATA_DIR)) return items;
  for (const file of walk(DATA_DIR)) {
    if (path.basename(file) !== "index.md") continue;
    const rel = path.relative(DATA_DIR, file).replaceAll("\\", "/");
    const kind = kindFromPath(rel);
    if (!kind) continue;
    const folders = folderPathOf(rel, kind);
    if (!folders) continue;
    const { slug, section } = folders;
    const raw = fs.readFileSync(file, "utf8");
    const { fm, body } = splitFrontmatter(raw);
    const gallery = Array.isArray(fm.gallery)
      ? fm.gallery
          .map((g) =>
            typeof g === "string" ? g : typeof g?.src === "string" ? g.src : "",
          )
          .filter(Boolean)
      : [];
    items.push({
      kind,
      slug,
      section,
      dir: path.dirname(file),
      title: typeof fm.title === "string" ? fm.title : slug,
      desc: typeof fm.desc === "string" ? fm.desc : "",
      summary: typeof fm.summary === "string" ? fm.summary : "",
      cover: typeof fm.cover === "string" ? fm.cover : "",
      poster: typeof fm.poster === "string" ? fm.poster : "",
      venue: typeof fm.venue === "string" ? fm.venue : "",
      year: typeof fm.year === "string" ? fm.year : "",
      videoUrl: typeof fm.videoUrl === "string" ? fm.videoUrl : "",
      group: typeof fm.group === "string" ? fm.group : "",
      duration: typeof fm.duration === "string" ? fm.duration : "",
      date: typeof fm.date === "string" ? fm.date : "",
      tags: Array.isArray(fm.tags)
        ? fm.tags.filter((t) => typeof t === "string")
        : [],
      gallery,
      kicker: typeof fm.kicker === "string" ? fm.kicker : "",
      draft: fm.draft === true,
      body: (body || "").trim(),
      links: Array.isArray(fm.links)
        ? fm.links.filter((l) => l && typeof l.href === "string")
        : [],
      captions: Array.isArray(fm.gallery)
        ? fm.gallery
            .map((g) => (g && typeof g.caption === "string" ? g.caption : ""))
            .filter(Boolean)
        : [],
    });
  }
  return items;
}

function readAbout() {
  const file = path.join(DATA_DIR, "about.md");
  if (!fs.existsSync(file)) return {};
  const raw = fs.readFileSync(file, "utf8");
  const { fm, body } = splitFrontmatter(raw);
  return { ...fm, bio: (body || "").trim() };
}

function collectCachedSources() {
  const dir = path.join(DATA_DIR, "sources");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const { fm, body } = splitFrontmatter(
        fs.readFileSync(path.join(dir, f), "utf8"),
      );
      return {
        key: fm.key || f.replace(/\.md$/, ""),
        title: fm.title || fm.source || f.replace(/\.md$/, ""),
        source: fm.source || "",
        original: fm.original || "",
        date: fm.date || "",
        body: (body || "").trim(),
      };
    });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ---- og assets: everything resolves to PUBLIC paths, so the exact same
// URLs work on prod, on the dev tunnel, and in the dev middleware below. The
// audit guarantees every item has a public poster (previews/ or lab-media/).
const LAB_DIR = { hardware: "hardware", game: "game", blog: "blog", docs: "docs" };

// A cover written as "./file.png" lives beside its index.md under data/, which
// no URL reaches: Vite bundles it to a content-hashed name for the app, and a
// hash is no use to a crawler that re-fetches the same og:image URL later. So
// each one is copied to a stable public path at build time (copyItemCovers)
// and served from data/ in dev, and both halves agree on this name.
const OG_ITEM_PREFIX = "/og/items";
const MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

function itemCoverSource(item) {
  if (!item.cover.startsWith("./") || !item.dir) return null;
  const file = path.join(item.dir, item.cover.slice(2));
  return fs.existsSync(file) ? file : null;
}

function itemCoverPublicPath(item) {
  const file = itemCoverSource(item);
  if (!file) return null;
  // Only real image types: an og:image a crawler cannot decode is worse than
  // none, and this is also what keeps the dev middleware's Content-Type honest.
  const ext = path.extname(file).toLowerCase();
  if (!MIME[ext]) return null;
  return `${OG_ITEM_PREFIX}/${item.kind}-${item.slug}${ext}`;
}

function itemImagePath(item) {
  const prev = path.join(PUBLIC_DIR, "previews", `${item.slug}.webp`);
  if (fs.existsSync(prev)) return `/previews/${item.slug}.webp`;
  // A kind with no lab-media directory has no still to find. Without this
  // guard path.join() is handed undefined and THROWS, which is how adding a
  // kind used to take the whole build down on its first page.
  const dir = LAB_DIR[item.kind];
  if (dir) {
    const still = path.join(PUBLIC_DIR, "lab-media", dir, `${item.slug}.webp`);
    if (fs.existsSync(still)) return `/lab-media/${dir}/${item.slug}.webp`;
  }
  // The page's own cover, which is the only image most items have. Without
  // this an item with a co-located cover shared no image at all: there is no
  // site-wide og/default.jpg to fall back to.
  return itemCoverPublicPath(item);
}

// Copy every co-located cover to the public path itemCoverPublicPath promised.
function copyItemCovers(distDir, items) {
  const outDir = path.join(distDir, ...OG_ITEM_PREFIX.slice(1).split("/"));
  let n = 0;
  for (const item of items) {
    const src = itemCoverSource(item);
    const pub = itemCoverPublicPath(item);
    if (!src || !pub) continue;
    fs.mkdirSync(outDir, { recursive: true });
    fs.copyFileSync(src, path.join(distDir, pub.slice(1)));
    n++;
  }
  return n;
}

function itemVideoPath(item) {
  const p = path.join(PUBLIC_DIR, "previews", `${item.slug}.mp4`);
  return fs.existsSync(p) ? `/previews/${item.slug}.mp4` : null;
}

function sourceImagePath(key) {
  for (const dir of ["sources", "snapshots"]) {
    for (const ext of [".jpg", ".webp", ".png"]) {
      if (fs.existsSync(path.join(PUBLIC_DIR, dir, `${key}${ext}`)))
        return `/${dir}/${key}${ext}`;
    }
  }
  return null;
}

// ---- structured data (schema.org JSON-LD) ----
const SITE_ENTITY = {
  "@type": "Organization",
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  description: DEFAULT_DESC,
  ...(DEFAULT_OG ? { image: `${SITE_URL}${DEFAULT_OG}` } : {}),
};

// Byline for authored content (articles, blog posts).
const AUTHOR = { "@type": "Person", name: SITE.author };

function jsonLdScript(obj) {
  if (!obj) return null;
  const data = { "@context": "https://schema.org", ...obj };
  // escape "<" so a "</script>" inside any string can't break out of the tag
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${json}</script>`;
}

function ldDate(item) {
  if (item.date) return item.date;
  if (item.year) return `${item.year}-01-01`;
  return undefined;
}

function pageLd(type, name, description, url) {
  return { "@type": type, name, description, url, about: SITE_ENTITY };
}

function itemJsonLd(item, url, image) {
  const date = ldDate(item);
  // Documentation is technical reference, not news: TechArticle is what tells a
  // crawler (and an assistant citing it) which of the two it has found.
  if (item.kind === "docs") {
    return {
      "@type": "TechArticle",
      headline: item.title,
      description: item.summary || item.desc || item.title,
      url,
      image,
      author: AUTHOR,
      publisher: SITE_ENTITY,
      ...(date ? { datePublished: date } : {}),
    };
  }
  if (item.kind === "blog") {
    return {
      "@type": "Article",
      headline: item.title,
      description: item.desc || item.title,
      url,
      image,
      author: AUTHOR,
      ...(date ? { datePublished: date } : {}),
      ...(item.venue
        ? { publisher: { "@type": "Organization", name: item.venue } }
        : {}),
    };
  }
  if (item.videoUrl) {
    const isYt = /youtu\.?be/.test(item.videoUrl);
    const videoUrl = /^https?:/.test(item.videoUrl)
      ? item.videoUrl
      : `${SITE_URL}${item.videoUrl.startsWith("/") ? "" : "/"}${item.videoUrl}`;
    return {
      "@type": "VideoObject",
      name: item.title,
      description: item.desc || item.title,
      url,
      thumbnailUrl: image,
      ...(date ? { uploadDate: date } : {}),
      ...(isYt ? { embedUrl: videoUrl } : { contentUrl: videoUrl }),
      ...(item.venue
        ? { recordedAt: { "@type": "Event", name: item.venue } }
        : {}),
      creator: AUTHOR,
      author: AUTHOR,
    };
  }
  // hardware ecosystems and game projects
  return {
    "@type": "GamesSourceCode",
    name: item.title,
    description: item.desc || item.title,
    url,
    image,
    creator: AUTHOR,
    author: AUTHOR,
    ...(item.tags && item.tags.length
      ? { keywords: item.tags.join(", ") }
      : {}),
  };
}


// ---- static readable content ----
// Every prerendered route carries its real text inside <div id="root"> (hidden,
// so there is no flash before React mounts; createRoot().render() replaces it).
// This is what makes the site readable to crawlers and LLM browsing tools,
// which otherwise see an empty client-rendered shell.

// One attribute value, for text escapeHtml() has already been through: only the
// quote is left to deal with, and escapeAttr() would double-escape the "&".
function quoteAttr(escaped) {
  return escaped.replace(/"/g, "&quot;");
}

// ![alt](src) in an article body. src/components/Markdown.tsx renders it as a
// figure: the image, with the alt doubling as the visible caption.
//
// Only a file this script can name a working URL for becomes an <img>. A
// relative "./shot.png" (and an absolute "/data/..." one) is a data/ asset that
// the bundler hashes into /assets/, and resolveKey() in src/lib/content.ts
// reads that map from inside the app; nothing here can see it, so pointing an
// <img> at "./shot.png" would only promise a file that is not at that address.
// The caption is kept instead of the image, because on a documentation page the
// alt is a whole sentence carrying the diagram's argument and dropping it loses
// the point of the figure.
function mediaHtml(alt, src) {
  const caption = alt ? `<span class="md-figcaption">${alt}</span>` : "";
  // Videos are embedded, never re-hosted: ![caption](https://youtu.be/ID) is a
  // player on the page, and a link to it is what that degrades to.
  if (/youtu\.?be/.test(src)) return `<a href="${quoteAttr(src)}">${alt || src}</a>`;
  // The half of resolveKey() that does not need the bundler's map: a public/
  // asset and a remote file are served at the address they are written at.
  const asWritten = /^https?:/.test(src) || (src.startsWith("/") && !src.startsWith("/data/"));
  if (!asWritten || VIDEO_EXT.test(src)) return caption;
  return `<img src="${quoteAttr(src)}" alt="${quoteAttr(alt)}" />`;
}

function mdInline(text) {
  // Text that is literal once it is parsed (a code span's contents, an
  // autolink's URL) is parked here so the rules below cannot chew on it, and
  // put back at the end. headingText() in src/lib/toc.ts parks for the same
  // reason: `ws_cfg_num * 3 > ws_cfg_den * 4` is a C expression, and the
  // emphasis rule used to eat both multiplications out of the middle of it.
  const literals = [];
  const park = (html, plain) =>
    `\u0000${literals.push({ html, plain: plain ?? html }) - 1}\u0000`;
  const restore = (s, key) =>
    s.replace(/\u0000(\d+)\u0000/g, (_, i) => literals[+i][key]);

  const html = escapeHtml(text)
    // Code spans, before every other rule: a reference table is mostly
    // `--flags` and paths, literal backticks read badly as plain text, and
    // nothing inside a code span is markup.
    .replace(/`([^`\n]+)`/g, (_, code) => park(`<code>${code}</code>`, code))
    // An alt is a plain string on the React side, so any code span in it comes
    // back as its text and the result is parked whole: nothing in a caption is
    // markup either.
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
      const caption = restore(alt, "plain");
      return park(mediaHtml(caption, restore(src, "plain")), caption);
    })
    // citation markers ([src](cite:...)) are a client-side affordance; in the
    // static text they would be dead links, so drop them entirely
    .replace(/\s*\[[^\]]*\]\(cite:[^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, href) => {
      const safe = escapeAttr(href);
      return `<a href="${safe}">${t}</a>`;
    })
    // <https://example.com> is a link. Parked whole, because its URL is not
    // prose: an underscore or an asterisk in it is part of the address.
    .replace(/&lt;((?:https?|mailto):[^\s]+?)&gt;/g, (_, url) =>
      park(`<a href="${quoteAttr(url)}">${url}</a>`, url),
    )
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|\s)\*([^*\n]+)\*(?=[\s.,;:!?)]|$)/g, "$1<em>$2</em>");
  return restore(html, "html");
}

// The text of a rendered fragment. This is what rehype-slug slugs on the React
// side (hast-util-to-string over the heading element), so it is what a heading
// id has to be derived from here. Tags come out before the entities go back,
// or the "&lt;id&gt;" inside a code span would be read as one.
function htmlText(html) {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

// A table row's cells, on unescaped pipes, with the optional outer pipes gone.
function tableCells(line) {
  const s = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells = [];
  let cur = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\" && s[i + 1] === "|") {
      cur += "|";
      i++;
      continue;
    }
    if (s[i] === "|") {
      cells.push(cur.trim());
      cur = "";
      continue;
    }
    cur += s[i];
  }
  cells.push(cur.trim());
  return cells;
}

// The ---|:---:|---: line under a GFM table's header, and nothing else.
function isTableDelimiter(line) {
  if (!line.includes("|")) return false;
  const cells = tableCells(line);
  return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c));
}

function tableHtml(lines) {
  const head = tableCells(lines[0]);
  const rows = lines
    .slice(2)
    .filter((l) => l.trim())
    .map((l) => {
      const cells = tableCells(l);
      // GFM pads a short row and drops the overflow of a long one.
      while (cells.length < head.length) cells.push("");
      return cells.slice(0, head.length);
    });
  const th = head.map((c) => `<th>${mdInline(c)}</th>`).join("");
  const body = rows
    .map((r) => `<tr>${r.map((c) => `<td>${mdInline(c)}</td>`).join("")}</tr>`)
    .join("");
  return `<table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table>`;
}

// The filename half of a fence's info string. Mirrors fenceFilename() in
// src/lib/markdown.ts: title="path" is the convention, file=/filename= are
// accepted, and a bare token that reads as a path is accepted too.
function fenceFile(meta) {
  if (!meta) return "";
  const quoted = meta.match(
    /(?:^|\s)(?:title|file|filename)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/,
  );
  if (quoted) return (quoted[1] ?? quoted[2] ?? quoted[3] ?? "").trim();
  const bare = meta.trim();
  return /^[\w.@/\\+-]+$/.test(bare) && /[./\\]/.test(bare) ? bare : "";
}

function codeBlockHtml(info, code) {
  const first = info.trim().split(/\s+/)[0] || "";
  const isPath = /^[\w.@/\\+-]+$/.test(first) && /[./\\]/.test(first);
  const lang = isPath ? "" : first.toLowerCase();
  const meta = isPath ? first : info.trim().slice(first.length).trim();
  const file = fenceFile(meta);
  const cls = lang ? ` class="language-${escapeAttr(lang)}"` : "";
  // One trailing newline, however the fence was closed.
  const pre = `<pre><code${cls}>${escapeHtml(code.replace(/\n+$/, ""))}\n</code></pre>`;
  return file
    ? `<figure class="md-code"><figcaption>${escapeHtml(file)}</figcaption>${pre}</figure>`
    : pre;
}

// Paragraph-level blocks, split on blank lines. Fenced code never reaches here:
// mdToHtml lifts it out first, because a fence may contain blank lines and
// would otherwise be torn into pieces.
function mdBlocks(md, slugger) {
  const blocks = md.split(/\n{2,}/);
  const out = [];
  for (const raw of blocks) {
    const b = raw.trim();
    if (!b) continue;
    const h = b.match(/^(#{1,4})\s+(.+)$/s);
    if (h) {
      const lvl = Math.min(h[1].length + 1, 5);
      const inner = mdInline(h[2].trim());
      // Every heading carries the id the React render gives it, or the "#..."
      // links a page makes to its own sections land nowhere for a reader
      // without JavaScript. Same github-slugger, over the same heading text, in
      // the same document order as rehype-slug (and as src/lib/toc.ts, which
      // builds the contents list from the source). An id that differs between
      // the two renders would be worse than no id at all.
      const id = slugger.slug(htmlText(inner));
      out.push(`<h${lvl} id="${escapeAttr(id)}">${inner}</h${lvl}>`);
      continue;
    }
    const lines = b.split("\n");
    if (lines.length >= 2 && lines[0].includes("|") && isTableDelimiter(lines[1])) {
      out.push(tableHtml(lines));
      continue;
    }
    if (/^[-*]\s+/m.test(b) && lines.every((l) => /^[-*]\s+|^\s/.test(l))) {
      const lis = b
        .split(/\n(?=[-*]\s+)/)
        .map((l) => `<li>${mdInline(l.replace(/^[-*]\s+/, "").trim())}</li>`)
        .join("");
      out.push(`<ul>${lis}</ul>`);
      continue;
    }
    // The numbered steps a guide is mostly made of. Its own branch rather than
    // the bullet one above, because these have to come out as <ol><li> and
    // because the numbering has to survive: a step whose body holds a fenced
    // block ends the block here (mdToHtml lifts the fence out), so the rest of
    // the list arrives as a block of its own starting at "2.", and the start
    // attribute is what keeps it step 2 instead of step 1 again.
    if (/^\d+[.)]\s+/.test(b) && lines.every((l) => /^\d+[.)]\s+|^\s/.test(l))) {
      const first = parseInt(b, 10);
      const lis = b
        .split(/\n(?=\d+[.)]\s+)/)
        .map((l) => `<li>${mdInline(l.replace(/^\d+[.)]\s+/, "").trim())}</li>`)
        .join("");
      out.push(`<ol${first > 1 ? ` start="${first}"` : ""}>${lis}</ol>`);
      continue;
    }
    if (b.startsWith(">")) {
      // Back through the top of the renderer, because pages quote whole
      // passages: a quotation can hold its own paragraphs, list, table or
      // fenced block, and one <p> of raw markdown would swallow all of it.
      // " ?" and not "\s?": on a lone ">" line \s matched the NEWLINE, which
      // pulled the blank line out from under the quote and left a nested
      // quotation glued to the paragraph above it as literal "&gt;" text.
      const inner = b.replace(/^ {0,3}> ?/gm, "").trim();
      out.push(`<blockquote>${mdToHtml(inner, slugger)}</blockquote>`);
      continue;
    }
    out.push(`<p>${mdInline(b)}</p>`);
  }
  return out.join("\n");
}

// The crawlable text. Documentation pages lean on fenced code and tables, and
// neither survives a blank-line split, so the fences come out in one line pass
// and everything between them goes through mdBlocks() above.
//
// One slugger per document, made here and handed down: github-slugger numbers
// a repeated heading ("Notes", then "notes-1"), so it has to see every heading
// on the page, once, in source order, exactly as rehype-slug does on the React
// side. A quotation renders through here again and passes its parent's along.
export function mdToHtml(md, slugger = new GithubSlugger()) {
  if (!md) return "";
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let buf = [];
  const flush = () => {
    if (!buf.length) return;
    const text = buf.join("\n");
    buf = [];
    if (text.trim()) out.push(mdBlocks(text, slugger));
  };
  for (let i = 0; i < lines.length; i++) {
    const open = lines[i].match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    // A backtick fence's info string cannot contain a backtick, so a line like
    // "``` and `code` in prose" is prose.
    if (!open || (open[1][0] === "`" && open[2].includes("`"))) {
      buf.push(lines[i]);
      continue;
    }
    flush();
    const fence = open[1];
    const body = [];
    for (i++; i < lines.length; i++) {
      const close = lines[i].match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
      if (close && close[1][0] === fence[0] && close[1].length >= fence.length) break;
      body.push(lines[i]);
    }
    // An unclosed fence runs to the end of the document, as CommonMark says.
    out.push(codeBlockHtml(open[2], body.join("\n")));
  }
  flush();
  return out.join("\n");
}

const NAV_HTML = [
  ["/", "Home"],
  ["/hardware", "Platforms"],
  ["/games", "Games"],
  ["/blog", "News and coverage"],
  ["/docs", "Documentation"],
]
  .map(([href, label]) => `<a href="${href}">${label}</a>`)
  .join(" \u00b7 ");

function wrapStatic(inner) {
  // NOT hidden: readability-style extractors (ChatGPT's browser tool) drop
  // display:none/hidden content entirely. Browsers hide it via the inline
  // script below before first paint (no flash), and React replaces it on
  // mount; no-JS readers get the visible text page.
  return (
    `<div class="ssg"><script>document.currentScript.parentElement.style.display="none"</script><header><p><strong>${escapeHtml(SITE_NAME)}</strong> \u00b7 ` +
    `${escapeHtml(SITE_TAGLINE)}</p><nav>${NAV_HTML}</nav></header><main>${inner}</main>` +
    `<footer><p>${escapeHtml(SITE.owner)}${
      SITE.email
        ? ` \u00b7 <a href="mailto:${escapeAttr(SITE.email)}">${escapeHtml(SITE.email)}</a>`
        : ""
    }</p></footer></div>`
  );
}

function itemListHtml(items, kind) {
  const segment = KIND_SEGMENT[kind];
  // Blog lists newest first, matching src/lib/content.ts's BLOGS order: date,
  // then a bare year as January 1st, then folder order breaks ties with the
  // newer folder first. Other kinds keep their curated folder order.
  const recency = (i) => i.date || (i.year ? `${i.year}-01-01` : "0000-00-00");
  const listed = items.filter((i) => i.kind === kind);
  if (kind === "blog") {
    listed.sort((a, b) => {
      const d = recency(b).localeCompare(recency(a));
      return d !== 0 ? d : b.order - a.order;
    });
  }
  return (
    "<ul>" +
    listed
      .map((i) => {
        const meta = [i.venue, i.year || i.date].filter(Boolean).join(", ");
        return (
          `<li><a href="/${segment}/${i.slug}">${escapeHtml(i.title)}</a>` +
          (meta ? ` (${escapeHtml(meta)})` : "") +
          (i.desc ? `: ${escapeHtml(i.desc)}` : "") +
          "</li>"
        );
      })
      .join("") +
    "</ul>"
  );
}

// Home prose (proof / recognition / philosophy) is authored in data/home.json
// (proof paragraphs as markdown); pull plain text out for the crawlable static
// shell, mirroring the runtime parse in src/lib/homeContent.tsx.
function readHomeProse() {
  const file = path.join(ROOT, "data", "home.json");
  const out = { proof: [], recognition: [], philosophy: [], constraintsIntro: "", stories: [], platformNote: null, featured: [], action: [] };
  if (!fs.existsSync(file)) return out;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return out;
  }
  const stripMd = (md) =>
    String(md)
      .replace(/\[[^\]]*\]\(cite:[^)]*\)/g, "") // citations -> gone
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links -> their text
      .trim();
  out.proof = (data.proof || []).map(stripMd).filter(Boolean);
  out.recognition = (data.recognition || []).map((g) => ({
    label: g.label,
    items: (g.items || []).map((it) => it.text),
  }));
  out.philosophy = data.philosophy || [];
  out.constraintsIntro = String(data.constraintsIntro || "");
  out.stories = (data.stories || []).map((e) => ({
    title: String(e.title || ""),
    body: String(e.body || ""),
    image: String(e.image || ""),
    alt: String(e.alt || ""),
    href: String(e.href || ""),
  }));
  out.platformNote = data.platformNote
    ? { title: String(data.platformNote.title || ""), body: String(data.platformNote.body || "") }
    : null;
  out.featured = (data.featured || []).map((e) => ({
    slug: String(e.slug || ""),
    headline: String(e.headline || ""),
    capability: String(e.capability || ""),
    cover: String(e.cover || ""),
    alt: String(e.alt || ""),
  }));
  out.sectionTitles = {
    proof: "A different path from emulation.",
    constraints: "Preserve the game. Replace the constraints.",
    featured: "Featured projects",
    action: "See it in action",
    ...(data.sectionTitles || {}),
  };
  out.featuredPost = data.featuredPost
    ? {
        slug: String(data.featuredPost.slug || ""),
        eyebrow: String(data.featuredPost.eyebrow || ""),
        title: String(data.featuredPost.title || ""),
        blurb: String(data.featuredPost.blurb || ""),
        headline: String(data.featuredPost.headline || ""),
        cover: String(data.featuredPost.cover || ""),
        alt: String(data.featuredPost.alt || ""),
      }
    : null;
  out.action = (data.action || []).map((e) => ({
    videoTitle: String(e.videoTitle || ""),
    headline: String(e.headline || ""),
    project: String(e.project || ""),
    page: String(e.page || ""),
    poster: String(e.poster || ""),
    alt: String(e.alt || ""),
    blurb: String(e.blurb || ""),
  }));
  return out;
}

function homeStaticHtml(items) {
  const about = readAbout();
  const prose = readHomeProse();
  const parts = [
    `<h1>${escapeHtml(about.heroTitle || `Hi, I'm ${SITE_NAME}`)}</h1>`,
    `<p>${escapeHtml(about.role || "")}</p>`,
    `<p>${escapeHtml(about.tagline || "")}</p>`,
    ...(about.bio ? [mdToHtml(about.bio)] : []),
  ];
  parts.push(`<h2>${escapeHtml(prose.sectionTitles.proof)}</h2>`);
  parts.push(...prose.proof.map((t) => `<p>${escapeHtml(t)}</p>`));
  parts.push(`<h2>${escapeHtml(prose.sectionTitles.constraints)}</h2>`);
  if (prose.constraintsIntro) parts.push(`<p>${escapeHtml(prose.constraintsIntro)}</p>`);
  if (prose.stories.length) {
    parts.push(
      "<ul>" +
        prose.stories
          .map((st) => `<li><a href="${escapeAttr(st.href)}"><strong>${escapeHtml(st.title)}</strong></a> ${escapeHtml(st.body)}</li>`)
          .join("") +
        "</ul>",
    );
  }
  if (prose.platformNote) {
    parts.push(
      `<p><strong>${escapeHtml(prose.platformNote.title)}</strong> ${escapeHtml(prose.platformNote.body)}</p>`,
    );
  }
  if (prose.featuredPost) {
    parts.push(
      `<h2>${escapeHtml(prose.featuredPost.eyebrow || "From the build log")}</h2>` +
        `<p><a href="/blog/${escapeAttr(prose.featuredPost.slug)}">${escapeHtml(prose.featuredPost.headline || prose.featuredPost.title)}</a>: ${escapeHtml(prose.featuredPost.blurb)}</p>`,
    );
  }
  if (prose.featured.length) {
    parts.push(`<h2>${escapeHtml(prose.sectionTitles.featured)}</h2><ul>`);
    for (const fp of prose.featured) {
      const item = items.find((i) => i.kind === "game" && i.slug === fp.slug);
      parts.push(
        `<li><a href="/games/${escapeAttr(fp.slug)}">${escapeHtml(item ? item.title : fp.slug)}</a>: ${escapeHtml(fp.capability)}</li>`,
      );
    }
    parts.push("</ul>");
  }
  if (prose.action.length) {
    parts.push(`<h2>${escapeHtml(prose.sectionTitles.action)}</h2><ul>`);
    for (const c of prose.action) {
      parts.push(
        `<li><a href="${escapeAttr(c.page)}">${escapeHtml(c.headline || c.videoTitle)}</a>: ${escapeHtml(c.blurb)}</li>`,
      );
    }
    parts.push("</ul>");
    parts.push(`<p><a href="/blog">See all news and coverage</a></p>`);
  }
  parts.push(
    `<p><a href="/games">All game projects</a> · <a href="/hardware">All platforms</a></p>`,
    `<p>You provide your own game files. No copyrighted game data is included.</p>`,
  );
  return wrapStatic(parts.join("\n"));
}

// Build-time validation for the homepage media system: a missing or duplicate
// cover is a build failure, never a silently empty card.
function validateHomeMedia(items) {
  const prose = readHomeProse();
  const problems = [];
  const seen = new Map();
  const need = (cond, msg) => {
    if (!cond) problems.push(msg);
  };
  const checkAsset = (p, what) => {
    need(p, `${what}: missing image path`);
    if (!p) return;
    if (p.startsWith("/")) {
      need(fs.existsSync(path.join(PUBLIC_DIR, p.slice(1))), `${what}: asset not found in public${p}`);
    }
    const prior = seen.get(p);
    if (prior) problems.push(`duplicate cover ${p} used by both ${prior} and ${what}`);
    seen.set(p, what);
  };
  const gamePageExists = (p, what) => {
    need(/^\/games\/[a-z0-9-]+$/.test(p), `${what}: link "${p}" must be an internal /games/ page`);
    if (/^\/games\//.test(p)) {
      const slug = p.split("/").pop();
      need(
        items.some((i) => i.kind === "game" && i.slug === slug),
        `${what}: no game page for "${slug}"`,
      );
    }
  };
  // "Watch it run" features whatever page carries the footage, which is not
  // always a game: a library's own article can be the page with the video.
  const videoPageExists = (p, what) => {
    const m = /^\/(games|blog)\/([a-z0-9-]+)$/.exec(p);
    need(m, `${what}: link "${p}" must be an internal /games/ or /blog/ page`);
    if (!m) return null;
    const kind = m[1] === "games" ? "game" : "blog";
    const item = items.find((i) => i.kind === kind && i.slug === m[2]);
    need(item, `${what}: no ${kind} page for "${m[2]}"`);
    return item ?? null;
  };
  for (const st of prose.stories) {
    checkAsset(st.image, `story "${st.title}"`);
    need(st.alt, `story "${st.title}": missing alt`);
    gamePageExists(st.href, `story "${st.title}"`);
  }
  need(prose.featured.length > 0 && prose.featured.length <= 8, `featured: expected 1-8 entries, found ${prose.featured.length}`);
  for (const fp of prose.featured) {
    const item = items.find((i) => i.kind === "game" && i.slug === fp.slug);
    need(item, `featured "${fp.slug}": no such game page`);
    checkAsset(fp.cover, `featured "${fp.slug}"`);
    need(fp.alt, `featured "${fp.slug}": missing alt`);
    need(fp.capability, `featured "${fp.slug}": missing capability line`);
  }
  need(prose.action.length > 0 && prose.action.length <= 8, `action: expected 1-8 cards, found ${prose.action.length}`);
  for (const c of prose.action) {
    checkAsset(c.poster, `action "${c.videoTitle}"`);
    need(c.alt, `action "${c.videoTitle}": missing alt`);
    // the internal page must carry the video so the embed and attribution live there
    const item = videoPageExists(c.page, `action "${c.videoTitle}"`);
    need(item && item.videoUrl, `action "${c.videoTitle}": ${c.page} has no videoUrl to embed`);
  }
  if (prose.featuredPost) {
    const fp = prose.featuredPost;
    checkAsset(fp.cover, `featuredPost "${fp.slug}"`);
    need(fp.alt, `featuredPost "${fp.slug}": missing alt`);
    need(
      items.some((i) => i.kind === "blog" && i.slug === fp.slug),
      `featuredPost: no blog page for "${fp.slug}"`,
    );
  }
  if (problems.length) {
    throw new Error("Homepage media validation failed:\n  - " + problems.join("\n  - "));
  }
}

function itemStaticHtml(item) {
  const metaLine = [item.kicker, item.venue, item.year || item.date, item.duration]
    .filter(Boolean)
    .join(" \u00b7 ");
  const parts = [`<article><h1>${escapeHtml(item.title)}</h1>`];
  if (metaLine) parts.push(`<p>${escapeHtml(metaLine)}</p>`);
  const lead = item.summary || item.desc;
  if (lead) parts.push(`<p>${escapeHtml(lead)}</p>`);
  if (item.body) parts.push(mdToHtml(item.body));
  if (item.captions.length)
    parts.push(
      "<h2>Gallery</h2><ul>" +
        item.captions.map((c) => `<li>${escapeHtml(c)}</li>`).join("") +
        "</ul>",
    );
  if (item.links.length)
    parts.push(
      "<h2>Links</h2><ul>" +
        item.links
          .map(
            (l) =>
              `<li><a href="${escapeAttr(l.href)}">${escapeHtml(l.label || l.href)}</a></li>`,
          )
          .join("") +
        "</ul>",
    );
  parts.push("</article>");
  return wrapStatic(parts.join("\n"));
}

function sourceStaticHtml(s) {
  const parts = [
    `<article><h1>${escapeHtml(s.title)}</h1>`,
    `<p>Cached copy of an article from ${escapeHtml(s.source)}${
      s.date ? `, ${escapeHtml(s.date)}` : ""
    }, served from ${escapeHtml(SITE_NAME)} so it stays readable if the original goes offline.</p>`,
  ];
  if (s.original)
    parts.push(
      `<p><a href="${escapeAttr(s.original)}">View the original</a></p>`,
    );
  if (s.body) parts.push(mdToHtml(s.body));
  parts.push("</article>");
  return wrapStatic(parts.join("\n"));
}

function youtubeEmbed(url) {
  if (!url || !/youtu\.?be/.test(url)) return null;
  const m = url.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/live\/)([\w-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

const META_BLOCK_MARKER = "<!-- prerender-meta -->";

function buildMetaBlock(meta) {
  const title = escapeHtml(meta.title);
  const lines = [
    META_BLOCK_MARKER,
    `<title>${title}</title>`,
    `<meta name="description" content="${escapeAttr(meta.description)}" />`,
    `<link rel="canonical" href="${escapeAttr(meta.url)}" />`,
    `<link rel="alternate" type="application/rss+xml" title="${escapeAttr(`${SITE_NAME} · Blog (RSS)`)}" href="${SITE_URL}/rss.xml" />`,
    `<link rel="alternate" type="application/atom+xml" title="${escapeAttr(`${SITE_NAME} · Blog (Atom)`)}" href="${SITE_URL}/atom.xml" />`,
    `<link rel="alternate" type="application/feed+json" title="${escapeAttr(`${SITE_NAME} · Blog (JSON Feed)`)}" href="${SITE_URL}/feed.json" />`,
    `<meta property="og:site_name" content="${escapeAttr(SITE_NAME)}" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:type" content="${escapeAttr(meta.type)}" />`,
    `<meta property="og:title" content="${escapeAttr(meta.title)}" />`,
    `<meta property="og:description" content="${escapeAttr(meta.description)}" />`,
  ];
  // A site with no og/default.jpg and an item with no cover has no image to
  // point at; emitting og:image="undefined" would be worse than omitting it.
  if (meta.image) {
    lines.push(
      `<meta property="og:image" content="${escapeAttr(meta.image)}" />`,
      `<meta property="og:image:alt" content="${escapeAttr(meta.title)}" />`,
    );
  }
  if (meta.image && meta.imageWidth && meta.imageHeight) {
    lines.push(
      `<meta property="og:image:width" content="${meta.imageWidth}" />`,
      `<meta property="og:image:height" content="${meta.imageHeight}" />`,
    );
  }
  // Talks with a full YouTube recording embed the FULL player (the way
  // youtube.com links do): og:video -> the embed URL with type text/html.
  // Discord/Slack/Telegram render the whole talk, not the 10s preview clip.
  if (meta.videoEmbed) {
    lines.push(
      `<meta property="og:video" content="${escapeAttr(meta.videoEmbed)}" />`,
      `<meta property="og:video:secure_url" content="${escapeAttr(meta.videoEmbed)}" />`,
      `<meta property="og:video:type" content="text/html" />`,
      `<meta property="og:video:width" content="1280" />`,
      `<meta property="og:video:height" content="720" />`,
    );
  } else if (meta.video) {
    // items whose only motion asset is the local clip embed it as direct mp4
    lines.push(
      `<meta property="og:video" content="${escapeAttr(meta.video)}" />`,
      `<meta property="og:video:secure_url" content="${escapeAttr(meta.video)}" />`,
      `<meta property="og:video:type" content="video/mp4" />`,
    );
  }
  lines.push(`<meta property="og:url" content="${escapeAttr(meta.url)}" />`);
  if (meta.videoEmbed) {
    lines.push(
      `<meta name="twitter:card" content="player" />`,
      `<meta name="twitter:player" content="${escapeAttr(meta.videoEmbed)}" />`,
      `<meta name="twitter:player:width" content="1280" />`,
      `<meta name="twitter:player:height" content="720" />`,
    );
  } else {
    lines.push(`<meta name="twitter:card" content="summary_large_image" />`);
  }
  lines.push(
    `<meta name="twitter:title" content="${escapeAttr(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(meta.description)}" />`,
  );
  if (meta.image) {
    lines.push(`<meta name="twitter:image" content="${escapeAttr(meta.image)}" />`);
  }
  const ld = jsonLdScript(meta.jsonLd);
  if (ld) lines.push(ld);
  return lines.join("\n    ");
}

const TAGS_TO_STRIP = [
  /<title>[\s\S]*?<\/title>\s*/i,
  /<link\s+rel="canonical"[^>]*\/?>\s*/gi,
  /<meta\s+name="description"[^>]*\/?>\s*/gi,
  /<meta\s+property="og:[^"]+"[^>]*\/?>\s*/gi,
  /<meta\s+name="twitter:[^"]+"[^>]*\/?>\s*/gi,
  /<script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>\s*/gi,
];

function injectMeta(html, meta) {
  let out = html;
  for (const re of TAGS_TO_STRIP) {
    out = out.replace(re, "");
  }
  const block = buildMetaBlock(meta);
  const head = meta.extraHead ? `${block}\n    ${meta.extraHead}` : block;
  out = out.replace(/<\/head>/i, `    ${head}\n  </head>`);
  // Real text content inside #root (hidden; React replaces it on mount) so
  // crawlers and LLM browsing tools get a readable page, not an empty shell.
  if (meta.static) {
    // hideStatic routes (the spatial page) must never paint the shell, even
    // for one frame: inline display:none instead of the self-hiding script
    const inner = meta.hideStatic
      ? meta.static.replace('<div class="ssg">', '<div class="ssg" style="display:none">')
      : meta.static;
    out = out.replace(
      /<div id="root">\s*<\/div>/,
      `<div id="root">${inner}</div>`,
    );
  }
  return out;
}

// Topic pages (/topic/<id>) are a client-side view, so a cold load or a
// shared link only resolves if the route is prerendered, exactly like /all/*.
// Read the ids and labels straight out of the topics source.
function collectTopics() {
  const file = path.join(ROOT, "src", "lib", "topics.ts");
  if (!fs.existsSync(file)) return [];
  const src = fs.readFileSync(file, "utf8");
  const re = /\bid:\s*"([^"]+)",\s*label:\s*"([^"]+)"/g;
  const out = [];
  let m;
  while ((m = re.exec(src))) out.push({ id: m[1], label: m[2] });
  return out;
}

// One meta map for every route on the site. `origin` makes all asset/og URLs
// absolute for whichever host is serving (SITE.url in the build,
// the tunnel host in dev), so shared links embed correctly everywhere.
export function buildRouteMeta(origin) {
  const all = collectItems();
  // Drafts keep their own route, for preview, and appear nowhere else: not in
  // a listing, not in the counts those listings quote, not in the sitemap.
  const items = all.filter((i) => !i.draft);
  validateHomeMedia(items);
  const out = new Map();
  const defaultImage = DEFAULT_OG ? `${origin}${DEFAULT_OG}` : undefined;
  const add = (route, meta) =>
    out.set(route, {
      imageWidth: meta.image === defaultImage ? 1200 : undefined,
      imageHeight: meta.image === defaultImage ? 674 : undefined,
      ...meta,
    });

  add("/", {
    title: `${SITE_NAME} · ${SITE_TAGLINE}`,
    description: DEFAULT_DESC,
    image: defaultImage,
    url: `${origin}/`,
    type: "website",
    jsonLd: SITE_ENTITY,
    static: homeStaticHtml(items),
  });

  const counts = { hardware: 0, game: 0, blog: 0, docs: 0 };
  for (const it of items) counts[it.kind] = (counts[it.kind] ?? 0) + 1;
  // Derived from the real content counts so the descriptions never drift from
  // what the pages actually list.
  const TAB_DESC = {
    hardware: `${counts.hardware} platform recompilation ${counts.hardware === 1 ? "ecosystem" : "ecosystems"} from ${SITE_NAME}: decoders and runtimes for original console hardware.`,
    games: (() => {
      return `${counts.game} game recompilations and community ports built on ${SITE_NAME}.`;
    })(),
    blog: `${counts.blog} ${counts.blog === 1 ? "article" : "articles"}: technical writing from the team, press coverage, and videos.`,
    docs: `${counts.docs} documentation ${counts.docs === 1 ? "page" : "pages"}: the concepts, guides and reference behind ${SITE_NAME}.`,
  };
  const SEG_KIND = { hardware: "hardware", games: "game", blog: "blog", docs: "docs" };
  for (const seg of ["hardware", "games", "blog", "docs"]) {
    const listHtml = wrapStatic(
      `<h1>${escapeHtml(COLLECTION_TITLE[seg])}</h1>\n` +
        `<p>${escapeHtml(TAB_DESC[seg])}</p>\n` +
        itemListHtml(items, SEG_KIND[seg]),
    );
    for (const route of [`/all/${seg}`, `/${seg}`]) {
      add(route, {
        title: `${COLLECTION_TITLE[seg]} · ${SITE_NAME}`,
        description: TAB_DESC[seg],
        image: defaultImage,
        url: `${origin}${route}`,
        type: "website",
        jsonLd: pageLd(
          "CollectionPage",
          `${COLLECTION_TITLE[seg]} · ${SITE_NAME}`,
          TAB_DESC[seg],
          `${origin}${route}`,
        ),
        static: listHtml,
      });
    }
  }

  for (const item of all) {
    const segment = KIND_SEGMENT[item.kind];
    const url = `${origin}/${segment}/${item.slug}`;
    const imgPath = itemImagePath(item);
    const image = imgPath ? `${origin}${imgPath}` : defaultImage;
    const vidPath = itemVideoPath(item);
    const venuePart = item.venue ? ` · ${item.venue}` : "";
    add(`/${segment}/${item.slug}`, {
      title: `${item.title}${venuePart} · ${SITE_NAME}`,
      // Docs pages lead with `summary`, the sentence under their H1, so an
      // author writes the description once. Every other kind has no summary
      // and reads exactly as before.
      description: truncate(item.summary || item.desc || item.title, 280),
      image,
      video: vidPath ? `${origin}${vidPath}` : undefined,
      videoEmbed: youtubeEmbed(item.videoUrl) ?? undefined,
      url,
      type: vidPath
        ? "video.other"
        : item.kind === "blog"
          ? "article"
          : "website",
      jsonLd: itemJsonLd(item, url, image),
      static: itemStaticHtml(item),
      draft: item.draft,
      extraHead: item.draft ? `<meta name="robots" content="noindex, nofollow">` : undefined,
    });
  }

  for (const s of collectCachedSources()) {
    const imgPath = sourceImagePath(s.key);
    const image = imgPath ? `${origin}${imgPath}` : defaultImage;
    const desc = truncate(
      s.body || `Cached copy of ${s.source}, readable on ${SITE_NAME}.`,
      280,
    );
    add(`/source/${s.key}`, {
      title: `${s.title} · cached on ${SITE_NAME}`,
      description: desc,
      image,
      url: `${origin}/source/${s.key}`,
      type: "article",
      static: sourceStaticHtml(s),
      jsonLd: {
        "@type": "Article",
        headline: s.title,
        description: desc,
        url: `${origin}/source/${s.key}`,
        ...(s.source
          ? { publisher: { "@type": "Organization", name: s.source } }
          : {}),
      },
    });
  }

  for (const t of collectTopics()) {
    const desc = `Selected platforms, projects, and articles about ${t.label} from ${SITE_NAME}.`;
    add(`/topic/${t.id}`, {
      title: `${t.label} · ${SITE_NAME}`,
      description: desc,
      image: defaultImage,
      url: `${origin}/topic/${t.id}`,
      type: "website",
      jsonLd: pageLd(
        "CollectionPage",
        `${t.label} · ${SITE_NAME}`,
        desc,
        `${origin}/topic/${t.id}`,
      ),
      static: wrapStatic(
        `<h1>${escapeHtml(t.label)}</h1>\n<p>${escapeHtml(desc)}</p>`,
      ),
    });
  }

  // Upstream also prerendered a set of experimental WebGL routes (/xr,
  // /prototypes/*, /home-next, /spatial-test). This template ships no such
  // pages, and prerendering a route the router does not implement emits a shell
  // that resolves to NotFound. Add them back here alongside the React routes if
  // you build them.

  // /admin is the dev-only content editor. It is registered (noindex) only so a
  // cold prod load resolves to a clean shell instead of 404; its save API is a
  // dev-only Vite middleware, so on prod the page just shows a "local dev" notice.
  add("/admin", {
    title: `Edit · ${SITE_NAME}`,
    extraHead: `<meta name="robots" content="noindex" />`,
    description: "Local content editor.",
    image: defaultImage,
    url: `${origin}/admin`,
    type: "website",
  });

  assertDocsRoutes(all, out);

  return out;
}

// vercel.json rewrites every unmatched path to "/", so a docs page that never
// reaches the route map does NOT 404: it quietly serves the home page's HTML,
// title, description and og tags to every crawler and link unfurler, while a
// human sees the right page because React renders the URL client-side. That
// failure is invisible without a count, so count it. Three numbers have to
// agree: the index.md files on disk under data/docs, the docs items this walk
// produced, and the /docs/... routes in the map.
function assertDocsRoutes(items, map) {
  const docsDir = path.join(DATA_DIR, "docs");
  const onDisk = fs.existsSync(docsDir)
    ? walk(docsDir).filter((f) => path.basename(f) === "index.md").length
    : 0;
  const expected = items.filter((i) => i.kind === "docs").map((i) => `/docs/${i.slug}`);
  const emitted = [...map.keys()].filter((r) => r.startsWith("/docs/"));
  const emittedSet = new Set(emitted);
  const missing = expected.filter((r) => !emittedSet.has(r));
  const unexpected = emitted.filter((r) => !expected.includes(r));
  const problems = [];
  if (onDisk !== expected.length) {
    problems.push(
      `data/docs holds ${onDisk} index.md file(s) but the content walk produced ${expected.length} page(s). ` +
        `A page is being dropped: check the folder layout is data/docs/<NN>_<section>/index.md ` +
        `or data/docs/<NN>_<section>/<NN>_<page>/index.md, no deeper.`,
    );
  }
  if (missing.length) problems.push(`no prerendered route for: ${missing.join(", ")}`);
  if (unexpected.length) problems.push(`route with no page behind it: ${unexpected.join(", ")}`);
  if (problems.length) {
    throw new Error(
      "Documentation routes do not match data/docs:\n  - " + problems.join("\n  - "),
    );
  }
}

function writeRoute(distDir, baseHtml, route, meta) {
  const cleanRoute = route.replace(/^\//, "").replace(/\/$/, "");
  const dir = cleanRoute
    ? path.join(distDir, ...cleanRoute.split("/"))
    : distDir;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), injectMeta(baseHtml, meta));
}

function truncate(s, n) {
  if (!s) return s;
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

// SEO: sitemap.xml + robots.txt, generated from the SAME route map as the
// prerendered HTML so they can never drift. We index only the canonical
// content routes; the /all/* aliases (duplicates of /hardware etc.) and the
// dev-only editor are left out so crawlers don't index duplicate or
// unrenderable pages.
function sitemapPriority(route) {
  if (route === "/") return "1.0";
  if (["/hardware", "/games", "/blog", "/docs"].includes(route)) {
    return "0.9";
  }
  if (route.startsWith("/source/")) return "0.5";
  if (route.startsWith("/topic/")) return "0.6";
  return "0.8";
}

function writeSitemap(distDir, map) {
  const skip = (r) => r.startsWith("/all/") || r === "/admin";
  const lastmod = new Date().toISOString().slice(0, 10);
  // A draft is rendered so it can be previewed, and is not offered to search.
  const routes = [...map.entries()]
    .filter(([r, meta]) => !skip(r) && !meta.draft)
    .map(([r]) => r)
    .sort();
  const urls = routes
    .map(
      (r) =>
        `  <url>\n    <loc>${SITE_URL}${r}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>${sitemapPriority(r)}</priority>\n  </url>`,
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  fs.writeFileSync(path.join(distDir, "sitemap.xml"), xml);
  return routes.length;
}

function writeRobots(distDir) {
  const txt = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
  fs.writeFileSync(path.join(distDir, "robots.txt"), txt);
}

function run(distDir) {
  const indexPath = path.join(distDir, "index.html");
  if (!fs.existsSync(indexPath)) {
    console.warn("[prerender] dist/index.html not found, skipping");
    return;
  }
  const baseHtml = fs.readFileSync(indexPath, "utf8");
  const map = buildRouteMeta(SITE_URL);
  let n = 0;
  let withVideo = 0;
  for (const [route, meta] of map) {
    writeRoute(distDir, baseHtml, route, meta);
    if (meta.video) withVideo++;
    n++;
  }
  const covers = copyItemCovers(distDir, collectItems());
  console.log(
    `[prerender] wrote ${n} routes with social meta (${withVideo} with og:video, ${covers} item covers)`,
  );
  const sitemapCount = writeSitemap(distDir, map);
  writeRobots(distDir);
  console.log(
    `[prerender] wrote sitemap.xml (${sitemapCount} urls) + robots.txt`,
  );
}

export function prerenderRoutes() {
  let outDir = "dist";
  let isBuild = false;
  return {
    name: "prerender-routes",
    configResolved(cfg) {
      isBuild = cfg.command === "build";
      outDir = cfg.build?.outDir || "dist";
    },
    closeBundle() {
      if (!isBuild) return;
      const distDir = path.isAbsolute(outDir)
        ? outDir
        : path.resolve(ROOT, outDir);
      run(distDir);
    },
    // Dev parity: the dev server serves the same per-route social meta as the
    // prod build, with absolute URLs on whatever host made the request, so a
    // shared dev link unfurls properly in Discord/iMessage/Slack.
    configureServer(server) {
      return () => {
        // The build copies co-located covers into dist; in dev they are still
        // only in data/, so serve them from there under the same URL.
        server.middlewares.use((req, res, next) => {
          const urlPath = (req.originalUrl || req.url || "/").split("?")[0];
          if (!urlPath.startsWith(`${OG_ITEM_PREFIX}/`)) return next();
          const item = collectItems().find(
            (i) => itemCoverPublicPath(i) === urlPath,
          );
          const file = item && itemCoverSource(item);
          if (!file) return next();
          res.setHeader("Content-Type", MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream");
          res.end(fs.readFileSync(file));
        });
        server.middlewares.use(async (req, res, next) => {
          try {
            // vite's SPA fallback has already rewritten req.url to
            // /index.html by the time post middlewares run; the route the
            // visitor asked for survives in originalUrl
            const urlPath = (req.originalUrl || req.url || "/").split("?")[0];
            if (urlPath.includes(".")) return next();
            const host = req.headers["x-forwarded-host"] || req.headers.host;
            if (!host) return next();
            const proto =
              req.headers["x-forwarded-proto"] ||
              (/^(localhost|127\.|\d+\.\d+\.)/.test(String(host))
                ? "http"
                : "https");
            const origin = `${proto}://${host}`;
            const meta = buildRouteMeta(origin).get(
              urlPath.replace(/\/$/, "") || "/",
            );
            if (!meta) return next();
            let html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
            html = await server.transformIndexHtml(req.url, html);
            res.setHeader("Content-Type", "text/html");
            res.end(injectMeta(html, meta));
          } catch (e) {
            next(e);
          }
        });
      };
    },
  };
}
