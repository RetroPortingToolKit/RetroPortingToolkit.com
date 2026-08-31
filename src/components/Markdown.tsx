import { Children, isValidElement, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import type { Element, Nodes } from "hast";
import { PreviewLink } from "./PreviewLink";
import { CodeBlock } from "./CodeBlock";
import { InlineMarkdownVideo } from "./InlineMarkdownVideo";
import { calloutKindFromLabel, parseFenceInfo, type CalloutKind } from "@/lib/markdown";

interface MarkdownProps {
  children: string;
  className?: string;
  mediaActive?: boolean;
}

// The text content of a hast node, which is what rehype-slug slugged and what
// an anchor's label should say.
function hastText(node: Nodes | null | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.value;
  if ("children" in node) return node.children.map(hastText).join("");
  return "";
}

// A callout is a blockquote whose first paragraph opens with one of the three
// labels the writing guide allows. Everything else stays a blockquote, which
// matters: pages quote repositories verbatim, and a quotation that happens to
// start in bold must not be dressed up as our own aside.
function calloutKindOf(node: Element | undefined): CalloutKind | null {
  const first = node?.children.find(
    (child): child is Element => child.type === "element",
  );
  if (!first || first.tagName !== "p") return null;
  const lead = first.children[0];
  if (!lead || lead.type !== "element" || lead.tagName !== "strong") return null;
  return calloutKindFromLabel(hastText(lead));
}

// Every heading carries an id (rehype-slug, below) so it can be linked to and
// so an on-this-page contents list has somewhere to point. The visible anchor
// is the affordance for copying that link.
function heading(Tag: "h2" | "h3" | "h4") {
  return function Heading({
    id,
    node,
    children,
  }: {
    id?: string;
    node?: Element;
    children?: ReactNode;
  }) {
    return (
      <Tag id={id} className="md-heading">
        {children}
        {id && (
          <a
            className="md-anchor"
            href={`#${id}`}
            aria-label={`Link to ${hastText(node) || "this section"}`}
          >
            <span aria-hidden="true">#</span>
          </a>
        )}
      </Tag>
    );
  };
}

// Built once: a component identity created inside render would remount every
// heading on every keystroke in the CMS preview.
const H2 = heading("h2");
const H3 = heading("h3");
const H4 = heading("h4");

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

export function Markdown({ children, className, mediaActive = true }: MarkdownProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        // Stable, human-readable heading ids. github-slugger derives each one
        // from that heading's own text, so adding a heading never renames
        // another one; src/lib/toc.ts reproduces the same ids from the source.
        rehypePlugins={[rehypeSlug]}
        // Content is first-party, so pass URLs through unchanged. This also lets
        // the custom "cite:" protocol survive sanitization.
        urlTransform={(url) => url}
        components={{
          h2: H2,
          h3: H3,
          h4: H4,
          // A fenced block becomes a figure: language label, optional filename,
          // copy button, and the <code> react-markdown built, untouched.
          pre: ({ node, children }) => {
            const code = node?.children.find(
              (child): child is Element =>
                child.type === "element" && child.tagName === "code",
            );
            if (!code) return <pre className="md-code-pre">{children}</pre>;
            const info = parseFenceInfo(code.properties?.className, code.data?.meta);
            return (
              <CodeBlock
                lang={info.lang}
                label={info.label}
                file={info.file}
                // The raw source, minus the newline remark-rehype appends.
                code={hastText(code).replace(/\n+$/, "")}
              >
                {children}
              </CodeBlock>
            );
          },
          // A wide table scrolls inside its own box. Without the wrapper the
          // page itself scrolls sideways on a phone, which drags every other
          // element with it.
          table: ({ children }) => (
            <div className="md-table-wrap" tabIndex={0}>
              <table className="md-table">{children}</table>
            </div>
          ),
          blockquote: ({ node, children }) => {
            const kind = calloutKindOf(node);
            if (!kind) return <blockquote>{children}</blockquote>;
            return (
              <div
                className={`md-callout md-callout--${kind}`}
                data-callout={kind}
                role="note"
              >
                {children}
              </div>
            );
          },
          // The "**Lead-in.** body" flourish must only fire when the bold text
          // actually STARTS the paragraph. CSS :first-child counts element
          // children and ignores preceding text, so styling it in CSS alone
          // put an accent dot in the middle of any sentence that happened to
          // end in bold.
          p: ({ children }) => {
            const first = Children.toArray(children)[0];
            const leadIn = isValidElement(first) && first.type === "strong";
            return <p className={leadIn ? "md-leadin" : undefined}>{children}</p>;
          },
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
          // alt doubles as the caption). File videos receive their URL only
          // near the viewport and autoplay only when the shared ambient-media
          // policy permits it. Spans (display:block) because react-markdown
          // puts images inside <p>, where a real <figure> would be invalid.
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
                  <InlineMarkdownVideo
                    src={url}
                    title={alt || "Video"}
                    active={mediaActive}
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
