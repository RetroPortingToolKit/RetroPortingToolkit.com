// Resolves a link's href into a small, displayable preview: a kicker, a title, a
// one-line description, and (where one exists) a real image. This is the data
// behind the hover preview cards on content links. Every field comes from
// existing site content (item frontmatter, curated topics) or authored static
// copy, so a hover never triggers a fetch.

import type { Kind, Item } from "@/lib/types";
import {
  findItem,
  itemsForTopic,
  isVideoSrc,
  isYouTubeSrc,
  youtubeThumb,
} from "@/lib/content";
import { findTopic } from "@/lib/topics";
import { TOPIC_BLURBS } from "@/lib/topicPreviews";

export interface LinkPreview {
  kicker: string; // overline: "Talk", "Collection · 6 talks"
  title: string; // bold heading
  meta?: string; // venue / year line for items
  description?: string; // one-line description / topic blurb
  image?: string; // a real still, if the destination has one
  isVideo?: boolean; // the destination is a recording
  cta: string; // "View", "Watch", "Explore"
  internal: boolean; // SmartLink (in-app) vs external new tab
}

const SEG_TO_KIND: Record<string, Kind> = {
  hardware: "hardware",
  games: "game",
  blog: "blog",
};

const KIND_LABEL: Record<Kind, string> = {
  hardware: "Hardware",
  game: "Games",
  blog: "Article",
};

// Tiny inline base64 placeholders (LQIP) read as a blurry smear when scaled to
// the preview width, so they are not a usable still here.
function usable(src: string | undefined): string | undefined {
  return src && !src.startsWith("data:") ? src : undefined;
}

// The best real still for an item: a YouTube thumb for recorded talks, the
// poster when the cover is itself a video, otherwise the cover image. Returns no
// image rather than a blurry LQIP placeholder.
function itemImage(item: Item): { image?: string; isVideo: boolean } {
  const ytThumb =
    item.videoUrl && isYouTubeSrc(item.videoUrl)
      ? youtubeThumb(item.videoUrl)
      : undefined;
  const coverIsVideo = isVideoSrc(item.cover);
  const image =
    ytThumb ?? (coverIsVideo ? usable(item.poster) : usable(item.cover));
  return { image, isVideo: !!item.videoUrl || coverIsVideo };
}

function itemPreview(kind: Kind, slug: string): LinkPreview {
  const item = findItem(kind, slug);
  if (!item) {
    return { kicker: KIND_LABEL[kind], title: slug, cta: "View", internal: true };
  }
  const { image, isVideo } = itemImage(item);
  const meta = [item.venue, item.year].filter(Boolean).join(", ") || undefined;
  return {
    kicker: item.kicker || KIND_LABEL[kind],
    title: item.title,
    meta,
    description: item.desc || undefined,
    image,
    isVideo,
    cta: isVideo ? "Watch" : "View",
    internal: true,
  };
}

function topicPreview(id: string): LinkPreview | null {
  const topic = findTopic(id);
  if (!topic) return null;
  const items = itemsForTopic(topic);
  // A count summary kicker ("6 talks · 3 projects"), strongest grouping first.
  const counts: Record<Kind, number> = { hardware: 0, game: 0, blog: 0 };
  for (const it of items) counts[it.kind]++;
  const order: Kind[] = ["hardware", "game", "blog"];
  const plural: Record<Kind, [string, string]> = {
    hardware: ["platform", "platforms"],
    game: ["project", "projects"],
    blog: ["article", "articles"],
  };
  const countBits = order
    .filter((k) => counts[k] > 0)
    .map((k) => `${counts[k]} ${plural[k][counts[k] === 1 ? 0 : 1]}`);
  const kicker = ["Collection", ...countBits].join(" · ");

  // Description: the curated blurb, else derived from the real titles.
  const derived =
    items.length > 0
      ? `Includes ${items
          .slice(0, 3)
          .map((it) => it.title)
          .join(", ")}${items.length > 3 ? ", and more" : ""}.`
      : undefined;
  const description = TOPIC_BLURBS[id] || derived;

  // Lead image: the first item that carries a real still.
  let image: string | undefined;
  let isVideo = false;
  for (const it of items) {
    const r = itemImage(it);
    if (r.image) {
      image = r.image;
      isVideo = r.isVideo;
      break;
    }
  }

  return {
    kicker,
    title: topic.label,
    description,
    image,
    isVideo,
    cta: "Explore",
    internal: true,
  };
}

function externalPreview(href: string): LinkPreview | null {
  // No network at hover time, so an external link previews as a clean host
  // label. Enough to tell the visitor where the link goes before they commit.
  let host = "";
  try {
    host = new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  return {
    kicker: "External",
    title: host,
    cta: "Open original",
    internal: false,
  };
}

// Returns the preview for an href, or null if there is nothing useful to show
// (in which case the link renders as a plain link).
export function previewForHref(href: string): LinkPreview | null {
  if (!href) return null;

  if (href.startsWith("/")) {
    const parts = href.replace(/^\/+/, "").split("/");
    const seg = parts[0];
    const rest = parts.slice(1).join("/");
    if (seg === "topic" && rest) return topicPreview(rest);
    const kind = SEG_TO_KIND[seg];
    if (kind && rest) return itemPreview(kind, rest);
    return null;
  }

  if (/^https?:\/\//.test(href)) return externalPreview(href);
  return null;
}
