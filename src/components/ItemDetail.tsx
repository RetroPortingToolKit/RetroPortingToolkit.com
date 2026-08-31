import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Item } from "@/lib/types";
import { SITE } from "@/lib/site";
import { itemsForCatalogKind } from "@/lib/catalogContent";
import {
  formatArticleDate,
  isVideoSrc,
  isYouTubeSrc,
  readingTimeMin,
  youtubeEmbedUrl,
  youtubeThumb,
} from "@/lib/contentCore";
import { useItemNavigate } from "@/lib/useItemNavigate";
import { svgCover } from "@/lab/labContent";
import { chipColorFor, CHIP_PALETTE } from "@/lib/chipColor";
import { Markdown } from "./Markdown";
import { BlurText } from "./BlurText";
import { LazyProjectCarousel, type Slide } from "./LazyProjectCarousel";
import { SmartLink } from "./SmartLink";
import { VideoLightbox } from "./VideoLightbox";
import type { LinkRef } from "@/lib/types";

interface Props {
  item: Item;
  variant?: "modal" | "page";
  /** False while another modal covers this detail. Rich media is replaced by
      static poster content so hidden players and decoders release their work. */
  mediaActive?: boolean;
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

// News video pages use the talk layout this template came with: a
// viewport-capped stage with the title, channel and date, and the description
// visible below it without scrolling.
function VideoDetail({ item, mediaActive }: { item: Item; mediaActive: boolean }) {
  const embed = youtubeEmbedUrl(item.videoUrl ?? "");
  if (!embed) return null;
  const meta = [item.venue, formatArticleDate(item.date || item.year)]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="modal-article">
      <div className="talk-detail">
        <div className="talk-detail-stage">
          {/* The player is embedded on open and starts muted, the way the
              talk pages this layout comes from behave. Videos are embedded,
              never re-hosted. */}
          {mediaActive ? (
            <iframe
              className="talk-detail-iframe"
              src={embed}
              title={item.title}
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <img
              className="talk-detail-cover"
              src={item.cover || youtubeThumb(item.videoUrl)}
              alt=""
              aria-hidden="true"
            />
          )}
        </div>
        <div className="talk-detail-meta">
          <h1 className="talk-detail-title">{item.title}</h1>
          {meta && <div className="talk-detail-date">{meta}</div>}
          {item.body && (
            <Markdown className="talk-detail-desc" mediaActive={mediaActive}>
              {item.body}
            </Markdown>
          )}
        </div>
        <AdjacentItems item={item} />
      </div>
    </div>
  );
}

export function ItemDetail({ item, mediaActive = true }: Props) {
  if (item.kind === "hardware") {
    return <LabSplit item={item} slides={[]} mediaActive={mediaActive} />;
  }
  // News videos read like ramine.net talks: player on top, title and
  // description right below.
  if (
    item.kind === "blog" &&
    item.kicker === "Video" &&
    isYouTubeSrc(item.videoUrl)
  ) {
    return <VideoDetail item={item} mediaActive={mediaActive} />;
  }
  // Blog: split entries render two-pane in BOTH modal and page (a live demo
  // deserves the full page). Everything else reads as an article.
  if (item.kind === "blog" && blogIsSplit(item)) {
    return <LabSplit item={item} mediaActive={mediaActive} />;
  }
  return <DefaultDetail item={item} mediaActive={mediaActive} />;
}

// in-site lightbox; only true externals leave the site.
function LinksBlock({
  links,
  delay,
  mediaActive = true,
}: {
  links: LinkRef[];
  delay: number;
  mediaActive?: boolean;
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
      {video && mediaActive && <VideoLightbox url={video} onClose={() => setVideo(null)} />}
    </div>
  );
}

// The author line under a blog post's title: monogram avatar + name + date +
// reading time. Blog posts carry the site author's byline, so it renders
// only rides blog entries (writing items are often third-party coverage OF him,
// there (unlike linked writing elsewhere, where a site byline would misattribute).
// Press and video entries are authored by their outlet or channel, not the
// team; only 1379.tech writing carries the site author's byline.
/** The sign-off belongs to a person who wrote the piece. Press and video
    entries are bylined to an outside outlet, which does not sign off. */
function showsEndCard(item: Item): boolean {
  if (item.author) return true;
  return articleAuthor(item) === SITE.author;
}

function articleAuthor(item: Item): string {
  // An explicit byline wins: whoever wrote the page said so on the page.
  if (item.author) return item.author;
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
      {item.authorAvatar ? (
        <img className="article-endcard-avatar" src={item.authorAvatar} alt="" aria-hidden="true" />
      ) : (
        <span className="article-endcard-avatar" aria-hidden="true">
          {articleAuthor(item).charAt(0) || "?"}
        </span>
      )}
      <div className="article-endcard-text">
        <span className="article-endcard-name">Written by {articleAuthor(item)}</span>
        <span className="article-endcard-line">
          {item.authorBio || "Building recompilation ecosystems for legacy games."}
        </span>
        {date && <span className="article-endcard-date">{date}</span>}
      </div>
    </aside>
  );
}

