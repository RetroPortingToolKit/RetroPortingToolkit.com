import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Item } from "@/lib/types";
import { SITE } from "@/lib/site";
import {
  itemsForKind,
  youtubeEmbedUrl,
  isYouTubeSrc,
  isVideoSrc,
  formatArticleDate,
  readingTimeMin,
} from "@/lib/content";
import { useItemNavigate } from "@/lib/useItemNavigate";
import { Markdown } from "./Markdown";
import { BlurText } from "./BlurText";
import { ProjectCarousel, type Slide } from "./ProjectCarousel";
import { SmartLink } from "./SmartLink";
import { VideoLightbox } from "./VideoLightbox";
import type { LinkRef } from "@/lib/types";

interface Props {
  item: Item;
  variant?: "modal" | "page";
}

const delayed = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });

// A Blog entry is "split" (writeup + live demo / media on the side) when it has a demo or gallery,
// unless it explicitly opts into the article (body-only) layout. Otherwise it reads like an article.
export function blogIsSplit(item: Item): boolean {
  if (item.layout === "article") return false;
  if (item.layout === "split") return true;
  return !!item.demo || item.gallery.length > 0;
}

// Click-to-play YouTube embed for a page's primary video: the cover is the
// poster, the player loads only on activation, and attribution stays in the
// page's links. Videos are embedded, never re-hosted.
function VideoHero({ item }: { item: Item }) {
  const [playing, setPlaying] = useState(false);
  const id = item.videoUrl?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
  if (!id) return null;
  const poster = item.cover || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  return (
    <div className="modal-hero video-hero">
      {playing ? (
        <iframe
          className="video-hero-frame"
          src={`https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1`}
          title={item.title}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          className="video-hero-poster"
          onClick={() => setPlaying(true)}
          aria-label={`Play video: ${item.title}`}
        >
          <img src={poster} alt="" loading="lazy" decoding="async" />
          <span className="media-card-play" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="52" height="52" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="11" fill="rgba(0,0,0,0.55)" />
              <path d="M9.8 7.5v9l7-4.5z" fill="#fff" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}

// News video pages use the ramine.net talk layout: a viewport-capped stage
// with the title, channel and date, and the description all visible below it
// without scrolling. Click-to-play; videos are embedded, never re-hosted.
function VideoDetail({ item }: { item: Item }) {
  const [playing, setPlaying] = useState(false);
  const id = item.videoUrl?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
  if (!id) return null;
  const fallbackPoster = item.cover || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  const meta = [item.venue, formatArticleDate(item.date || item.year)]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="modal-body modal-body--blog">
      <div className="talk-detail">
        <div className="talk-detail-stage">
          {playing ? (
            <iframe
              className="talk-detail-iframe"
              src={`https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1`}
              title={item.title}
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <button
              type="button"
              className="video-hero-poster"
              onClick={() => setPlaying(true)}
              aria-label={`Play video: ${item.title}`}
            >
              <img
                className="talk-detail-cover"
                src={`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`}
                onError={(e) => {
                  if (e.currentTarget.src !== fallbackPoster) {
                    e.currentTarget.src = fallbackPoster;
                  }
                }}
                alt=""
                loading="lazy"
                decoding="async"
              />
              <span className="media-card-play" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="52" height="52" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="11" fill="rgba(0,0,0,0.55)" />
                  <path d="M9.8 7.5v9l7-4.5z" fill="#fff" />
                </svg>
              </span>
            </button>
          )}
        </div>
        <div className="talk-detail-meta">
          <h1 className="talk-detail-title">{item.title}</h1>
          {(meta || item.videoUrl) && (
            <div className="talk-detail-date">
              {meta}
              {item.videoUrl && (
                <>
                  {meta ? " · " : ""}
                  <a
                    href={item.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Watch on YouTube <span className="ext">↗</span>
                  </a>
                </>
              )}
            </div>
          )}
          {item.body && (
            <Markdown className="talk-detail-desc">{item.body}</Markdown>
          )}
        </div>
        <AdjacentItems item={item} />
      </div>
    </div>
  );
}

// Project pages follow the ramine.net split: writeup on the left, media on
// the right. The primary video (embedded, never re-hosted) leads the carousel
// with the cover as its poster; gallery shots follow. A cover alone still
// earns the split; pages with no media at all read as plain articles.
function projectSlides(item: Item): Slide[] {
  const slides: Slide[] = [];
  if (isYouTubeSrc(item.videoUrl)) {
    slides.push({ src: item.videoUrl as string, poster: item.cover });
  } else if (
    item.cover &&
    !item.gallery.some((g) => g.src === item.cover)
  ) {
    slides.push({
      src: item.cover,
      srcFallback: item.coverFallback,
      lqip: item.coverLqip,
      caption: item.coverCaption,
    });
  }
  for (const g of item.gallery) {
    slides.push({
      src: g.src,
      srcFallback: g.srcFallback,
      lqip: g.lqip,
      poster: g.poster,
      caption: g.caption,
    });
  }
  return slides;
}

export function ItemDetail({ item }: Props) {
  if (item.kind !== "blog") {
    const slides = projectSlides(item);
    if (slides.length > 0) {
      return <LabSplit item={item} slides={slides} />;
    }
  }
  // News videos read like ramine.net talks: player on top, title and
  // description right below.
  if (
    item.kind === "blog" &&
    item.kicker === "Video" &&
    isYouTubeSrc(item.videoUrl)
  ) {
    return <VideoDetail item={item} />;
  }
  // Blog: split entries render two-pane in BOTH modal and page (a live demo
  // deserves the full page). Everything else reads as an article.
  if (item.kind === "blog" && blogIsSplit(item)) {
    return <LabSplit item={item} />;
  }
  return <DefaultDetail item={item} />;
}

// in-site lightbox; only true externals leave the site.
function LinksBlock({
  links,
  delay,
}: {
  links: LinkRef[];
  delay: number;
}) {
  const [video, setVideo] = useState<string | null>(null);
  if (links.length === 0) return null;
  return (
    <div className="modal-links blur-in" style={delayed(delay)}>
      {links.map((l, i) => {
        if (isYouTubeSrc(l.href)) {
          return (
            <a
              key={i}
              href={l.href}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0)
                  return;
                e.preventDefault();
                setVideo(l.href);
              }}
            >
              {l.label} <span className="ext">▶</span>
            </a>
          );
        }
        const isExternal = /^https?:/.test(l.href);
        if (!isExternal) {
          return (
            <SmartLink key={i} href={l.href}>
              {l.label}
            </SmartLink>
          );
        }
        return (
          <a key={i} href={l.href} target="_blank" rel="noopener noreferrer">
            {l.label} <span className="ext">↗</span>
          </a>
        );
      })}
      {video && <VideoLightbox url={video} onClose={() => setVideo(null)} />}
    </div>
  );
}

