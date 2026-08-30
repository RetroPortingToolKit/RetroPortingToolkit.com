import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useAmbientMediaAllowed } from "@/lib/useAmbientMedia";

const PROXIMITY_MARGIN = "400px 0px";

export interface InlineMarkdownVideoStateInput {
  src: string;
  nearViewport: boolean;
  userActivated: boolean;
  ambientAllowed: boolean;
}

export interface InlineMarkdownVideoState {
  src?: string;
  autoPlay: boolean;
  preload: "none" | "metadata";
}

// Kept pure so the network-affecting states can be exhaustively tested without
// pretending a server renderer or synthetic event is a real browser viewport.
export function inlineMarkdownVideoState({
  src,
  nearViewport,
  userActivated,
  ambientAllowed,
}: InlineMarkdownVideoStateInput): InlineMarkdownVideoState {
  const activated = nearViewport || userActivated;
  const ambient = nearViewport && ambientAllowed && !userActivated;
  return {
    src: activated ? src : undefined,
    autoPlay: ambient,
    // A policy-suppressed video may expose native controls once it is near,
    // but it must not spend data until the visitor explicitly presses play.
    preload: ambient ? "metadata" : "none",
  };
}

function isPlaybackKey(event: KeyboardEvent<HTMLVideoElement>): boolean {
  return event.key === "Enter" || event.key === " ";
}

export function InlineMarkdownVideo({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [userActivated, setUserActivated] = useState(false);
  const ambientAllowed = useAmbientMediaAllowed();
  const state = inlineMarkdownVideoState({
    src,
    nearViewport,
    userActivated,
    ambientAllowed,
  });

  // Assigning no src at all is the load boundary. preload="none" alone is a
  // hint browsers may ignore, whereas an absent URL cannot start a request.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        setNearViewport(entries.some((entry) => entry.isIntersecting));
      },
      { rootMargin: PROXIMITY_MARGIN, threshold: 0.01 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  // React's autoplay attribute is not reliable on a src assigned after mount,
  // especially in Safari. Make the allowed ambient attempt directly. A policy
  // change pauses ambient playback; once the visitor touches the native
  // controls, that explicit choice owns playback instead of the ambient rule.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !state.src || userActivated) return;
    if (!state.autoPlay) {
      video.pause();
      return;
    }
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    const attempt = video.play();
    attempt?.catch(() => {
      // Native controls remain available when autoplay is denied.
    });
  }, [state.autoPlay, state.src, userActivated]);

  const activate = () => {
    // Put the URL on the element inside the gesture itself. Waiting for the
    // state update can make a browser treat the native control's play request
    // as an autoplay attempt, forcing the visitor to press Play twice.
    const video = videoRef.current;
    if (video && !video.getAttribute("src")) video.src = src;
    setUserActivated(true);
  };

  return (
    <video
      ref={videoRef}
      {...(state.src ? { src: state.src } : {})}
      autoPlay={state.autoPlay}
      muted
      loop
      playsInline
      controls
      preload={state.preload}
      aria-label={title}
      onPointerDown={activate}
      onClick={activate}
      onKeyDown={(event) => {
        if (isPlaybackKey(event)) activate();
      }}
    />
  );
}
