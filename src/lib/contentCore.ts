import yaml from "js-yaml";
import { LQIP } from "@/generated/lqip";
import type {
  About,
  DocsPageType,
  GalleryItem,
  Item,
  Kind,
  LinkRef,
} from "./types";

export type AssetUrlMap = Readonly<Record<string, string>>;

function splitFrontmatter(raw: string): { fm: Record<string, unknown>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: raw };
  const fm = (yaml.load(m[1]) ?? {}) as Record<string, unknown>;
  // Source appendices are working notes, not reader-facing content. Keep the
  // markdown files available to maintainers, but omit the whole section from
  // rendered and generated public surfaces, including its otherwise-empty
  // heading.
  const body = (m[2] ?? "")
    .replace(
      /\n## Sources?\r?\n[\s\S]*?(?=\n## Next(?: pages?| questions?)?:?\r?\n|\s*$)/,
      "",
    )
    // "Next" lists duplicated the sidebar and made each page end with an
    // editorial handoff. Navigation owns that job, so omit every spelling
    // already present in the docs from all reader and agent surfaces.
    .replace(/\n## Next(?: pages?| questions?)?:?\r?\n[\s\S]*$/, "");
  return { fm, body };
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
// folder. This key matches both the supplied Vite asset map and the LQIP manifest.
function assetKey(value: string, baseDir: string): string {
  if (value.startsWith("/")) return value;
  return baseDir + value.replace(/^\.\//, "");
}

// Resolve a key to a served URL: data/ assets are hashed by Vite (in assetUrls);
// public/ assets are served verbatim.
function resolveKey(key: string, assetUrls: AssetUrlMap): string | undefined {
  return assetUrls[key] ?? (key.startsWith("/data/") ? undefined : key);
}

// The image pipeline keeps the source file for provenance, while adding a
// same-stem WebP beside it. Prefer that smaller sibling when Vite knows about
// it; old frontmatter and Markdown links therefore keep working unchanged.
function preferredImageKey(key: string, assetUrls: AssetUrlMap): string {
  if (!/\.(jpe?g|png)$/i.test(key)) return key;
  const webp = key.replace(/\.[^.]+$/, ".webp");
  return assetUrls[webp] ? webp : key;
}

function imageSrcSet(key: string, assetUrls: AssetUrlMap): string | undefined {
  if (!/\.(jpe?g|png)$/i.test(key)) return undefined;
  const base = key.replace(/\.[^.]+$/, "");
  const widths = [640, 1280];
  const variants = widths
    .map((width) => ({ width, key: `${base}-${width}.webp` }))
    .filter(({ key: variantKey }) => assetUrls[variantKey])
    .map(({ width, key: variantKey }) => `${resolveKey(variantKey, assetUrls)} ${width}w`);
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
  assetUrls: AssetUrlMap,
): ResolvedMedia | undefined {
  if (!value) return undefined;
  if (/^(https?:|data:|blob:)/.test(value)) return { src: value };
  const key = assetKey(value, baseDir);
  if (VIDEO_EXT.test(key)) {
    const webmKey = key.replace(/\.[^.]+$/, ".webm");
    const mp4Key = key.replace(/\.[^.]+$/, ".mp4");
    const webm = resolveKey(webmKey, assetUrls);
    const mp4 = resolveKey(mp4Key, assetUrls);
    const src = webm ?? mp4 ?? resolveKey(key, assetUrls) ?? value;
    return {
      src,
      srcFallback: webm && mp4 ? mp4 : undefined,
      lqip: LQIP[webmKey] ?? LQIP[mp4Key] ?? LQIP[key],
      poster: resolveKey(key.replace(/\.[^.]+$/, ".thumb.webp"), assetUrls),
    };
  }
  const imageKey = preferredImageKey(key, assetUrls);
  return {
    src: resolveKey(imageKey, assetUrls) ?? value,
    srcSet: imageSrcSet(key, assetUrls),
    lqip: LQIP[imageKey] ?? LQIP[key],
  };
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

// Inline body media: rewrite markdown image refs that point into the item's
// folder (![caption](./file)) to their built asset URLs, so article bodies can
// be sprinkled with first-party media the way the galleries are.
function resolveBodyMedia(body: string, baseDir: string, assetUrls: AssetUrlMap): string {
  return body.replace(
    /(!\[[^\]]*\]\()((?:\.\/|\/data\/)[^)\s]+)(\))/g,
    (_all, pre: string, rel: string, post: string) => {
      const media = resolveMedia(rel, baseDir, assetUrls);
      return pre + (media?.src ?? rel) + post;
    },
  );
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function asGallery(v: unknown, baseDir: string, assetUrls: AssetUrlMap): GalleryItem[] {
  if (!Array.isArray(v)) return [];
  const out: GalleryItem[] = [];
  for (const entry of v) {
    if (typeof entry === "string") {
      const media = resolveMedia(entry, baseDir, assetUrls);
      if (media) {
        out.push({
          src: media.src,
          srcSet: media.srcSet,
          srcFallback: media.srcFallback,
          lqip: media.lqip,
          poster: media.poster,
        });
      }
    } else if (entry && typeof entry === "object") {
      const rec = entry as Record<string, unknown>;
      const rawSrc = asString(rec.src);
      if (!rawSrc) continue;
      const media = resolveMedia(rawSrc, baseDir, assetUrls);
      if (!media) continue;
      const caption = asString(rec.caption) || undefined;
      out.push({
        src: media.src,
        srcSet: media.srcSet,
        srcFallback: media.srcFallback,
        lqip: media.lqip,
        poster: media.poster,
        caption,
      });
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
    .filter((link) => link.label.length > 0);
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
    slug: parts.map((part) => part.slug).join("/"),
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

function parseItem(path: string, raw: string, assetUrls: AssetUrlMap): Item | null {
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

  const coverM = resolveMedia(asString(fm.cover) || undefined, baseDir, assetUrls);
  const coverCaption = asString(fm.coverCaption) || undefined;
  const posterM = resolveMedia(asString(fm.poster) || undefined, baseDir, assetUrls);
  const gallery = asGallery(fm.gallery, baseDir, assetUrls);

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
    gallery,
    links: asLinks(fm.links),
    body: resolveBodyMedia(body.trim(), baseDir, assetUrls),
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
    showOnPlatform: fm.showOnPlatform !== false,
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

function parseAboutFrom(path: string, raw: string, assetUrls: AssetUrlMap): About {
  const { fm, body } = splitFrontmatter(raw);
  const baseDir = dirOf(path);
  const videoBg = resolveMedia(asString(fm.videoBackground) || undefined, baseDir, assetUrls);
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

export function createContentParsers(assetUrls: AssetUrlMap) {
  return {
    parseItem: (path: string, raw: string) => parseItem(path, raw, assetUrls),
    parseAboutFrom: (path: string, raw: string) => parseAboutFrom(path, raw, assetUrls),
  };
}

const PATH_SEGMENT: Record<Kind, string> = {
  hardware: "hardware",
  game: "games",
  blog: "blog",
  docs: "docs",
};

export function pathFor(kind: Kind, slug: string): string {
  return `/${PATH_SEGMENT[kind]}/${slug}`;
}

export function topicPath(topicId: string): string {
  return `/topic/${topicId}`;
}

// The inverse of PATH_SEGMENT, derived rather than restated: a hand-written
// copy is a Record<string, Kind>, so TypeScript cannot tell when it falls one
// kind behind and /all/<segment> silently resolves to nothing.
export const COLLECTION_KIND: Record<string, Kind> = Object.fromEntries(
  (Object.keys(PATH_SEGMENT) as Kind[]).map((kind) => [PATH_SEGMENT[kind], kind]),
);
