import { useEffect, useRef, useState } from "react";

// The hero plays a rolling gameplay reel built from the project's verified
// YouTube coverage: each clip shows ~3 seconds of a different recompiled game,
// then crossfades to the next. Clips are embedded YouTube players (muted,
// chromeless), double-buffered so the next clip is already playing off-screen
// when the crossfade happens. No video files ship with the site and nothing is
// re-hosted; the reel is the coverage itself.
//
// still=true (pager panes being dragged in) and prefers-reduced-motion render
// only the static poster frame.

interface Clip {
  id: string; // YouTube video id
  start: number; // seconds into the video where gameplay is on screen
}

// Verified coverage videos (Video Game Esoterica + Gamemaster1379).
const CLIPS: Clip[] = [
  { id: "sbqPnJhb3uk", start: 120 }, // Tomba!
  { id: "XRwKZ0_8u-c", start: 150 }, // Mega Man X (SNES)
  { id: "FFUglxqa_eI", start: 95 }, // Metroid Prime Hunters
  { id: "IXMHXC2BLSc", start: 180 }, // Mega Man X6
  { id: "tvqnW6J6KU0", start: 60 }, // Prime Hunters 21:9
  { id: "Rbh5wKb112A", start: 120 }, // Mega Man X4
  { id: "L36ppNkuJG0", start: 30 }, // Save states & rewind showcase
];

const SLIDE_MS = 3000;
const FADE_MS = 450;

function embedUrl(c: Clip): string {
  const p = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    controls: "0",
    start: String(c.start),
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
    iv_load_policy: "3",
    disablekb: "1",
    fs: "0",
    loop: "1",
    playlist: c.id, // loop needs playlist=id, keeps a slow network from ending a clip early
  });
  return `https://www.youtube.com/embed/${c.id}?${p.toString()}`;
}

function thumb(c: Clip): string {
  return `https://i.ytimg.com/vi/${c.id}/hqdefault.jpg`;
}

export function HeroReel({ still = false }: { still?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const live = !still && !reduced;

  // A 16:9 element sized to COVER the hero box (iframes have no object-fit).
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const scale = Math.max(r.width / 16, r.height / 9);
      // overscan ~15% so YouTube's edge chrome never peeks in
      setSize({ w: 16 * scale * 1.15, h: 9 * scale * 1.15 });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Advance the reel; hold while the tab is hidden so background tabs don't
  // churn through players.
  useEffect(() => {
    if (!live) return;
    const t = window.setInterval(() => {
      if (document.hidden) return;
      setI((v) => v + 1);
    }, SLIDE_MS);
    return () => window.clearInterval(t);
  }, [live]);

  const cur = CLIPS[i % CLIPS.length];

  // Three layers keyed by ABSOLUTE index: on advance the incoming frame keeps
  // its DOM node (it was preloading invisibly and is already playing), the
  // outgoing frame keeps its node and fades to 0, and only the frame beyond
  // that unmounts, which is invisible anyway. Net effect: a real crossfade.
  const frame = (abs: number, visible: boolean) => {
    if (abs < 0 || !size) return null;
    const c = CLIPS[abs % CLIPS.length];
    return (
      <iframe
        key={abs}
        className="hn-reel-embed"
        style={{
          width: size.w,
          height: size.h,
          opacity: visible ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease`,
        }}
        src={embedUrl(c)}
        title=""
        aria-hidden="true"
        tabIndex={-1}
        allow="autoplay; encrypted-media"
      />
    );
  };

  return (
    <div className="hn-hero-reel" ref={rootRef}>
      {/* instant paint + the only layer in still/reduced-motion mode */}
      <img
        className="hn-reel-poster"
        src={thumb(cur)}
        alt=""
        aria-hidden="true"
        decoding="async"
      />
      {live && frame(i - 1, false)}
      {live && frame(i, true)}
      {live && frame(i + 1, false)}
    </div>
  );
}

export default HeroReel;
