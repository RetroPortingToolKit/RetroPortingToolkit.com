import {
  DOCS,
  DOCS_SECTIONS,
  isDocsSectionIndex,
  pathFor,
  type DocsSection,
} from "@/lib/content";
import type { Item } from "@/lib/types";

// Everything the docs chrome needs to know about ORDER lives here: the sidebar,
// the breadcrumbs and the prev/next links all read the same list, so they can
// never disagree about what comes after what.
//
// Derived from DOCS_SECTIONS, never from allItems. DOCS_SECTIONS is built from
// the published list, so a draft page cannot appear in navigation while its own
// URL keeps working. See scratchpad HANDOFF_CORE section 3.

export interface DocsNavEntry {
  /** full slug under /docs: "start" or "start/quickstart" */
  slug: string;
  /** "/docs/start/quickstart" */
  path: string;
  title: string;
  /** the one-line summary, falling back to desc, else "" */
  summary: string;
  section: DocsSection;
  /** true for the section's own index page */
  isSectionIndex: boolean;
}

function summaryOf(item: Item): string {
  return item.summary || item.desc || "";
}

function entryFor(item: Item, section: DocsSection): DocsNavEntry {
  return {
    slug: item.slug,
    path: pathFor("docs", item.slug),
    title: item.title,
    summary: summaryOf(item),
    section,
    isSectionIndex: isDocsSectionIndex(item),
  };
}

/**
 * Every published docs page in sidebar order: each section's own index page
 * first, then its pages, then on to the next section. This is reading order,
 * which is what prev/next follows across a section boundary.
 */
export const DOCS_ORDER: DocsNavEntry[] = DOCS_SECTIONS.flatMap((section) => {
  const entries: DocsNavEntry[] = [];
  if (section.index) entries.push(entryFor(section.index, section));
  for (const page of section.pages) entries.push(entryFor(page, section));
  return entries;
});

/** The pages of one section in sidebar order, index page included. */
export function entriesInSection(section: DocsSection): DocsNavEntry[] {
  return DOCS_ORDER.filter((e) => e.section.slug === section.slug);
}

/** The section a slug belongs to, by its first path segment. */
export function sectionForSlug(slug: string): DocsSection | undefined {
  const head = slug.split("/")[0];
  return DOCS_SECTIONS.find((s) => s.slug === head);
}

/**
 * The pages either side of `slug` in reading order. Both are undefined for a
 * page that is not in navigation at all, which is the case for a draft being
 * previewed in the editor: it has an address but no place in the order yet.
 */
export function neighbours(slug: string): {
  prev?: DocsNavEntry;
  next?: DocsNavEntry;
} {
  const i = DOCS_ORDER.findIndex((e) => e.slug === slug);
  if (i < 0) return {};
  return { prev: DOCS_ORDER[i - 1], next: DOCS_ORDER[i + 1] };
}

// The three links above the card grid on /docs. Each names a destination rather
// than a page title, and each is resolved against the published pages at build
// time: a link whose page has not been written yet is simply not rendered, so
// the landing page never points at a 404. Add the alternatives a page might
// plausibly land under, most likely first.
const QUICK_LINKS: { label: string; slugs: string[] }[] = [
  { label: "Developer quickstart", slugs: ["start/quickstart", "guides/quickstart"] },
  {
    label: "What is static recompilation",
    slugs: [
      "start/what-is-static-recompilation",
      "concepts/what-is-static-recompilation",
    ],
  },
  {
    label: "For agents",
    slugs: ["agents/start-here", "agents", "agents/for-agents"],
  },
];

export interface DocsQuickLink {
  label: string;
  path: string;
  summary: string;
}

export const DOCS_QUICK_LINKS: DocsQuickLink[] = QUICK_LINKS.flatMap(
  ({ label, slugs }) => {
    for (const slug of slugs) {
      const item = DOCS.find((i) => i.slug === slug);
      if (item) {
        return [{ label, path: pathFor("docs", slug), summary: summaryOf(item) }];
      }
    }
    return [];
  },
);
