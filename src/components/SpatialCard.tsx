import { useCallback, useEffect, useRef, useState } from "react";
import type { LabMedia } from "@/lab/labContent";
import { useAutoplayVideo } from "@/lib/useAutoplayVideo";
import { playMp4ToCanvas, WEBCODECS_OK } from "@/lib/canvasVideo";

// The card shows its animated cover everywhere, including visionOS. We tried the
// <model> element (inline USDZ) for real depth, but on Vision Pro it renders a
// *static* USDZ (no animation) that only recedes behind the page surface -- not
// the layered, animated card we want, and it read as a rotatable image. visionOS
// renders the page flat (CSS 3D is monoscopic there; real depth would need a
// WebGL/WebGPU rebuild), so the card is the clean animated "floating iPad" card
// with the system gaze highlight.

function PlayBadge() {
  return (
    <span className="tvcard-play" aria-hidden="true">
      <svg viewBox="0 0 16 16" fill="none">
        <path d="M5 3.5L12 8L5 12.5V3.5Z" fill="currentColor" />
      </svg>
    </span>
  );
}

// A DOM card with the Apple-TV focus effect: on mouse hover it floats, tilts in
// CSS 3D toward the pointer, the inner layers parallax, and a specular sheen
// tracks the cursor. Clean white-on-gray (Apple); plain DOM video that animates
// everywhere, including the headset (visionOS renders the page flat).
export function SpatialCard({
  media,
  onOpen,
  still = false,
}: {
  media: LabMedia;
  onOpen: (m: LabMedia) => void;
  /** Poster-only render (no WebCodecs, no <video>): used for pager panes being
      dragged into view, so a gesture never spins up video decoders. The poster
      IS the clip's first frame, so the post-commit handoff is seamless. */
  still?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const vref = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // the crisp webp poster shows instantly behind the cover
  const [ready, setReady] = useState(false);

  // Primary path: decode the preview MP4 into a <canvas> via WebCodecs -- no
  // <video> element, so Safari's autoplay policy never applies and it animates
  // on load. Where WebCodecs is unavailable, the <video> fallback below runs.
  // Decode the clip into a <canvas> with WebCodecs: Safari refuses to autoplay
  // a grid of <video> elements, and this path has no video element for its
  // policy to apply to. The <video> fallback below covers browsers without
  // WebCodecs.
  const useCanvas = media.video && WEBCODECS_OK && !still;
  const [near, setNear] = useState(false);

  // Only decode while the card is on (or near) screen -- WebCodecs decoders are
  // not free like a paused <video>, so running all of them at once starves each
  // other and stutters. Off-screen cards just show their crisp poster.
  useEffect(() => {
    if (!useCanvas) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), {
      // small margin: decode only what's about to be seen, so far fewer
      // WebCodecs decoders run at once. The poster IS the clip's first frame,
      // so the still->motion handoff is seamless even at a tight margin.
      rootMargin: "20% 0px",
      threshold: 0.01,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [useCanvas]);

  useEffect(() => {
    if (!useCanvas || !near) return;
    const c = canvasRef.current;
    if (!c) return;
    const handle = playMp4ToCanvas(c, media.src);
    return () => handle.stop();
  }, [useCanvas, near, media.src]);

  // Fallback only: set muted as a property pre-paint (Safari) and let the hook
  // retry on canplay + first gesture.
  const attachVideo = useCallback((node: HTMLVideoElement | null) => {
    vref.current = node;
    if (node) {
      node.muted = true;
      node.defaultMuted = true;
    }
  }, []);
  useAutoplayVideo(vref, {
    autoplay: media.video && !useCanvas && !still,
    whenVisible: false,
  });

  // Desktop hover tilt: ease the tilt toward the cursor every animation frame (a
  // lerp), with NO CSS transition. This tracks tightly (responsive) AND stays
  // smooth between irregular pointer events -- a CSS transition can only do one
  // or the other (long = laggy, short = shivery).
  const NEUTRAL = { rx: 0, ry: 0, mx: 50, my: 16 };
  const tiltTarget = useRef({ ...NEUTRAL });
  const tiltCurrent = useRef({ ...NEUTRAL });
  const tiltRaf = useRef(0);

  const applyTilt = () => {
    const el = ref.current;
    if (!el) return;
    const c = tiltCurrent.current;
    el.style.setProperty("--rx", `${c.rx.toFixed(2)}deg`);
    el.style.setProperty("--ry", `${c.ry.toFixed(2)}deg`);
    el.style.setProperty("--mx", `${c.mx.toFixed(1)}%`);
    el.style.setProperty("--my", `${c.my.toFixed(1)}%`);
  };

  const tiltLoop = () => {
    const c = tiltCurrent.current;
    const t = tiltTarget.current;
    const k = 0.6; // ease factor per frame: higher = tighter tracking
    c.rx += (t.rx - c.rx) * k;
    c.ry += (t.ry - c.ry) * k;
    c.mx += (t.mx - c.mx) * k;
    c.my += (t.my - c.my) * k;
    applyTilt();
    if (
      Math.abs(t.rx - c.rx) < 0.04 &&
      Math.abs(t.ry - c.ry) < 0.04 &&
      Math.abs(t.mx - c.mx) < 0.2 &&
      Math.abs(t.my - c.my) < 0.2
    ) {
      tiltCurrent.current = { ...t };
      applyTilt();
      tiltRaf.current = 0;
      return; // settled; sleep until the next move
    }
    tiltRaf.current = requestAnimationFrame(tiltLoop);
  };

  const wakeTilt = () => {
    if (!tiltRaf.current) tiltRaf.current = requestAnimationFrame(tiltLoop);
  };

  const setHoverTarget = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (clientX - r.left) / r.width;
    const py = (clientY - r.top) / r.height;
    tiltTarget.current = {
      // Half the original throw (was 33 / 36): enough parallax to read as 3D
      // without the card swinging away from the cursor.
      rx: (0.5 - py) * 16.5,
      ry: (px - 0.5) * 18,
      mx: px * 100,
      my: py * 100,
    };
  };

  useEffect(
    () => () => {
      if (tiltRaf.current) cancelAnimationFrame(tiltRaf.current);
    },
    [],
  );

  // The tilt is a desktop-hover-only flourish. On touch and Vision Pro it would
  // hijack taps and drag-to-scroll, so the pointer handlers run for mouse only;
  // touch just taps (onClick) and the page scrolls normally.
  // Hover is JS-owned (.is-hover), not CSS :hover, for two reasons:
  // 1. after a tab switch the browser applies :hover to whatever lands under
  //    the stationary cursor; hover should engage only when the mouse MOVES
  //    (html.hover-frozen gates it until then), and
  // 2. the grown card scales its own hit area, so CSS :hover only releases
  //    well outside the original bounds; we track the UNSCALED rect and drop
  //    hover the moment the pointer leaves it.
  const [hovered, setHovered] = useState(false);

  const endHover = () => {
    setHovered(false);
    tiltTarget.current = { ...NEUTRAL };
    wakeTilt();
  };

  // The UNTRANSFORMED card rect, valid at any point mid-grow/shrink: layout
  // size from offsetWidth/Height (transforms don't touch it) and center from
  // the live rect minus the current translate (scale keeps the center put,
  // origin is the middle). Measuring getBoundingClientRect directly mid-
  // transition returned the enlarged box, so a hover released in the inset
  // band instantly re-engaged against an inflated 'base' and stuck.
  const baseRectOf = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    let tx = 0;
    let ty = 0;
    if (cs.translate && cs.translate !== "none") {
      const parts = cs.translate.split(" ");
      tx = parseFloat(parts[0]) || 0;
      ty = parseFloat(parts[1] ?? "0") || 0;
    }
    const cx = (rect.left + rect.right) / 2 - tx;
    const cy = (rect.top + rect.bottom) / 2 - ty;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    return {
      left: cx - w / 2,
      right: cx + w / 2,
      top: cy - h / 2,
      bottom: cy + h / 2,
    };
  };

  // The float region is a band SMALLER than the card: leaving toward a nearby
  // target (the section title sits right above the top row) releases the hover
  // sooner, without shrinking the card itself or its click target.
  const HOVER_INSET = 14;
  const insideHoverRegion = (
    r: { left: number; right: number; top: number; bottom: number },
    x: number,
    y: number,
  ) =>
    x >= r.left + HOVER_INSET &&
    x <= r.right - HOVER_INSET &&
    y >= r.top + HOVER_INSET &&
    y <= r.bottom - HOVER_INSET;

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    if (document.documentElement.classList.contains("hover-frozen")) return;
    const el = ref.current;
    if (!el) return;
    const base = baseRectOf(el);
    if (!hovered) {
      if (!insideHoverRegion(base, e.clientX, e.clientY)) return;
      setHovered(true);
    } else if (!insideHoverRegion(base, e.clientX, e.clientY)) {
      endHover();
      return;
    }
    setHoverTarget(e.clientX, e.clientY);
    wakeTilt();
  };

  const onPointerLeave = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    endHover();
  };

  return (
    <button
      ref={ref}
      type="button"
      className={`tvcard tvcard--${media.kind}${hovered ? " is-hover" : ""}`}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={() => onOpen(media)}
      aria-label={media.title}
    >
      <span className="tvcard-inner">
        <span className="tvcard-tilt">
          <span className="tvcard-media">
          {media.poster && (
            <img
              className="tvcard-poster"
              src={media.poster}
              alt=""
              aria-hidden="true"
              decoding="async"
              loading="lazy"
            />
          )}
          {(() => {
            if (still && media.video) {
              return (
                <img
                  className="tvcard-cover"
                  src={media.poster ?? media.src}
                  alt={media.title}
                  decoding="async"
                  loading="lazy"
                />
              );
            }
            const cover = !media.video ? (
              <img
                className="tvcard-cover"
                src={media.src}
                alt={media.title}
                decoding="async"
                loading="lazy"
              />
            ) : useCanvas ? (
              <canvas
                ref={canvasRef}
                className="tvcard-cover"
                aria-hidden="true"
              />
            ) : (
              <video
                ref={attachVideo}
                className="tvcard-cover"
                data-ready={ready}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                aria-hidden="true"
                onCanPlay={() => setReady(true)}
              >
                <source src={media.src} type="video/mp4" />
              </video>
            );
            return cover;
          })()}
          {/* Animated project cards are ambient motion, not click-to-play;
              a badge would promise a player that is not there. */}
          {media.video && media.kind === "blog" && <PlayBadge />}
            <span className="tvcard-sheen" aria-hidden="true" />
          </span>
          <span className="tvcard-body">
            {/* Only news cards carry the kicker chip: on game and platform
                cards the platform is already the section heading. */}
            {media.kind === "blog" && (
              <span className="tvcard-chip" style={{ background: media.color }}>
                {media.kicker}
              </span>
            )}
            {/* Platform cards answer the two questions up front: how many
                games run, and how far along the ecosystem is. */}
            {media.chips && media.chips.length > 0 && (
              <span className="tvcard-chips">
                {media.chips.map((c) => (
                  <span key={c} className="tvcard-metachip">
                    {c}
                  </span>
                ))}
              </span>
            )}
            <span className="tvcard-title">{media.title}</span>
            <span className="tvcard-desc">{media.desc}</span>
          </span>
        </span>
      </span>
    </button>
  );
}