// The author line under a blog post's title: monogram avatar + name + date +
// reading time. Blog posts carry the site author's byline, so it renders
// only rides blog entries (writing items are often third-party coverage OF him,
// there (unlike linked writing elsewhere, where a site byline would misattribute).
// Press and video entries are authored by their outlet or channel, not the
// team; only 1379.tech writing carries the site author's byline.
function articleAuthor(item: Item): string {
  if ((item.kicker === "Press" || item.kicker === "Video") && item.venue) {
    return item.venue;
  }
  return SITE.author;
}

export function ArticleByline({ item, delay = 200 }: { item: Item; delay?: number }) {
  const author = articleAuthor(item);
  const meta = [
    formatArticleDate(item.date || item.year),
    item.body ? `${readingTimeMin(item.body)} min read` : "",
  ]
    .filter(Boolean)
    .join("  ·  ");
  return (
    <div className="article-byline blur-in" style={delayed(delay)}>
      <span className="article-avatar" aria-hidden="true">
        {author.charAt(0) || "?"}
      </span>
      <span className="article-byline-text">
        <span className="article-author">{author}</span>
        {meta && <span className="article-byline-meta">{meta}</span>}
      </span>
    </div>
  );
}

// A closing sign-off card at the foot of a blog post: monogram + a one-line
// standing bio + the post date. Derived purely from the item so the CMS live
// preview reflects streamed drafts.
function ArticleEndCard({ item }: { item: Item }) {
  const date = formatArticleDate(item.date || item.year);
  return (
    <aside className="article-endcard">
      <span className="article-endcard-avatar" aria-hidden="true">
        {SITE.author.charAt(0) || "?"}
      </span>
      <div className="article-endcard-text">
        <span className="article-endcard-name">Written by {SITE.author}</span>
        <span className="article-endcard-line">
          Building recompilation ecosystems for legacy games.
        </span>
        {date && <span className="article-endcard-date">{date}</span>}
      </div>
    </aside>
  );
}

