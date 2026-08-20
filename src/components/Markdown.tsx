import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PreviewLink } from "./PreviewLink";

interface MarkdownProps {
  children: string;
  className?: string;
}

// Poster first, player on click: an inline article embed must not autoload a
// third-party player for every image slot on the page.
function MarkdownYouTube({ id, title }: { id: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  if (playing) {
    return (
      <span className="md-embed">
        <iframe
          src={`https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1`}
          title={title}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </span>
    );
  }
  return (
    <button
      type="button"
      className="md-embed md-embed--poster"
      onClick={() => setPlaying(true)}
      aria-label={`Play video: ${title}`}
    >
      <img src={`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`} alt="" loading="lazy" decoding="async" />
      <span className="media-card-play" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="52" height="52" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="11" fill="rgba(0,0,0,0.55)" />
          <path d="M9.8 7.5v9l7-4.5z" fill="#fff" />
        </svg>
      </span>
    </button>
  );
}

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        // Content is first-party, so pass URLs through unchanged. This also lets
        // the custom "cite:" protocol survive sanitization.
        urlTransform={(url) => url}
        components={{
          // PreviewLink wraps SmartLink: it adds a hover card describing the
          // destination when the href resolves to real site content, and falls
          // through to a plain SmartLink when it does not.
          a: ({ href, children, className }) => {
            return (
              <PreviewLink href={href ?? "#"} className={className}>
                {children}
              </PreviewLink>
            );
          },
          // Inline article media: ![caption](./file) renders as a figure (the
          // alt doubles as the caption); video files autoplay muted like the
          // gallery clips. Spans (display:block) because react-markdown puts
          // images inside <p>, where a real <figure> would be invalid.
          img: ({ src, alt }) => {
            const url = typeof src === "string" ? src : "";
            const isVideo = /\.(webm|mp4|mov|m4v)(\?|#|$)/i.test(url);
            const yt = url.match(
              /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
            );
            // ![caption](https://youtu.be/ID) embeds the video inline, played
            // on click. Videos are embedded, never re-hosted.
            if (yt) {
              return (
                <span className="md-figure">
                  <MarkdownYouTube id={yt[1]} title={alt ?? "Video"} />
                  {alt && <span className="md-figcaption">{alt}</span>}
                </span>
              );
            }
            return (
              <span className="md-figure">
                {isVideo ? (
                  <video
                    src={url}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img src={url} alt={alt ?? ""} loading="lazy" decoding="async" />
                )}
                {alt && <span className="md-figcaption">{alt}</span>}
              </span>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
