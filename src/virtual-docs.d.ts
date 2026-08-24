// The two build-time virtual modules the `docsDataPlugin` in vite.config.ts
// serves. Neither exists on disk: both are generated during the build (and on
// the fly in dev) from the published documentation, which is why they are
// declared here rather than imported from a file.
//
// Nothing is fetched at runtime. `virtual:docs-search-index` is reached through
// a dynamic import, so it becomes its own chunk and is downloaded the first
// time a reader opens search, not on page load.

declare module "virtual:docs-search-index" {
  import type { DocsSearchIndex } from "@/lib/docsSearch";
  const index: DocsSearchIndex;
  export default index;
}

declare module "virtual:docs-updated" {
  import type { DocsUpdatedEntry } from "../scripts/gen-docs-dates.mjs";
  /** Keyed by the page's full slug under /docs ("reference/cli"). */
  const updated: Record<string, DocsUpdatedEntry>;
  export default updated;
}
