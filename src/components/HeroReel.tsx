import { useEffect, useRef, useState } from "react";
import { playMp4ToCanvas, type CanvasVideoHandle } from "@/lib/canvasVideo";
import {
  useAmbientMediaAllowed,
  webCodecsAvailable,
} from "@/lib/useAmbientMedia";

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
// Four initial URLs fill all twelve cells by repetition. The rest enter one at
// a time only while the video is still buffering, avoiding eleven simultaneous
// third-party requests on the successful autoplay path.
const INITIAL_POOL = POOL.slice(0, 4);

const TILES = 12; // 4x3 on desktop; CSS hides the last rows' overflow on mobile
const TICK_MS = 2600; // one tile swaps per tick

// Deterministic image pick: tile i after u updates. Primes stride the pool so
// neighboring tiles never show the same capture at the same time.
function imageFor(i: number, updates: number): string {
  if (updates === 0) return INITIAL_POOL[i % INITIAL_POOL.length];
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
  const policyAllowsMotion = useAmbientMediaAllowed();
  const live = !still;
  const [intent, setIntent] = useState<"auto" | "play" | "pause">("auto");
  // Reduced-motion/data-saving preferences suppress ambient media, while the
  // existing control remains an explicit opt-in for visitors who want it.
  const active =
    live &&
    (intent === "play" || (intent === "auto" && policyAllowsMotion));
  const [playing, setPlaying] = useState(false);
  const hasPlayed = useRef(false);
  // Safari (and some power modes) can freeze a <video> mid-play and never
  // recover. When that happens we hand the reel to the WebCodecs canvas
  // player, which decodes the mp4 frame-by-frame with no <video> element and
  // loops internally. Same approach as the original template's hero.
  const [cvFallback, setCvFallback] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cvHandle = useRef<CanvasVideoHandle | null>(null);

  // Pick the source the engine actually commits to: only engines that answer
  // "probably" for VP9 webm get it (Chrome); Safari answers "maybe" and then
  // stalls, so it gets the H.264 mp4.
  const [srcUrl] = useState(() => {
    if (typeof document === "undefined") return "/previews/hero-montage.mp4";
    const probe = document.createElement("video");
    return probe.canPlayType('video/webm; codecs="vp9"') === "probably"
      ? "/previews/hero-montage.webm"
      : "/previews/hero-montage.mp4";
  });

  // Autoplay can be denied (Low Power Mode, data saver, hidden tab). Retry
  // while it remains eligible, but honor NotAllowedError by returning to the
  // static collage. Canvas is reserved for a video that actually played and
  // then froze; it must not bypass an autoplay refusal.
  useEffect(() => {
    if (!active || cvFallback) return;
    const tryPlay = () => {
      const v = videoRef.current;
      if (v && v.paused)
        v.play().catch((err: unknown) => {
          if (
            err instanceof DOMException &&
            err.name === "NotAllowedError"
          ) {
            hasPlayed.current = false;
            setPlaying(false);
            setIntent("pause");
          }
        });
    };
    tryPlay();
    window.addEventListener("pointerdown", tryPlay, { passive: true });
    document.addEventListener("visibilitychange", tryPlay);
    return () => {
      window.removeEventListener("pointerdown", tryPlay);
      document.removeEventListener("visibilitychange", tryPlay);
    };
  }, [active, cvFallback]);

  useEffect(() => {
    if (active) return;
    hasPlayed.current = false;
    setPlaying(false);
    setCvFallback(false);
  }, [active]);

  // Freeze watchdog: if currentTime stops advancing while the video claims to
  // be playing (Safari's silent mid-play stall), switch to the canvas player.
  useEffect(() => {
    if (!active || !playing || !hasPlayed.current || cvFallback) return;
    let lastT = -1;
    let strikes = 0;
    const t = window.setInterval(() => {
      const v = videoRef.current;
      if (!v || document.hidden) return;
      if (!v.paused && !v.ended) {
        if (v.currentTime === lastT) {
          strikes += 1;
          if (strikes === 1) {
            // one free nudge before giving up on the element
            v.play().catch(() => {});
          } else if (strikes >= 2 && webCodecsAvailable()) {
            setCvFallback(true);
          }
        } else {
          strikes = 0;
        }
        lastT = v.currentTime;
      }
    }, 2000);
    return () => window.clearInterval(t);
  }, [active, playing, cvFallback]);

  // The canvas player: decodes the no-B-frame mp4 via WebCodecs and loops
  // internally; no <video>, so no autoplay policy and no Safari stalls.
  useEffect(() => {
    if (!active || !cvFallback) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    cvHandle.current = playMp4ToCanvas(canvas, "/previews/hero-montage.mp4");
    setPlaying(true);
    return () => {
      cvHandle.current?.stop();
      cvHandle.current = null;
    };
  }, [active, cvFallback]);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    // The collage keeps rotating only while an allowed/explicit video is
    // buffering. Policy-suppressed and manually paused heroes remain still.
    if (!active || playing) return;
    const t = window.setInterval(() => {
      if (document.hidden) return;
      setTick((v) => v + 1);
    }, TICK_MS);
    return () => window.clearInterval(t);
  }, [active, playing]);

  return (
    <div className="hn-hero-reel">
      <div className="hn-collage" aria-hidden="true">
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
      {active && !cvFallback && (
        <video
          ref={videoRef}
          className={"hn-reel-canvas" + (playing ? " is-playing" : "")}
          src={srcUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onPlaying={() => {
            hasPlayed.current = true;
            setPlaying(true);
          }}
          onEnded={(e) => {
            // Native loop can fail on some webm/browser combinations; force it.
            const v = e.currentTarget;
            v.currentTime = 0;
            v.play().catch(() => {});
          }}
        />
      )}
      {active && cvFallback && (
        <canvas
          ref={canvasRef}
          className="hn-reel-canvas is-playing"
          aria-hidden="true"
        />
      )}
      {live && (
        <button
          type="button"
          className="hn-reel-pause"
          aria-label={active ? "Pause background video" : "Play background video"}
          aria-pressed={!active}
          onClick={() => {
            videoRef.current?.pause();
            hasPlayed.current = false;
            setPlaying(false);
            setCvFallback(false);
            setIntent(active ? "pause" : "play");
          }}
        >
          {!active ? (
            <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M4.5 2.8v10.4L13 8z" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <rect x="3.5" y="2.8" width="3.2" height="10.4" rx="1" />
              <rect x="9.3" y="2.8" width="3.2" height="10.4" rx="1" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
