// Build-time feed generator for the blog. Emits, into the deployed dist root:
//   rss.xml   (RSS 2.0, full content via <content:encoded>)
//   atom.xml  (Atom 1.0)
//   feed.json (JSON Feed 1.1)
// Self-contained on purpose (only node builtins + js-yaml, an existing dep) so
// it can run standalone for cheap verification: `node scripts/gen-feeds.mjs [outDir]`.
// vite.config.ts imports renderFeeds() for the dev middleware, so dev and build
// emit identical bytes.
//
// Brand strings come from src/lib/site.ts via site-config.mjs. Do not hardcode
// a site name, domain, or byline here (see AGENTS.md).
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import yaml from "js-yaml";
import { SITE, ROOT } from "./site-config.mjs";

const DATA_DIR = path.join(ROOT, "data");
const PUBLIC_DIR = path.join(ROOT, "public");

const SITE_URL = SITE.url;
const FEED_TITLE = `${SITE.title} · Blog`;
const FEED_DESC = SITE.description;
const BLOG_URL = `${SITE_URL}/blog`;
// Optional: RSS managingEditor/webMaster and the Atom <email> are only emitted
// when src/lib/site.ts defines `email`. They are optional in both specs, and a
// placeholder address in a public feed is worse than no address.
const AUTHOR_EMAIL = SITE.email || "";
const AUTHOR_NAME = SITE.author;

// ---- content load (mirrors the blog slice of the content loader) ----
const FOLDER_RE = /^(\d+)_(.+)$/;

function splitFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: raw };
  return { fm: yaml.load(m[1]) ?? {}, body: m[2] ?? "" };
}

function collectBlog() {
  const dir = path.join(DATA_DIR, "blog");
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const folder of fs.readdirSync(dir)) {
    const file = path.join(dir, folder, "index.md");
    if (!fs.existsSync(file)) continue;
    const slug = (folder.match(FOLDER_RE) || [, , folder])[2];
    const { fm, body } = splitFrontmatter(fs.readFileSync(file, "utf8"));
    if (!fm.date && !fm.year) continue; // a feed entry needs a publish date
    if (fm.draft === true) continue; // a draft is not published anywhere
    out.push({
      slug,
      url: `${SITE_URL}/blog/${slug}`,
      title: typeof fm.title === "string" ? fm.title : slug,
      desc: typeof fm.desc === "string" ? fm.desc : "",
      date: typeof fm.date === "string" ? fm.date : `${fm.year}-01-01`,
      tags: Array.isArray(fm.tags) ? fm.tags.filter((t) => typeof t === "string") : [],
      body: (body || "").trim(),
      image: blogImage(slug),
    });
  }
  // newest first
  out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return out;
}

// the public card cover used everywhere else for this slug, absolutized.
// Both paths are existence-checked, so a site with neither simply ships no
// per-entry images. public/previews/ is populated by scripts/gen-previews.mjs.
function blogImage(slug) {
  if (fs.existsSync(path.join(PUBLIC_DIR, "previews", `${slug}.webp`)))
    return `${SITE_URL}/previews/${slug}.webp`;
  if (fs.existsSync(path.join(PUBLIC_DIR, "lab-media", "blog", `${slug}.webp`)))
    return `${SITE_URL}/lab-media/blog/${slug}.webp`;
  return null;
}

