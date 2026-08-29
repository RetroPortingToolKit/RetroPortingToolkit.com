import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useLocation, useNavigate, type Location } from "react-router-dom";
import { Drawer } from "vaul";
import type { Item } from "@/lib/types";
import { useMobile } from "@/lib/useMobile";
import { itemsForKind, pathFor } from "@/lib/content";
import { ItemDetail, ArticleByline, blogIsSplit } from "./ItemDetail";
import { Markdown } from "./Markdown";
import { ProjectCarousel, type Slide } from "./ProjectCarousel";
import { focusScroller, lockBody, unlockBody } from "@/lib/bodyLock";
import { trapFocus } from "@/lib/focusTrap";
import { Tabs, type TabId } from "./Tabs";
import { NAV_TABS, TAB_PATH } from "./navTabs";

interface Props {
  item: Item;
  onClose: () => void;
  /** another modal is stacked on top: stay mounted but ignore all input */
  covered?: boolean;
}

// Each item's own accent (from its kicker color) rides down as a CSS variable so
// the detail view can tint its eyebrow, links, and pull-quotes to match. Unset
// when the item has no color, so the CSS fallbacks (neutral ink) kick in.
function accentVars(item: Item): CSSProperties | undefined {
  return item.kickerColor
    ? ({ "--article-accent": item.kickerColor } as CSSProperties)
    : undefined;
}

const CloseIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M3 3L13 13M13 3L3 13"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const ChevronIcon = ({ dir }: { dir: "left" | "right" }) => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d={dir === "left" ? "M10 3L5 8L10 13" : "M6 3L11 8L6 13"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Detect which direction the user navigated (left arrow → previous, right →
// next) so the new detail can slide in from that side. Computed synchronously
// during render, the wrapper div uses key={item.slug} and remounts on each
// nav, so the direction class must be present at mount time for the CSS
// animation to actually play.
function useSlideDirection(item: Item): "left" | "right" | null {
  const list = itemsForKind(item.kind);
  const prevSlugRef = useRef<string | null>(null);
  const prev = prevSlugRef.current;
  let dir: "left" | "right" | null = null;
  if (prev !== null && prev !== item.slug) {
    const prevIdx = list.findIndex((i) => i.slug === prev);
    const nextIdx = list.findIndex((i) => i.slug === item.slug);
    if (prevIdx !== -1 && nextIdx !== -1) {
      let diff = nextIdx - prevIdx;
      // handle wrap-around at list boundaries
      if (diff > list.length / 2) diff -= list.length;
      if (diff < -list.length / 2) diff += list.length;
      dir = diff > 0 ? "right" : diff < 0 ? "left" : null;
    }
  }
  useEffect(() => {
    prevSlugRef.current = item.slug;
  });
  return dir;
}

function useSiblingNav(item: Item) {
  const navigate = useNavigate();
  const location = useLocation();
  const list = itemsForKind(item.kind);
  const idx = list.findIndex((i) => i.slug === item.slug);
  const canNav = list.length > 1 && idx >= 0;
  const state = location.state as { background?: Location } | null;

  const go = useCallback(
    (offset: number) => {
      if (!canNav) return;
      const next = list[(idx + offset + list.length) % list.length];
      navigate(pathFor(item.kind, next.slug), {
        replace: true,
        state: state ?? undefined,
      });
    },
    [canNav, idx, list, navigate, item.kind, state],
  );

  return { canNav, go };
}

interface NavControlsProps {
  item: Item;
  onClose: () => void;
  enableKeyboard?: boolean;
}

