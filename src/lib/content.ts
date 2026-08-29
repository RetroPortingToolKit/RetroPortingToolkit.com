import yaml from "js-yaml";
import type {
  About,
  DocsPageType,
  GalleryItem,
  Item,
  Kind,
  LinkRef,
  Topic,
} from "./types";
import { LQIP } from "@/generated/lqip";

const rawMd = import.meta.glob("/data/**/index.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const aboutMd = import.meta.glob("/data/about.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const assetUrls = import.meta.glob(
  "/data/**/*.{jpg,jpeg,png,webp,svg,gif,avif,mp4,webm,mov}",
  { eager: true, query: "?url", import: "default" },
) as Record<string, string>;

function splitFrontmatter(raw: string): { fm: Record<string, unknown>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: raw };
  const fm = (yaml.load(m[1]) ?? {}) as Record<string, unknown>;
  return { fm, body: m[2] ?? "" };
}

function dirOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i < 0 ? "" : path.slice(0, i + 1);
}

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;
const YOUTUBE_RE = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

export function isVideoSrc(url: string | undefined): boolean {
  return !!url && VIDEO_EXT.test(url);
}

export function isYouTubeSrc(url: string | undefined): boolean {
  return !!url && YOUTUBE_RE.test(url);
}

export function youtubeEmbedUrl(url: string): string | undefined {
  const m = url.match(YOUTUBE_RE);
  if (!m) return undefined;
  const id = m[1];
  return `https://www.youtube.com/embed/${id}?enablejsapi=1&autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`;
}

