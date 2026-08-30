import {
  useEffect,
  useLayoutEffect,
  useRef,
  type MutableRefObject,
  type RefObject,
} from "react";
import { Link } from "react-router-dom";
import { useAbout } from "@/lib/about";
import { COLLECTION_TITLE } from "@/lib/pageTitle";
import { SearchPalette } from "./SearchTrigger";
import { ThemeToggle } from "./ThemeToggle";

export type TabId = "home" | "hardware" | "game" | "blog";

/**
 * What the bar shows as current. Every tab, plus "docs": the Documentation
 * entry is a link rather than a tab (see the call site below), but it is still
 * a place you can BE, and the bar has to say so on every /docs URL.
 *
 * "none" is for a place the bar has no entry for, a topic collection that cuts
 * across every kind being the case that needs it. Nothing matches, so no pill
 * and no capsule: the bar still says which site this is without claiming you
 * are somewhere you are not.
 */
export type NavActive = TabId | "docs" | "none";

interface TabDef {
  id: TabId;
  label: string;
  count?: number | null;
  path: string;
}

interface TabsProps {
  active: NavActive;
  onChange: (id: TabId) => void;
  tabsRef: RefObject<HTMLDivElement>;
  tabs: TabDef[];
  /** Home writes gesture progress here from its animation frame. Keeping this
      outside React prevents a pill scrub from rerendering every page card. */
  swipeProgressRef?: MutableRefObject<((fraction: number) => void) | null>;
}