// ---- escaping ----
function escXml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escAttr(s) {
  return escXml(s).replace(/"/g, "&quot;");
}
function cdata(s) {
  return `<![CDATA[${String(s).replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

// ---- a small, correct markdown -> HTML for the blog bodies ----
// (handles paragraphs, headings, unordered lists, **bold**, *em* / _em_,
//  `code`, and [text](href) links with relative hrefs absolutized.)
function absHref(href) {
  if (href.startsWith("/")) return SITE_URL + href;
  return href;
}
function inlineMd(text) {
  const links = [];
  // Hold generated anchors outside the later Markdown replacements. Parsing
  // raw input means hrefs are escaped exactly once for HTML.
  let s = String(text).replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    const token = `\0${links.length}\0`;
    links.push(`<a href="${escAttr(absHref(href))}">${inlineMd(label)}</a>`);
    return token;
  });
  s = escXml(s);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[\s(])\*([^*]+)\*/g, "$1<em>$2</em>");
  s = s.replace(/(^|[\s(])_([^_]+)_/g, "$1<em>$2</em>");
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  return s.replace(/\0(\d+)\0/g, (_, index) => links[Number(index)]);
}
function mdToHtml(md) {
  const blocks = md.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const html = [];
  for (const block of blocks) {
    const lines = block.split("\n");
    if (lines.every((l) => /^[-*]\s+/.test(l.trim()))) {
      const items = lines.map((l) => `<li>${inlineMd(l.replace(/^[-*]\s+/, "").trim())}</li>`);
      html.push(`<ul>${items.join("")}</ul>`);
    } else if (/^#{1,6}\s+/.test(block)) {
      const level = Math.min(block.match(/^#+/)[0].length + 1, 6); // # -> h2
      html.push(`<h${level}>${inlineMd(block.replace(/^#{1,6}\s+/, "").trim())}</h${level}>`);
    } else {
      html.push(`<p>${inlineMd(lines.join(" "))}</p>`);
    }
  }
  return html.join("\n");
}

// ---- dates ----
function asDate(d) {
  return new Date(`${d}T00:00:00Z`);
}
function rfc822(d) {
  return asDate(d).toUTCString();
}
function rfc3339(d) {
  return asDate(d).toISOString();
}

// ---- builders ----
function entryHtml(post) {
  const lead = post.image
    ? `<p><img src="${escAttr(post.image)}" alt="${escAttr(post.title)}" /></p>\n`
    : "";
  return lead + mdToHtml(post.body);
}

function buildRss(posts) {
  const newest = posts[0] ? rfc822(posts[0].date) : new Date().toUTCString();
  const editor = AUTHOR_EMAIL
    ? `    <managingEditor>${escXml(AUTHOR_EMAIL)} (${escXml(AUTHOR_NAME)})</managingEditor>
    <webMaster>${escXml(AUTHOR_EMAIL)} (${escXml(AUTHOR_NAME)})</webMaster>
`
    : "";
  const items = posts.map((p) => {
    const cats = p.tags.map((t) => `      <category>${escXml(t)}</category>`).join("\n");
    const media = p.image
      ? `      <media:content url="${escAttr(p.image)}" medium="image" />\n      <media:thumbnail url="${escAttr(p.image)}" />\n`
      : "";
    return `    <item>
      <title>${escXml(p.title)}</title>
      <link>${escXml(p.url)}</link>
      <guid isPermaLink="true">${escXml(p.url)}</guid>
      <pubDate>${rfc822(p.date)}</pubDate>
      <description>${cdata(p.desc)}</description>
      <content:encoded>${cdata(entryHtml(p))}</content:encoded>
${cats ? cats + "\n" : ""}${media}    </item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escXml(FEED_TITLE)}</title>
    <link>${escXml(BLOG_URL)}</link>
    <atom:link href="${escAttr(`${SITE_URL}/rss.xml`)}" rel="self" type="application/rss+xml" />
    <description>${escXml(FEED_DESC)}</description>
    <language>en-us</language>
${editor}    <lastBuildDate>${newest}</lastBuildDate>
    <generator>gen-feeds.mjs</generator>
${items.join("\n")}
  </channel>
</rss>
`;
}

function buildAtom(posts) {
  const updated = posts[0] ? rfc3339(posts[0].date) : new Date().toISOString();
  const entries = posts.map((p) => {
    const cats = p.tags.map((t) => `    <category term="${escAttr(t)}" />`).join("\n");
    return `  <entry>
    <title>${escXml(p.title)}</title>
    <link href="${escAttr(p.url)}" />
    <id>${escXml(p.url)}</id>
    <published>${rfc3339(p.date)}</published>
    <updated>${rfc3339(p.date)}</updated>
    <summary>${escXml(p.desc)}</summary>
    <content type="html">${escXml(entryHtml(p))}</content>
${cats ? cats + "\n" : ""}  </entry>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escXml(FEED_TITLE)}</title>
  <subtitle>${escXml(FEED_DESC)}</subtitle>
  <link href="${escAttr(BLOG_URL)}" />
  <link href="${escAttr(`${SITE_URL}/atom.xml`)}" rel="self" type="application/atom+xml" />
  <id>${escXml(BLOG_URL)}</id>
  <updated>${updated}</updated>
  <author>
    <name>${escXml(AUTHOR_NAME)}</name>
${AUTHOR_EMAIL ? `    <email>${escXml(AUTHOR_EMAIL)}</email>\n` : ""}    <uri>${escXml(`${SITE_URL}/`)}</uri>
  </author>
  <generator>gen-feeds.mjs</generator>
${entries.join("\n")}
</feed>
`;
}

function buildJsonFeed(posts) {
  return (
    JSON.stringify(
      {
        version: "https://jsonfeed.org/version/1.1",
        title: FEED_TITLE,
        home_page_url: BLOG_URL,
        feed_url: `${SITE_URL}/feed.json`,
        description: FEED_DESC,
        language: "en-US",
        authors: [{ name: AUTHOR_NAME, url: `${SITE_URL}/` }],
        items: posts.map((p) => ({
          id: p.url,
          url: p.url,
          title: p.title,
          summary: p.desc,
          content_html: entryHtml(p),
          ...(p.image ? { image: p.image, banner_image: p.image } : {}),
          date_published: rfc3339(p.date),
          ...(p.tags.length ? { tags: p.tags } : {}),
        })),
      },
      null,
      2,
    ) + "\n"
  );
}

// Render the feeds in memory (used by the dev middleware for live parity) so
// the exact same bytes are produced in dev and at build time.
export function renderFeeds() {
  return renderFeedsFromPosts(collectBlog());
}

export function renderFeedsFromPosts(inputPosts) {
  const published = Array.isArray(inputPosts)
    ? inputPosts.filter((post) => post?.draft !== true)
    : [];
  if (published.length === 0) throw new Error("Cannot render an empty blog feed.");
  const posts = [...published].sort((a, b) => {
    const dateDelta = asDate(b.date).getTime() - asDate(a.date).getTime();
    if (dateDelta) return dateDelta;
    return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
  });
  const urls = new Set();
  for (const post of posts) {
    if (!post?.slug || !post?.url || !post?.date) {
      throw new Error("Every feed post needs a slug, URL, and publication date.");
    }
    if (Number.isNaN(asDate(post.date).getTime())) {
      throw new Error(`Invalid publication date for ${post.slug}: ${post.date}`);
    }
    if (urls.has(post.url)) throw new Error(`Duplicate feed URL: ${post.url}`);
    urls.add(post.url);
  }
  return {
    count: posts.length,
    rss: buildRss(posts),
    atom: buildAtom(posts),
    json: buildJsonFeed(posts),
  };
}

export function generateFeeds(distDir = path.join(ROOT, "dist")) {
  const { count, rss, atom, json } = renderFeeds();
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, "rss.xml"), rss);
  fs.writeFileSync(path.join(distDir, "atom.xml"), atom);
  fs.writeFileSync(path.join(distDir, "feed.json"), json);
  return count;
}

// CLI: `node scripts/gen-feeds.mjs [outDir]` for standalone verification.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, "dist");
  const n = generateFeeds(out);
  console.log(`[gen-feeds] wrote rss.xml + atom.xml + feed.json (${n} posts) -> ${out}`);
}
