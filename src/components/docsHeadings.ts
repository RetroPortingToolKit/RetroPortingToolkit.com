// The "on this page" data source.
//
// SEAM: the headings are read from the RENDERED article, not from the markdown
// source. That is deliberate. A separate change is putting stable anchor ids on
// docs headings (rehype-slug), and reading the DOM means this list carries
// whatever ids that change actually produced, rather than a second slug
// algorithm that has to be kept in step with it. If a heading has no id yet,
// `slugify` below supplies one so the TOC links work in the meantime; once the
// anchors land, that fallback simply never fires.
//
// If a shared extractor (src/lib/toc.ts) appears later, swapping to it is a
// one-line change in DocsToc.tsx: the shape below is the whole contract.

export interface DocsHeading {
  /** 2 or 3: H1 is the page title and is not in the list */
  depth: number;
  id: string;
  text: string;
}

/**
 * GitHub-style anchor slug: lowercased, punctuation dropped, spaces hyphenated.
 * Only used for a heading the renderer left without an id.
 */
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * A heading's own words. The permalink the renderer appends to each heading is
 * a child of it, so reading textContent straight off the element would put a
 * stray "#" on the end of every contents entry.
 */
function headingText(el: HTMLElement): string {
  const clone = el.cloneNode(true) as HTMLElement;
  for (const a of Array.from(
    clone.querySelectorAll<HTMLElement>('.md-anchor, a[href^="#"]'),
  )) {
    const label = (a.textContent ?? "").trim();
    if (label === "" || label === "#" || label === "¶") a.remove();
  }
  return (clone.textContent ?? "").trim();
}

/**
 * Read H2 and H3 out of a rendered article, giving each one a usable id.
 * Returns [] when the article has no headings, which is what tells the caller
 * to render no table of contents at all rather than an empty box.
 */
export function headingsInElement(root: HTMLElement): DocsHeading[] {
  const seen = new Map<string, number>();
  const out: DocsHeading[] = [];
  for (const el of root.querySelectorAll<HTMLElement>("h2, h3")) {
    const text = headingText(el);
    if (!text) continue;
    let id = el.id;
    if (!id) {
      const base = slugify(text) || `section-${out.length + 1}`;
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      id = n === 0 ? base : `${base}-${n}`;
      // The renderer has not put an anchor here yet; give it one so the link
      // resolves. Setting an attribute React does not control is safe.
      el.id = id;
    }
    out.push({ depth: el.tagName === "H2" ? 2 : 3, id, text });
  }
  return out;
}
