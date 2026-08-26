import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { ModKbd } from "./ModKbd";
import { lockBody, unlockBody } from "@/lib/bodyLock";
import { BLOGS, GAMES, HARDWARE } from "@/lib/content";
import { buildPaletteCommands } from "@/lib/paletteCommands";
import {
  closeSearchPalette,
  openSearchPalette,
  registerPaletteFallback,
  useSearchPaletteOpen,
} from "@/lib/searchPalette";
import {
  buildSiteSearchIndex,
  searchSite,
  type SiteSearchHit,
  type SiteSearchIndex,
} from "@/lib/siteSearch";
import { setTheme } from "@/lib/theme";
import type { SnippetPart } from "@/lib/docsSearch";

/**
 * The command palette: the button in the nav bar, the dialog it summons, and
 * the keyboard that summons it without the button.
 *
 * It is a COMMAND palette that also searches, not a search box with commands
 * bolted on. Empty, it lists what the site can do; type, and the commands
 * narrow while the whole site's content is ranked underneath them.
 *
 * Nothing is fetched at runtime. Games, Platforms and News are already in the
 * bundle (src/lib/content.ts reads data/ at build time); the documentation
 * arrives as `virtual:docs-search-index`, the build-time index that already
 * existed for the documentation search, dynamically imported so it stays its
 * own chunk and costs nothing until the first open.
 *
 * The ranking is src/lib/siteSearch.ts, kept pure and asserted without a DOM.
 */

const DIALOG_LABEL = "Search and commands";

export function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="site-search-icon">
      <circle cx="7" cy="7" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10.2 10.2 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** True while the keystroke belongs to something the reader is typing into. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

// The three flat kinds, whole. Their bodies are in the bundle already, so the
// index is built from them on the first open rather than shipped twice.
const CONTENT_ITEMS = [...GAMES, ...HARDWARE, ...BLOGS];

let indexPromise: Promise<SiteSearchIndex> | undefined;

/** Build the index once per session, on the first open. */
function loadIndex(): Promise<SiteSearchIndex> {
  if (!indexPromise) {
    indexPromise = import("virtual:docs-search-index")
      .then((m) => buildSiteSearchIndex({ items: CONTENT_ITEMS, docs: m.default }))
      // Without the documentation chunk the palette is still worth having:
      // everything else is already here.
      .catch(() => buildSiteSearchIndex({ items: CONTENT_ITEMS }));
  }
  return indexPromise;
}