function NavControls({ item, onClose, enableKeyboard = true }: NavControlsProps) {
  const { canNav, go } = useSiblingNav(item);
  const navVisible = canNav;
  const navigate = useNavigate();
  const location = useLocation();
  // A real in-app history entry exists behind this one (react-router keys the
  // first entry "default"), so Back returns to the page the user came from,
  // e.g. platform page -> game page -> back.
  const canGoBack = location.key !== "default";
  const onBack = () => navigate(-1);

  useEffect(() => {
    if (!enableKeyboard || !canNav) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as Element | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Arrow keys only when the visible buttons are showing (talks /
      // writing). Projects use the carousel arrows for media and a
      // dedicated J/K keystroke (Gmail-style) for sibling navigation.
      if (navVisible && e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      } else if (navVisible && e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      } else if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        go(1);
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enableKeyboard, canNav, navVisible, go]);

  return (
    <>
      {canGoBack && (
        <button
          type="button"
          className="modal-nav modal-back"
          onClick={onBack}
          aria-label="Back"
        >
          <span className="modal-close-icon">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M13.5 8H3M7 3.5 2.5 8 7 12.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
      )}
      <div className="modal-controls">
      {navVisible && (
        <>
          <button
            type="button"
            className="modal-nav"
            onClick={() => go(-1)}
            aria-label="Previous"
          >
            <span className="modal-close-icon">
              <ChevronIcon dir="left" />
            </span>
          </button>
          <button
            type="button"
            className="modal-nav"
            onClick={() => go(1)}
            aria-label="Next"
          >
            <span className="modal-close-icon">
              <ChevronIcon dir="right" />
            </span>
          </button>
        </>
      )}
      <button
        type="button"
        className="modal-close"
        onClick={onClose}
        aria-label="Close"
      >
        <span className="modal-close-icon">
          <CloseIcon />
        </span>
      </button>
      </div>
    </>
  );
}

export function ItemView({ item, onClose, covered }: Props) {
  const isMobile = useMobile();
  // ProjectSplit (text-left, carousel-right) needs real desktop width, below
  // that, projects fall back to the carousel-on-top + bottom-sheet layout.
  const isProjectStacked = useMobile("(max-width: 1200px)");
  // A blog entry WITH a demo/media (split) gets the exact PROJECT experience: two-pane on desktop,
  // media-on-top + bottom-sheet on mobile. Body-only blog (article) falls through to the normal path.
  const useProjectLayout = blogIsSplit(item);
  let view;
  if (useProjectLayout) {
    view = isProjectStacked ? (
      <ProjectMobileView item={item} onClose={onClose} covered={covered} />
    ) : (
      <DesktopModal item={item} onClose={onClose} covered={covered} />
    );
  } else if (isMobile) {
    view = <MobileSheet item={item} onClose={onClose} covered={covered} />;
  } else {
    view = <DesktopModal item={item} onClose={onClose} covered={covered} />;
  }
  // Citation numbering is scoped INSIDE each variant (around the content that
  // remounts per item), NOT out here: a keyed wrapper at this level would
  // remount the whole modal chrome on J/K / arrow sibling navigation, blanking
  // the modal for a frame and flashing the page behind it.
  return view;
}

function DesktopModal({ item, onClose, covered }: Props) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const slideDir = useSlideDirection(item);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setOpen(true));
    lockBody();
    return () => {
      cancelAnimationFrame(raf);
      unlockBody();
    };
  }, []);

  useEffect(() => {
    // .modal is the scroll container (overflow-y: auto); .modal-card itself
    // has overflow: hidden and doesn't scroll.
    modalRef.current?.scrollTo({ top: 0, behavior: "auto" });
    // And whatever scrolls must hold focus, or the keyboard has nothing to
    // drive: the document can't (body is locked while a modal is open) and
    // these containers are not focusable on their own, so Space, PageDown,
    // the arrows and Home/End would all do nothing. Usually that is the
    // modal, but the split layout keeps the modal at viewport height and
    // scrolls its left column instead, so ask which one actually overflows.
    // Covered layers keep their hands off.
    if (!covered) focusScroller(modalRef.current);
  }, [item.slug, covered]);

  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    setOpen(false);
    setTimeout(onClose, 380);
  };

  useEffect(() => {
    if (covered) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [covered]);

  return (
    <>
      <div
        className={"modal-backdrop" + (open ? " open" : "")}
        onClick={requestClose}
      />
      <div
        className={
          "modal" +
          (open ? " open" : "") +
          (blogIsSplit(item) ? " modal--demo" : "")
        }
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={item.title}
        onKeyDown={trapFocus}
      >
        {/* The site's own bar, the same component every other section renders.
            An item URL opened directly (a shared link, a search result) used to
            arrive with no wordmark and no navigation at all: nothing on screen
            said which site this was or how to reach anything else. The item's
            own kind is marked current, so the bar also says where you are. */}
        <Tabs
          active={item.kind as TabId}
          onChange={(id) => navigate(TAB_PATH[id])}
          tabsRef={barRef}
          tabs={NAV_TABS}
        />
        <div
          className="modal-card"
          onClick={(e) => {
            // The detail sits inside an .item-slide wrapper (full width, no
            // useful bounds) so reach in and use the actual content element:
            // .talk-detail (capped width) for talks, .modal-body--article
            // (centered column) for writing and body-only blog. If neither
            // matches, bail.
            const content =
              e.currentTarget.querySelector(".talk-detail") ??
              e.currentTarget.querySelector(".modal-body--article");
            if (!content) return;
            const { left, right } = content.getBoundingClientRect();
            if (e.clientX < left || e.clientX > right) requestClose();
          }}
        >
          <div
            key={item.slug}
            className={
              "item-slide" +
              (slideDir ? ` item-slide--${slideDir}` : "")
            }
          >
              <article className="modal-article" style={accentVars(item)}>
                <ItemDetail item={item} />
              </article>
          </div>
        </div>
        <NavControls
          item={item}
          onClose={requestClose}
          enableKeyboard={!covered}
        />
      </div>
    </>
  );
}

