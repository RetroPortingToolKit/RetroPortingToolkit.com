import { useEffect, useRef, useState } from "react";
import { HERO_MONTAGE_V } from "@/generated/heroMontageVersion";
import { playMp4ToCanvas, WEBCODECS_OK } from "@/lib/canvasVideo";

// The hero can play a single pre-rendered "sizzle reel" behind the headline,
// via a native <video> (HW-decodes smoothly and autoplays everywhere including
// Safari). This template ships without that media: HERO_MEDIA is off, so the
// component renders nothing and the hero falls back to its plain background.
// Drop the encodes into /public/previews, flip HERO_MEDIA to true, and the
// responsive tiers below light up.
//
// Responsive tiers keep the bytes and the FRAMING matched to the device:
//   - portrait phones: a dedicated 9:16 edit (gen-hero-montage-portrait.sh) --
//     a landscape reel can't be made to look right on a portrait screen (cover
//     is absurdly zoomed, letterbox/blur reads as filler), so phones get their
//     own cut of portrait-friendly segments, played full-bleed.
//   - large desktop (>=1536px, fine pointer): 4K landscape
//   - iPad / laptop / mid screens:            1440p landscape
//   - small landscape screens:                 720p landscape
// VP9 WebM first for efficiency, H.264 mp4 as the universal fallback. The video
// is also lazy: the source attaches when the page goes idle after first paint,
// so the (instant) poster paints first and the stream never blocks load.
// No hero reel media ships with this template. Set to true once the files
// named below exist under /public/previews.
const HERO_MEDIA: boolean = false;

const V = HERO_MONTAGE_V;

const LANDSCAPE = {
  poster: `/previews/hero-montage.webp?v=${V}`,
  mp4: `/previews/hero-montage.mp4?v=${V}`,
  webm4k: `/previews/hero-montage-4k.webm?v=${V}`,
  webm1440: `/previews/hero-montage-1440.webm?v=${V}`,
  webm720: `/previews/hero-montage-720.webm?v=${V}`,
};
const PORTRAIT = {
  poster: `/previews/hero-montage-portrait.webp?v=${V}`,
  mp4: `/previews/hero-montage-portrait.mp4?v=${V}`,
  webm: `/previews/hero-montage-portrait.webm?v=${V}`,
};

const PHONE_PORTRAIT_MQ = "(orientation: portrait) and (max-width: 700px)";

// Tier ladder for the stall watchdog: if the stream starves mid-play (slow
// link, heavy 4K VP9 decode), step down a rung and resume where we were.
const LANDSCAPE_LADDER = [LANDSCAPE.webm4k, LANDSCAPE.webm1440, LANDSCAPE.webm720];

function isPhonePortrait() {
  return typeof window !== "undefined" && window.matchMedia(PHONE_PORTRAIT_MQ).matches;
}

function pickLandscapeWebm() {
  if (typeof window === "undefined") return LANDSCAPE.webm1440;
  const mm = (q: string) => window.matchMedia(q).matches;
  if (mm("(min-width: 1536px) and (pointer: fine)")) return LANDSCAPE.webm4k; // large desktop only
  if (mm("(max-width: 640px)")) return LANDSCAPE.webm720; // small landscape
  return LANDSCAPE.webm1440; // iPad / laptop / mid
}

function pickSrc(): { webm: string; mp4: string } {
  return isPhonePortrait()
    ? { webm: PORTRAIT.webm, mp4: PORTRAIT.mp4 }
    : { webm: pickLandscapeWebm(), mp4: LANDSCAPE.mp4 };
}

