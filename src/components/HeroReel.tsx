import { useEffect, useRef, useState } from "react";

// The hero is a living collage of real gameplay captures: frames published by
// YouTube for the project's verified coverage videos (every frame below was
// reviewed as actual gameplay). Tiles crossfade one at a time on a gentle
// cadence, so the hero always reads as "a bunch of games running" without
// booting a single video player. Nothing is re-hosted.
//
// still=true (pager panes being dragged in) and prefers-reduced-motion render
// the static grid with no rotation.

// Curated capture pool: videoId/frame pairs. hq1/hq2/hq3 are YouTube's real
// frames at 25/50/75% of the video; hqdefault is its chosen key frame.
const POOL: string[] = [
  "https://i.ytimg.com/vi/Owuku0zj4As/hq2.jpg", // SMW character replacement
  "https://i.ytimg.com/vi/L36ppNkuJG0/hq1.jpg", // Tomba! (save states capture)
  "https://i.ytimg.com/vi/9AxKR_u-yu4/hq2.jpg", // SMB character replacement
  "https://i.ytimg.com/vi/tvqnW6J6KU0/hq1.jpg", // Prime Hunters 21:9
  "https://i.ytimg.com/vi/_sW-m-HaSVE/hq3.jpg", // SMB voxel 3D
  "https://i.ytimg.com/vi/Owuku0zj4As/hq1.jpg", // SMW char replacement (action)
  "https://i.ytimg.com/vi/L36ppNkuJG0/hq2.jpg", // Tomba!
  "https://i.ytimg.com/vi/tvqnW6J6KU0/hq2.jpg", // Prime Hunters 21:9
  "https://i.ytimg.com/vi/Owuku0zj4As/hqdefault.jpg", // SMW overworld
  "https://i.ytimg.com/vi/L36ppNkuJG0/hq3.jpg", // Tomba!
  "https://i.ytimg.com/vi/tvqnW6J6KU0/hq3.jpg", // Prime Hunters 21:9
];

const TILES = 12; // 4x3 on desktop; CSS hides the last rows' overflow on mobile
const TICK_MS = 2600; // one tile swaps per tick

// Deterministic image pick: tile i after u updates. Primes stride the pool so
// neighboring tiles never show the same capture at the same time.
function imageFor(i: number, updates: number): string {
  return POOL[(i * 5 + updates * 7) % POOL.length];
}

// One tile: keeps the previous capture mounted under the incoming one, which
// fades in over it. No layout shift, no flash.
function Tile({ src, delay }: { src: string; delay: number }) {
  const [layers, setLayers] = useState<string[]>([src]);
  useEffect(() => {
    setLayers((prev) => (prev[prev.length - 1] === src ? prev : [...prev.slice(-1), src]));
  }, [src]);
  return (
    <span className="hn-tile" style={{ animationDelay: `${delay}ms` }}>
      {layers.map((s) => (
        <img key={s} className="hn-tile-img" src={s} alt="" aria-hidden="true" decoding="async" />
      ))}
    </span>
  );
}

export function HeroReel({ still = false }: { still?: boolean }) {
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // The montage is the hero: it mounts whenever this pane is interactive.
  // Reduced-motion only quiets the collage rotation (the loading fallback),
  // it does not suppress the video itself.
  const live = !still;
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Autoplay can be denied (Low Power Mode, data saver, hidden tab). Retry on
  // the first gesture and whenever the tab becomes visible; until then the
  // collage carries the hero.
  useEffect(() => {
    if (!live) return;
    const tryPlay = () => {
      const v = videoRef.current;
      if (v && v.paused) v.play().catch(() => {});
    };
    window.addEventListener("pointerdown", tryPlay, { passive: true });
    document.addEventListener("visibilitychange", tryPlay);
    return () => {
      window.removeEventListener("pointerdown", tryPlay);
      document.removeEventListener("visibilitychange", tryPlay);
    };
  }, [live]);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    // The collage keeps rotating only until the montage takes over, and holds
    // still for reduced-motion users.
    if (!live || playing || reduced) return;
    const t = window.setInterval(() => {
      if (document.hidden) return;
      setTick((v) => v + 1);
    }, TICK_MS);
    return () => window.clearInterval(t);
  }, [live, playing]);

  return (
    <div className="hn-hero-reel" aria-hidden="true">
      <div className="hn-collage">
        {Array.from({ length: TILES }, (_, i) => {
          // tile i updates on ticks where tick % TILES === i
          const updates = Math.floor((tick + (TILES - 1 - i)) / TILES);
          return <Tile key={i} src={imageFor(i, updates)} delay={(i % 5) * 900} />;
        })}
      </div>
      {/* The real reel: a 27s montage of verified gameplay clips cut from the
          coverage footage (used with the channel's permission), self-hosted in
          /public/previews. It fades in over the collage once it actually
          plays, so a slow network or blocked autoplay still shows gameplay. */}
      {live && (
        <video
          ref={videoRef}
          className={"hn-reel-canvas" + (playing ? " is-playing" : "")}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onPlaying={() => setPlaying(true)}
        >
          <source src="/previews/hero-montage.webm" type="video/webm" />
          <source src="/previews/hero-montage.mp4" type="video/mp4" />
        </video>
      )}
    </div>
  );
}

export default HeroReel;
