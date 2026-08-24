import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ModKbd } from "./ModKbd";
import { lockBody, unlockBody } from "@/lib/bodyLock";
import { searchDocs, type DocsSearchIndex, type DocsSearchResult } from "@/lib/docsSearch";
import { COLLECTION_TITLE } from "@/lib/pageTitle";

// Search across the documentation. The index is BUILT AT BUILD TIME by the
// `docsDataPlugin` in vite.config.ts and reached here through a dynamic import,
// so it is its own chunk: nothing is downloaded until the first time someone
// opens this, and nothing is ever fetched from a server at runtime.
//
// It searches table cells, which is the point on this site: the port registry,
// the configuration keys, the command tables and the glossary put their whole
// substance in a table, and a search that only read prose would miss all of it.
// src/lib/docsSearch.ts is where a table row becomes searchable text.

const SEARCH_LABEL = "Search the documentation";

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="docs-search-icon">
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
  return (
    tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable
  );
}

let indexPromise: Promise<DocsSearchIndex> | undefined;

/** Load the index chunk once per session, on the first open. */
function loadIndex(): Promise<DocsSearchIndex> {
  if (!indexPromise) {
    indexPromise = import("virtual:docs-search-index").then((m) => m.default);
  }
  return indexPromise;
}

function Snippet({ result }: { result: DocsSearchResult }) {
  return (
    <span className="docs-search-snippet">
      {result.snippet.map((part, i) =>
        part.mark ? (
          <mark key={i} className="docs-search-mark">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </span>
  );
}

function Dialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [index, setIndex] = useState<DocsSearchIndex>();
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

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
    return unlockBody;
  }, []);

  const results = useMemo(() => searchDocs(index, query), [index, query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  // Keep the highlighted row in view when the arrow keys walk past the edge.
  useEffect(() => {
    const row = listRef.current?.children[active];
    if (row instanceof HTMLElement) row.scrollIntoView({ block: "nearest" });
  }, [active]);

  const go = useCallback(
    (result: DocsSearchResult | undefined) => {
      if (!result) return;
      onClose();
      navigate(result.path);
    },
    [navigate, onClose],
  );

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
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
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
      return;
    }
    if (e.key === "Home" && results.length) {
      e.preventDefault();
      setActive(0);
      return;
    }
    if (e.key === "End" && results.length) {
      e.preventDefault();
      setActive(results.length - 1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      go(results[active]);
    }
  };

  const activeId = results.length ? `docs-search-option-${active}` : undefined;

  return createPortal(
    <div
      className="docs-search-overlay"
      // A click on the backdrop closes; mousedown so a drag that ends outside
      // a result does not count as one.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="docs-search-panel"
        role="dialog"
        aria-modal="true"
        aria-label={SEARCH_LABEL}
        onKeyDown={onKeyDown}
      >
        <div className="docs-search-field">
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            className="docs-search-input"
            placeholder={`Search ${COLLECTION_TITLE.docs.toLowerCase()}`}
            aria-label={SEARCH_LABEL}
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="docs-search-results"
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
            className="docs-search-esc"
            onClick={onClose}
            aria-label="Close search"
          >
            Esc
          </button>
        </div>

        <div className="docs-search-body">
          {results.length > 0 && (
            <ul
              className="docs-search-results"
              id="docs-search-results"
              role="listbox"
              aria-label="Results"
              ref={listRef}
            >
              {results.map((result, i) => (
                <li
                  key={result.path}
                  id={`docs-search-option-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={
                    "docs-search-result" + (i === active ? " docs-search-result--active" : "")
                  }
                  onMouseMove={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    go(result);
                  }}
                >
                  <span className="docs-search-result-head">
                    <span className="docs-search-result-title">{result.title}</span>
                    {result.section && result.section !== result.title && (
                      <span className="docs-search-result-section">{result.section}</span>
                    )}
                  </span>
                  {result.heading && (
                    <span className="docs-search-result-heading">{result.heading}</span>
                  )}
                  <Snippet result={result} />
                </li>
              ))}
            </ul>
          )}
          {results.length === 0 && (
            <p className="docs-search-empty">
              {loading
                ? "Loading the index…"
                : query.trim()
                  ? `Nothing matches “${query.trim()}”.`
                  : "Search titles, headings, prose and table cells."}
            </p>
          )}
        </div>

        <div className="docs-search-foot">
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

/** The bar affordance plus the dialog it opens, and the shortcut that opens it
    without the bar. Mounted by DocsShell, so it exists on every /docs URL. */
export function DocsSearch() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    // Back to where the reader was, so the shortcut and the button both leave
    // the keyboard somewhere sensible.
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        return;
      }
      // Escape is handled inside the dialog too; this is the backstop for a
      // click that left focus on the panel itself rather than on the field.
      if (e.key === "Escape" && open) {
        close();
        return;
      }
      // "/" is the other shortcut every documentation site has, and it costs
      // nothing as long as it is ignored while a field has focus.
      if (e.key === "/" && !mod && !e.altKey && !isTypingTarget(e.target)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="docs-search-trigger"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <SearchIcon />
        <span className="docs-search-trigger-label">Search</span>
        <ModKbd className="docs-search-trigger-kbd" />
      </button>
      {open && <Dialog onClose={close} />}
    </>
  );
}
