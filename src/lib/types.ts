export type Kind = "hardware" | "game" | "blog";

export interface TopicItemRef {
  kind: Kind;
  slug: string;
}

export interface Topic {
  id: string;
  label: string;
  keywords: string[];
  kinds?: Kind[];
  items?: TopicItemRef[];
}

export interface LinkRef {
  label: string;
  href: string;
}

export interface GalleryItem {
  src: string;
  /** small static poster for video items (thumbnails, video poster attr) */
  poster?: string;
  // H.264 MP4 fallback when `src` is a WebM (Safari / Vision Pro safety)
  srcFallback?: string;
  // tiny base64 placeholder shown blurred while the asset loads
  lqip?: string;
  caption?: string;
}

export interface Item {
  kind: Kind;
  slug: string;
  title: string;
  kicker: string;
  kickerColor?: string;
  desc: string;
  cover?: string;
  // H.264 MP4 fallback when `cover` is a WebM video
  coverFallback?: string;
  // tiny base64 placeholder for the cover, shown blurred while it loads
  coverLqip?: string;
  coverCaption?: string;
  poster?: string;
  posterLqip?: string;
  gallery: GalleryItem[];
  links: LinkRef[];
  body: string;
  order: number;
  meta: string[];
  tags: string[];
  featured?: boolean;
  group?: string;
  venue?: string;
  year?: string;
  duration?: string;
  date?: string;
  /** Normalized maturity label (e.g. "Mature", "Alpha", "Tech demo", "Research"). */
  status?: string;
  /** Who maintains it: the core team or a community project built on the toolkit. */
  provenance?: "core" | "community";
  /** Games items: slug of the hardware ecosystem page this project runs on. */
  platform?: string;
  /** Hardware items: the original processor architecture (e.g. "MIPS R3000A"). */
  arch?: string;
  /** Canonical source repository URL. */
  repo?: string;
  videoUrl?: string;
  coverBgSize?: string;
  coverBgPos?: string;
  /** Blog entries: a live interactive embed (iframe URL) shown in the work pane */
  demo?: string;
  /** Blog entries: force the layout. Default auto -> "split" if a demo/gallery exists, else "article" */
  layout?: "split" | "article";
  /** Blog cards: opt in to a motion preview from /previews/<slug>.{mp4,webp} (a real recorded clip).
      Implied for posts with a `demo`; set explicitly for body-only posts that still have a clip. */
  preview?: boolean;
}

export interface About {
  eyebrow: string;
  role: string;
  headerName: string;
  heroTitle: string;
  tagline: string;
  bio: string;
  locations: string[];
  email: string;
  videoBackground?: string;
  videoBackgroundFallback?: string;
}