export function HeroReel({ still = false }: { still?: boolean } = {}) {
  if (!HERO_MEDIA) return null;

  // SSR renders the landscape poster; the real orientation is resolved on mount
  // (and tracked across rotation).
  const [portrait, setPortrait] = useState(false);
  // Sources are present from the FIRST render: Safari's native autoplay path
  // (muted + playsinline + autoplay attr on an element inserted WITH sources)
  // is far more permissive than a later scripted load()/play(), which is what
  // the old idle-time lazy attach turned it into.
  const [src, setSrc] = useState<{ webm: string; mp4: string } | null>(() =>
    still ? null : pickSrc(),
  );
  // The <video> is kept invisible until 'playing' actually fires: when Safari
  // blocks autoplay it draws a play glyph INSIDE the element (and modern
  // Safari ignores the -webkit-media-controls hide), so a blocked reel must
  // show the clean poster underneath instead of the video element at all.
  const [playing, setPlaying] = useState(false);
  // Safari Low Power Mode rejects even muted autoplay at the policy level
  // (NotAllowedError). The reel must still autoplay, so it falls back to the
  // cards' WebCodecs path: JS-decoding the mp4 onto a <canvas> is not "media
  // playback", so no autoplay policy applies. (?cv=1 forces it for testing.)
  const [cvFallback, setCvFallback] = useState(
    () => typeof location !== "undefined" && /[?&]cv=1/.test(location.search),
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const mq = window.matchMedia(PHONE_PORTRAIT_MQ);
    const apply = () => setPortrait(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Re-resolve on rotation / still-mode change; identical sources keep the
  // same object so the <video> never remounts needlessly.
  useEffect(() => {
    const next = still ? null : pickSrc();
    setSrc((prev) => (prev?.webm === next?.webm ? prev : next));
  }, [portrait, still]);

  // Once the source is attached (or swapped on rotation), load + nudge autoplay.
  // Safari blocks autoplay under Low Power Mode / per-site auto-play settings
  // (the reel would sit frozen on its first frame): retry on the first user
  // gesture (which grants playback) and whenever the tab becomes visible.
  useEffect(() => {
    if (!src || cvFallback) return;
    const v = videoRef.current;
    if (!v) return;
    // Safari is stricter about the muted PROPERTY than the attribute when
    // play() is called from script.
    v.muted = true;
    v.load();
    let done = false;
    const detach = () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
      window.removeEventListener("touchend", onGesture);
      document.removeEventListener("visibilitychange", onVis);
    };
    const tryPlay = () => {
      if (done) return;
      v.play()
        .then(() => {
          done = true;
          detach();
        })
        .catch((err: unknown) => {
          // NotAllowedError = autoplay policy (Low Power Mode): switch to the
          // WebCodecs canvas immediately so the reel runs without a gesture.
          if (
            WEBCODECS_OK &&
            err instanceof DOMException &&
            err.name === "NotAllowedError"
          ) {
            done = true;
            detach();
            setCvFallback(true);
          }
        });
    };
    const onGesture = () => tryPlay();
    const onVis = () => {
      if (!document.hidden) tryPlay();
    };
    window.addEventListener("pointerdown", onGesture, { passive: true });
    window.addEventListener("keydown", onGesture);
    window.addEventListener("touchend", onGesture, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    tryPlay();
    return () => {
      done = true;
      detach();
    };
  }, [src, cvFallback]);

  // Stall watchdog: a reel that freezes mid-loop is a buffer underrun or a
  // decoder that can't keep up. If 'waiting'/'stalled' persists ~2.5s, step
  // down one webm tier and resume from the same timestamp.
  useEffect(() => {
    if (!src || cvFallback) return;
    const v = videoRef.current;
    if (!v) return;
    let timer = 0;
    const downshift = () => {
      const idx = LANDSCAPE_LADDER.indexOf(src.webm);
      if (idx < 0 || idx >= LANDSCAPE_LADDER.length - 1) return; // portrait or floor
      const at = v.currentTime;
      setSrc({ webm: LANDSCAPE_LADDER[idx + 1], mp4: src.mp4 });
      // the key change remounts the element; restore position on the next one
      requestAnimationFrame(() => {
        const nv = videoRef.current;
        if (nv && Number.isFinite(at)) {
          const seek = () => {
            nv.currentTime = at;
            nv.removeEventListener("loadedmetadata", seek);
          };
          nv.addEventListener("loadedmetadata", seek);
        }
      });
    };
    const arm = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(downshift, 2500);
    };
    const disarm = () => window.clearTimeout(timer);
    v.addEventListener("waiting", arm);
    v.addEventListener("stalled", arm);
    v.addEventListener("playing", disarm);
    v.addEventListener("timeupdate", disarm);
    return () => {
      disarm();
      v.removeEventListener("waiting", arm);
      v.removeEventListener("stalled", arm);
      v.removeEventListener("playing", disarm);
      v.removeEventListener("timeupdate", disarm);
    };
  }, [src, cvFallback]);

  // LPM path: decode the 1440p no-B-frame mp4 straight onto the canvas.
  useEffect(() => {
    if (!cvFallback || !src) return;
    const canvas = cvRef.current;
    if (!canvas) return;
    const handle = playMp4ToCanvas(canvas, src.mp4);
    return () => handle.stop();
  }, [cvFallback, src]);

  const poster = portrait ? PORTRAIT.poster : LANDSCAPE.poster;

  return (
    <div className="hn-hero-reel">
      <img
        className="hn-reel-poster"
        src={poster}
        alt=""
        aria-hidden="true"
        decoding="async"
      />
      {cvFallback && (
        <canvas
          ref={cvRef}
          className="hn-reel-canvas is-playing"
          aria-hidden="true"
        />
      )}
      {!cvFallback && (
      <video
        key={src ? src.webm : "idle"}
        ref={videoRef}
        className={"hn-reel-canvas" + (playing ? " is-playing" : "")}
        autoPlay
        muted
        loop
        playsInline
        preload={src ? "auto" : "none"}
        aria-hidden="true"
        onPlaying={() => setPlaying(true)}
      >
        {src && <source src={src.webm} type="video/webm" />}
        {src && <source src={src.mp4} type="video/mp4" />}
      </video>
      )}
    </div>
  );
}
