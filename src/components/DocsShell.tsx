import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { SITE } from "@/lib/site";
import { COLLECTION_TITLE } from "@/lib/pageTitle";
import { useMobile } from "@/lib/useMobile";
import { ThemeToggle } from "./ThemeToggle";
import { DocsSidebar, DocsNavSheet } from "./DocsSidebar";

// The frame every documentation URL renders inside: the bar, the persistent
// sidebar, the reading column, and an optional right rail.
//
// Below 900px the sidebar is not a rail, it is a sheet opened from the bar,
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
  /** the right rail (the on-this-page TOC), omitted on the landing */
  rail?: ReactNode;
  children: ReactNode;
}

export function DocsShell({ currentSlug, rail, children }: Props) {
  const isNarrow = useMobile(NARROW);
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="page page-fade docs-page">
      <header className="page-bar docs-bar">
        <div className="page-bar-inner">
          {isNarrow ? (
            <button
              type="button"
              className="page-back docs-menu-btn"
              onClick={() => setNavOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={navOpen}
            >
              <MenuIcon />
              <span>{COLLECTION_TITLE.docs}</span>
            </button>
          ) : (
            <Link to="/docs" className="page-back docs-bar-back">
              <span>{COLLECTION_TITLE.docs}</span>
            </Link>
          )}
          <span className="docs-bar-right">
            <ThemeToggle />
            <Link to="/" className="page-home">
              {SITE.name}
              <span className="dot">{SITE.nameSuffix}</span>
            </Link>
          </span>
        </div>
      </header>

      <main className="page-main docs-main">
        <div className={"docs-layout" + (rail ? "" : " docs-layout--norail")}>
          {!isNarrow && <DocsSidebar currentSlug={currentSlug} />}
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