// A small linked tile for a game: cover, title, status. Used by the platform
// pages' games showcase and the related-games strip on game pages.
function GameTile({ game, showStatus = true }: { game: Item; showStatus?: boolean }) {
  const link = useItemNavigate(game);
  return (
    <a className="game-tile" href={link.href} onClick={link.onClick}>
      <img
        className="game-tile-cover"
        src={
          game.cover ??
          svgCover(
            game.title,
            game.kicker,
            chipColorFor(game.kicker) ?? CHIP_PALETTE[game.title.length % CHIP_PALETTE.length],
          )
        }
        alt=""
        srcSet={game.coverSrcSet}
        sizes="(max-width: 760px) 42vw, 210px"
        loading="lazy"
        decoding="async"
      />
      <span className="game-tile-text">
        <span className="game-tile-title">{game.title}</span>
        {showStatus && game.status && <span className="game-tile-status">{game.status}</span>}
      </span>
    </a>
  );
}

// Platform pages showcase the games that run on them, linked to their pages.
function PlatformGames({ item }: { item: Item }) {
  const games = itemsForCatalogKind("game").filter(
    (g) => g.platform === item.slug && g.showOnPlatform !== false,
  );
  if (games.length === 0) return null;
  return (
    <div className="platform-games">
      <h2 className="platform-games-title">Games on {item.title}</h2>
      <div className="game-tile-grid">
        {games.map((g) => (
          <GameTile key={g.slug} game={g} showStatus={false} />
        ))}
      </div>
    </div>
  );
}

