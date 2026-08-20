import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
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
};

const COLLECTION_TITLE = {
  hardware: "Platforms",
  games: "Games",
  blog: "News and coverage",
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
  return null;
}

const FOLDER_RE = /^(\d+)_(.+)$/;
function folderSlug(folder) {
  const m = folder.match(FOLDER_RE);
  return m ? m[2] : folder;
}

function collectItems() {
  const items = [];
  if (!fs.existsSync(DATA_DIR)) return items;
  for (const file of walk(DATA_DIR)) {
    if (path.basename(file) !== "index.md") continue;
    const rel = path.relative(DATA_DIR, file).replaceAll("\\", "/");
    const kind = kindFromPath(rel);
    if (!kind) continue;
    const folder = path.basename(path.dirname(file));
    const slug = folderSlug(folder);
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
      dir: path.dirname(file),
      title: typeof fm.title === "string" ? fm.title : slug,
      desc: typeof fm.desc === "string" ? fm.desc : "",
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
const LAB_DIR = { hardware: "hardware", game: "game", blog: "blog" };

function itemImagePath(item) {
  const prev = path.join(PUBLIC_DIR, "previews", `${item.slug}.webp`);
  if (fs.existsSync(prev)) return `/previews/${item.slug}.webp`;
  const still = path.join(
    PUBLIC_DIR,
    "lab-media",
    LAB_DIR[item.kind],
    `${item.slug}.webp`,
  );
  if (fs.existsSync(still))
    return `/lab-media/${LAB_DIR[item.kind]}/${item.slug}.webp`;
  return null;
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

function mdInline(text) {
  return escapeHtml(text)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "")
    // citation markers ([src](cite:...)) are a client-side affordance; in the
    // static text they would be dead links, so drop them entirely
    .replace(/\s*\[[^\]]*\]\(cite:[^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, href) => {
      const safe = escapeAttr(href);
      return `<a href="${safe}">${t}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|\s)\*([^*\n]+)\*(?=[\s.,;:!?)]|$)/g, "$1<em>$2</em>");
}

function mdToHtml(md) {
  if (!md) return "";
  const blocks = md.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const out = [];
  for (const raw of blocks) {
    const b = raw.trim();
    if (!b) continue;
    const h = b.match(/^(#{1,4})\s+(.+)$/s);
    if (h) {
      const lvl = Math.min(h[1].length + 1, 5);
      out.push(`<h${lvl}>${mdInline(h[2].trim())}</h${lvl}>`);
      continue;
    }
    if (/^[-*]\s+/m.test(b) && b.split("\n").every((l) => /^[-*]\s+|^\s/.test(l))) {
      const lis = b
        .split(/\n(?=[-*]\s+)/)
        .map((l) => `<li>${mdInline(l.replace(/^[-*]\s+/, "").trim())}</li>`)
        .join("");
      out.push(`<ul>${lis}</ul>`);
      continue;
    }
    if (b.startsWith(">")) {
      const inner = b.replace(/^>\s?/gm, "").trim();
      out.push(`<blockquote><p>${mdInline(inner)}</p></blockquote>`);
      continue;
    }
    out.push(`<p>${mdInline(b)}</p>`);
  }
  return out.join("\n");
}

const NAV_HTML = [
  ["/", "Home"],
  ["/hardware", "Platforms"],
  ["/games", "Games"],
  ["/blog", "News and coverage"],
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
  return (
    "<ul>" +
    items
      .filter((i) => i.kind === kind)
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
        cover: String(data.featuredPost.cover || ""),
        alt: String(data.featuredPost.alt || ""),
      }
    : null;
  out.action = (data.action || []).map((e) => ({
    videoTitle: String(e.videoTitle || ""),
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
        `<p><a href="/blog/${escapeAttr(prose.featuredPost.slug)}">${escapeHtml(prose.featuredPost.title)}</a>: ${escapeHtml(prose.featuredPost.blurb)}</p>`,
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
        `<li><a href="${escapeAttr(c.page)}">${escapeHtml(c.videoTitle)}</a>: ${escapeHtml(c.blurb)}</li>`,
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
    gamePageExists(c.page, `action "${c.videoTitle}"`);
    need(c.alt, `action "${c.videoTitle}": missing alt`);
    // the internal page must carry the video so the embed and attribution live there
    const slug = c.page.split("/").pop();
    const item = items.find((i) => i.kind === "game" && i.slug === slug);
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
  if (item.desc) parts.push(`<p>${escapeHtml(item.desc)}</p>`);
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
  const items = collectItems();
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

  const counts = { hardware: 0, game: 0, blog: 0 };
  for (const it of items) counts[it.kind] = (counts[it.kind] ?? 0) + 1;
  // Derived from the real content counts so the descriptions never drift from
  // what the pages actually list.
  const TAB_DESC = {
    hardware: `${counts.hardware} platform recompilation ${counts.hardware === 1 ? "ecosystem" : "ecosystems"} from ${SITE_NAME}: decoders and runtimes for original console hardware.`,
    games: (() => {
      const libs = items.filter((i) => i.kind === "game" && i.group === "Shared libraries").length;
      const gamesOnly = counts.game - libs;
      return `${counts.game} projects built on ${SITE_NAME}: ${gamesOnly} game recompilations and ${libs} shared ${libs === 1 ? "library" : "libraries"}.`;
    })(),
    blog: `${counts.blog} ${counts.blog === 1 ? "article" : "articles"}: technical writing from the team, press coverage, and videos.`,
  };
  const SEG_KIND = { hardware: "hardware", games: "game", blog: "blog" };
  for (const seg of ["hardware", "games", "blog"]) {
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

  for (const item of items) {
    const segment = KIND_SEGMENT[item.kind];
    const url = `${origin}/${segment}/${item.slug}`;
    const imgPath = itemImagePath(item);
    const image = imgPath ? `${origin}${imgPath}` : defaultImage;
    const vidPath = itemVideoPath(item);
    const venuePart = item.venue ? ` · ${item.venue}` : "";
    add(`/${segment}/${item.slug}`, {
      title: `${item.title}${venuePart} · ${SITE_NAME}`,
      description: truncate(item.desc || item.title, 280),
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

  return out;
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
  if (["/hardware", "/games", "/blog"].includes(route)) {
    return "0.9";
  }
  if (route.startsWith("/source/")) return "0.5";
  if (route.startsWith("/topic/")) return "0.6";
  return "0.8";
}

function writeSitemap(distDir, map) {
  const skip = (r) => r.startsWith("/all/") || r === "/admin";
  const lastmod = new Date().toISOString().slice(0, 10);
  const routes = [...map.keys()].filter((r) => !skip(r)).sort();
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
  console.log(
    `[prerender] wrote ${n} routes with social meta (${withVideo} with og:video)`,
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
