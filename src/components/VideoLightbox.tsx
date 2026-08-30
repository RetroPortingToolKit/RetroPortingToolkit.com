import { useEffect } from "react";
import { createPortal } from "react-dom";
import { youtubeEmbedUrl } from "@/lib/contentCore";

// In-site video lightbox for YouTube links: the visitor never leaves the page.
// Esc/backdrop close it; the capture-phase listener stops the event before the
// item modal's own Esc handler would close the modal underneath.
export function VideoLightbox({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKey, { capture: true });
  }, [onClose]);

  const embed = youtubeEmbedUrl(url);
  if (!embed) return null;
  return createPortal(
    <div
      className="video-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Video"
      onClick={onClose}
    >
      <button
        type="button"
        className="modal-close"
        onClick={onClose}
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
      <div className="video-lightbox-frame" onClick={(e) => e.stopPropagation()}>
        <iframe
          src={`${embed}${embed.includes("?") ? "&" : "?"}autoplay=1`}
          title="Video"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
        />
        <a
          className="video-lightbox-original"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Watch on YouTube ↗
        </a>
      </div>
    </div>,
    document.body,
  );
}
