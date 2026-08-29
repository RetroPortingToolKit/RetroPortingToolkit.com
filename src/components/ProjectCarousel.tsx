import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import useEmblaCarousel from "embla-carousel-react";
import { isVideoSrc, isYouTubeSrc, youtubeThumb } from "@/lib/content";
import { useAutoplayVideo } from "@/lib/useAutoplayVideo";
import { VideoSources } from "./mediaLoad";

function PlayIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <path d="M3.5 2.2L9.5 6L3.5 9.8Z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <rect x="3" y="2" width="2.2" height="8" fill="currentColor" />
      <rect x="6.8" y="2" width="2.2" height="8" fill="currentColor" />
    </svg>
  );
}

function CarouselVideo({
  src,
  srcFallback,
  loop,
  onReady,
  onUserInteract,
  onEnded,
}: {
  src: string;
  srcFallback?: string;
  loop: boolean;
  onReady?: () => void;
  onUserInteract?: () => void;
  onEnded?: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useAutoplayVideo(ref);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  // Keep latest onEnded reachable from a stable listener, avoids reattaching
  // on every render and keeps the listener live even if the autoplay effect
  // tears down its own attempt to listen.
  const onEndedRef = useRef(onEnded);
  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onTime = () => setCurrentTime(v.currentTime);
    const onDur = () => setDuration(v.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnd = () => onEndedRef.current?.();
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("durationchange", onDur);
    v.addEventListener("loadedmetadata", onDur);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnd);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("durationchange", onDur);
      v.removeEventListener("loadedmetadata", onDur);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnd);
    };
  }, []);

  const togglePlay = () => {
    const v = ref.current;
    if (!v) return;
    onUserInteract?.();
    if (v.paused) void v.play();
    else v.pause();
  };

  const onSeek = (e: ReactPointerEvent<HTMLDivElement>) => {
    const v = ref.current;
    if (!v || !duration) return;
    onUserInteract?.();
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width),
    );
    v.currentTime = ratio * duration;
  };

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="proj-carousel-video">
      <video
        ref={ref}
        autoPlay
        loop={loop}
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        onLoadedData={onReady}
      >
        <VideoSources src={src} fallback={srcFallback} />
      </video>
      <div className="proj-carousel-video-controls">
        <button
          type="button"
          className="proj-carousel-video-btn"
          aria-label={isPlaying ? "Pause" : "Play"}
          onClick={togglePlay}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
        <div
          className="proj-carousel-video-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={Math.max(1, Math.round(duration))}
          aria-valuenow={Math.round(currentTime)}
          onPointerDown={onSeek}
        >
          <div
            className="proj-carousel-video-progress-fill"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export interface Slide {
  src: string;
  srcSet?: string;
  srcFallback?: string;
  lqip?: string;
  /** small static poster for video slides (thumbnails + <video poster>) */
  poster?: string;
  caption?: string;
}

interface Props {
  slides: Slide[];
  showThumbs?: boolean;
  autoplayDelay?: number;
}

