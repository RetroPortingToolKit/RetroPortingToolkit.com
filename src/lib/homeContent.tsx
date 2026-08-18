import { Fragment } from "react";
import { PreviewLink } from "@/components/PreviewLink";
import { topicPath } from "@/lib/content";
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

const extra = homeData as {
  videos?: HomeVideo[];
  capabilities?: TitledEntry[];
  pillars?: TitledEntry[];
  transforms?: TitledEntry[];
  thesis?: string[];
};

export const PROOF_PRIMARY: ProofSegment[][] = homeData.proof.map(parseProof);
export const RECOGNITION: RecognitionGroup[] = homeData.recognition;
export const PHILOSOPHY: string[] = homeData.philosophy;
export const VIDEOS: HomeVideo[] = extra.videos ?? [];
export const CAPABILITIES: TitledEntry[] = extra.capabilities ?? [];
export const PILLARS: TitledEntry[] = extra.pillars ?? [];
export const TRANSFORMS: TitledEntry[] = extra.transforms ?? [];
export const THESIS: string[] = extra.thesis ?? [];

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
