import { useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { COLLECTION_TITLE } from "@/lib/pageTitle";
import { useMobile } from "@/lib/useMobile";
import { Tabs } from "./Tabs";
import { NAV_TABS, TAB_PATH } from "./navTabs";
import { DocsSidebar, DocsNavSheet } from "./DocsSidebar";
import { SearchTrigger } from "./SearchTrigger";

// The frame every documentation URL renders inside: the SITE's navigation bar,
// the persistent sidebar, the reading column, and an optional right rail.
//
// The bar is the shared <Tabs> component in the same subpage form the Games and
// Platforms pages use ("home-next-page is-subpage", 03-nav.css), with
// Documentation marked current. This section used to render a bar of its own -
// a breadcrumb on the left, the wordmark on the right - and crossing into /docs
// therefore swapped the whole chrome, which read as leaving the site. The
// docs-only furniture (sidebar, search, breadcrumbs, on-this-page) all sits
// BELOW the shared bar now, so there is exactly one bar on the page.
//
// Below 900px the sidebar is not a rail, it is a sheet opened from the toolbar,
// which is the pattern this site already uses for navigation on a narrow screen
// (vaul, as in CollectionView and ItemView).
const NARROW = "(max-width: 899px)";

function MenuIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="docs-menu-icon">
      <path
        d="M2 4h12M2 8h12M2 12h12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface Props {
  /** full slug of the page being read; undefined on the /docs landing */
  currentSlug?: string;
  /** the right rail (the on-this-page TOC); may render nothing */
  rail?: ReactNode;
  children: ReactNode;
}

export function DocsShell({ currentSlug, rail, children }: Props) {
  const isNarrow = useMobile(NARROW);
  const [navOpen, setNavOpen] = useState(false);
  const navigate = useNavigate();
  const tabsRef = useRef<HTMLDivElement>(null);
  // The landing is a hub and uses the rail's width for its card grid. Every
  // real page keeps the three column grid whether or not it has enough
  // headings for a contents list, so the reading measure does not change from
  // one page to the next.
  const isLanding = currentSlug === undefined;

  return (
    <div className="home-next-page is-subpage docs-page">
      {/* Docs are not one of the home pager's panes, so a tab click here is a
          plain navigation rather than a page-turn gesture. Everything else
          about the bar - brand, pill row, theme toggle, scrolled contraction -
          is the site's, unchanged. */}
      <Tabs
        active="docs"
        onChange={(id) => navigate(TAB_PATH[id])}
        tabsRef={tabsRef}
        tabs={NAV_TABS}
      />

      <main className="page-main docs-main">
        <aside className="docs-alpha-banner" role="note">
          <strong>Docs preview</strong>
          <span>These pages are early and may change. For exact commands and current support, follow the linked project repository.</span>
        </aside>
        <div className={"docs-layout" + (isLanding ? " docs-layout--norail" : "")}> 
          {isNarrow ? (
            // No rail at this width, so the sheet trigger and the search need
            // somewhere of their own. One slim row above the article, not a
            // second bar.
            <div className="docs-toolbar">
              <button
                type="button"
                className="docs-menu-btn"
                onClick={() => setNavOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={navOpen}
              >
                <MenuIcon />
                <span>{COLLECTION_TITLE.docs}</span>
              </button>
              {/* The same trigger the sidebar carries above 900px, moved here
                  rather than existing in both. It opens the site's command
                  palette; the shortcut that opens it without a button is
                  registered once, by the nav bar. */}
              <SearchTrigger />
            </div>
          ) : (
            <DocsSidebar currentSlug={currentSlug} />
          )}
          <div className="docs-column">{children}</div>
          {rail}
        </div>
      </main>

      {/* Mounted only where it can open, so the desktop page carries no
          dialog markup at all. */}
      {isNarrow && (
        <DocsNavSheet
          open={navOpen}
          onOpenChange={setNavOpen}
          currentSlug={currentSlug}
        />
      )}
    </div>
  );
}
