import { useState } from "react";

// Shared loading visuals for images and video. A tiny blurred LQIP (or a
// shimmer skeleton when none is available) sits under the real asset until it
// decodes, then crossfades out. See `.media-ph` in styles.css.

export function useLoaded() {
  const [loaded, setLoaded] = useState(false);
  return { loaded, onLoaded: () => setLoaded(true) };
}

// The placeholder layer(s) to render as the first child of a `.media-ph` box.
export function Placeholder({ lqip }: { lqip?: string }) {
  if (lqip) {
    return (
      <span
        className="media-lqip"
        aria-hidden="true"
        style={{ backgroundImage: `url(${lqip})` }}
      />
    );
  }
  return <span className="media-skel" aria-hidden="true" />;
}

function typeFor(src: string): string | undefined {
  if (/\.webm(\?|#|$)/i.test(src)) return "video/webm";
  if (/\.mp4(\?|#|$)/i.test(src)) return "video/mp4";
  if (/\.mov(\?|#|$)/i.test(src)) return "video/quicktime";
  return undefined;
}

// <source> elements for a video: the primary (WebM) first, then the H.264 MP4
// fallback so Safari / Vision Pro always have a playable path.
export function VideoSources({
  src,
  fallback,
}: {
  src: string;
  fallback?: string;
}) {
  return (
    <>
      <source src={src} type={typeFor(src)} />
      {fallback && <source src={fallback} type="video/mp4" />}
    </>
  );
}