function ProjectMobileView({ item, onClose, covered }: Props) {
  const [open, setOpen] = useState(false);
  const [snap, setSnap] = useState<number | string | null>(0.5);
  const sheetScrollRef = useRef<HTMLDivElement>(null);
  const isFull = snap === 1;

  useEffect(() => {
    if (!isFull) {
      sheetScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [isFull]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setOpen(true));
    lockBody();
    return () => {
      cancelAnimationFrame(raf);
      unlockBody();
    };
  }, []);

  // Vaul's Drawer.Content is wrapped by Radix Dialog, which (regardless of our
  // modal={false}) sets body { pointer-events: none } via DismissableLayer while
  // the dialog is mounted. That blocks interactions on the gallery sitting
  // outside the drawer on mobile. Force it back to auto and watch for re-sets.
  useEffect(() => {
    const body = document.body;
    const reset = () => {
      if (body.style.pointerEvents === "none") {
        body.style.pointerEvents = "auto";
      }
    };
    reset();
    const observer = new MutationObserver(reset);
    observer.observe(body, { attributes: true, attributeFilter: ["style"] });
    return () => {
      observer.disconnect();
      body.style.pointerEvents = "";
    };
  }, []);

  const requestClose = () => {
    if (!open) return;
    setOpen(false);
    setTimeout(onClose, 500);
  };

  const slides: Slide[] = item.gallery.map((g) => ({
    src: g.src,
    srcSet: g.srcSet,
    srcFallback: g.srcFallback,
    lqip: g.lqip,
    poster: g.poster,
    caption: g.caption,
  }));

  return (
    <>
      <div className={"proj-mobile" + (open ? " open" : "")}>
        <NavControls
          item={item}
          onClose={requestClose}
          enableKeyboard={!covered}
        />
        {item.demo ? (
          // a blog entry's live demo fills the top half (where a project's carousel goes)
          <iframe
            className="lab-demo-frame"
            src={item.demo}
            title={`${item.title} · live demo`}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; microphone; xr-spatial-tracking; fullscreen"
            allowFullScreen
          />
        ) : (
          <ProjectCarousel slides={slides} autoplayDelay={3000} />
        )}
      </div>
      <Drawer.Root
        open={open}
        onOpenChange={(o) => {
          if (!o && !covered) requestClose();
        }}
        snapPoints={[0.5, 1]}
        activeSnapPoint={snap}
        setActiveSnapPoint={setSnap}
        shouldScaleBackground={false}
        modal={false}
        dismissible={!isFull}
      >
        <Drawer.Portal>
          <Drawer.Content
            className="proj-sheet"
            aria-describedby={undefined}
            onKeyDown={trapFocus}
          >
            <Drawer.Title className="sr-only">{item.title}</Drawer.Title>
            <div className="proj-sheet-handle" aria-hidden="true" />
            <div
              className={"proj-sheet-scroll" + (isFull ? " full" : "")}
              ref={sheetScrollRef}
              style={accentVars(item)}
            >
              {item.kicker && (
                <div className="modal-kicker">{item.kicker}</div>
              )}
              <h1 className="modal-title">{item.title}</h1>
              {item.kind === "blog" && <ArticleByline item={item} delay={0} />}
              {item.kind !== "blog" &&
                (item.status ||
                  item.availability ||
                  item.arch ||
                  item.provenance ||
                  item.verified ||
                  item.meta.length > 0) && (
                  <div className="modal-meta">
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
                  </div>
                )}
              {item.body && (
                <Markdown className="modal-content">{item.body}</Markdown>
              )}
              {item.links.length > 0 && (
                <div className="modal-links">
                  {item.links.map((l, i) => {
                    const isExternal = /^https?:/.test(l.href);
                    return (
                      <a
                        key={i}
                        href={l.href}
                        target={isExternal ? "_blank" : undefined}
                        rel={isExternal ? "noopener noreferrer" : undefined}
                      >
                        {l.label} <span className="ext">↗</span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}

function MobileSheet({ item, onClose, covered }: Props) {
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const slideDir = useSlideDirection(item);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setOpen(true));
    lockBody();
    return () => {
      cancelAnimationFrame(raf);
      unlockBody();
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [item.slug]);

  const requestClose = () => {
    if (!open) return;
    setOpen(false);
    setTimeout(onClose, 500);
  };

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(o) => {
        if (!o && !covered) requestClose();
      }}
      shouldScaleBackground
    >
      <Drawer.Portal>
        <Drawer.Overlay className="sheet-overlay" />
        <Drawer.Content
          className="sheet-content"
          aria-describedby={undefined}
        >
          <Drawer.Title className="sr-only">{item.title}</Drawer.Title>
          <NavControls
            item={item}
            onClose={requestClose}
            enableKeyboard={!covered}
          />
          <div className="sheet-scroll" ref={scrollRef}>
            <div
              key={item.slug}
              className={
                "item-slide" +
                (slideDir ? ` item-slide--${slideDir}` : "")
              }
              style={accentVars(item)}
            >
                <ItemDetail item={item} />
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