// A small linked tile for a game: cover, title, status. Used by the platform
// pages' games showcase and the related-games strip on game pages.
function GameTile({ game }: { game: Item }) {
  const link = useItemNavigate(game);
  return (
    <a className="game-tile" href={link.href} onClick={link.onClick}>
      {game.cover ? (
        <img
          className="game-tile-cover"
          src={game.cover}
          alt=""
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="game-tile-cover game-tile-cover--blank" aria-hidden="true">
          {game.title.charAt(0)}
        </span>
      )}
      <span className="game-tile-text">
        <span className="game-tile-title">{game.title}</span>
        {game.status && <span className="game-tile-status">{game.status}</span>}
      </span>
    </a>
  );
}

// Platform pages showcase the games that run on them, linked to their pages.
function PlatformGames({ item }: { item: Item }) {
  const games = itemsForKind("game").filter((g) => g.platform === item.slug);
  if (games.length === 0) return null;
  return (
    <div className="platform-games">
      <h2 className="platform-games-title">Games on {item.title}</h2>
      <div className="game-tile-grid">
        {games.map((g) => (
          <GameTile key={g.slug} game={g} />
        ))}
      </div>
    </div>
  );
}

// Game pages end with the other games on the same platform.
function RelatedGames({ item }: { item: Item }) {
  if (item.kind !== "game" || !item.platform) return null;
  const sibs = itemsForKind("game").filter(
    (g) => g.slug !== item.slug && g.platform === item.platform,
  );
  if (sibs.length === 0) return null;
  const hw = itemsForKind("hardware").find((h) => h.slug === item.platform);
  return (
    <div className="related-games">
      <h2 className="platform-games-title">
        More on {hw ? hw.title : "this platform"}
      </h2>
      <div className="game-tile-grid">
        {sibs.slice(0, 6).map((g) => (
          <GameTile key={g.slug} game={g} />
        ))}
      </div>
    </div>
  );
}

// Singular noun per kind for the "Previous / Next …" labels.
const ADJ_NOUN: Record<string, string> = {
  hardware: "platform",
  game: "project",
  blog: "article",
};

function AdjacentItemLink({
  item,
  position,
}: {
  item: Item;
  position: "prev" | "next";
}) {
  const link = useItemNavigate(item);
  const noun = ADJ_NOUN[item.kind] ?? "item";
  return (
    <a
      className={"adjacent-link adjacent-link--" + position}
      href={link.href}
      onClick={link.onClick}
    >
      <span className="adjacent-label">
        {position === "prev" ? `Previous ${noun}` : `Next ${noun}`}
      </span>
      <span className="adjacent-title">{item.title}</span>
    </a>
  );
}

// Previous / next cards for the item's own kind (projects, articles, talks),
// wrapping around at the ends. Shown at the bottom of a detail view.
function AdjacentItems({ item }: { item: Item }) {
  const list = itemsForKind(item.kind);
  if (list.length < 2) return null;
  const idx = list.findIndex((i) => i.slug === item.slug);
  if (idx < 0) return null;
  const prev = list[(idx - 1 + list.length) % list.length];
  const next = list[(idx + 1) % list.length];
  const noun = ADJ_NOUN[item.kind] ?? "item";
  return (
    <nav className="adjacent-row" aria-label={`More ${noun}s`}>
      <AdjacentItemLink item={prev} position="prev" />
      <AdjacentItemLink item={next} position="next" />
    </nav>
  );
}