// Game pages end with the other games on the same platform.
function RelatedGames({ item }: { item: Item }) {
  if (item.kind !== "game" || !item.platform) return null;
  const sibs = itemsForCatalogKind("game").filter(
    (g) => g.slug !== item.slug && g.platform === item.platform,
  );
  if (sibs.length === 0) return null;
  const hw = itemsForCatalogKind("hardware").find((h) => h.slug === item.platform);
  return (
    <div className="related-games">
      <h2 className="platform-games-title">
        <SmartLink
          className="platform-games-title-link"
          href={`/hardware/${item.platform}`}
        >
          More on {hw ? hw.title : "this platform"} →
        </SmartLink>
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
  docs: "page",
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
  const list = itemsForCatalogKind(item.kind);
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
function LabSplit({
  item,
  slides: slidesProp,
  mediaActive,
}: {
  item: Item;
  slides?: Slide[];
  mediaActive: boolean;
}) {
  const slides: Slide[] = slidesProp ?? item.gallery.map((g) => ({
    src: g.src,
    srcSet: g.srcSet,
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
          {item.kicker && item.kind === "game" && (
            <div className="modal-tags blur-in" style={delayed(160)}>
              {/* One chip, styled exactly like the card chips. Feature tags
                  were noise; the body covers the features. Game chips link to
                  the platform page. */}
              {item.kind === "game" && item.platform ? (
                <SmartLink
                  className="tvcard-chip tvcard-chip--link"
                  href={`/hardware/${item.platform}`}
                >
                  <span
                    className="tvcard-chip-bg"
                    style={{ background: chipColorFor(item.kicker) ?? CHIP_PALETTE[0] }}
                  >
                    {item.kicker}
                  </span>
                </SmartLink>
              ) : (
                <span
                  className="tvcard-chip"
                  style={{ background: chipColorFor(item.kicker) ?? CHIP_PALETTE[0] }}
                >
                  {item.kicker}
                </span>
              )}
            </div>
          )}
          {item.kind === "blog" && <ArticleByline item={item} delay={240} />}
          {/* One pill, the only one a reader needs at a glance: can I play it?
              Provenance, packaging, architecture and verification dates are
              jargon here; the writeup and Sources carry them. */}
          {item.kind !== "blog" && item.status && (
            <div className="modal-meta blur-in" style={delayed(220)}>
              <span className="pill">{item.status}</span>
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
              <Markdown className="modal-content" mediaActive={mediaActive}>
                {item.body}
              </Markdown>
            </div>
          )}
          <LinksBlock links={item.links} delay={520} mediaActive={mediaActive} />
          {item.kind !== "blog" && (
          <p className="game-data-notice blur-in" style={delayed(480)}>
            Game files not included. This project requires a dump you provide
            yourself.
          </p>
        )}
        {item.kind === "blog" && showsEndCard(item) && (
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
            {mediaActive ? (
              <iframe
                className="lab-demo-frame"
                src={item.demo}
                title={`${item.title} · live demo`}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; microphone; xr-spatial-tracking; fullscreen"
                allowFullScreen
              />
            ) : item.cover && !isVideoSrc(item.cover) ? (
              <img className="lab-demo-frame" src={item.cover} alt="" aria-hidden="true" />
            ) : (
              <div className="lab-demo-frame" aria-hidden="true" />
            )}
          </>
        ) : item.kind === "hardware" ? (
          // A platform's media pane is its catalog. Console art and a lone
          // clip added nothing that the game cards do not say better.
          <PlatformGames item={item} />
        ) : mediaActive ? (
            <LazyProjectCarousel slides={slides} showThumbs autoplayDelay={3000} />
        ) : slides[0]?.poster || slides[0]?.lqip ? (
            <img
              className="lab-demo-frame"
              src={slides[0].poster ?? slides[0].lqip}
              alt=""
              aria-hidden="true"
            />
        ) : (
            <div className="lab-demo-frame" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}

function DefaultDetail({ item, mediaActive }: { item: Item; mediaActive: boolean }) {
  // Game pages read as articles: one column, with the video embeds and
  // screenshots placed inline through the body where they earn their spot.
  const isArticle = item.kind === "blog" || item.kind === "game";
  // The cover media, shared between the standalone hero (project pages) and the
  // in-masthead figure (articles). Articles keep the cover INSIDE
  // .modal-body--article so the desktop modal's click-outside bounds still fit.
  const coverMedia = item.cover ? (
    isVideoSrc(item.cover) && mediaActive ? (
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
    ) : isVideoSrc(item.cover) ? (
      item.poster || item.coverLqip ? (
        <img
          className="img"
          src={item.poster ?? item.coverLqip}
          alt=""
          aria-hidden="true"
        />
      ) : null
    ) : (
      <img
        className="img"
        src={item.cover}
        srcSet={item.coverSrcSet}
        sizes="(max-width: 760px) 92vw, 860px"
        alt={item.title}
        loading="lazy"
      />
    )
  ) : null;

  // No lead video hero: blog videos use VideoDetail, and a game's video is
  // embedded inline in its body.
  const hasVideoHero = false;
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
            {/* A game article still has to answer the two questions a card
                answers: which platform, and can I play it. Then the one link
                that matters. An article about a project, a library say, has no
                platform and nothing to play, but the repository is still the
                link the reader wants, so it earns the same button. */}
            {(item.kind === "game" || item.repo) && (
              <div className="article-projectmeta blur-in" style={delayed(200)}>
                {item.kind === "game" && item.kicker && item.platform && (
                  <SmartLink
                    className="tvcard-chip tvcard-chip--link"
                    href={`/hardware/${item.platform}`}
                  >
                    <span
                      className="tvcard-chip-bg"
                      style={{ background: chipColorFor(item.kicker) ?? CHIP_PALETTE[0] }}
                    >
                      {item.kicker}
                    </span>
                  </SmartLink>
                )}
                {item.kind === "game" && item.status && <span className="pill">{item.status}</span>}
                {item.repo && (
                  <a
                    className="project-cta"
                    href={item.repo}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Get the project on GitHub <span className="ext">↗</span>
                  </a>
                )}
              </div>
            )}
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
            {item.kicker &&
              item.kind !== "hardware" &&
              (item.kind === "game" && item.platform ? (
                <SmartLink
                  className="tvcard-chip tvcard-chip--link"
                  href={`/hardware/${item.platform}`}
                >
                  <span
                    className="tvcard-chip-bg"
                    style={{ background: chipColorFor(item.kicker) ?? CHIP_PALETTE[0] }}
                  >
                    {item.kicker}
                  </span>
                </SmartLink>
              ) : (
                <span
                  className="tvcard-chip"
                  style={{ background: chipColorFor(item.kicker) ?? CHIP_PALETTE[0] }}
                >
                  {item.kicker}
                </span>
              ))}
            <BlurText
              as="h1"
              className="modal-title"
              text={item.title}
              stagger={12}
              duration={360}
              delay={40}
            />
            {item.kind === "blog" && item.venue && (
              <div className="modal-meta blur-in" style={delayed(220)}>
                <span className="pill">{item.venue}</span>
              </div>
            )}
            {item.kind !== "blog" && item.status && (
              <div className="modal-meta blur-in" style={delayed(220)}>
                <span className="pill">{item.status}</span>
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
            <Markdown className="modal-content" mediaActive={mediaActive}>
              {item.body}
            </Markdown>
          </div>
        )}

        {item.gallery.length > 0 && (
          <div className="modal-gallery blur-in" style={delayed(420)}>
            {item.gallery.map((g, i) =>
              isYouTubeSrc(g.src) && mediaActive ? (
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
              ) : isYouTubeSrc(g.src) ? (
                <img
                  key={i}
                  className="g-item"
                  src={youtubeThumb(g.src)}
                  alt={g.caption || "Video"}
                  loading="lazy"
                />
              ) : isVideoSrc(g.src) && mediaActive ? (
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
              ) : isVideoSrc(g.src) ? (
                g.poster || g.lqip ? (
                  <img
                    key={i}
                    className="g-item"
                    src={g.poster ?? g.lqip}
                    alt={g.caption || ""}
                    loading="lazy"
                  />
                ) : null
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
          return (
            <LinksBlock
              links={item.links.slice(startAt)}
              delay={520}
              mediaActive={mediaActive}
            />
          );
        })()}
        {item.kind !== "blog" && (
          <p className="game-data-notice blur-in" style={delayed(480)}>
            Game files not included. This project requires a dump you provide
            yourself.
          </p>
        )}
        {item.kind === "blog" && showsEndCard(item) && (
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