export function youtubeThumb(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const m = url.match(YOUTUBE_RE);
  if (!m) return undefined;
  return `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg`;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// A human date for an article byline. "2026-06-25" -> "June 25, 2026". A bare
// year ("2009") or any unparseable value passes through unchanged. Hand-rolled
// (not Intl/Date) so it renders identically in the Node prerender and the
// browser, with no timezone drift on the day.
export function formatArticleDate(date: string | undefined): string {
  if (!date) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return date;
  const mi = Number(m[2]) - 1;
  if (mi < 0 || mi > 11) return date;
  return `${MONTHS[mi]} ${Number(m[3])}, ${m[1]}`;
}

// Reading time in whole minutes at ~200 wpm, floored at 1.
export function readingTimeMin(body: string | undefined): number {
  const words = body ? (body.trim().match(/\S+/g) || []).length : 0;
  return Math.max(1, Math.round(words / 200));
}

// The public-facing key for a referenced asset: absolute paths (public/ assets)
// are used as-is; relative paths (data/ assets) are resolved against the item's
// folder. This key matches both the import.meta.glob map and the LQIP manifest.
function assetKey(value: string, baseDir: string): string {
  if (value.startsWith("/")) return value;
  return baseDir + value.replace(/^\.\//, "");
}

// Resolve a key to a served URL: data/ assets are hashed by Vite (in assetUrls);
// public/ assets are served verbatim.
function resolveKey(key: string): string | undefined {
  return assetUrls[key] ?? (key.startsWith("/data/") ? undefined : key);
}

// The image pipeline keeps the source file for provenance, while adding a
// same-stem WebP beside it. Prefer that smaller sibling when Vite knows about
// it; old frontmatter and Markdown links therefore keep working unchanged.
function preferredImageKey(key: string): string {
  if (!/\.(jpe?g|png)$/i.test(key)) return key;
  const webp = key.replace(/\.[^.]+$/, ".webp");
  return assetUrls[webp] ? webp : key;
}

function imageSrcSet(key: string): string | undefined {
  if (!/\.(jpe?g|png)$/i.test(key)) return undefined;
  const base = key.replace(/\.[^.]+$/, "");
  const widths = [640, 1280];
  const variants = widths
    .map((width) => ({ width, key: `${base}-${width}.webp` }))
    .filter(({ key }) => assetUrls[key])
    .map(({ width, key }) => `${resolveKey(key)} ${width}w`);
  return variants.length ? variants.join(", ") : undefined;
}

export interface ResolvedMedia {
  src: string;
  srcSet?: string;
  srcFallback?: string;
  lqip?: string;
  /** small static poster for videos (<stem>.thumb.webp next to the file) */
  poster?: string;
}

// Resolve any image or video reference to its served URL plus, for video, an
// H.264 MP4 fallback alongside the WebM, and a tiny blurred placeholder.
function resolveMedia(
  value: string | undefined,
  baseDir: string,
): ResolvedMedia | undefined {
  if (!value) return undefined;
  if (/^(https?:|data:|blob:)/.test(value)) return { src: value };
  const key = assetKey(value, baseDir);
  if (VIDEO_EXT.test(key)) {
    const webmKey = key.replace(/\.[^.]+$/, ".webm");
    const mp4Key = key.replace(/\.[^.]+$/, ".mp4");
    const webm = resolveKey(webmKey);
    const mp4 = resolveKey(mp4Key);
    const src = webm ?? mp4 ?? resolveKey(key) ?? value;
    return {
      src,
      srcFallback: webm && mp4 ? mp4 : undefined,
      lqip: LQIP[webmKey] ?? LQIP[mp4Key] ?? LQIP[key],
      poster: resolveKey(key.replace(/\.[^.]+$/, ".thumb.webp")),
    };
  }
  const imageKey = preferredImageKey(key);
  return {
    src: resolveKey(imageKey) ?? value,
    srcSet: imageSrcSet(key),
    lqip: LQIP[imageKey] ?? LQIP[key],
  };
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

// Inline body media: rewrite markdown image refs that point into the item's
// folder (![caption](./file)) to their built asset URLs, so article bodies can
// be sprinkled with first-party media the way the galleries are.
function resolveBodyMedia(body: string, baseDir: string): string {
  return body.replace(
    /(!\[[^\]]*\]\()((?:\.\/|\/data\/)[^)\s]+)(\))/g,
    (_all, pre: string, rel: string, post: string) => {
      const m = resolveMedia(rel, baseDir);
      return pre + (m?.src ?? rel) + post;
    },
  );
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function asGallery(v: unknown, baseDir: string): GalleryItem[] {
  if (!Array.isArray(v)) return [];
  const out: GalleryItem[] = [];
  for (const entry of v) {
    if (typeof entry === "string") {
      const m = resolveMedia(entry, baseDir);
      if (m) out.push({ src: m.src, srcSet: m.srcSet, srcFallback: m.srcFallback, lqip: m.lqip, poster: m.poster });
    } else if (entry && typeof entry === "object") {
      const rec = entry as Record<string, unknown>;
      const rawSrc = asString(rec.src);
      if (!rawSrc) continue;
      const m = resolveMedia(rawSrc, baseDir);
      if (!m) continue;
      const caption = asString(rec.caption) || undefined;
      out.push({ src: m.src, srcSet: m.srcSet, srcFallback: m.srcFallback, lqip: m.lqip, poster: m.poster, caption });
    }
  }
  return out;
}

function asLinks(v: unknown): LinkRef[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({
      label: asString(x.label),
      href: asString(x.href, "#"),
    }))
    .filter((l) => l.label.length > 0);
}

function kindFromPath(path: string): Kind | null {
  if (path.startsWith("/data/hardware/")) return "hardware";
  if (path.startsWith("/data/games/")) return "game";
  if (path.startsWith("/data/blog/")) return "blog";
  if (path.startsWith("/data/docs/")) return "docs";
  return null;
}

// Folder name is `NN_<slug>`. The numeric prefix drives display order; the
// slug part is what's exposed in URLs.
const FOLDER_RE = /^(\d+)_(.+)$/;

function segmentInfo(folder: string): { order: number; slug: string } {
  const m = folder.match(FOLDER_RE);
  if (!m) return { order: 999, slug: folder };
  return { order: parseInt(m[1], 10), slug: m[2] };
}

// How deep a kind's folders may nest under data/<kind>/. Docs are the only kind
// with sections: data/docs/<NN>_<section>/<NN>_<page>/index.md is a page and
// data/docs/<NN>_<section>/index.md is that section's own page. Everything
// else is exactly one folder deep. Anything outside this (a stray
// data/docs/index.md, a third level) is DROPPED rather than published at a URL
// the router cannot match. scripts/vite-prerender.mjs carries the same table:
// the two walks decide independently which pages exist and must agree, or the
// prerendered HTML and the client disagree about what the site has.
const MAX_DEPTH: Record<Kind, number> = {
  hardware: 1,
  game: 1,
  blog: 1,
  docs: 2,
};

interface FolderInfo {
  order: number;
  slug: string;
  section?: string;
  sectionOrder?: number;
}

// The folder path under data/<kind>/ is the item's identity: every segment is
// `NN_<slug>` and the slugs, joined, are the URL. For the three flat kinds that
// is one segment and behaves exactly as it always has; for docs it is what
// makes /docs/<section>/<page> a real address rather than a flattened one.
function folderInfo(path: string, kind: Kind): FolderInfo | null {
  // "/data/docs/01_start/01_quickstart/index.md" -> ["01_start", "01_quickstart"]
  const segments = path.split("/").slice(3, -1);
  if (segments.length < 1 || segments.length > MAX_DEPTH[kind]) return null;
  const parts = segments.map(segmentInfo);
  const leaf = parts[parts.length - 1];
  return {
    order: leaf.order,
    slug: parts.map((p) => p.slug).join("/"),
    section: kind === "docs" ? parts[0].slug : undefined,
    sectionOrder: kind === "docs" ? parts[0].order : undefined,
  };
}

const DOCS_PAGE_TYPES = ["concept", "guide", "reference", "project"] as const;

function asPageType(v: unknown): DocsPageType | undefined {
  return (DOCS_PAGE_TYPES as readonly string[]).includes(v as string)
    ? (v as DocsPageType)
    : undefined;
}

export function parseItem(path: string, raw: string): Item | null {
  const kind = kindFromPath(path);
  if (!kind) return null;
  const folder = folderInfo(path, kind);
  if (!folder) return null;
  const { slug, section, sectionOrder } = folder;
  const { fm, body } = splitFrontmatter(raw);
  const baseDir = dirOf(path);
  // Order comes from the folder's numeric prefix, but a docs tree is reordered
  // often enough that renaming folders (and so every URL) to move one page is a
  // bad trade. An explicit `order:` wins where it is set.
  const order = typeof fm.order === "number" ? fm.order : folder.order;

  const coverM = resolveMedia(asString(fm.cover) || undefined, baseDir);
  const coverCaption = asString(fm.coverCaption) || undefined;
  const posterM = resolveMedia(asString(fm.poster) || undefined, baseDir);
  const gallery = asGallery(fm.gallery, baseDir);

  return {
    kind,
    slug,
    title: asString(fm.title, slug),
    kicker: asString(fm.kicker),
    kickerColor: asString(fm.kickerColor) || undefined,
    desc: asString(fm.desc),
    cover: coverM?.src,
    coverSrcSet: coverM?.srcSet,
    coverFallback: coverM?.srcFallback,
    coverLqip: coverM?.lqip,
    coverCaption,
    poster: posterM?.src,
    posterLqip: posterM?.lqip,
    gallery,
    links: asLinks(fm.links),
    body: resolveBodyMedia(body.trim(), baseDir),
    order,
    meta: asStringArray(fm.meta),
    tags: asStringArray(fm.tags),
    featured: fm.featured === true,
    draft: fm.draft === true,
    group: typeof fm.group === "string" ? fm.group : undefined,
    venue: typeof fm.venue === "string" ? fm.venue : undefined,
    author: typeof fm.author === "string" ? fm.author : undefined,
    authorAvatar: typeof fm.authorAvatar === "string" ? fm.authorAvatar : undefined,
    authorBio: typeof fm.authorBio === "string" ? fm.authorBio : undefined,
    year: typeof fm.year === "string" ? fm.year : undefined,
    duration: typeof fm.duration === "string" ? fm.duration : undefined,
    date: typeof fm.date === "string" ? fm.date : undefined,
    videoUrl: typeof fm.videoUrl === "string" ? fm.videoUrl : undefined,
    coverBgSize: typeof fm.coverBgSize === "string" ? fm.coverBgSize : undefined,
    coverBgPos: typeof fm.coverBgPos === "string" ? fm.coverBgPos : undefined,
    demo: asString(fm.demo) || undefined,
    layout: fm.layout === "split" || fm.layout === "article" ? fm.layout : undefined,
    preview: fm.preview === true || undefined,
    status: asString(fm.status) || undefined,
    availability: asString(fm.availability) || undefined,
    verified: asString(fm.verified) || undefined,
    provenance:
      fm.provenance === "core" || fm.provenance === "community" ? fm.provenance : undefined,
    platform: asString(fm.platform) || undefined,
    arch: asString(fm.arch) || undefined,
    repo: asString(fm.repo) || undefined,
    maturity: asString(fm.maturity) || undefined,
    added: asString(fm.added) || undefined,
    updated: asString(fm.updated) || undefined,
    section,
    sectionOrder,
    sectionTitle: asString(fm.sectionTitle) || undefined,
    summary: asString(fm.summary) || undefined,
    pageType: asPageType(fm.pageType),
  };
}

const allItems: Item[] = Object.entries(rawMd)
  .map(([path, raw]) => parseItem(path, raw))
  .filter((x): x is Item => x !== null)
  .sort((a, b) => a.order - b.order);

// The published lists. A draft is deliberately absent from all three, which is
// what keeps it off every grid, strip, feed and the sitemap; findItem() still
// resolves it, so its own URL renders and the editor can preview it.
export const HARDWARE = allItems.filter((i) => i.kind === "hardware" && !i.draft);
export const GAMES = allItems.filter((i) => i.kind === "game" && !i.draft);
// Blog is the one kind where recency is the order a reader expects, so it
// sorts newest first instead of by folder prefix. Two early posts carry only
// a year, so the key falls back year, then folder order breaks ties, newer
// folder first. The feeds already sort by date on their own.
const blogRecency = (i: Item) => i.date || (i.year ? `${i.year}-01-01` : "0000-00-00");
export const BLOGS = allItems
  .filter((i) => i.kind === "blog" && !i.draft)
  .sort((a, b) => {
    const d = blogRecency(b).localeCompare(blogRecency(a));
    return d !== 0 ? d : b.order - a.order;
  });
// Docs pages, section index pages included. `slug` is the full path under
// /docs (a section index is "start", a page is "start/quickstart"), so this
// list is flat and DOCS_SECTIONS below is the shape a sidebar wants.
export const DOCS = allItems.filter((i) => i.kind === "docs" && !i.draft);

export function findItem(kind: Kind, slug: string): Item | undefined {
  return allItems.find((i) => i.kind === kind && i.slug === slug);
}

/** True for a docs section's own page (data/docs/<NN>_<section>/index.md),
    which is the one docs item whose slug has no section prefix. */
export function isDocsSectionIndex(item: Item): boolean {
  return item.kind === "docs" && !item.slug.includes("/");
}

export interface DocsSection {
  /** URL segment, and the first segment of every page slug inside it */
  slug: string;
  /** "/docs/<slug>" */
  path: string;
  title: string;
  summary: string;
  order: number;
  /** the section's own page, when it has one */
  index?: Item;
  /** published pages in the section, in sidebar order */
  pages: Item[];
}

// The docs tree: one entry per section, each with its own page and its pages.
// Built from the PUBLISHED list, never from allItems, so a draft page stays out
// of navigation while its own URL keeps working (the draft rule the three lists
// above implement). This is what a sidebar, a breadcrumb, and prev/next links
// should read; nothing else needs to know how the folders nest.
export const DOCS_SECTIONS: DocsSection[] = (() => {
  const sections = new Map<string, DocsSection>();
  const bySlug = (slug: string, order: number): DocsSection => {
    let s = sections.get(slug);
    if (!s) {
      // A section with no index page of its own still has to be nameable, so
      // the slug is titled until one exists.
      const title = slug.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
      s = { slug, path: `/docs/${slug}`, title, summary: "", order, pages: [] };
      sections.set(slug, s);
    }
    return s;
  };
  for (const item of DOCS) {
    if (!item.section) continue;
    const s = bySlug(item.section, item.sectionOrder ?? 999);
    if (isDocsSectionIndex(item)) {
      s.index = item;
      s.title = item.sectionTitle || item.title;
      s.summary = item.summary || item.desc;
      // The index page's own order IS the section's order, including an
      // explicit `order:` override in its frontmatter.
      s.order = item.order;
    } else {
      s.pages.push(item);
    }
  }
  const byOrder = (a: { order: number; slug: string }, b: { order: number; slug: string }) =>
    a.order - b.order || a.slug.localeCompare(b.slug);
  for (const s of sections.values()) s.pages.sort(byOrder);
  return [...sections.values()].sort(byOrder);
})();

const PATH_SEGMENT: Record<Kind, string> = {
  hardware: "hardware",
  game: "games",
  blog: "blog",
  docs: "docs",
};

export function pathFor(kind: Kind, slug: string): string {
  return `/${PATH_SEGMENT[kind]}/${slug}`;
}

export function allPath(kind: Kind): string {
  return `/all/${PATH_SEGMENT[kind]}`;
}

export function topicPath(topicId: string): string {
  return `/topic/${topicId}`;
}

// The inverse of PATH_SEGMENT, derived rather than restated: a hand-written
// copy is a Record<string, Kind>, so TypeScript cannot tell when it falls one
// kind behind and /all/<segment> silently resolves to nothing.
export const COLLECTION_KIND: Record<string, Kind> = Object.fromEntries(
  (Object.keys(PATH_SEGMENT) as Kind[]).map((k) => [PATH_SEGMENT[k], k]),
);

// Keyed by Kind, so adding a fifth kind fails `npm run typecheck` here instead
// of silently serving the wrong list. This was a ternary chain ending in BLOGS,
// which meant any kind that was not hardware or game got the blog's items:
// prev/next on a docs page would have paged through the blog, and nothing in
// the type system objected.
const PUBLISHED: Record<Kind, Item[]> = {
  hardware: HARDWARE,
  game: GAMES,
  blog: BLOGS,
  docs: DOCS,
};

export function itemsForKind(kind: Kind): Item[] {
  return PUBLISHED[kind];
}

function itemMatchesTopic(item: Item, topic: Topic): boolean {
  if (topic.kinds && !topic.kinds.includes(item.kind)) return false;
  // A docs page is reference material, not an entry in a curated card set, so
  // it joins a topic only when the topic asks for docs by kind or names the
  // page outright (itemsForTopic's `items` path never reaches here).
  if (item.kind === "docs" && !topic.kinds?.includes("docs")) return false;
  const haystack = [
    item.title,
    item.kicker,
    item.desc,
    item.body,
    item.venue ?? "",
    ...item.meta,
  ]
    .join(" \n ")
    .toLowerCase();
  return topic.keywords.some((kw) => haystack.includes(kw.toLowerCase()));
}

export function itemsForTopic(topic: Topic): Item[] {
  if (topic.items && topic.items.length > 0) {
    return topic.items
      .map((ref) =>
        allItems.find((i) => i.kind === ref.kind && i.slug === ref.slug),
      )
      .filter((i): i is Item => !!i);
  }
  return allItems.filter((i) => itemMatchesTopic(i, topic));
}

// Intentionally returns no image. Cards without a real cover render a
// typographic title block instead of a stock-photo placeholder, so absence
// reads as restraint, never as something unfinished.
export function placeholderCover(): undefined {
  return undefined;
}

// Pure parser (path + raw -> About), reused by the live CMS preview to render a
// draft about.md without touching the static import.
export function parseAboutFrom(path: string, raw: string): About {
  const { fm, body } = splitFrontmatter(raw);
  const baseDir = dirOf(path);
  const videoBg = resolveMedia(asString(fm.videoBackground) || undefined, baseDir);
  return {
    eyebrow: asString(fm.eyebrow),
    role: asString(fm.role),
    headerName: asString(fm.headerName, "Placeholder Name"),
    heroTitle: asString(fm.heroTitle),
    tagline: asString(fm.tagline),
    bio: body.trim(),
    locations: asStringArray(fm.locations),
    email: asString(fm.email),
    videoBackground: videoBg?.src,
    videoBackgroundFallback: videoBg?.srcFallback,
  };
}

function parseAbout(): About {
  const entry = Object.entries(aboutMd)[0];
  if (!entry) {
    return {
      eyebrow: "",
      role: "",
      headerName: "Placeholder Name",
      heroTitle: "",
      tagline: "",
      bio: "",
      locations: [],
      email: "",
    };
  }
  return parseAboutFrom(entry[0], entry[1]);
}

export const ABOUT: About = parseAbout();

// HMR: this module is imported by App.tsx (the root), so a content edit would
// otherwise re-execute App and remount the whole app, dropping editor focus in
// /admin on every save. Self-accept so the HMR update stops here (no propagation
// to App). The /admin editor refreshes its own preview frame after saving; other
// dev tabs showing content pick changes up on reload.
if (import.meta.hot) {
  import.meta.hot.accept(() => {});
}
