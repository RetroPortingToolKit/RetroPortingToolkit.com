import { useCallback, useEffect, useRef, useState } from "react";
import { useAutoplayVideo } from "@/lib/useAutoplayVideo";

// Ambient card motion: a short silent loop of the real thing, shown where a
// static cover would otherwise sit. The poster IS the clip's first frame, so
// the still-to-motion handoff is seamless and the card never flashes empty.
//
// A plain muted inline <video> is the right tool here: it is supported
// everywhere, muted autoplay is permitted, and the clips are ~5s at 640x360.
// Only cards near the viewport mount one, so a long catalog never spins up
// dozens of decoders at once. (The WebCodecs canvas path in canvasVideo.ts
// stays reserved for the hero reel, where it exists to recover from Safari
// freezing a long-running video.)
export function CardMotion({
  mp4,
  poster,
  alt,
  still = false,
  className,
}: {
  /** clip URL; when absent the poster renders alone (a plain cover image) */
  mp4?: string;
  poster: string;
  alt: string;
  /** poster-only render: used while a pane is being dragged into view */
  still?: boolean;
  className?: string;
}) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);
  const play = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    void v.play().catch(() => {});
  }, []);

  const animated = !!mp4 && !still;

  useEffect(() => {
    if (!animated) return;
    const el = hostRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    // Synchronous first answer: an observer only reports on the next frame,
    // and some contexts (a backgrounded or hidden document) never deliver a
    // first callback at all, which would leave a fully visible card frozen on
    // its poster. The observer then keeps it current as the page scrolls.
    const viewportH = () =>
      window.innerHeight || document.documentElement.clientHeight || 0;
    const seen = () => {
      const vh = viewportH();
      // A viewport we cannot measure (0 height) means we cannot decide, so
      // play rather than leaving the card silently frozen on its poster.
      if (!vh) return true;
      const margin = vh * 0.25;
      const r = el.getBoundingClientRect();
      return r.bottom > -margin && r.top < vh + margin;
    };
    if (seen()) setNear(true);
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting || seen()), {
      rootMargin: "25% 0px",
      threshold: 0.01,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [animated]);

  // Set muted as a property pre-paint (Safari reads the property, not just the
  // attribute) and let the hook retry on canplay and on the first gesture.
  const attachVideo = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node) {
      node.muted = true;
      node.defaultMuted = true;
    }
  }, []);
  useAutoplayVideo(videoRef, { autoplay: animated && near, whenVisible: false });

  return (
    <span
      ref={hostRef}
      className={"card-motion" + (className ? ` ${className}` : "")}
      onPointerEnter={play}
    >
      <img
        className="card-motion-poster"
        src={poster}
        alt={alt}
        width={1280}
        height={720}
        loading="lazy"
        decoding="async"
      />
      {animated && near && (
        <video
          ref={attachVideo}
          className={"card-motion-layer" + (ready ? " is-on" : "")}
          src={mp4}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          aria-hidden="true"
          // Reveal as soon as the clip can render a frame, not when it starts
          // playing: frame 1 matches the poster, so an autoplay that is
          // blocked or deferred still looks right instead of freezing the
          // card on its still. Nudge playback here too, since a canplay that
          // arrives after the element mounted can miss the initial attempt.
          onCanPlay={() => {
            setReady(true);
            play();
          }}
        />
      )}
    </span>
  );
}
