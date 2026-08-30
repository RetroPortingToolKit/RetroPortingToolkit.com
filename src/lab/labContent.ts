import { BLOGS, GAMES, HARDWARE } from "@/lib/catalogContent";
import { chipColorFor, CHIP_PALETTE } from "@/lib/chipColor";
import { LQIP } from "@/generated/lqip";
import { previewFor } from "@/generated/previews";
import type { Item } from "@/lib/types";

// Media pulled from the real site content so the lab scenes show actual work,
// rendered as the same card types the home page uses (projects, talks,
// articles). Project clips play as local video; talks/articles use their cover
// image, self-hosted under /lab-media so textures never hit a CORS wall or
// depend on an external host (see scripts/gen-lab-media.sh).

export type LabKind = "hardware" | "game" | "blog";

export interface LabMedia {
  src: string;
  srcSet?: string;
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
  /** How the card should LOOK, when that differs from what it links to. A row
      of game cards featuring one article should not sprout a news card in the
      middle of it: the row has one visual language, the link still goes to the
      article. Defaults to `kind`.

      Everything visual in SpatialCard reads `look ?? kind`: the variant class,
      the kicker chip, and the play badge. Only navigation reads `kind`. Adding
      a fourth appearance branch means adding it to that list. */
  look?: LabKind;
  video: boolean;
  // project shelf ("side" = fun side projects, shown separately on the tab)
  group?: string;
  /** small coloured labels on the card, e.g. "12 games", "Beta" */
  chips?: { label: string; color: string }[];
  /** sort key for the platform grid */
  weight?: number;
  /** project repository dates, for the games sort control */
  added?: string;
  updated?: string;
}

// Same colored-kicker logic as the site cards, with a palette fallback so every
// lab card gets a chip color even for kickers without a fixed mapping.
const colorFor = (p: Item, i: number): string =>
  p.kickerColor ?? chipColorFor(p.kicker) ?? CHIP_PALETTE[i % CHIP_PALETTE.length];

// Generated cover art: a vibrant diagonal gradient with oversized initials and
// a scanline sheen, built as an inline SVG data URI. Every card gets real cover
// art this way even before a screenshot or capture exists; an authored `cover:`
// in frontmatter always wins.
export function svgCover(title: string, kicker: string, color: string): string {
  const esc = (v: string) =>
    v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  // Wrap the title onto up to three lines so the cover carries the game's
  // NAME, not an abbreviation. Initials read as a missing image; the title set
  // properly reads as a designed cover, which is what a game with no
  // screenshot in existence still deserves.
  const words = title.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > 15 && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
    if (lines.length === 3) break;
  }
  if (line && lines.length < 3) lines.push(line);
  const size = lines.length >= 3 ? 64 : lines.length === 2 ? 78 : 92;
  const blockH = lines.length * size * 1.06;
  const startY = 360 / 2 - blockH / 2 + size * 0.82;
  const text = lines
    .map(
      (l, i) =>
        `<text x="44" y="${Math.round(startY + i * size * 1.06)}" font-family="ui-rounded,system-ui,-apple-system,sans-serif" font-size="${size}" font-weight="800" fill="#fff" letter-spacing="-2">${esc(l)}</text>`,
    )
    .join("");
  const scan = Array.from(
    { length: 12 },
    (_, r) => `<rect x="0" y="${r * 30}" width="640" height="15" fill="#000" opacity="0.06"/>`,
  ).join("");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${esc(color)}"/><stop offset="1" stop-color="#0d0f17"/></linearGradient>` +
    `<radialGradient id="h" cx="0.25" cy="0.2" r="0.9">` +
    `<stop offset="0" stop-color="#fff" stop-opacity="0.26"/><stop offset="0.6" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>` +
    `<rect width="640" height="360" fill="url(#g)"/>` +
    scan +
    `<rect width="640" height="360" fill="url(#h)"/>` +
    `<text x="44" y="62" font-family="ui-rounded,system-ui,-apple-system,sans-serif" font-size="22" font-weight="700" fill="#fff" opacity="0.72" letter-spacing="3">${esc(kicker.toUpperCase())}</text>` +
    text +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// Cards use the item's own cover when one exists (authored in frontmatter and
// resolved by the content loader, e.g. a real gameplay still), then a dropped-in
// /lab-media capture, then the generated cover art above.
function staticMedia(p: Item, i: number, kind: LabKind, dir: string): LabMedia {
  const labSrc = `/lab-media/${dir}/${p.slug}.webp`;
  const color = colorFor(p, i);
  const src = p.cover ?? (LQIP[labSrc] ? labSrc : svgCover(p.title, p.kicker, color));
  return {
    src,
    srcSet: p.coverSrcSet,
    lqip: p.coverLqip ?? LQIP[src],
    slug: p.slug,
    title: p.title,
    kicker: p.kicker,
    desc: p.desc,
    tags: p.tags,
    color,
    kind,
    video: false,
    group: p.group,
    chips: kind === "game" ? [{ label: p.kicker, color }] : undefined,
    added: p.added,
    updated: p.updated,
  };
}

// Game and platform cards animate whenever a clip exists for the slug: the
// card shows the real thing moving instead of a still. News cards stay static
// on purpose, that section reads as a regular blog.
function projectMedia(p: Item, i: number, kind: LabKind, dir: string): LabMedia {
  const clip = previewFor(p.slug);
  if (!clip) return staticMedia(p, i, kind, dir);
  return {
    src: clip.mp4,
    poster: clip.poster,
    slug: p.slug,
    title: p.title,
    kicker: p.kicker,
    desc: p.desc,
    tags: p.tags,
    color: colorFor(p, i),
    kind,
    video: true,
    group: p.group,
    chips: kind === "game" ? [{ label: p.kicker, color: colorFor(p, i) }] : undefined,
    added: p.added,
    updated: p.updated,
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

// How many game pages name this platform: the number a reader actually wants.
const GAME_COUNT: Record<string, number> = {};
for (const g of GAMES) {
  if (g.platform) GAME_COUNT[g.platform] = (GAME_COUNT[g.platform] ?? 0) + 1;
}

function hardwareMedia(p: Item, i: number): LabMedia {
  const media = projectMedia(p, i, "hardware", "hardware");
  const n = GAME_COUNT[p.slug] ?? 0;
  // Catalogue size takes the platform's own colour; maturity gets a fixed
  // pair so Beta and Alpha read the same way on every card.
  const MATURITY: Record<string, string> = {
    Beta: "#15803d",
    Alpha: "#b45309",
  };
  const chips: { label: string; color: string }[] = [];
  if (n > 0) {
    chips.push({ label: `${n} ${n === 1 ? "game" : "games"}`, color: "#475569" });
  }
  if (p.maturity) {
    chips.push({ label: p.maturity, color: MATURITY[p.maturity] ?? colorFor(p, i) });
  }
  return { ...media, chips, weight: n };
}

// Full per-kind decks for the tab pages, in authored (NN_ prefix) order so the
// group headings the tab grids build from `group` stay in the authored order.
export const labAll: Record<LabKind, LabMedia[]> = {
  // One blended list, most-supported platform first.
  hardware: [...HARDWARE]
    .map((p, i) => hardwareMedia(p, i))
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0)),
  game: GAMES.map((p, i) => projectMedia(p, i, "game", "game")),
  blog: BLOGS.map(blogMedia),
};
