import { Fragment } from "react";
import { PreviewLink } from "@/components/PreviewLink";
import { topicPath } from "@/lib/contentCore";
import homeData from "@data/home.json";

// Home page copy (the "About me" proof, Recognition, and Philosophy). The text
// lives in data/home.json so it is editable as content (via /admin) instead of
// code; this module turns it into the typed structures the home renders. The
// proof paragraphs are authored as markdown ([text](/path) links and
// [src](cite:keys) citations) and parsed into segments here. Both the canonical
// home and the archived HomeOld import from here.

export interface ProofSegment {
  text: string;
  topicId?: string;
  href?: string;
  cite?: string[];
}

export interface RecognitionGroup {
  label: string;
  items: { text: string; href: string }[];
}

// Parse one proof paragraph (markdown) into ordered segments. `[text](cite:a,b)`
// becomes a citation; any other `[text](href)` a (preview) link; the rest text.
function parseProof(md: string): ProofSegment[] {
  const segs: ProofSegment[] = [];
  const re = /\[([^\]]*)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md))) {
    if (m.index > last) segs.push({ text: md.slice(last, m.index) });
    const text = m[1];
    const href = m[2];
    if (href.startsWith("cite:")) {
      segs.push({ text });
    } else {
      segs.push({ text, href });
    }
    last = re.lastIndex;
  }
  if (last < md.length) segs.push({ text: md.slice(last) });
  return segs;
}

export interface HomeVideo {
  title: string;
  channel: string;
  href: string;
}

export interface TitledEntry {
  title: string;
  body: string;
}

export interface HomeStory {
  title: string;
  body: string;
  image: string;
  alt: string;
  href: string;
}

export interface HomeFeatured {
  slug: string;
  capability: string;
  cover: string;
  alt: string;
  /** show the cover instead of the clip, where motion would
      contradict what the card claims */
  still?: boolean;
  /** card headline; falls back to the game's own title */
  headline?: string;
}

export interface HomeActionCard {
  videoTitle: string;
  project: string;
  page: string;
  poster: string;
  alt: string;
  blurb: string;
  /** card headline; falls back to the video's title */
  headline?: string;
}

export interface HomeFeaturedPost {
  slug: string;
  eyebrow: string;
  title: string;
  blurb: string;
  cover: string;
  alt: string;
  /** card headline; falls back to the article title */
  headline?: string;
}

const extra = homeData as {
  constraintsIntro?: string;
  stories?: HomeStory[];
  platformNote?: { title: string; body: string };
  featured?: HomeFeatured[];
  action?: HomeActionCard[];
  featuredPost?: HomeFeaturedPost;
  sectionTitles?: Partial<Record<"proof" | "constraints" | "featured" | "action", string>>;
};

export const PROOF_PRIMARY: ProofSegment[][] = homeData.proof.map(parseProof);
export const RECOGNITION: RecognitionGroup[] =
  (homeData as { recognition?: RecognitionGroup[] }).recognition ?? [];
export const PHILOSOPHY: string[] = homeData.philosophy;
export const CONSTRAINTS_INTRO: string = extra.constraintsIntro ?? "";
export const STORIES: HomeStory[] = extra.stories ?? [];
export const PLATFORM_NOTE = extra.platformNote ?? { title: "", body: "" };
export const FEATURED: HomeFeatured[] = extra.featured ?? [];
export const ACTION: HomeActionCard[] = extra.action ?? [];
export const FEATURED_POST: HomeFeaturedPost | null = extra.featuredPost ?? null;

// Section headings live in content so the page's narrative can be rewritten
// without touching the component. Must stay in sync with the same defaults in
// scripts/vite-prerender.mjs, which mirrors these headings into the static shell.
const SECTION_TITLE_DEFAULTS = {
  proof: "A different path from emulation.",
  constraints: "Preserve the game. Replace the constraints.",
  featured: "Featured projects",
  action: "See it in action",
} as const;

export const SECTION_TITLES = {
  ...SECTION_TITLE_DEFAULTS,
  ...(extra.sectionTitles ?? {}),
};

// Pure parser for a draft home.json (proof/recognition/philosophy), used by the
// live CMS preview to render edits without touching the static import.
export function parseHome(home: { proof?: string[]; recognition?: RecognitionGroup[]; philosophy?: string[] }): {
  proof: ProofSegment[][];
  recognition: RecognitionGroup[];
  philosophy: string[];
} {
  return {
    proof: (Array.isArray(home.proof) ? home.proof : []).map((p) => parseProof(String(p))),
    recognition: Array.isArray(home.recognition) ? home.recognition : [],
    philosophy: Array.isArray(home.philosophy) ? home.philosophy.map((p) => String(p)) : [],
  };
}

export function renderSegments(segments: ProofSegment[]) {
  return segments.map((seg, i) => {
    const content = seg.topicId ? (
      <PreviewLink href={topicPath(seg.topicId)} className="topic-link">
        {seg.text}
      </PreviewLink>
    ) : seg.href ? (
      <PreviewLink href={seg.href} className="topic-link">
        {seg.text}
      </PreviewLink>
    ) : (
      seg.text
    );
    return (
      <Fragment key={i}>
        {content}
      </Fragment>
    );
  });
}
