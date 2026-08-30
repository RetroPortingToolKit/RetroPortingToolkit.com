// Compatibility surface for existing callers. The static imports live in the
// two domain modules so later consumers can take catalog content without also
// pulling the documentation tree into their module graph.
import {
  ABOUT,
  BLOGS,
  CATALOG_ITEMS,
  GAMES,
  HARDWARE,
  catalogAssetUrls,
} from "./catalogContent";
import { createContentParsers } from "./contentCore";
import {
  DOCS,
  DOCS_ALL_ITEMS,
  DOCS_SECTIONS,
  docsAssetUrls,
} from "./docsContent";
import type { About, Item, Kind, Topic } from "./types";

export { ABOUT, BLOGS, DOCS, DOCS_SECTIONS, GAMES, HARDWARE };
export {
  COLLECTION_KIND,
  formatArticleDate,
  isVideoSrc,
  isYouTubeSrc,
  pathFor,
  readingTimeMin,
  topicPath,
  youtubeEmbedUrl,
  youtubeThumb,
} from "./contentCore";
export type { ResolvedMedia } from "./contentCore";
export { isDocsSectionIndex } from "./docsContent";
export type { DocsSection } from "./docsContent";

// The public parsers accept every page kind, so their asset resolver keeps the
// union of both domain maps. Static catalog and docs lists are parsed in their
// own modules; only this compatibility path needs the combined map.
const compatibilityParsers = createContentParsers({
  ...catalogAssetUrls,
  ...docsAssetUrls,
});

export function parseItem(path: string, raw: string): Item | null {
  return compatibilityParsers.parseItem(path, raw);
}

// Pure parser (path + raw -> About), reused by the live CMS preview to render a
// draft about.md without touching the static import.
export function parseAboutFrom(path: string, raw: string): About {
  return compatibilityParsers.parseAboutFrom(path, raw);
}

// Preserve the original all-data ordering for cross-kind topic results. Vite's
// glob keys are path ordered; the source kind order below is their lexical
// order, while stable sorting leaves each domain module's within-kind order
// untouched.
const SOURCE_KIND_ORDER: Record<Kind, number> = {
  blog: 0,
  docs: 1,
  game: 2,
  hardware: 3,
};

const allItems: Item[] = [...CATALOG_ITEMS, ...DOCS_ALL_ITEMS].sort(
  (a, b) => a.order - b.order || SOURCE_KIND_ORDER[a.kind] - SOURCE_KIND_ORDER[b.kind],
);

export function findItem(kind: Kind, slug: string): Item | undefined {
  return allItems.find((item) => item.kind === kind && item.slug === slug);
}

// Keyed by Kind, so adding a fifth kind fails `npm run typecheck` here instead
// of silently serving the wrong list.
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
  return topic.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

export function itemsForTopic(topic: Topic): Item[] {
  if (topic.items && topic.items.length > 0) {
    return topic.items
      .map((ref) => allItems.find((item) => item.kind === ref.kind && item.slug === ref.slug))
      .filter((item): item is Item => !!item);
  }
  return allItems.filter((item) => itemMatchesTopic(item, topic));
}

// HMR: this module is imported by App.tsx (the root), so a content edit would
// otherwise re-execute App and remount the whole app, dropping editor focus in
// /admin on every save. Self-accept so updates from either domain stop here (no
// propagation to App). The editor refreshes its own preview frame after saving;
// other dev tabs showing content pick changes up on reload.
if (import.meta.hot) {
  import.meta.hot.accept(() => {});
}
