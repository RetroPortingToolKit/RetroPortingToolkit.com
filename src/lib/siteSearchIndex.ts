import { BLOGS, GAMES, HARDWARE } from "./content";
import { buildSiteSearchIndex, type SiteSearchIndex } from "./siteSearch";

/**
 * The one site-wide search index, built once per page load and shared.
 *
 * TWO surfaces read it now: the command palette
 * (src/components/SearchPalette.tsx) and the WebMCP `search_site` tool
 * (src/lib/webmcp.ts). They must rank the same corpus the same way, so the
 * index is built here rather than once in each, and the promise is cached so
 * the second caller reuses the first caller's work.
 *
 * Nothing is fetched at runtime, which is the rule for this whole site. Games,
 * Platforms and News are already in the bundle (src/lib/content.ts reads data/
 * at build time). The documentation arrives as `virtual:docs-search-index`, the
 * build-time index that already existed for the documentation search,
 * dynamically imported so it stays its own chunk and costs nothing until
 * something actually searches.
 */

// The three flat kinds, whole. Their bodies are in the bundle already, so the
// index is built from them on first use rather than shipped twice.
const CONTENT_ITEMS = [...GAMES, ...HARDWARE, ...BLOGS];

let indexPromise: Promise<SiteSearchIndex> | undefined;

/** Build the index once per session, on first use. */
export function loadSiteSearchIndex(): Promise<SiteSearchIndex> {
  if (!indexPromise) {
    indexPromise = import("virtual:docs-search-index")
      .then((m) => buildSiteSearchIndex({ items: CONTENT_ITEMS, docs: m.default }))
      // Without the documentation chunk the index is still worth having:
      // everything else is already here.
      .catch(() => buildSiteSearchIndex({ items: CONTENT_ITEMS }));
  }
  return indexPromise;
}
