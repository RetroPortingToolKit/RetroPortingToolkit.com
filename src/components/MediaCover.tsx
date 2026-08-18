import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { isVideoSrc } from "@/lib/content";
import { useAutoplayVideo } from "@/lib/useAutoplayVideo";
import { Placeholder, VideoSources, useLoaded } from "./mediaLoad";

interface Props {
  src: string;
  // H.264 MP4 fallback when `src` is a WebM video
  srcFallback?: string;
  // Static fallback rendered as the wrapper's background. When provided, the
  // animated `src` is overlaid on top and gated by an IntersectionObserver:
  // off-screen cards display:none the overlay so videos pause and animated
  // images stop decoding, but the element stays in the DOM (so it remains
  // loaded and re-shows instantly when scrolled back into view).
  poster?: string;
  // tiny blurred placeholder shown while the cover loads
  lqip?: string;
  className?: string;
  bgSize?: string;
  bgPos?: string;
}

export function MediaCover({
  src,
  srcFallback,
  poster,
  lqip,
  className,
  bgSize,
  bgPos,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const { loaded, onLoaded } = useLoaded();

  useLayoutEffect(() => {
    if (!poster) return;
    const el = wrapRef.current;
    if (!el || typeof window === "undefined") return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight + 200 && rect.bottom > -200) {
      setNear(true);
    }
  }, [poster]);

  useEffect(() => {
    if (!poster) return;
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) setNear(e.isIntersecting);
      },
      { rootMargin: "200px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [poster]);

  useAutoplayVideo(videoRef);

  const video = isVideoSrc(src);

  // No poster: the media itself is the cover, with the placeholder underneath.
  if (!poster) {
    return (
      <div
        ref={wrapRef}
        className={(className ?? "") + " media-ph"}
        data-loaded={loaded}
      >
        <Placeholder lqip={lqip} />
        {video ? (
          <video
            ref={videoRef}
            className="media-real"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            aria-hidden="true"
            onLoadedData={onLoaded}
          >
            <VideoSources src={src} fallback={srcFallback} />
          </video>
        ) : (
          <img
            className="media-real"
            src={src}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            onLoad={onLoaded}
            style={{
              ...(bgSize && { objectFit: bgSize as React.CSSProperties["objectFit"] }),
              ...(bgPos && { objectPosition: bgPos }),
            }}
          />
        )}
      </div>
    );
  }

  // Poster present: show the poster as the still cover, animate `src` over it
  // when near the viewport. The placeholder sits under the poster while it loads.
  return (
    <div
      ref={wrapRef}
      className={(className ?? "") + " media-ph"}
      data-loaded={loaded}
    >
      <Placeholder lqip={lqip} />
      <img
        className="media-real"
        src={poster}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        onLoad={onLoaded}
      />
      <div className={"media-cover-anim" + (near ? " active" : "")}>
        {video ? (
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            aria-hidden="true"
          >
            <VideoSources src={src} fallback={srcFallback} />
          </video>
        ) : (
          <img src={src} alt="" aria-hidden="true" loading="lazy" decoding="async" />
        )}
      </div>
    </div>
  );
}