export function Tabs({
  active,
  onChange,
  tabsRef,
  tabs,
  swipeProgressRef,
}: TabsProps) {
  const tabsRowRef = useRef<HTMLDivElement>(null);
  const about = useAbout(); // draft-aware in the CMS preview

  // Desktop resizable navbar: contract the bar into a floating pill once the
  // page is scrolled. The CSS gates the visual to >=761px, so mobile keeps the
  // normal full-width bar.
  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        el.classList.toggle("scrolled", window.scrollY > 30);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [tabsRef]);

  const pillRef = useRef<HTMLSpanElement>(null);
  const pillSettled = useRef(false);
  const swipeFraction = useRef(0);

  // Slide the active capsule with the tab, and interpolate toward the
  // adjacent tab while a swipe is in progress so the pill scrubs with the
  // gesture instead of snapping at the end.
  useLayoutEffect(() => {
    const row = tabsRowRef.current;
    const pill = pillRef.current;
    if (!row || !pill) return;

    // snap=true repositions without easing (layout shifts: resize, font load)
    const position = (snap = false, fraction = swipeFraction.current) => {
      swipeFraction.current = fraction;
      const tabEls = Array.from(row.querySelectorAll<HTMLElement>(".tab"));
      // -1 on a /docs URL: the current thing is the Documentation link, which
      // is not a .tab and carries its own static capsule (12-docs.css). The
      // sliding pill stays at width 0, i.e. invisible.
      const activeIdx = tabs.findIndex((t) => t.id === active);
      if (activeIdx < 0 || !tabEls[activeIdx]) return;

      // offsetLeft/offsetWidth: scroll-content coordinates, same space the
      // absolute pill is positioned in (viewport coords break when a tab is
      // partway off-screen on mobile).
      const rect = (i: number) => {
        const el = tabEls[i];
        if (!el) return null;
        return { left: el.offsetLeft, width: el.offsetWidth };
      };

      const from = rect(activeIdx);
      if (!from) return;
      const dir = fraction > 0 ? 1 : fraction < 0 ? -1 : 0;
      const to = dir !== 0 ? rect(activeIdx + dir) : null;
      const t = Math.min(Math.abs(fraction), 1);

      const left = to ? from.left + (to.left - from.left) * t : from.left;
      const width = to ? from.width + (to.width - from.width) * t : from.width;
      // scrub follows the finger raw and the FIRST placement snaps; settled
      // changes (keyboard, click) ease
      pill.style.transition =
        snap || dir !== 0 || !pillSettled.current ? "none" : "";
      pillSettled.current = true;
      pill.style.transform = `translateX(${left}px) translateY(-50%)`;
      pill.style.width = `${width}px`;
    };

    const scrub = (fraction: number) => position(false, fraction);
    if (swipeProgressRef) swipeProgressRef.current = scrub;
    position(false, 0);
    // Tab widths move under us (web font swap, bar resize, container
    // changes); a stale pill sits at the wrong offset until the next tab
    // change, so track every layout change and re-pin without animation.
    const ro = new ResizeObserver(() => position(true));
    ro.observe(row);
    for (const el of row.querySelectorAll<HTMLElement>(".tab")) ro.observe(el);
    document.fonts?.ready.then(() => position(true)).catch(() => {});
    return () => {
      ro.disconnect();
      if (swipeProgressRef?.current === scrub) swipeProgressRef.current = null;
    };
  }, [active, tabs, swipeProgressRef]);

  // When the active tab changes, make sure it's visible inside the scrollable
  // strip. On mobile the row overflows horizontally, so switching to the last tab
  // would otherwise leave the active tab off-screen.
  useEffect(() => {
    const row = tabsRowRef.current;
    if (!row) return;
    // The Documentation link is the last thing in the row and is the current
    // item on every /docs URL, so it is exactly the one a phone would leave
    // off-screen; it counts here as much as a tab does.
    const activeEl = row.querySelector<HTMLElement>(
      ".tab.active, .tabs-doclink.is-current",
    );
    if (!activeEl) return;
    const rowRect = row.getBoundingClientRect();
    const elRect = activeEl.getBoundingClientRect();
    const fullyVisible =
      elRect.left >= rowRect.left && elRect.right <= rowRect.right;
    if (fullyVisible) return;
    const elCenter = elRect.left + elRect.width / 2;
    const rowCenter = rowRect.left + rowRect.width / 2;
    row.scrollBy({ left: elCenter - rowCenter, behavior: "smooth" });
  }, [active]);

  return (
    <div className="tabs-wrap" ref={tabsRef}>
      <div className="tabs-inner">
        <span className="tabs-brand">
          {/* Name + picture are a single Home link, identical to clicking the
              Home tab (modifier-clicks fall through to a normal navigation). */}
          <a
            href="/"
            className="tabs-brand-btn"
            aria-label="Home"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
              e.preventDefault();
              onChange("home");
            }}
          >
            <img
              className="tabs-avatar"
              src="/favicon.svg"
              alt=""
              aria-hidden="true"
            />
            {about.headerName && (
              <span className="tabs-brand-name">{about.headerName}</span>
            )}
          </a>
        </span>
        <div className="tabs" ref={tabsRowRef}>
          <span className="tab-pill" ref={pillRef} aria-hidden="true" />
          {tabs.map((t) => (
            <a
              key={t.id}
              href={t.path}
              role="tab"
              className={"tab" + (active === t.id ? " active" : "")}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) {
                  return;
                }
                e.preventDefault();
                onChange(t.id);
              }}
            >
              {t.label}
              {t.count != null && <span className="count">{t.count}</span>}
            </a>
          ))}
          {/* Documentation is a PAGE, not a tab: it has its own sidebar and is
              not one of the home pager's panes. So it is a plain link, and
              deliberately NOT class="tab" - the sliding pill measures
              querySelectorAll(".tab") against the tabs array by index, and an
              extra .tab would make a swipe past the last tab scrub the pill
              onto this link. Styled to match a tab in 12-docs.css, including
              the active capsule: this bar renders on /docs too, so the link
              has to be able to read as the current place. */}
          <Link
            to="/docs"
            className={"tabs-doclink" + (active === "docs" ? " is-current" : "")}
            aria-current={active === "docs" ? "page" : undefined}
          >
            {COLLECTION_TITLE.docs}
          </Link>
          {/* The bar's controls, as one thing: on a phone the tab row is wider
              than the screen and scrolls, and these two are pinned to its right
              edge (15-search-palette.css) rather than scrolling out of reach,
              which needs one opaque box behind both.

              The search button is deliberately NOT a .tab: the sliding pill
              measures querySelectorAll(".tab") against the tabs array by index,
              and an extra one would scrub the pill onto it. */}
          <span className="tabs-actions">
            {/* The command palette's button. The palette ITSELF is mounted
                once by the app (SearchPaletteHost in App.tsx), not here: more
                than one of these bars can be on screen at a time, since the
                item overlay carries one over whichever tab page is behind it,
                and a dialog per bar would stack two on the first Cmd-K. */}
            <SearchPalette />
            {/* On mobile this sits inline at the end of the tab row so it
                doesn't crowd the last tab. On desktop CSS pulls it back to
                the absolute top-right of .tabs-inner. */}
            <ThemeToggle />
          </span>
        </div>
      </div>
    </div>
  );
}
