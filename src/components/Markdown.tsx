import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SmartLink } from "./SmartLink";

interface MarkdownProps {
  children: string;
  className?: string;
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
          a: ({ href, children, className }) => {
            return (
              <SmartLink href={href ?? "#"} className={className}>
                {children}
              </SmartLink>
            );
          },
          // Inline article media: ![caption](./file) renders as a figure (the
          // alt doubles as the caption); video files autoplay muted like the
          // gallery clips. Spans (display:block) because react-markdown puts
          // images inside <p>, where a real <figure> would be invalid.
          img: ({ src, alt }) => {
            const url = typeof src === "string" ? src : "";
            const isVideo = /\.(webm|mp4|mov|m4v)(\?|#|$)/i.test(url);
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
