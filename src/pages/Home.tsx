import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Tabs, type TabId } from "@/components/Tabs";
// The bar's contents live outside this file: the documentation shell renders
// the SAME bar, and a nav that differed from one section to the next is the
// defect this shared module exists to stop.
import { NAV_TABS, TAB_ORDER, TAB_PATH } from "@/components/navTabs";
import { SmartLink } from "@/components/SmartLink";
import { SpatialCard } from "@/components/SpatialCard";
import { FeedButton } from "@/components/FeedLink";
import { chipColorFor, CHIP_PALETTE } from "@/lib/chipColor";
import { HeroReel } from "@/components/HeroReel";
import {
  labAll,
  type LabKind,
  type LabMedia,
} from "@/lab/labContent";
import { GAMES, HARDWARE, findCatalogItem } from "@/lib/catalogContent";
import { pathFor } from "@/lib/contentCore";
import { useAbout } from "@/lib/about";
import {
  titleForCollection,
  titleForHome,
  useDocumentTitle,
} from "@/lib/pageTitle";
import { useOverlayOpen } from "@/lib/overlay";
import { previewFor } from "@/generated/previews";
import {
  PROOF_PRIMARY,
  CONSTRAINTS_INTRO,
  STORIES,
  PLATFORM_NOTE,
  FEATURED,
  ACTION,
  FEATURED_POST,
  SECTION_TITLES,
  renderSegments,
} from "@/lib/homeContent";

// Must equal what scripts/vite-prerender.mjs serves for each tab's route, so
// hydration does not replace the served title with a different one. Built from
// src/lib/pageTitle.ts, which is asserted against the prerender in its test.
const TAB_TITLE: Record<TabId, string> = {
  home: titleForHome(),
  hardware: titleForCollection("hardware"),
  game: titleForCollection("game"),
  blog: titleForCollection("blog"),
};

// Apple-marquee orphan protection: glue the final word pair of a line with a
// no-break space so natural wrapping never strands a single word.
function glueOrphan(text: string): string {
  return text.replace(/ (\S+)$/, "\u00A0$1");
}

// An arrow that lives INSIDE the section-title link (one big click target).
function HeadArrow() {
  return (
    <svg width="17" height="17" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2.5 8H12M8.5 4.5 12 8 8.5 11.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// One shared media card for See it in action: static 16:9 poster, play badge,
// creator attribution, one-line blurb. Never autoplays; the whole card is a
// link (keyboard-activatable by nature).
// Home cards are the same cards as the catalog: same component, same tilt,
// same canvas-decoded clip. Only the blurb differs, since the home page says
// something specific about why an item is here.
function homeCard(
  slug: string,
  blurb: string,
  fallbackCover: string,
  /** force the still: for cards whose claim is something the clip does not
      show, where motion would contradict the copy */
  forceStill = false,
  /** "Watch it run" features whatever carries the video, which is not always
      a game: a library's own article can be the page that has the footage.
      LabKind, not Kind: this builds a card, and only the kinds that HAVE a card
      belong on the home page (docs are a page tree, not a poster). */
  kind: LabKind = "game",
): LabMedia | null {
  const item = findCatalogItem(kind, slug);
  if (!item) return null;
  const clip = forceStill ? undefined : previewFor(slug);
  const color =
    item.kickerColor ?? chipColorFor(item.kicker) ?? CHIP_PALETTE[slug.length % CHIP_PALETTE.length];
  return {
    src: clip ? clip.mp4 : (item.cover ?? fallbackCover),
    poster: clip?.poster,
    slug,
    title: item.title,
    kicker: item.kicker,
    desc: blurb,
    tags: item.tags,
    color,
    kind,
    video: !!clip,
  };
}

function SectionHead({
  title,
  to,
  count,
  onNav,
}: {
  title: string;
  to: string;
  count: number;
  onNav: (path: string) => void;
}) {
  return (
    <div className="hn-section-head" data-reveal>
      <h2 className="hn-h2">
        {/* Title + arrow are ONE link with a padded hit area (easy on mobile);
            the onClick routes through the directional slide transition. */}
        <Link
          to={to}
          className="hn-head-link"
          aria-label={`All ${count} ${title.toLowerCase()}`}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            e.preventDefault();
            onNav(to);
          }}
        >
          {title}
          <HeadArrow />
        </Link>
      </h2>
    </div>
  );
}