// ProjectSplit, but the right pane can be the running thing, and it renders on the full page too.
function LabSplit({ item, slides: slidesProp }: { item: Item; slides?: Slide[] }) {
  const slides: Slide[] = slidesProp ?? item.gallery.map((g) => ({
    src: g.src,
    srcFallback: g.srcFallback,
    lqip: g.lqip,
    poster: g.poster,
    caption: g.caption,
  }));
  const leftRef = useRef<HTMLElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;
    if (item.kind === "hardware") return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      left.scrollBy({ top: e.deltaY, behavior: "auto" });
    };
    right.addEventListener("wheel", onWheel, { passive: false });
    return () => right.removeEventListener("wheel", onWheel);
  }, []);
  return (
    <div
      className={
        "project-split lab-split" +
        (item.kind === "hardware" ? " project-split--hardware" : "")
      }
    >
      <aside className="project-split-left" ref={leftRef}>
        <div className="project-split-inner">
          <BlurText as="h1" className="modal-title" text={item.title} stagger={12} duration={360} delay={40} />
          {(item.kicker || item.tags.length > 0) && (
            <div className="modal-tags blur-in" style={delayed(160)}>
              {item.kicker &&
                (item.kind === "game" && item.platform ? (
                  <SmartLink
                    className="proj-tag proj-tag--kicker proj-tag--link"
                    href={`/hardware/${item.platform}`}
                  >
                    {item.kicker}
                  </SmartLink>
                ) : (
                  <span className="proj-tag proj-tag--kicker">{item.kicker}</span>
                ))}
              {item.tags.map((t) => (
                <span key={t} className="proj-tag">{t}</span>
              ))}
            </div>
          )}
          {item.kind === "blog" && <ArticleByline item={item} delay={240} />}
          {item.kind !== "blog" &&
            (item.status ||
              item.availability ||
              item.arch ||
              item.provenance ||
              item.verified ||
              item.meta.length > 0) && (
              <div className="modal-meta blur-in" style={delayed(220)}>
                {item.status && <span className="pill">{item.status}</span>}
                {item.availability && <span className="pill">{item.availability}</span>}
                {item.provenance && (
                  <span className="pill">
                    {item.provenance === "core" ? "Core project" : "Community project"}
                  </span>
                )}
                {item.arch && <span className="pill">{item.arch}</span>}
                {item.meta.map((m, i) => (
                  <span key={i} className="pill">
                    {m}
                  </span>
                ))}
                {item.verified && (
                  <span className="pill">Last verified {formatArticleDate(item.verified)}</span>
                )}
              </div>
            )}
          {item.kind !== "blog" && item.repo && (
            <a
              className="project-cta blur-in"
              style={delayed(280)}
              href={item.repo}
              target="_blank"
              rel="noopener noreferrer"
            >
              Get the project on GitHub <span className="ext">↗</span>
            </a>
          )}
          {item.body && (
            <div className="blur-in" style={delayed(320)}>
              <Markdown className="modal-content">{item.body}</Markdown>
            </div>
          )}
          <LinksBlock links={item.links} delay={520} />
          {item.kind !== "blog" && (
          <p className="game-data-notice blur-in" style={delayed(480)}>
            Game files not included. This project requires a dump you provide
            yourself.
          </p>
        )}
        {item.kind === "blog" && articleAuthor(item) === SITE.author && (
          <ArticleEndCard item={item} />
        )}
          {item.kind === "game" && <RelatedGames item={item} />}
          <AdjacentItems item={item} />
        </div>
      </aside>
      <div className="project-split-right" ref={rightRef}>
        {item.demo ? (
          <>
            {/* Action-bar strip across the right half: the modal's prev/next/close float in
                here so they never cover the demo's own top-right UI. The demo sits BELOW it. */}
            <div className="lab-demo-bar">
              <span className="lab-demo-bar-label">Live demo</span>
            </div>
            <iframe
              className="lab-demo-frame"
              src={item.demo}
              title={`${item.title} · live demo`}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; microphone; xr-spatial-tracking; fullscreen"
              allowFullScreen
            />
          </>
        ) : (
          <>
            <ProjectCarousel slides={slides} showThumbs autoplayDelay={3000} />
            {item.kind === "hardware" && <PlatformGames item={item} />}
          </>
        )}
      </div>
    </div>
  );
}

