import { createContentParsers } from "./contentCore";
import type { About, Item, Kind } from "./types";

export type CatalogKind = Exclude<Kind, "docs">;

const catalogMd = import.meta.glob(
  [
    "/data/hardware/**/index.md",
    "/data/games/**/index.md",
    "/data/blog/**/index.md",
  ],
  {
    query: "?raw",
    import: "default",
    eager: true,
  },
) as Record<string, string>;

const aboutMd = import.meta.glob("/data/about.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

// Keep every catalog kind in one asset map. Some game pages intentionally use
// an absolute asset reference into a related blog post, so parsing one kind in
// isolation would turn a hashed Vite asset back into its source pathname.
export const catalogAssetUrls = import.meta.glob(
  [
    "/data/hardware/**/*.{jpg,jpeg,png,webp,svg,gif,avif,mp4,webm,mov}",
    "/data/games/**/*.{jpg,jpeg,png,webp,svg,gif,avif,mp4,webm,mov}",
    "/data/blog/**/*.{jpg,jpeg,png,webp,svg,gif,avif,mp4,webm,mov}",
    "/data/*.{jpg,jpeg,png,webp,svg,gif,avif,mp4,webm,mov}",
  ],
  { eager: true, query: "?url", import: "default" },
) as Record<string, string>;

const catalogParsers = createContentParsers(catalogAssetUrls);

// Draft previews use the same parser as the static catalogue, but only this
// domain's asset map. Keeping these entry points here prevents a catalogue
// preview from importing the documentation loader just to parse one buffer.
export function parseCatalogItem(path: string, raw: string): Item | null {
  return catalogParsers.parseItem(path, raw);
}

export function parseCatalogAboutFrom(path: string, raw: string): About {
  return catalogParsers.parseAboutFrom(path, raw);
}

export const CATALOG_ITEMS: Item[] = Object.entries(catalogMd)
  .map(([path, raw]) => parseCatalogItem(path, raw))
  .filter((item): item is Item => item !== null)
  .sort((a, b) => a.order - b.order);

// The published lists. A draft is deliberately absent from all three, which is
// what keeps it off every grid, strip, feed and the sitemap; findItem() in the
// compatibility module still resolves it, so its own URL renders and the
// editor can preview it.
export const HARDWARE = CATALOG_ITEMS.filter((item) => item.kind === "hardware" && !item.draft);
export const GAMES = CATALOG_ITEMS.filter((item) => item.kind === "game" && !item.draft);

// Blog is the one kind where recency is the order a reader expects, so it
// sorts newest first instead of by folder prefix. Two early posts carry only
// a year, so the key falls back year, then folder order breaks ties, newer
// folder first. The feeds already sort by date on their own.
const blogRecency = (item: Item) => item.date || (item.year ? `${item.year}-01-01` : "0000-00-00");
export const BLOGS = CATALOG_ITEMS
  .filter((item) => item.kind === "blog" && !item.draft)
  .sort((a, b) => {
    const dateOrder = blogRecency(b).localeCompare(blogRecency(a));
    return dateOrder !== 0 ? dateOrder : b.order - a.order;
  });

export function findCatalogItem(kind: Kind, slug: string): Item | undefined {
  return CATALOG_ITEMS.find((item) => item.kind === kind && item.slug === slug);
}

const PUBLISHED_CATALOG: Record<CatalogKind, Item[]> = {
  hardware: HARDWARE,
  game: GAMES,
  blog: BLOGS,
};

/** Published siblings for catalogue UI. Documentation is deliberately an
    empty list: docs have their own tree and never use card/modal navigation. */
export function itemsForCatalogKind(kind: Kind): Item[] {
  return kind === "docs" ? [] : PUBLISHED_CATALOG[kind];
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
  return parseCatalogAboutFrom(entry[0], entry[1]);
}

export const ABOUT: About = parseAbout();

// Content files are edited while /admin itself is open. Stop a glob update at
// this data boundary so it cannot propagate through Home/App and remount the
// editor, which would drop the current field's focus. The preview iframe is
// refreshed explicitly by Admin after a save; ordinary browsing tabs can
// reload to pick up the new static collection.
if (import.meta.hot) {
  import.meta.hot.accept(() => {});
}
