import yaml from "js-yaml";
import type { About, GalleryItem, Item, Kind, LinkRef, Resume, Topic } from "./types";
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

const resumeJson = import.meta.glob("/data/resume.json", {
  eager: true,
  import: "default",
}) as Record<string, Resume>;

const assetUrls = import.meta.glob(
  "/data/**/*.{jpg,jpeg,png,webp,gif,avif,mp4,webm,mov}",
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

export interface ResolvedMedia {
  src: string;
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
  return { src: resolveKey(key) ?? value, lqip: LQIP[key] };
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
      if (m) out.push({ src: m.src, srcFallback: m.srcFallback, lqip: m.lqip, poster: m.poster });
    } else if (entry && typeof entry === "object") {
      const rec = entry as Record<string, unknown>;
      const rawSrc = asString(rec.src);
      if (!rawSrc) continue;
      const m = resolveMedia(rawSrc, baseDir);
      if (!m) continue;
      const caption = asString(rec.caption) || undefined;
      out.push({ src: m.src, srcFallback: m.srcFallback, lqip: m.lqip, poster: m.poster, caption });
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
  if (path.startsWith("/data/projects/")) return "project";
  if (path.startsWith("/data/talks/")) return "talk";
  if (path.startsWith("/data/writing/")) return "writing";
  if (path.startsWith("/data/blog/")) return "blog";
  return null;
}

// Folder name is `NN_<slug>`. The numeric prefix drives display order; the
// slug part is what's exposed in URLs.
const FOLDER_RE = /^(\d+)_(.+)$/;

function folderInfo(path: string): { order: number; slug: string } {
  const parts = path.split("/");
  const folder = parts[parts.length - 2] ?? "";
  const m = folder.match(FOLDER_RE);
  if (!m) return { order: 999, slug: folder };
  return { order: parseInt(m[1], 10), slug: m[2] };
}

export function parseItem(path: string, raw: string): Item | null {
  const kind = kindFromPath(path);
  if (!kind) return null;
  const { order, slug } = folderInfo(path);
  const { fm, body } = splitFrontmatter(raw);
  const baseDir = dirOf(path);

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
    group: typeof fm.group === "string" ? fm.group : undefined,
    venue: typeof fm.venue === "string" ? fm.venue : undefined,
    year: typeof fm.year === "string" ? fm.year : undefined,
    duration: typeof fm.duration === "string" ? fm.duration : undefined,
    date: typeof fm.date === "string" ? fm.date : undefined,
    videoUrl: typeof fm.videoUrl === "string" ? fm.videoUrl : undefined,
    coverBgSize: typeof fm.coverBgSize === "string" ? fm.coverBgSize : undefined,
    coverBgPos: typeof fm.coverBgPos === "string" ? fm.coverBgPos : undefined,
    demo: asString(fm.demo) || undefined,
    layout: fm.layout === "split" || fm.layout === "article" ? fm.layout : undefined,
    preview: fm.preview === true || undefined,
  };
}

const allItems: Item[] = Object.entries(rawMd)
  .map(([path, raw]) => parseItem(path, raw))
  .filter((x): x is Item => x !== null)
  .sort((a, b) => a.order - b.order);

export const PROJECTS = allItems.filter((i) => i.kind === "project");
export const TALKS = allItems.filter((i) => i.kind === "talk");
export const WRITING = allItems.filter((i) => i.kind === "writing");
export const BLOGS = allItems.filter((i) => i.kind === "blog");

export function findItem(kind: Kind, slug: string): Item | undefined {
  return allItems.find((i) => i.kind === kind && i.slug === slug);
}

const PATH_SEGMENT: Record<Kind, string> = {
  project: "projects",
  talk: "talks",
  writing: "writing",
  blog: "blog",
};

export function pathFor(kind: Kind, slug: string): string {
  return `/${PATH_SEGMENT[kind]}/${slug}`;
}

const ALL_SEGMENT: Record<Kind, "projects" | "talks" | "writing" | "blog"> = {
  project: "projects",
  talk: "talks",
  writing: "writing",
  blog: "blog",
};

export function allPath(kind: Kind): string {
  return `/all/${ALL_SEGMENT[kind]}`;
}

export function topicPath(topicId: string): string {
  return `/topic/${topicId}`;
}

export const COLLECTION_KIND: Record<string, Kind> = {
  projects: "project",
  talks: "talk",
  writing: "writing",
  blog: "blog",
};

export function itemsForKind(kind: Kind): Item[] {
  return kind === "project" ? PROJECTS : kind === "talk" ? TALKS : kind === "blog" ? BLOGS : WRITING;
}

function itemMatchesTopic(item: Item, topic: Topic): boolean {
  if (topic.kinds && !topic.kinds.includes(item.kind)) return false;
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

// Pure parser for a draft resume.json string, used by the live CMS preview.
export function parseResumeRaw(raw: string): Resume {
  try {
    const parsed = JSON.parse(raw) as Resume;
    return parsed && Array.isArray(parsed.items) ? parsed : { items: [] };
  } catch {
    return { items: [] };
  }
}

export const RESUME: Resume = (() => {
  const entry = Object.entries(resumeJson)[0];
  if (!entry) return { items: [] };
  return entry[1];
})();

// HMR: this module is imported by App.tsx (the root), so a content edit would
// otherwise re-execute App and remount the whole app, dropping editor focus in
// /admin on every save. Self-accept so the HMR update stops here (no propagation
// to App). The /admin editor refreshes its own preview frame after saving; other
// dev tabs showing content pick changes up on reload.
if (import.meta.hot) {
  import.meta.hot.accept(() => {});
}