// YouTube slides never auto-embed: an iframe that YouTube declines to render
// leaves a blank card. Poster first (the item's cover, else the yt thumb),
// then a real embed only on an explicit click.
function CarouselYouTube({
  src,
  poster,
  title,
  onReady,
  onUserInteract,
}: {
  src: string;
  poster?: string;
  title?: string;
  onReady: () => void;
  onUserInteract: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const id = src.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
  if (!id) return null;
  if (playing) {
    return (
      <iframe
        className="proj-carousel-iframe"
        src={`https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1`}
        title={title ?? "Video"}
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return (
    <button
      type="button"
      className="proj-carousel-ytposter"
      onClick={() => {
        onUserInteract();
        setPlaying(true);
      }}
      aria-label={`Play video: ${title ?? "video"}`}
    >
      <img
        src={poster ?? youtubeThumb(src)}
        alt=""
        draggable={false}
        onLoad={onReady}
        decoding="async"
      />
      <span className="media-card-play" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="52" height="52" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="11" fill="rgba(0,0,0,0.55)" />
          <path d="M9.8 7.5v9l7-4.5z" fill="#fff" />
        </svg>
      </span>
    </button>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  const d = direction === "left" ? "M11 3L5 9L11 15" : "M5 3L11 9L5 15";
  return (
    <svg viewBox="0 0 16 18" fill="none" aria-hidden="true">
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Minimal YouTube IFrame API surface we use.
type YTPlayer = {
  destroy?: () => void;
  playVideo?: () => void;
};
type YTApi = {
  Player: new (
    el: HTMLElement,
    config: {
      events: {
        onReady?: (e: { target: YTPlayer }) => void;
        onStateChange?: (e: { data: number }) => void;
      };
    },
  ) => YTPlayer;
  PlayerState: { ENDED: number };
};

interface WindowWithYT extends Window {
  YT?: YTApi;
  onYouTubeIframeAPIReady?: () => void;
}

let ytApiPromise: Promise<YTApi> | null = null;
function loadYouTubeAPI(): Promise<YTApi> {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const w = window as WindowWithYT;
    if (w.YT && w.YT.Player) {
      resolve(w.YT);
      return;
    }
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      const yt = (window as WindowWithYT).YT;
      if (yt) resolve(yt);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(script);
  });
  return ytApiPromise;
}

export function ProjectCarousel({
  slides,
  showThumbs = false,
  autoplayDelay,
}: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    skipSnaps: false,
  });
  const [activeSlide, setActiveSlide] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [loadedSlides, setLoadedSlides] = useState<Set<number>>(new Set());
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!lightboxSrc) return;
    // capture phase + stopImmediatePropagation: Esc closes ONLY the lightbox;
    // the item modal's own window-level Esc listener (bubble phase) never
    // sees the event, so the project page underneath stays open
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        e.stopPropagation();
        setLightboxSrc(null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [lightboxSrc]);
  // Exposed by the autoplay useEffect so video controls inside slides can
  // cancel autoplay the same way drag does, and so the React-managed video
  // listener can advance the carousel without going through DOM queries.
  const stopAutoplayRef = useRef<(() => void) | null>(null);
  const advanceRef = useRef<(() => void) | null>(null);
  const stopAutoplay = useCallback(() => {
    stopAutoplayRef.current?.();
  }, []);
  const advanceFromVideo = useCallback(() => {
    advanceRef.current?.();
  }, []);
  const markLoaded = useCallback((i: number) => {
    setLoadedSlides((prev) => {
      if (prev.has(i)) return prev;
      const next = new Set(prev);
      next.add(i);
      return next;
    });
  }, []);

  // Image preloading is handled inline by the <img> element itself: it's
  // always in the DOM (so the browser fetches + decodes from the start), but
  // visually overlaid by the skeleton until its `onLoad` fires.

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      const i = emblaApi.selectedScrollSnap();
      setActiveSlide(i);
      setCanPrev(emblaApi.canScrollPrev());
      setCanNext(emblaApi.canScrollNext());
    };
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi]);

  // Drive advancement manually so the duration adapts per-slide:
  //   image  -> autoplayDelay (e.g. 2s)
  //   video  -> wait for the <video>'s `ended` event
  //   youtube -> wait for YT IFrame API state === ENDED
  // Any user interaction (drag) cancels the autoplay flow.
  useEffect(() => {
    if (!emblaApi || !autoplayDelay) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let cleanupPrev: (() => void) | null = null;
    let userStopped = false;

    const clearTimer = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const advance = () => {
      if (userStopped) return;
      if (emblaApi.canScrollNext()) emblaApi.scrollNext();
    };

    const onUserInteract = () => {
      userStopped = true;
      clearTimer();
      cleanupPrev?.();
      cleanupPrev = null;
    };

    const handleSelect = () => {
      cleanupPrev?.();
      cleanupPrev = null;
      clearTimer();
      if (userStopped) return;

      const i = emblaApi.selectedScrollSnap();
      const slide = slides[i];
      if (!slide) return;
      const slideEl = emblaApi.slideNodes()[i];
      if (!slideEl) return;

      if (isYouTubeSrc(slide.src)) {
        const iframe = slideEl.querySelector("iframe");
        if (!iframe) {
          timer = setTimeout(advance, autoplayDelay);
          return;
        }
        let player: YTPlayer | null = null;
        let cancelled = false;
        loadYouTubeAPI().then((YT) => {
          if (cancelled) return;
          player = new YT.Player(iframe, {
            events: {
              onReady: (e) => {
                e.target.playVideo?.();
              },
              onStateChange: (e) => {
                if (e.data === YT.PlayerState.ENDED) advance();
              },
            },
          });
        });
        cleanupPrev = () => {
          cancelled = true;
          try {
            player?.destroy?.();
          } catch {
            // ignore
          }
        };
      } else if (isVideoSrc(slide.src)) {
        // CarouselVideo owns the `ended` listener (via onEnded → advance).
        // We just nudge it back to the start in case the user previously
        // scrubbed or it was paused mid-playback before navigating away.
        const video = slideEl.querySelector("video");
        if (!video) {
          timer = setTimeout(advance, autoplayDelay);
          return;
        }
        try {
          video.currentTime = 0;
          void video.play();
        } catch {
          // ignore
        }
      } else {
        timer = setTimeout(advance, autoplayDelay);
      }
    };

    emblaApi.on("select", handleSelect);
    emblaApi.on("reInit", handleSelect);
    emblaApi.on("pointerDown", onUserInteract);
    stopAutoplayRef.current = onUserInteract;
    advanceRef.current = advance;
    handleSelect();

    return () => {
      emblaApi.off("select", handleSelect);
      emblaApi.off("reInit", handleSelect);
      emblaApi.off("pointerDown", onUserInteract);
      stopAutoplayRef.current = null;
      advanceRef.current = null;
      clearTimer();
      cleanupPrev?.();
    };
  }, [emblaApi, slides, autoplayDelay]);

  // Deliberate navigation (thumbnail, prev/next) means the user wants to LOOK:
  // stop the autoplay flow for good, same as a drag.
  const goToSlide = useCallback(
    (i: number) => {
      stopAutoplayRef.current?.();
      emblaApi?.scrollTo(i);
    },
    [emblaApi],
  );
  const scrollPrev = useCallback(() => {
    stopAutoplayRef.current?.();
    emblaApi?.scrollPrev();
  }, [emblaApi]);
  const scrollNext = useCallback(() => {
    stopAutoplayRef.current?.();
    emblaApi?.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        emblaApi.scrollPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        emblaApi.scrollNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [emblaApi]);

  // Show the prev/next arrows for a moment when the gallery first appears,
  // then fade them away until hover.
  const [navPeek, setNavPeek] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setNavPeek(false), 1800);
    return () => clearTimeout(t);
  }, []);

  const slideCount = slides.length;
  if (slideCount === 0) return null;

  const firstImageSrc =
    slides.find((s) => !isVideoSrc(s.src) && !isYouTubeSrc(s.src))?.src ??
    slides[0].src;
  const activeSrc = slides[activeSlide]?.src ?? firstImageSrc;
  const backdropSrc =
    isVideoSrc(activeSrc) || isYouTubeSrc(activeSrc)
      ? firstImageSrc
      : activeSrc;

  return (
    <div
      className={
        "proj-carousel" +
        (showThumbs ? " with-thumbs" : "") +
        (navPeek ? " nav-peek" : "")
      }
      aria-roledescription="carousel"
      aria-label="Project media"
    >
      {backdropSrc && !isYouTubeSrc(backdropSrc) && (
        <div
          className="proj-carousel-bg"
          style={{ backgroundImage: `url(${backdropSrc})` }}
          aria-hidden="true"
        />
      )}
      <div className="proj-carousel-bg-tint" aria-hidden="true" />
      <div className="proj-carousel-stage">
        {canPrev && (
          <button
            type="button"
            className="proj-carousel-nav prev"
            aria-label="Previous slide"
            onClick={scrollPrev}
          >
            <span className="proj-carousel-nav-icon">
              <Chevron direction="left" />
            </span>
          </button>
        )}
        {canNext && (
          <button
            type="button"
            className="proj-carousel-nav next"
            aria-label="Next slide"
            onClick={scrollNext}
          >
            <span className="proj-carousel-nav-icon">
              <Chevron direction="right" />
            </span>
          </button>
        )}
        <div className="proj-carousel-viewport" ref={emblaRef}>
          <div className="proj-carousel-track">
            {slides.map((s, i) => {
              const isLoaded = loadedSlides.has(i);
              return (
                <div
                  key={i}
                  className="proj-carousel-slide"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${slideCount}`}
                >
                  <div className="proj-carousel-card">
                    <div className="proj-carousel-stack">
                      <div
                        className={
                          "proj-carousel-media" +
                          (isLoaded ? " is-loaded" : "")
                        }
                      >
                        {isYouTubeSrc(s.src) ? (
                          <CarouselYouTube
                            src={s.src}
                            poster={s.poster}
                            title={s.caption}
                            onReady={() => markLoaded(i)}
                            onUserInteract={stopAutoplay}
                          />
                        ) : isVideoSrc(s.src) ? (
                          <CarouselVideo
                            src={s.src}
                            srcFallback={s.srcFallback}
                            loop={!autoplayDelay}
                            onReady={() => markLoaded(i)}
                            onUserInteract={stopAutoplay}
                            onEnded={autoplayDelay ? advanceFromVideo : undefined}
                          />
                        ) : (
                          <img
                            src={s.src}
                            srcSet={s.srcSet}
                            sizes="(max-width: 760px) 92vw, 860px"
                            alt={s.caption ?? ""}
                            draggable={false}
                            onLoad={() => markLoaded(i)}
                            onClick={() => {
                              stopAutoplay();
                              setLightboxSrc(s.src);
                            }}
                            style={{ cursor: "zoom-in" }}
                          />
                        )}
                        {!isLoaded && (
                          <div
                            className="proj-carousel-skeleton"
                            aria-hidden="true"
                            style={
                              s.lqip
                                ? {
                                    backgroundImage: `url(${s.lqip})`,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                    filter: "blur(14px)",
                                    transform: "scale(1.08)",
                                  }
                                : undefined
                            }
                          />
                        )}
                      </div>
                      {s.caption && (
                        <p className="proj-carousel-caption">{s.caption}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {slideCount > 1 && (
          <div className="proj-carousel-status">
            {!showThumbs && (
              <span className="proj-carousel-counter" aria-hidden="true">
                {activeSlide + 1} / {slideCount}
              </span>
            )}
            <div
              className="proj-carousel-dots"
              role="tablist"
              aria-label="Slide"
            >
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={
                    "proj-carousel-dot" + (i === activeSlide ? " active" : "")
                  }
                  aria-label={`Slide ${i + 1}`}
                  aria-selected={i === activeSlide}
                  role="tab"
                  onClick={() => goToSlide(i)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      {lightboxSrc &&
        createPortal(
          <div
            className="media-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="Expanded media"
            onClick={() => setLightboxSrc(null)}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setLightboxSrc(null)}
              aria-label="Close"
            >
              <span className="modal-close-icon">
                <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M3 3L13 13M13 3L3 13"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </button>
            <img
              className="media-lightbox-img"
              src={lightboxSrc}
              alt=""
              onClick={(e) => e.stopPropagation()}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