function Description({ parts }: { parts: SnippetPart[] }) {
  return (
    <span className="site-search-row-desc">
      {parts.map((part, i) =>
        part.mark ? (
          <mark key={i} className="site-search-mark">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </span>
  );
}

const GROUP_LABEL: Record<SiteSearchHit["group"], string> = {
  command: "Commands",
  result: "Results",
};

function Dialog() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [index, setIndex] = useState<SiteSearchIndex>();
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  /** The command that has just run and is showing its confirmation. */
  const [confirmed, setConfirmed] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number>();

  useEffect(() => {
    let live = true;
    loadIndex()
      .then((loaded) => {
        if (!live) return;
        setIndex(loaded);
        setLoading(false);
      })
      .catch(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    lockBody();
    inputRef.current?.focus();
    return () => {
      unlockBody();
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, []);

  const commands = useMemo(
    () =>
      buildPaletteCommands({
        navigate: (to) => navigate(to),
        // A real page load: /admin mounts outside the router and a .md twin is
        // a static file, so neither is something the router can render.
        load: (url) => {
          window.location.href = url;
        },
        pathname,
        // Returned rather than swallowed: the row's "Link copied" waits for it,
        // so a browser that refuses the write does not get a confirmation.
        copyLink: () => navigator.clipboard.writeText(window.location.href),
        setTheme,
      }),
    [navigate, pathname],
  );

  const hits = useMemo(
    () => searchSite(index, query, { commands }),
    [index, query, commands],
  );

  useEffect(() => {
    setActive(0);
  }, [query]);

  // Keep the highlighted row in view when the arrow keys walk past the edge.
  useEffect(() => {
    const row = listRef.current?.querySelector(`#site-search-option-${active}`);
    if (row instanceof HTMLElement) row.scrollIntoView({ block: "nearest" });
  }, [active, hits]);

  const close = useCallback(() => closeSearchPalette(), []);

  const run = useCallback(
    (hit: SiteSearchHit | undefined) => {
      if (!hit) return;
      if (hit.command) {
        const command = hit.command;
        let outcome: Promise<unknown>;
        try {
          outcome = Promise.resolve(command.run());
        } catch {
          // A command that cannot run (no clipboard in this context, say) is
          // not worth an error state: the palette just gets out of the way.
          close();
          return;
        }
        if (!command.confirm) {
          close();
          return;
        }
        // Stay open just long enough for the row to say it worked, and only
        // once it has.
        outcome.then(
          () => {
            setConfirmed(hit.id);
            closeTimer.current = window.setTimeout(close, 1000);
          },
          () => close(),
        );
        return;
      }
      if (hit.path) {
        close();
        navigate(hit.path);
      }
    },
    [close, navigate],
  );

  // Escape, in the capture phase and consumed here. Other surfaces listen for
  // it on window too (an open item modal closes on Escape, and so does a tab
  // page's "back to home"), and one keystroke must not do two things.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      close();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [close]);

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "Tab") {
      // aria-modal says the rest of the page is inert, so Tab has to stay
      // here. There are exactly two focusable things: the field and Esc.
      const focusable = e.currentTarget.querySelectorAll<HTMLElement>("input, button");
      if (focusable.length) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (hits.length ? (i + 1) % hits.length : 0));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (hits.length ? (i - 1 + hits.length) % hits.length : 0));
      return;
    }
    if (e.key === "Home" && hits.length) {
      e.preventDefault();
      setActive(0);
      return;
    }
    if (e.key === "End" && hits.length) {
      e.preventDefault();
      setActive(hits.length - 1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      run(hits[active]);
    }
  };

  // The flat list is what the arrow keys walk; the groups are how it reads.
  const groups: { group: SiteSearchHit["group"]; from: number; hits: SiteSearchHit[] }[] = [];
  hits.forEach((hit, i) => {
    const last = groups[groups.length - 1];
    if (last && last.group === hit.group) last.hits.push(hit);
    else groups.push({ group: hit.group, from: i, hits: [hit] });
  });

  const activeId = hits.length ? `site-search-option-${active}` : undefined;
  const typed = query.trim();

  return createPortal(
    <div
      className="site-search-overlay"
      // A click on the backdrop closes; mousedown so a drag that ends outside
      // a row does not count as one.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="site-search-panel"
        role="dialog"
        aria-modal="true"
        aria-label={DIALOG_LABEL}
        onKeyDown={onKeyDown}
      >
        <div className="site-search-field">
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            className="site-search-input"
            placeholder="Search the site, or run a command"
            aria-label={DIALOG_LABEL}
            role="combobox"
            aria-expanded={hits.length > 0}
            aria-controls="site-search-listbox"
            aria-activedescendant={activeId}
            aria-autocomplete="list"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="button"
            className="site-search-esc"
            onClick={close}
            aria-label="Close"
          >
            Esc
          </button>
        </div>

        <div className="site-search-body" ref={listRef}>
          <div
            id="site-search-listbox"
            role="listbox"
            aria-label={DIALOG_LABEL}
            className="site-search-list"
          >
            {groups.map((group) => (
              <div
                key={group.group}
                role="group"
                aria-labelledby={`site-search-group-${group.group}`}
              >
                <div
                  className="site-search-group-label"
                  id={`site-search-group-${group.group}`}
                  role="presentation"
                >
                  {GROUP_LABEL[group.group]}
                </div>
                {group.hits.map((hit, i) => {
                  const at = group.from + i;
                  return (
                    <div
                      key={hit.id}
                      id={`site-search-option-${at}`}
                      role="option"
                      aria-selected={at === active}
                      className={
                        "site-search-row" + (at === active ? " site-search-row--active" : "")
                      }
                      onMouseMove={() => setActive(at)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        run(hit);
                      }}
                    >
                      <span className="site-search-row-head">
                        <span className="site-search-row-title">{hit.title}</span>
                        {hit.section && (
                          <span className="site-search-row-section">{hit.section}</span>
                        )}
                        <span className="site-search-row-kind">{hit.label}</span>
                      </span>
                      {hit.heading && (
                        <span className="site-search-row-heading">{hit.heading}</span>
                      )}
                      {confirmed === hit.id ? (
                        <span className="site-search-row-desc site-search-row-done">
                          {hit.command?.confirm}
                        </span>
                      ) : (
                        <Description parts={hit.description} />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {hits.length === 0 && (
            <p className="site-search-empty">
              {loading && typed
                ? "Looking…"
                : typed
                  ? `Nothing matches “${typed}”.`
                  : "Type to search titles, descriptions and page text."}
            </p>
          )}
        </div>

        <div className="site-search-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> to move
          </span>
          <span>
            <kbd>↵</kbd> to open
          </span>
          <span>
            <kbd>Esc</kbd> to close
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface TriggerProps {
  /** Extra classes for where it sits; the base look is the same everywhere. */
  className?: string;
  /**
   * True for the nav bar's own button, which is where the keyboard goes back
   * to when a palette opened by Cmd-K is closed.
   */
  primary?: boolean;
}

/** The affordance. The nav bar has one; the documentation sidebar has the
    other, at the head of its rail, where a reader looks for search. */
export function SearchTrigger({ className, primary }: TriggerProps) {
  const open = useSearchPaletteOpen();
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!primary) return;
    return registerPaletteFallback(ref.current);
  }, [primary]);

  return (
    <button
      ref={ref}
      type="button"
      className={"site-search-trigger" + (className ? ` ${className}` : "")}
      onClick={() => openSearchPalette(ref.current)}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={DIALOG_LABEL}
      // The bar shows the magnifier and the shortcut, not the word, so the
      // hover tooltip is where the word lives there.
      title={DIALOG_LABEL}
    >
      <SearchIcon />
      <span className="site-search-trigger-label">Search</span>
      <ModKbd className="site-search-trigger-kbd" />
    </button>
  );
}

/**
 * The nav bar's button and the one palette it opens, plus the shortcut. Mounted
 * by Tabs, which renders on every page, so the palette exists everywhere and
 * exactly once.
 */
export function SearchPalette() {
  const open = useSearchPaletteOpen();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearchPalette();
        return;
      }
      // "/" is the other shortcut every site with a search has, and it costs
      // nothing as long as it is ignored while a field has focus.
      if (e.key === "/" && !mod && !e.altKey && !isTypingTarget(e.target)) {
        e.preventDefault();
        openSearchPalette();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <SearchTrigger primary />
      {open && <Dialog />}
    </>
  );
}
