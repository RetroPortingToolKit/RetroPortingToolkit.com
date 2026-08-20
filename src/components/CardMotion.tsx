import { useCallback, useEffect, useRef } from "react";
import { useAutoplayVideo } from "@/lib/useAutoplayVideo";
import { playMp4ToCanvas, WEBCODECS_OK } from "@/lib/canvasVideo";

// Ambient card motion for the home page: a short silent loop of the real
// thing, where a static cover would otherwise sit.
//
// This mirrors SpatialCard, which is the card treatment that already works on
// Safari: decode the clip into a <canvas> with WebCodecs, so Safari's
// autoplay policy has no <video> element to refuse, and let the poster show
// through underneath until the first frame is painted (a canvas is
// transparent until then, so there is nothing to fade in and no state that
// can strand a card on its still).
//
// Deliberately NOT gated on an IntersectionObserver. The grid gates because it
// can hold 45 cards; the home page holds eleven, and every observer-based
// gate is one more way for a card to sit frozen when the callback never
// arrives (a hidden or zero-sized document never delivers one).
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const animated = !!mp4 && !still;
  const useCanvas = animated && WEBCODECS_OK;

  useEffect(() => {
    if (!useCanvas || !mp4) return;
    const c = canvasRef.current;
    if (!c) return;
    const handle = playMp4ToCanvas(c, mp4);
    return () => handle.stop();
  }, [useCanvas, mp4]);

  // Fallback path only (no WebCodecs): set muted as a property pre-paint,
  // which Safari reads, and let the hook retry on canplay and first gesture.
  const attachVideo = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node) {
      node.muted = true;
      node.defaultMuted = true;
    }
  }, []);
  useAutoplayVideo(videoRef, {
    autoplay: animated && !useCanvas,
    whenVisible: false,
  });

  return (
    <span className={"card-motion" + (className ? ` ${className}` : "")}>
      <img
        className="card-motion-poster"
        src={poster}
        alt={alt}
        width={1280}
        height={720}
        loading="lazy"
        decoding="async"
      />
      {useCanvas && (
        <canvas ref={canvasRef} className="card-motion-layer" aria-hidden="true" />
      )}
      {animated && !useCanvas && (
        <video
          ref={attachVideo}
          className="card-motion-layer"
          src={mp4}
          poster={poster}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          aria-hidden="true"
        />
      )}
    </span>
  );
}