const GRID_TITLES: Record<LabKind, string> = {
  hardware: "Platforms",
  game: "Games",
  blog: "Blog",
};

const GRID_SUBS: Record<LabKind, string> = {
  hardware:
    "One toolset per console: a static recompiler that translates its games ahead of time, plus a runtime that provides the services those games expect. Sorted by how many games run on each.",
  game:
    "Game projects and community ports, from the core team and the community. You provide your own legally dumped game files; nothing here includes game data.",
  blog: "Project updates from the team, plus press and videos from the wider community.",
};

// A full-catalog tab page. Items carry an optional `group` (from frontmatter):
// grouped items render under their group heading in first-appearance order,
// which the NN_ folder prefixes control. Ungrouped items lead.
function TabGrid({
  kind,
  onOpen,
  still = false,
}: {
  kind: LabKind;
  onOpen: (m: LabMedia) => void;
  still?: boolean;
}) {
  // News blends everything chronologically with a light filter instead of
  // grouped sections; Videos are the entries whose kicker is "Video".
  // Games: narrow a long catalogue to one console, and choose an order.
  const [gameFilter, setGameFilter] = useState<string>("All");
  const [gameSort, setGameSort] = useState<"updated" | "added" | "name">("updated");
  const all = labAll[kind];
  // Every tab is one blended list now; groups only feed the games filter.
  const groups: { label: string; items: LabMedia[] }[] = [];
  for (const m of all) {
    if (!m.group) continue;
    const g = groups.find((x) => x.label === m.group);
    if (g) g.items.push(m);
    else groups.push({ label: m.group, items: [m] });
  }
  const gameFilters =
    kind === "game" ? ["All", ...groups.map((g) => g.label)] : [];
  const filtered =
    kind === "game" && gameFilter !== "All"
      ? all.filter((m) => m.group === gameFilter)
      : all;
  // Undated projects (the few with no public repository) sort last rather
  // than jumping to the top on an empty string.
  const byDate = (key: "added" | "updated") => (a: LabMedia, b: LabMedia) =>
    (b[key] ?? "").localeCompare(a[key] ?? "");
  const lead =
    kind !== "game"
      ? filtered
      : gameSort === "name"
        ? [...filtered].sort((a, b) => a.title.localeCompare(b.title))
        : [...filtered].sort(byDate(gameSort));
  const shownCount = lead.length;

  return (
    <section className="hn-section hn-subpage-section" aria-label={GRID_TITLES[kind]}>
      <div className="hn-container">
        <header className="hn-tab-head">
          <h1 className="hn-tab-title">{GRID_TITLES[kind]}</h1>
          <span className="hn-tab-count">{shownCount}</span>
          {/* Only the blog has a feed, so only the blog offers one. */}
          {kind === "blog" && <FeedButton />}
        </header>
        <p className="blog-tab-sub">{GRID_SUBS[kind]}</p>
        {kind === "game" && gameFilters.length > 1 && (
          <div className="tab-controls">
            <label className="tab-control">
              <span className="tab-control-label">Platform</span>
              <select
                value={gameFilter}
                onChange={(e) => setGameFilter(e.target.value)}
              >
                {gameFilters.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="tab-control">
              <span className="tab-control-label">Sort by</span>
              <select
                value={gameSort}
                onChange={(e) =>
                  setGameSort(e.target.value as "updated" | "added" | "name")
                }
              >
                <option value="updated">Recently updated</option>
                <option value="added">Recently added</option>
                <option value="name">Name (A to Z)</option>
              </select>
            </label>
          </div>
        )}
        {lead.length > 0 && (
          <div className={kind === "game" ? "tv-grid" : "news-list"}>
            {lead.map((m) => (
              <SpatialCard key={`${m.kind}-${m.slug}`} media={m} onOpen={onOpen} still={still} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// The actual content of one tab, chrome-free, so the live pager can render the
// current page and the incoming neighbor side by side. `interactive` is false
// for the pane being dragged into view: reveals show instantly and the
// scroll-coupled hero effects stay off.
function TabContent({
  tab,
  onOpen,
  onNav,
  interactive,
  tabsRef,
}: {
  tab: TabId;
  onOpen: (m: LabMedia) => void;
  onNav: (path: string) => void;
  interactive: boolean;
  tabsRef?: React.RefObject<HTMLDivElement>;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const isHome = tab === "home";

  const about = useAbout();
  // Sections come straight from data/home.json. parseHome stays exported so a
  // CMS or preview layer can feed it a draft later without touching this page.
  const sections = { proof: PROOF_PRIMARY };
  const featuredPost = FEATURED_POST;

  // After a tab switch, whatever lands under the stationary cursor must NOT
  // light up: freeze card hover until the mouse genuinely moves (>3px).
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("hover-frozen");
    let sx = -1;
    let sy = -1;
    const onMove = (e: MouseEvent) => {
      if (sx < 0) {
        sx = e.clientX;
        sy = e.clientY;
        return;
      }
      if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 3) {
        root.classList.remove("hover-frozen");
        window.removeEventListener("mousemove", onMove);
      }
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      root.classList.remove("hover-frozen");
    };
  }, [tab]);

  // Reveal text sections as they enter the viewport (home only; tab pages and
  // the dragged-in pane show content immediately).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!isHome || !interactive || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      // Trigger almost as soon as the element peeks in: slow scrollers were
      // staring at empty sections with the old -12% / 0.08 gate.
      { rootMargin: "0px 0px -2% 0px", threshold: 0.01 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [isHome, interactive]);

  // Subtle hero parallax + fade on scroll (interactive home only). The nav bar
  // itself is always visible on the home page (see 03-nav.css), so nothing here
  // reveals or hides it.
  useEffect(() => {
    if (!isHome || !interactive) return;
    const hero = heroRef.current;
    if (!hero) return;
    let raf = 0;

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        hero.style.setProperty("--hy", `${y * 0.25}px`);
        // fully faded by ~22% of the viewport
        hero.style.setProperty(
          "--ho",
          String(Math.max(0, 1 - y / (window.innerHeight * 0.22))),
        );
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isHome, interactive, tabsRef]);

  return (
    <div ref={rootRef}>
      {tab === "hardware" && <TabGrid kind="hardware" onOpen={onOpen} still={!interactive} />}
      {tab === "game" && <TabGrid kind="game" onOpen={onOpen} still={!interactive} />}
      {tab === "blog" && <TabGrid kind="blog" onOpen={onOpen} still={!interactive} />}

      {isHome && (
        <>
          <header className="hn-hero" ref={heroRef}>
            <HeroReel still={!interactive} />
            <div className="hn-hero-overlay" aria-hidden="true" />
            <div className="hn-hero-inner">
              {/* visionOS-style marquee: eyebrow -> headline -> copy -> CTA,
                  one centered stack (was: brand pinned top-left + CTA floating
                  bottom-right, which stranded both). */}
              {about.role && <div className="hn-hero-eyebrow">{about.role}</div>}
              {(about.heroTitle || about.headerName) && (
                <p className="hn-title">{about.heroTitle || `Hi, I'm ${about.headerName}`}</p>
              )}
              {(about.tagline || about.bio) && (
                <div className="hn-bio">
                  {/* Apple-style copy block (apple.com/apple-vision-pro +
                      /os/visionos): ONE paragraph, hand-placed <br>s at
                      sentence/clause boundaries shown per breakpoint, and the
                      last word pair of every line glued with a no-break space
                      (Apple peppers &nbsp; through all marquee copy) so no
                      width ever strands an orphan word. */}
                  <p>
                    {glueOrphan(about.tagline ?? "")}
                    {about.bio &&
                      (() => {
                        const idx = about.bio.lastIndexOf(", and ");
                        const head = glueOrphan(
                          idx > 0 ? about.bio.slice(0, idx + 1) : about.bio,
                        );
                        const tail =
                          idx > 0 ? glueOrphan(about.bio.slice(idx + 2)) : "";
                        return (
                          <>
                            <br className="bio-br" />{" "}
                            {head}
                            {tail && (
                              <>
                                <br className="bio-br bio-br--clause" />{" "}
                                {tail}
                              </>
                            )}
                          </>
                        );
                      })()}
                  </p>
                </div>
              )}
              <div className="hn-hero-actions">
                <a
                  className="hn-hero-cta hn-hero-cta--primary"
                  href="/games"
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                    e.preventDefault();
                    onNav("/games");
                  }}
                >
                  Explore games
                </a>
                <a
                  className="hn-hero-cta hn-hero-cta--ghost"
                  href="/hardware"
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                    e.preventDefault();
                    onNav("/hardware");
                  }}
                >
                  Explore platforms
                </a>
              </div>
              <p className="hn-hero-note">
                You provide your own game files. No copyrighted game data is
                included.
              </p>
            </div>
          </header>

          <section className="hn-section" aria-label={SECTION_TITLES.proof}>
            <div className="hn-container">
              <h2 className="hn-h2" data-reveal>
                {SECTION_TITLES.proof}
              </h2>
              <div className="hn-proof" data-reveal>
                {sections.proof.map((line, i) => (
                  <p key={i}>{renderSegments(line)}</p>
                ))}
              </div>
            </div>
          </section>

          <section className="hn-section" aria-label={SECTION_TITLES.constraints}>
            <div className="hn-container">
              <h2 className="hn-h2" data-reveal>
                {SECTION_TITLES.constraints}
              </h2>
              <div className="hn-proof" data-reveal>
                <p>{CONSTRAINTS_INTRO}</p>
              </div>
              <div className="story-grid">
                {STORIES.map((st) => {
                  const slug = st.href.split("/").pop() ?? "";
                  const media = homeCard(slug, st.body, st.image);
                  if (!media) return null;
                  // The story's own headline leads the card, not the game name.
                  return (
                    <SpatialCard
                      key={st.title}
                      media={{ ...media, title: st.title }}
                      onOpen={onOpen}
                      still={!interactive}
                    />
                  );
                })}
              </div>
              {(PLATFORM_NOTE.title || PLATFORM_NOTE.body) && (
                <p className="hn-note" data-reveal>
                  {PLATFORM_NOTE.title && <strong>{PLATFORM_NOTE.title}</strong>}{" "}
                  {PLATFORM_NOTE.body}
                </p>
              )}
            </div>
          </section>

          {featuredPost && (
            <section className="hn-section" aria-label="From the build log">
              <div className="hn-container">
                <SectionHead
                  title={featuredPost.eyebrow}
                  to="/blog"
                  count={labAll.blog.length}
                  onNav={onNav}
                />
                {/* The same card as everywhere else, at feature width: one
                    wide card rather than a lone narrow one in an empty row. */}
                <div className="buildlog-card" data-reveal>
                  <SpatialCard
                    media={{
                      src: featuredPost.cover,
                      slug: featuredPost.slug,
                      title: featuredPost.headline ?? featuredPost.title,
                      kicker: featuredPost.eyebrow,
                      desc: featuredPost.blurb,
                      color: chipColorFor("1379.tech") ?? CHIP_PALETTE[0],
                      kind: "blog",
                      video: false,
                    }}
                    onOpen={onOpen}
                    still={!interactive}
                  />
                </div>
              </div>
            </section>
          )}

          <section className="hn-section" aria-label={SECTION_TITLES.featured}>
            <div className="hn-container">
              <SectionHead
                title={SECTION_TITLES.featured}
                to="/games"
                count={GAMES.length}
                onNav={onNav}
              />
              <div className="home-strip">
                {FEATURED.map((fp) => {
                  const media = homeCard(fp.slug, fp.capability, fp.cover, fp.still === true);
                  const titled = media && { ...media, title: fp.headline ?? media.title };
                  return titled ? (
                    <SpatialCard
                      key={fp.slug}
                      media={titled}
                      onOpen={onOpen}
                      still={!interactive}
                    />
                  ) : null;
                })}
              </div>
            </div>
          </section>

          <section className="hn-section" aria-label={SECTION_TITLES.action} id="action">
            <div className="hn-container">
              <h2 className="hn-h2" data-reveal>
                {SECTION_TITLES.action}
              </h2>
              <div className="home-strip">
                {ACTION.map((card) => {
                  const slug = card.page.split("/").pop() ?? "";
                  const kind: LabKind = card.page.startsWith("/blog/") ? "blog" : "game";
                  const media = homeCard(slug, card.blurb, card.poster, false, kind);
                  if (!media) return null;
                  // The video's title leads here, since this row is coverage.
                  return (
                    <SpatialCard
                      key={card.page}
                      media={{ ...media, title: card.headline ?? card.videoTitle, look: "game" }}
                      onOpen={onOpen}
                      still={!interactive}
                    />
                  );
                })}
              </div>
              <p className="hn-index-links" data-reveal>
                <SmartLink href="/blog" className="hn-rec-link">
                  See all posts
                </SmartLink>
              </p>
            </div>
          </section>

          <section className="hn-section" aria-label="Browse the catalogs">
            <div className="hn-container" data-reveal>
              <p className="hn-index-links">
                Browse the full catalogs:{" "}
                <SmartLink href="/games" className="hn-rec-link">
                  all {GAMES.length} projects
                </SmartLink>{" "}
                ·{" "}
                <SmartLink href="/hardware" className="hn-rec-link">
                  all {HARDWARE.length} platforms
                </SmartLink>
              </p>
              <p className="hn-note">
                You provide your own game files. No copyrighted game data is
                included.
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

// Live pager gesture state. Lives in a ref so navigations (which re-run the
// engine effect) never reset a gesture mid-flight.
interface PagerState {
  active: boolean;
  settling: boolean;
  offset: number; // px, + = toward the next tab
  vel: number; // px/ms, exponential average
  lastT: number;
  raf: number;
  quiet: number | undefined;
  touch: { x: number; y: number; lastDx: number; ok: boolean } | null;
  touchActive: boolean;
}

export default function Home({ tab = "home" }: { tab?: TabId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const rootRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const currentPaneRef = useRef<HTMLDivElement>(null);
  const incomingPaneRef = useRef<HTMLDivElement>(null);
  const isHome = tab === "home";

  // The live pager: which neighbor is being dragged in (mounts its content).
  // The per-frame fraction updates the tab pill imperatively; putting it in
  // state rerendered every card on Home for every frame of every swipe.
  const [pagerTarget, setPagerTarget] = useState<TabId | null>(null);
  // The incoming pane is retired only after `tab` equals it, so the keyed list
  // goes [old, target] -> [target] in one step and React keeps that subtree
  // instead of rebuilding the page it just animated in.
  useEffect(() => {
    if (pagerTarget && pagerTarget === tab) setPagerTarget(null);
  }, [pagerTarget, tab]);
  const swipeProgressRef = useRef<((fraction: number) => void) | null>(null);
  const pager = useRef<PagerState>({
    active: false,
    settling: false,
    offset: 0,
    vel: 0,
    lastT: 0,
    raf: 0,
    quiet: undefined,
    touch: null,
    touchActive: false,
  });

  // An item or collection layer renders OVER this tab page with both mounted,
  // so the layer owns the title while it is open (it sets the item's own,
  // matching what the server prerendered for that URL).
  useDocumentTitle(TAB_TITLE[tab], !useOverlayOpen());

  // Open a card's detail as a modal over the current page.
  const onOpen = (m: LabMedia) =>
    navigate(pathFor(m.kind, m.slug), { state: { background: location } });

  // Clicks and keyboard ride the same live pager as swipes (programmatic
  // page-turn animated by the engine below).
  const autoPageRef = useRef<((id: TabId) => void) | null>(null);
  const goTab = (id: TabId) => {
    if (id === tab) return;
    autoPageRef.current?.(id);
  };
  // a "view all" section-title link targets a tab path; ride the page-turn.
  const onNav = (path: string) => {
    const base = path.split("#")[0];
    const id = (Object.keys(TAB_PATH) as TabId[]).find((k) => TAB_PATH[k] === base);
    if (!id) return;
    goTab(id);
  };

  // Keyboard: left/right cycles tabs; Esc returns home. Inactive while a modal
  // is open above this page (pathname no longer matches) or a lightbox is up.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)
      )
        return;
      if (window.location.pathname !== TAB_PATH[tab]) return;
      if (document.body.classList.contains("modal-open")) return;
      if (document.querySelector(".avatar-lightbox")) return;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const i = TAB_ORDER.indexOf(tab);
        const next = TAB_ORDER[i + (e.key === "ArrowRight" ? 1 : -1)];
        if (next) goTab(next);
      } else if (e.key >= "1" && e.key <= "9") {
        // number row jumps straight to that tab (1 = Home ... 4 = Articles),
        // riding the same page-turn (direction follows tab order)
        const target = TAB_ORDER[Number(e.key) - 1];
        if (target) goTab(target);
      } else if (e.key === "Escape" && tab !== "home") {
        goTab("home");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // THE LIVE PAGER. Trackpad wheel deltas and touch pans drag the actual
  // pages: the current page shifts in real time and the neighbor slides in
  // beside it (mounted lazily, only during the gesture). Release commits past
  // 30% width (or a flick), else springs back. Vertical scroll positions
  // survive a canceled pan because the current page never leaves normal flow.
  useEffect(() => {
    const g = pager.current;
    const vw = () => window.innerWidth;
    const iTab = TAB_ORDER.indexOf(tab);
    const neighbor = (dir: 1 | -1): TabId | undefined =>
      TAB_ORDER[iTab + dir];

    const apply = () => {
      g.raf = 0;
      const cur = currentPaneRef.current;
      const inc = incomingPaneRef.current;
      if (cur)
        cur.style.transform = g.offset
          ? `translateX(${-g.offset}px)`
          : "";
      if (inc) {
        const dir = g.offset >= 0 ? 1 : -1;
        inc.style.transform = `translateX(${dir * vw() - g.offset}px)`;
      }
      swipeProgressRef.current?.(g.offset / vw());
    };
    const schedule = () => {
      if (!g.raf) g.raf = requestAnimationFrame(apply);
    };

    const syncTarget = () => {
      const t =
        g.offset === 0 ? undefined : neighbor(g.offset > 0 ? 1 : -1);
      setPagerTarget(t ?? null);
    };

    const settle = () => {
      if (g.settling) return;
      g.active = false;
      g.settling = true;
      const w = vw();
      const dir = g.offset >= 0 ? 1 : -1;
      const target = neighbor(dir > 0 ? 1 : -1);
      const commit =
        !!target &&
        (Math.abs(g.offset) > w * 0.3 ||
          (Math.abs(g.vel) > 0.8 && Math.abs(g.offset) > w * 0.15));
      const from = g.offset;
      const to = commit ? dir * w : 0;
      const t0 = performance.now();
      const dur = 170;
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / dur);
        const ease = 1 - Math.pow(1 - p, 3);
        g.offset = from + (to - from) * ease;
        apply();
        if (p < 1) {
          requestAnimationFrame(step);
          return;
        }
        if (commit && target) {
          const promoted = incomingPaneRef.current;
          // ONLY the navigation here. Clearing pagerTarget in the same
          // flushSync produced two renders, not one: the first dropped the
          // incoming pane (pagerTarget null, tab still the old one) and the
          // second mounted the destination from scratch, so every card on the
          // page it had just finished animating in was rebuilt. Once tab is
          // the target, the render guard below (pagerTarget !== tab) already
          // omits the incoming entry, so the list goes straight from
          // [old, target] to [target] and React keeps that subtree.
          flushSync(() => {
            navigate(TAB_PATH[target]);
          });
          // the pane is PROMOTED to current (same key, same DOM): clear the
          // gesture transform we wrote outside React
          if (promoted) promoted.style.transform = "";
        }
        g.offset = 0;
        g.vel = 0;
        g.settling = false;
        const cur = currentPaneRef.current;
        if (cur) cur.style.transform = "";
        // Only the spring-back clears it here. On a commit, navigate() does not
        // update `tab` synchronously, so clearing now renders [old] on its own
        // and destroys the incoming pane a beat before the route lands, which
        // is what forced the destination to mount from scratch. The effect
        // below clears it once `tab` has actually caught up.
        if (!(commit && target)) setPagerTarget(null);
        swipeProgressRef.current?.(0);
      };
      requestAnimationFrame(step);
    };

    const insideXScroller = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      for (
        let n: HTMLElement | null = el;
        n && n !== document.body;
        n = n.parentElement
      ) {
        const cs = getComputedStyle(n);
        if (
          (cs.overflowX === "auto" || cs.overflowX === "scroll") &&
          n.scrollWidth > n.clientWidth + 1
        )
          return true;
      }
      return false;
    };

    // Programmatic page-turn (keyboard arrows, tab clicks, Esc, section
    // titles): same panes, same motion as a swipe, target can be any tab.
    const autoPage = (target: TabId) => {
      if (g.active || g.settling || target === tab) return;
      const dir = TAB_ORDER.indexOf(target) > iTab ? 1 : -1;
      setPagerTarget(target);
      g.settling = true;
      const w = vw();
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const t0 = performance.now();
      // paced like a quick swipe-plus-settle, not a blink
      const dur = reduced ? 0 : 380;
      const step = (now: number) => {
        const p = dur === 0 ? 1 : Math.min(1, (now - t0) / dur);
        const ease =
          p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        g.offset = dir * w * ease;
        apply();
        if (p < 1) {
          requestAnimationFrame(step);
          return;
        }
        const promoted = incomingPaneRef.current;
        flushSync(() => {
          navigate(TAB_PATH[target]);
        });
        if (promoted) promoted.style.transform = "";
        g.offset = 0;
        g.vel = 0;
        g.settling = false;
      };
      requestAnimationFrame(step);
    };
    autoPageRef.current = autoPage;

    const blocked = () =>
      window.location.pathname !== TAB_PATH[tab] ||
      document.body.classList.contains("modal-open") ||
      !!document.querySelector(".avatar-lightbox");

    const drive = (delta: number) => {
      g.offset += delta;
      const w = vw();
      if (g.offset > 0 && !neighbor(1)) g.offset = 0;
      if (g.offset < 0 && !neighbor(-1)) g.offset = 0;
      g.offset = Math.max(-w, Math.min(w, g.offset));
      // real velocity (px/ms): a slow steady drag must not read as a flick
      const now = performance.now();
      const dt = Math.max(1, now - (g.lastT || now - 16));
      g.lastT = now;
      g.vel = 0.75 * g.vel + 0.25 * (delta / dt);
      syncTarget();
      schedule();
    };

    // NOTE: there is deliberately no wheel/trackpad handler. A horizontal
    // two-finger swipe is the browser's own back/forward gesture, and paging
    // tabs on it meant calling preventDefault on exactly the gesture people use
    // to go back, so the site swallowed their history navigation. Tabs switch by
    // click and by keyboard, and a real touchscreen still swipes below.

    // ---- touch ----
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        g.touch = null;
        return;
      }
      const t = e.touches[0];
      const el = e.target as HTMLElement | null;
      const edge = 28;
      const ok =
        t.clientX > edge &&
        t.clientX < window.innerWidth - edge &&
        !blocked() &&
        !el?.closest(".tv-grid, .tabs, .modal, .sheet-content, .avatar-lightbox") &&
        !insideXScroller(el);
      g.touch = { x: t.clientX, y: t.clientY, lastDx: 0, ok };
      g.touchActive = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      const s = g.touch;
      if (!s || !s.ok || g.settling) return;
      const t = e.touches[0];
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (!g.touchActive) {
        if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) {
          g.touch = null; // vertical scroll wins
          return;
        }
        if (Math.abs(dx) < 12 || Math.abs(dx) < 1.4 * Math.abs(dy)) return;
        if (!neighbor(dx < 0 ? 1 : -1)) {
          g.touch = null;
          return;
        }
        g.touchActive = true;
        g.active = true;
        g.offset = 0;
        g.vel = 0;
        g.lastT = 0;
      }
      e.preventDefault();
      const delta = -(dx - s.lastDx);
      s.lastDx = dx;
      drive(delta);
    };
    const onTouchEnd = () => {
      if (g.touchActive && g.active) settle();
      g.touch = null;
      g.touchActive = false;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      if (g.raf) cancelAnimationFrame(g.raf);
      window.clearTimeout(g.quiet);
      autoPageRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const pagerDir = pagerTarget
    ? TAB_ORDER.indexOf(pagerTarget) > TAB_ORDER.indexOf(tab)
      ? 1
      : -1
    : 0;

  return (
      <div
        className={"home-next-page" + (isHome ? "" : " is-subpage")}
        ref={rootRef}
      >
        <Tabs
          active={tab}
          onChange={goTab}
          tabsRef={tabsRef}
          tabs={NAV_TABS}
          swipeProgressRef={swipeProgressRef}
        />
        {/* Both panes live in one keyed list: at commit the incoming pane is
            RECONCILED into the current pane (same key = same DOM subtree), so
            the new page never remounts and nothing repaints top-to-bottom. */}
        {[
          { tab, role: "current" as const },
          ...(pagerTarget && pagerTarget !== tab
            ? [{ tab: pagerTarget, role: "incoming" as const }]
            : []),
        ].map((p) => (
          <div
            key={p.tab}
            ref={p.role === "current" ? currentPaneRef : incomingPaneRef}
            className={p.role === "current" ? "pager-current" : "pager-incoming"}
            style={
              p.role === "incoming"
                ? {
                    transform: `translateX(${pagerDir * 100}vw)`,
                    // the fixed pane starts at viewport top, but a committed
                    // subpage flows BELOW the sticky bar; reproduce that
                    // offset now or the title falls by the bar height on
                    // commit
                    paddingTop:
                      p.tab === "home"
                        ? 0
                        : tabsRef.current?.getBoundingClientRect().height ?? 0,
                  }
                : undefined
            }
            aria-hidden={p.role === "incoming" || undefined}
          >
            <TabContent
              tab={p.tab}
              onOpen={onOpen}
              onNav={onNav}
              interactive={p.role === "current"}
              tabsRef={p.role === "current" ? tabsRef : undefined}
            />
          </div>
        ))}
      </div>
  );
}