function DefaultDetail({ item }: { item: Item }) {
  const isArticle = item.kind === "blog";
  // The cover media, shared between the standalone hero (project pages) and the
  // in-masthead figure (articles). Articles keep the cover INSIDE
  // .modal-body--article so the desktop modal's click-outside bounds still fit.
  const coverMedia = item.cover ? (
    isVideoSrc(item.cover) ? (
      <video
        className="img"
        poster={item.poster}
        muted
        loop
        playsInline
        autoPlay
        preload="metadata"
      >
        <source src={item.cover} />
        {item.coverFallback && <source src={item.coverFallback} />}
      </video>
    ) : (
      <img className="img" src={item.cover} alt={item.title} loading="lazy" />
    )
  ) : null;

  const hasVideoHero =
    (item.kind !== "blog" || item.kicker === "Video") && isYouTubeSrc(item.videoUrl);
  return (
    <>
      {hasVideoHero && <VideoHero item={item} />}
      {!isArticle && !hasVideoHero && item.cover && (
        <div className="modal-hero">{coverMedia}</div>
      )}

      <div
        className={
          `modal-body modal-body--${item.kind}` +
          (isArticle ? " modal-body--article" : "")
        }
      >
        {isArticle ? (
          <header
            className={
              "article-masthead" + (item.cover ? "" : " article-masthead--band")
            }
          >
            {/* Eyebrow is blog-only: writing items set kicker == venue, so an
                eyebrow would duplicate the "Originally published on {venue}"
                line below. Writing credits its source through that line. */}
            {item.kind === "blog" && item.kicker && (
              <BlurText
                as="div"
                className="modal-kicker"
                text={item.kicker}
                stagger={8}
                duration={320}
              />
            )}
            <BlurText
              as="h1"
              className="modal-title"
              text={item.title}
              stagger={12}
              duration={360}
              delay={40}
            />
            {item.kind === "blog" && <ArticleByline item={item} />}
            {item.kind === "blog" && item.venue && item.links[0] && (
              <div className="modal-meta blur-in" style={delayed(220)}>
                <a
                  href={item.links[0].href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="modal-published-link"
                >
                  {item.kicker === "Video" ? "Watch on" : "Originally published on"}{" "}
                  {item.venue} <span className="ext">↗</span>
                </a>
              </div>
            )}
            {coverMedia && !hasVideoHero && (
              <figure className="article-cover">
                {coverMedia}
                {item.coverCaption && (
                  <figcaption className="article-cover-cap md-figcaption">
                    {item.coverCaption}
                  </figcaption>
                )}
              </figure>
            )}
          </header>
        ) : (
          <>
            {item.kicker && (
              <BlurText
                as="div"
                className="modal-kicker"
                text={item.kicker}
                stagger={8}
                duration={320}
              />
            )}
            <BlurText
              as="h1"
              className="modal-title"
              text={item.title}
              stagger={12}
              duration={360}
              delay={40}
            />
            {item.tags.length > 0 && (
              <div className="modal-tags blur-in" style={delayed(160)}>
                {item.tags.map((t) => (
                  <span key={t} className="proj-tag">
                    {t}
                  </span>
                ))}
              </div>
            )}
            {(item.venue ||
              item.status ||
              item.availability ||
              item.arch ||
              item.provenance ||
              item.verified ||
              item.meta.length > 0) && (
              <div className="modal-meta blur-in" style={delayed(220)}>
                {item.status && <span className="pill">{item.status}</span>}
                {item.availability && <span className="pill">{item.availability}</span>}
                {item.provenance && (
                  <span className="pill">
                    {item.provenance === "core" ? "Core project" : "Community project"}
                  </span>
                )}
                {item.arch && <span className="pill">{item.arch}</span>}
                {item.venue && <span className="pill">{item.venue}</span>}
                {item.meta.map((m, i) => (
                  <span key={i} className="pill">
                    {m}
                  </span>
                ))}
                {item.verified && (
                  <span className="pill">Last verified {formatArticleDate(item.verified)}</span>
                )}
              </div>
            )}
            {item.repo && (
              <a
                className="project-cta blur-in"
                style={delayed(280)}
                href={item.repo}
                target="_blank"
                rel="noopener noreferrer"
              >
                Get the project on GitHub <span className="ext">↗</span>
              </a>
            )}
          </>
        )}

        {item.body && (
          <div className="blur-in" style={delayed(320)}>
            <Markdown className="modal-content">{item.body}</Markdown>
          </div>
        )}

        {item.gallery.length > 0 && (
          <div className="modal-gallery blur-in" style={delayed(420)}>
            {item.gallery.map((g, i) =>
              isYouTubeSrc(g.src) ? (
                // Embedded talk/demo videos sit in the gallery like any other
                // slide (the mobile carousel already supports this).
                <iframe
                  key={i}
                  className="g-item g-item--embed"
                  src={youtubeEmbedUrl(g.src)}
                  title={g.caption || "Video"}
                  loading="lazy"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : isVideoSrc(g.src) ? (
                <video
                  key={i}
                  className="g-item"
                  poster={g.lqip}
                  muted
                  loop
                  playsInline
                  autoPlay
                  preload="metadata"
                >
                  <source src={g.src} />
                  {g.srcFallback && <source src={g.srcFallback} />}
                </video>
              ) : (
                <img
                  key={i}
                  className="g-item"
                  src={g.src}
                  alt={g.caption || ""}
                  loading="lazy"
                />
              ),
            )}
          </div>
        )}

        {(() => {
          // Blog entries with a venue surface links[0] as the "Originally
          // published" line above; show any remaining links here. Other kinds
          // show all their links.
          const startAt =
            item.kind === "blog" && item.venue && item.links[0] ? 1 : 0;
          return <LinksBlock links={item.links.slice(startAt)} delay={520} />;
        })()}
        {item.kind !== "blog" && (
          <p className="game-data-notice blur-in" style={delayed(480)}>
            Game files not included. This project requires a dump you provide
            yourself.
          </p>
        )}
        {item.kind === "blog" && articleAuthor(item) === SITE.author && (
          <ArticleEndCard item={item} />
        )}
        {item.kind === "game" && <RelatedGames item={item} />}
        {/* Previous / next cards, like the project modal. Articles get article
            siblings; project pages get project siblings. */}
        <AdjacentItems item={item} />
      </div>
    </>
  );
}

