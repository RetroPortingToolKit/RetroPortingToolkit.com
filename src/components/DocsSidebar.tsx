import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Drawer } from "vaul";
import { DOCS_SECTIONS } from "@/lib/content";
import { COLLECTION_TITLE } from "@/lib/pageTitle";
import { entriesInSection } from "./docsNav";
import { SearchTrigger } from "./SearchPalette";

// The docs sidebar. Built from DOCS_SECTIONS, which is derived from the
// published docs list, so a draft page cannot appear here while its own URL
// keeps working. A section is only ever LINKED when it has an index page of its
// own: /docs/<section> exists because data/docs/<section>/index.md does, not
// because the folder does.

interface TreeProps {
  /** full slug of the page being read ("start/quickstart"), if any */
  currentSlug?: string;
  /** called after any link is followed, so the mobile sheet can close */
  onNavigate?: () => void;
}

function Chevron() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className="docs-nav-chevron">
      <path
        d="M4 2.5L7.5 6L4 9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DocsNavTree({ currentSlug, onNavigate }: TreeProps) {
  const currentSection = currentSlug ? currentSlug.split("/")[0] : undefined;
  // Explicit opens and closes, layered over the default (the section you are
  // reading is open, everything else is folded away). Navigating to another
  // section clears them so the default applies again.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setToggled({});
  }, [currentSection]);

  // On the landing page nothing is current, and the card grid beside the rail
  // already lists every page, so the sections start folded rather than as a
  // wall of every page in the section.
  const isOpen = (slug: string) =>
    toggled[slug] ?? slug === currentSection;

  return (
    <nav className="docs-nav" aria-label={COLLECTION_TITLE.docs}>
      <Link
        to="/docs"
        className={
          "docs-nav-root" + (currentSlug === undefined ? " is-current" : "")
        }
        onClick={onNavigate}
        aria-current={currentSlug === undefined ? "page" : undefined}
      >
        All {COLLECTION_TITLE.docs.toLowerCase()}
      </Link>
      <ul className="docs-nav-sections">
        {DOCS_SECTIONS.map((section) => {
          const open = isOpen(section.slug);
          const entries = entriesInSection(section);
          const pages = entries.filter((e) => !e.isSectionIndex);
          const listId = `docs-nav-${section.slug}`;
          const title = section.index ? (
            <Link
              to={section.path}
              className={
                "docs-nav-section-title" +
                (currentSlug === section.slug ? " is-current" : "")
              }
              onClick={onNavigate}
              aria-current={currentSlug === section.slug ? "page" : undefined}
            >
              {section.title}
            </Link>
          ) : (
            <span className="docs-nav-section-title">{section.title}</span>
          );
          return (
            <li key={section.slug} className="docs-nav-section">
              <div className="docs-nav-section-head">
                {title}
                {pages.length > 0 && (
                  <button
                    type="button"
                    className={
                      "docs-nav-disclose" + (open ? " is-open" : "")
                    }
                    aria-expanded={open}
                    aria-controls={listId}
                    aria-label={`${open ? "Collapse" : "Expand"} ${section.title}`}
                    onClick={() =>
                      setToggled((t) => ({ ...t, [section.slug]: !open }))
                    }
                  >
                    <Chevron />
                  </button>
                )}
              </div>
              {pages.length > 0 && (
                <ul id={listId} className="docs-nav-pages" hidden={!open}>
                  {pages.map((page) => (
                    <li key={page.slug}>
                      <Link
                        to={page.path}
                        className={
                          "docs-nav-page" +
                          (currentSlug === page.slug ? " is-current" : "")
                        }
                        onClick={onNavigate}
                        aria-current={
                          currentSlug === page.slug ? "page" : undefined
                        }
                      >
                        {page.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** The persistent rail. DocsShell mounts it only above the two-column
    breakpoint, where the sheet below takes over.

    The search trigger lives at the top of it, where a reader looks for it. It
    opens the site's ONE command palette (src/components/SearchPalette.tsx),
    which searches the documentation, headings and anchors included, alongside
    everything else the site publishes. There used to be a second, docs-only
    dialog behind this button; it and the palette both answered Cmd-K, so the
    docs half was folded into the palette and this is now the same control the
    nav bar carries, in the place documentation readers expect it. */
export function DocsSidebar({ currentSlug }: { currentSlug?: string }) {
  return (
    <aside className="docs-sidebar">
      <div className="docs-sidebar-inner">
        <SearchTrigger />
        <DocsNavTree currentSlug={currentSlug} />
      </div>
    </aside>
  );
}

/** The same tree as a bottom sheet, which is how this site already does
    navigation on a narrow screen (vaul, as in CollectionView and ItemView). */
export function DocsNavSheet({
  open,
  onOpenChange,
  currentSlug,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSlug?: string;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground>
      <Drawer.Portal>
        <Drawer.Overlay className="sheet-overlay" />
        <Drawer.Content className="docs-nav-sheet" aria-describedby={undefined}>
          <Drawer.Title className="sr-only">
            {COLLECTION_TITLE.docs}
          </Drawer.Title>
          <span className="docs-nav-sheet-grip" aria-hidden="true" />
          <div className="docs-nav-sheet-scroll">
            <DocsNavTree
              currentSlug={currentSlug}
              onNavigate={() => onOpenChange(false)}
            />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
