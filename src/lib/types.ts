export type Kind = "hardware" | "game" | "blog" | "docs";

/** Docs pages: which quadrant the page is in, which is what tells a reader
    (and an agent) whether to expect an explanation, a task, a table, or a
    project write-up. */
export type DocsPageType = "concept" | "guide" | "reference" | "project";

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
  /** Not finished: kept out of every listing, feed and the sitemap, but still
      reachable at its URL so the editor can preview it. */
  draft?: boolean;
  /** Byline for this page. Falls back to the site author when absent. */
  author?: string;
  /** Avatar URL for the byline; a monogram is drawn when absent. */
  authorAvatar?: string;
  /** One-line bio under the sign-off. */
  authorBio?: string;
  year?: string;
  duration?: string;
  date?: string;
  /** Maturity label from a small controlled vocabulary
      (Released | Playable alpha | Partial | Tech demo | Research). */
  status?: string;
  /** Availability, separate from maturity
      (Public build | Source only | No public release | Web). */
  availability?: string;
  /** ISO date the page's claims were last checked against the sources. */
  verified?: string;
  /** Who maintains it: the core team or a community project built on the toolkit. */
  provenance?: "core" | "community";
  /** Games items: slug of the hardware ecosystem page this project runs on. */
  platform?: string;
  /** "Beta" | "Alpha": how far along a platform ecosystem is */
  maturity?: string;
  /** first commit in the project's own repository */
  added?: string;
  /** last push to the project's own repository */
  updated?: string;
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
  /** Docs pages: the section this page sits in, taken from the folder path and
      therefore always the first segment of `slug`. A section's own index page
      carries its own slug here. Absent on every other kind. */
  section?: string;
  /** Docs pages: the section folder's numeric prefix, so a sidebar can order
      sections without re-walking the tree. */
  sectionOrder?: number;
  /** Docs section index pages: the section's display name in navigation, when
      it should differ from the page title. */
  sectionTitle?: string;
  /** Docs pages: the one sentence that sits under the H1 and describes the
      page to a reader choosing between pages. Falls back to `desc`. */
  summary?: string;
  /** Docs pages: concept | guide | reference | project. */
  pageType?: DocsPageType;
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

