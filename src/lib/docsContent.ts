import { createContentParsers } from "./contentCore";
import type { Item } from "./types";

const docsMd = import.meta.glob("/data/docs/**/index.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

// SVG is deliberately included: the documentation's diagrams are source
// assets beside their Markdown pages and need the same Vite URL rewriting as
// raster images and video.
export const docsAssetUrls = import.meta.glob(
  "/data/docs/**/*.{jpg,jpeg,png,webp,svg,gif,avif,mp4,webm,mov}",
  { eager: true, query: "?url", import: "default" },
) as Record<string, string>;

const docsParsers = createContentParsers(docsAssetUrls);

export const DOCS_ALL_ITEMS: Item[] = Object.entries(docsMd)
  .map(([path, raw]) => docsParsers.parseItem(path, raw))
  .filter((item): item is Item => item !== null)
  .sort((a, b) => a.order - b.order);

// Docs pages, section index pages included. `slug` is the full path under
// /docs (a section index is "start", a page is "start/quickstart"), so this
// list is flat and DOCS_SECTIONS below is the shape a sidebar wants.
export const DOCS = DOCS_ALL_ITEMS.filter((item) => !item.draft);

export function findDocsItem(slug: string): Item | undefined {
  return DOCS_ALL_ITEMS.find((item) => item.slug === slug);
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
// Built from the PUBLISHED list, never from DOCS_ALL_ITEMS, so a draft page
// stays out of navigation while its own URL keeps working. This is what a
// sidebar, a breadcrumb, and prev/next links should read; nothing else needs
// to know how the folders nest.
export const DOCS_SECTIONS: DocsSection[] = (() => {
  const sections = new Map<string, DocsSection>();
  const bySlug = (slug: string, order: number): DocsSection => {
    let section = sections.get(slug);
    if (!section) {
      // A section with no index page of its own still has to be nameable, so
      // the slug is titled until one exists.
      const title = slug.replace(/-/g, " ").replace(/^./, (char) => char.toUpperCase());
      section = { slug, path: `/docs/${slug}`, title, summary: "", order, pages: [] };
      sections.set(slug, section);
    }
    return section;
  };
  for (const item of DOCS) {
    if (!item.section) continue;
    const section = bySlug(item.section, item.sectionOrder ?? 999);
    if (isDocsSectionIndex(item)) {
      section.index = item;
      section.title = item.sectionTitle || item.title;
      section.summary = item.summary || item.desc;
      // The index page's own order IS the section's order, including an
      // explicit `order:` override in its frontmatter.
      section.order = item.order;
    } else {
      section.pages.push(item);
    }
  }
  const byOrder = (a: { order: number; slug: string }, b: { order: number; slug: string }) =>
    a.order - b.order || a.slug.localeCompare(b.slug);
  for (const section of sections.values()) section.pages.sort(byOrder);
  return [...sections.values()].sort(byOrder);
})();
