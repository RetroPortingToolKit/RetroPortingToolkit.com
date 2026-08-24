import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { headingsInElement, type DocsHeading } from "./docsHeadings";

// "On this page": the right-hand rail on a wide screen, a collapsed block above
// the body on a narrow one. Benchmark checklist item 2.

// Distance from the top of the viewport at which a heading counts as "the one
// you are reading". Clears the sticky page bar (52px) with room to spare.
const ACTIVE_OFFSET = 140;

/** Below this many headings there is nothing to navigate and no TOC is drawn.
    The rail keeps its grid column either way, so the reading measure does not
    change between a page that has a contents list and one that does not. */
export const TOC_MIN = 2;

/**
 * Headings of the rendered article, recomputed whenever the body changes (which
 * is every keystroke inside the CMS preview). useLayoutEffect so the rail is
 * placed in the same frame the article paints, with no flash of a missing TOC.
 */
export function useDocsHeadings(
  ref: RefObject<HTMLElement>,
  key: string,
): DocsHeading[] {
  const [headings, setHeadings] = useState<DocsHeading[]>([]);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) {
      setHeadings([]);
      return;
    }
    const next = headingsInElement(root);
    setHeadings((prev) =>
      prev.length === next.length &&
      prev.every((h, i) => h.id === next[i].id && h.text === next[i].text)
        ? prev
        : next,
    );
  }, [ref, key]);
  return headings;
}

/** The heading the reader is currently under, for the rail's active marker. */
function useActiveHeading(headings: DocsHeading[]): string {
  const [active, setActive] = useState("");
  useEffect(() => {
    if (headings.length === 0) {
      setActive("");
      return;
    }
    let raf = 0;
    const measure = () => {
      raf = 0;
      let current = headings[0].id;
      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= ACTIVE_OFFSET) current = h.id;
        else break;
      }
      // At the very bottom the last heading may never cross the line, so the
      // rail would stall one entry short of where the reader actually is.
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4
      ) {
        current = headings[headings.length - 1].id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [headings]);
  return active;
}

interface Props {
  headings: DocsHeading[];
  /** "rail" is the sticky right column, "inline" the block above the body. */
  variant: "rail" | "inline";
}

export function DocsToc({ headings, variant }: Props) {
  const active = useActiveHeading(headings);
  // A page with one heading has nothing to navigate, so no rail is drawn: an
  // empty box is worse than no box.
  if (headings.length < TOC_MIN) return null;

  const list = (
    <ol className="docs-toc-list">
      {headings.map((h) => (
        <li
          key={h.id}
          className={
            "docs-toc-item docs-toc-item--h" +
            h.depth +
            (active === h.id ? " is-active" : "")
          }
        >
          <a href={`#${h.id}`}>{h.text}</a>
        </li>
      ))}
    </ol>
  );

  if (variant === "inline") {
    return (
      <details className="docs-toc docs-toc--inline">
        <summary className="docs-toc-title">On this page</summary>
        {list}
      </details>
    );
  }

  return (
    <nav className="docs-toc docs-toc--rail" aria-label="On this page">
      <p className="docs-toc-title">On this page</p>
      {list}
    </nav>
  );
}
