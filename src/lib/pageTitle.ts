import { useEffect } from "react";
import { SITE } from "./site";
import type { Item, Kind, Topic } from "./types";

// The client-side counterpart to the titles scripts/vite-prerender.mjs bakes
// into each route's HTML. Both must agree: the server title is what crawlers
// and social unfurls read, and this is what replaces it after hydration. A
// mismatch means the tab (and anything that renders JS, including Googlebot)
// disagrees with the served markup.
//
// src/lib/pageTitle.test.ts asserts every route here equals buildRouteMeta()'s
// title for the same route, so the two cannot drift.

export const COLLECTION_TITLE: Record<Kind, string> = {
  hardware: "Platforms",
  game: "Games",
  blog: "News and coverage",
};

export function titleForHome(): string {
  return `${SITE.title} · ${SITE.tagline}`;
}

export function titleForCollection(kind: Kind): string {
  return `${COLLECTION_TITLE[kind]} · ${SITE.title}`;
}

export function titleForTopic(topic: Topic): string {
  return `${topic.label} · ${SITE.title}`;
}

export function titleForItem(item: Item): string {
  // Talks carry their venue in the title, matching the prerendered form.
  const venue = item.venue ? ` · ${item.venue}` : "";
  return `${item.title}${venue} · ${SITE.title}`;
}

/**
 * Set document.title while this component is mounted.
 *
 * Item and collection views render as a LAYER over their tab page, so both
 * layers are mounted at once and both would otherwise write the title. The
 * layer on top passes `enabled` true and the tab page underneath passes false
 * (see useOverlayOpen), so the deepest view always owns the title.
 */
export function useDocumentTitle(title: string, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    document.title = title;
  }, [title, enabled]);
}
