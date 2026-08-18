import { HARDWARE, SOFTWARE, BLOGS } from "@/lib/content";
import { chipColorFor, CHIP_PALETTE } from "@/lib/chipColor";
import { LQIP } from "@/generated/lqip";
import type { Item } from "@/lib/types";

// Media pulled from the real site content so the lab scenes show actual work,
// rendered as the same card types the home page uses (projects, talks,
// articles). Project clips play as local video; talks/articles use their cover
// image, self-hosted under /lab-media so textures never hit a CORS wall or
// depend on an external host (see scripts/gen-lab-media.sh).

export type LabKind = "hardware" | "software" | "blog";

export interface LabMedia {
  src: string;
  // H.264 MP4 fallback when `src` is a WebM video (Safari / Vision Pro)
  srcFallback?: string;
  // still image shown when the card is not the focused one, so only a few
  // videos decode at a time
  poster?: string;
  // tiny blurred placeholder shown while the card media loads
  lqip?: string;
  // USDZ card for the <model> element (true 3D on Apple Vision Pro)
  usdz?: string;
  slug: string;
  title: string;
  kicker: string;
  desc: string;
  tags?: string[];
  color: string;
  kind: LabKind;
  video: boolean;
  // project shelf ("side" = fun side projects, shown separately on the tab)
  group?: string;
}

// Same colored-kicker logic as the site cards, with a palette fallback so every
// lab card gets a chip color even for kickers without a fixed mapping.
const colorFor = (p: Item, i: number): string =>
  p.kickerColor ?? chipColorFor(p.kicker) ?? CHIP_PALETTE[i % CHIP_PALETTE.length];

// Cards use the item's own cover when one exists (authored in frontmatter and
// resolved by the content loader); items without one fall back to the
// /lab-media convention so generated covers can be dropped in later without a
// content change. Cards with neither render their chip + title over the card
// color, which is the intended look until real capture media lands.
function staticMedia(p: Item, i: number, kind: LabKind, dir: string): LabMedia {
  const src = p.cover ?? `/lab-media/${dir}/${p.slug}.webp`;
  return {
    src,
    lqip: p.coverLqip ?? LQIP[src],
    slug: p.slug,
    title: p.title,
    kicker: p.kicker,
    desc: p.desc,
    tags: p.tags,
    color: colorFor(p, i),
    kind,
    video: false,
    group: p.group,
  };
}

// Blog cards: a post with a live demo gets a MOTION preview (a tiny H.264 clip of the real thing,
// decoded to canvas like a project card, with a real-screenshot poster at /previews/<slug>.webp).
// Body-only posts fall back to a static cover.
function blogMedia(p: Item, i: number): LabMedia {
  if (p.demo || p.preview) {
    return {
      src: `/previews/${p.slug}.mp4`,
      poster: `/previews/${p.slug}.webp`,
      slug: p.slug,
      title: p.title,
      kicker: p.kicker,
      desc: p.desc,
      tags: p.tags,
      color: colorFor(p, i),
      kind: "blog",
      video: true,
      group: p.group,
    };
  }
  return staticMedia(p, i, "blog", "blog");
}

// Per-kind decks for the home strips (featured items only, falling back to the
// full list when nothing is flagged featured).
const featuredOf = <T extends { featured?: boolean }>(list: T[]): T[] => {
  const f = list.filter((x) => x.featured);
  return f.length ? f : list;
};

export const labHardware: LabMedia[] = featuredOf(HARDWARE).map((p, i) =>
  staticMedia(p, i, "hardware", "hardware"),
);
export const labSoftware: LabMedia[] = featuredOf(SOFTWARE).map((p, i) =>
  staticMedia(p, i, "software", "software"),
);
export const labBlog: LabMedia[] = featuredOf(BLOGS).map(blogMedia);

// Full per-kind decks for the tab pages, in authored (NN_ prefix) order so the
// group headings the tab grids build from `group` stay in the authored order.
export const labAll: Record<LabKind, LabMedia[]> = {
  hardware: HARDWARE.map((p, i) => staticMedia(p, i, "hardware", "hardware")),
  software: SOFTWARE.map((p, i) => staticMedia(p, i, "software", "software")),
  blog: BLOGS.map(blogMedia),
};
