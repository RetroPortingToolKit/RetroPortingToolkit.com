import { useEffect, useRef, type CSSProperties } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import DOCS_UPDATED from "virtual:docs-updated";
import { DOCS_SECTIONS, formatArticleDate, isDocsSectionIndex } from "@/lib/content";
import { IS_CMS_PREVIEW, useItem } from "@/lib/cmsPreview";
import { Markdown } from "@/components/Markdown";
import { DocsShell } from "@/components/DocsShell";
import { DocsToc, useDocsHeadings } from "@/components/DocsToc";
import {
  DOCS_QUICK_LINKS,
  entriesInSection,
  neighbours,
  sectionForSlug,
  type DocsNavEntry,
} from "@/components/docsNav";
import { SITE } from "@/lib/site";
import {
  COLLECTION_TITLE,
  titleForCollection,
  titleForItem,
  useDocumentTitle,
} from "@/lib/pageTitle";
import type { Item } from "@/lib/types";

// The documentation section. URLs are /docs, /docs/<section> and
// /docs/<section>/<page>, matching the folder path under data/docs/ exactly.
//
// Everything a navigation surface needs comes from DOCS_SECTIONS in
// src/lib/content.ts (by way of src/components/docsNav.ts), which is derived
// from the PUBLISHED docs list, so a draft page can never appear in the
// sidebar, the card grid or a prev/next link while its own URL keeps working.
//
// The route contract this file must keep: `/docs/*` puts the whole path in the
// splat param, and the title is titleForCollection("docs") for the landing and
// titleForItem(item) for a page. src/lib/pageTitle.test.ts asserts those match
// what scripts/vite-prerender.mjs baked into the served HTML for the same URL.

function summaryOf(item: Item): string {
  return item.summary || item.desc || "";
}

/* ---------------------------------- /docs --------------------------------- */

function QuickLinks() {
  // Resolved against published pages at build time, so a destination that has
  // not been written yet is absent rather than broken. See docsNav.ts.
  if (DOCS_QUICK_LINKS.length === 0) return null;
  return (
    <ul className="docs-quicklinks">
      {DOCS_QUICK_LINKS.map((link) => (
        <li key={link.path}>
          <Link to={link.path} className="docs-quicklink">
            <span className="docs-quicklink-label">{link.label}</span>
            <span className="docs-quicklink-arrow" aria-hidden="true">
              &rarr;
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function SectionCard({ section }: { section: (typeof DOCS_SECTIONS)[number] }) {
  const pages = entriesInSection(section).filter((e) => !e.isSectionIndex);
  const count = pages.length;
  const meta = count === 1 ? "1 page" : `${count} pages`;
  const body = (
    <>
      <span className="docs-card-title">{section.title}</span>
      {section.summary && (
        <span className="docs-card-desc">{section.summary}</span>
      )}
      {count > 0 && <span className="docs-card-meta">{meta}</span>}
    </>
  );

  // A section only has an address when it has an index page of its own. One
  // without gets a card that is not a link, and its pages are listed inside so
  // the section is still a way in.
  if (section.index) {
    return (
      <li className="docs-card">
        <Link to={section.path} className="docs-card-link">
          {body}
        </Link>
      </li>
    );
  }
  return (
    <li className="docs-card docs-card--plain">
      <span className="docs-card-link">{body}</span>
      {count > 0 && (
        <ul className="docs-card-pages">
          {pages.map((page) => (
            <li key={page.slug}>
              <Link to={page.path}>{page.title}</Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function DocsIndex() {
  useDocumentTitle(titleForCollection("docs"));
  return (
    <DocsShell>
      <article className="docs-article docs-landing">
        <h1 className="docs-title">{COLLECTION_TITLE.docs}</h1>
        <p className="docs-lede">
          This is the documentation for {SITE.title}: the shared vocabulary
          behind static recompilation, the techniques the toolchains have in
          common, and the map that says which repository to open next. Each
          section below is a different job, so start with the one that matches
          yours.
        </p>
        <QuickLinks />
        {DOCS_SECTIONS.length === 0 ? (
          <p className="docs-empty">Nothing here yet.</p>
        ) : (
          <ul className="docs-cards">
            {DOCS_SECTIONS.map((section) => (
              <SectionCard key={section.slug} section={section} />
            ))}
          </ul>
        )}
      </article>
    </DocsShell>
  );
}

/* ------------------------------- one page -------------------------------- */

function Breadcrumbs({ item }: { item: Item }) {
  const section = sectionForSlug(item.slug);
  const isIndex = isDocsSectionIndex(item);
  return (
    <nav className="docs-breadcrumb" aria-label="Breadcrumb">
      <ol>
        <li>
          <Link to="/docs">{COLLECTION_TITLE.docs}</Link>
        </li>
        {section && !isIndex && (
          <li>
            {section.index ? (
              <Link to={section.path}>{section.title}</Link>
            ) : (
              <span>{section.title}</span>
            )}
          </li>
        )}
        <li>
          <span aria-current="page">{item.title}</span>
        </li>
      </ol>
    </nav>
  );
}

function Pager({ slug }: { slug: string }) {
  const { prev, next } = neighbours(slug);
  if (!prev && !next) return null;
  const link = (entry: DocsNavEntry, dir: "prev" | "next") => (
    <Link to={entry.path} className={`docs-pager-link docs-pager-${dir}`}>
      <span className="docs-pager-dir">
        {dir === "prev" ? "Previous" : "Next"}
      </span>
      <span className="docs-pager-title">{entry.title}</span>
    </Link>
  );
  return (
    <nav className="docs-pager" aria-label="Documentation pages">
      {prev ? link(prev, "prev") : <span />}
      {next ? link(next, "next") : <span />}
    </nav>
  );
}

function SectionContents({ item }: { item: Item }) {
  const section = DOCS_SECTIONS.find((s) => s.slug === item.slug);
  const pages = section
    ? entriesInSection(section).filter((e) => !e.isSectionIndex)
    : [];
  if (pages.length === 0) return null;
  // A section index usually walks its own pages in prose, and printing the
  // same list again under it is just noise. So this is the fallback for a
  // section index that does not: if the body already links most of the
  // section, the body IS the contents.
  const linked = pages.filter((p) => item.body.includes(p.path)).length;
  if (linked * 2 >= pages.length) return null;
  return (
    <section className="docs-contents">
      <h2 className="docs-contents-title">In this section</h2>
      <ul className="docs-section-pages">
        {pages.map((page) => (
          <li key={page.slug}>
            <Link to={page.path} className="docs-section-page">
              <span className="docs-section-page-title">{page.title}</span>
              {page.summary && (
                <span className="docs-section-page-desc">{page.summary}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// The last-updated stamp. The date is decided at BUILD time by
// scripts/gen-docs-dates.mjs: the page's own `updated:` frontmatter where it
// has one, and otherwise the date of the last commit that touched its
// index.md. A page with neither shows nothing rather than a made up date.
//
// It sits at the foot of the article on purpose. A reader wants it when they
// are deciding whether to trust what they have just read, not before they have
// read it, and this file's H1 already has a summary competing for that space.
function LastUpdated({ slug }: { slug: string }) {
  const entry = DOCS_UPDATED[slug];
  if (!entry) return null;
  return (
    <p className="docs-updated">
      Last updated{" "}
      <time dateTime={entry.date} className="docs-updated-date">
        {formatArticleDate(entry.date)}
      </time>
    </p>
  );
}

function DocsMissing() {
  return (
    <DocsShell>
      <article className="docs-article">
        <h1 className="docs-title">
          {IS_CMS_PREVIEW ? "Loading the draft" : "Not found"}
        </h1>
        <p className="docs-summary">
          {IS_CMS_PREVIEW
            ? "This page renders here as you write it."
            : "That documentation page doesn't exist."}
        </p>
        {!IS_CMS_PREVIEW && (
          <p>
            <Link to="/docs">All {COLLECTION_TITLE.docs.toLowerCase()}</Link>
          </p>
        )}
      </article>
    </DocsShell>
  );
}

function DocsItem({ slug }: { slug: string }) {
  // Draft-aware, exactly like ItemPage: inside the editor's preview frame this
  // resolves from the streamed draft, so a page renders as it is written.
  const item = useItem("docs", slug);
  const { hash } = useLocation();
  useDocumentTitle(item ? titleForItem(item) : "", !!item);

  const bodyRef = useRef<HTMLDivElement>(null);
  const headings = useDocsHeadings(bodyRef, (item?.slug ?? "") + (item?.body ?? ""));

  useEffect(() => {
    // A link into a heading owns the scroll position; only a plain navigation
    // resets to the top. The browser handles a same-document fragment on its
    // own, but a client-side navigation carrying one (a search result opening
    // the heading it matched) has to be scrolled here, once the body exists.
    if (hash) {
      const id = decodeURIComponent(hash.slice(1));
      const jump = () => document.getElementById(id)?.scrollIntoView();
      jump();
      const raf = requestAnimationFrame(jump);
      return () => cancelAnimationFrame(raf);
    }
    window.scrollTo({ top: 0, behavior: "auto" });
    return undefined;
  }, [slug, hash]);

  // A slug that resolves to nothing is a real miss, not a redirect: the
  // prerenderer emits one route per docs page, so an address that misses is
  // either a typo or a page that has not been written.
  if (!item) return <DocsMissing />;

  const summary = summaryOf(item);
  const isIndex = isDocsSectionIndex(item);

  return (
    <DocsShell
      currentSlug={item.slug}
      rail={<DocsToc headings={headings} variant="rail" />}
    >
      <article
        className="docs-article"
        style={
          item.kickerColor
            ? ({ "--article-accent": item.kickerColor } as CSSProperties)
            : undefined
        }
      >
        <Breadcrumbs item={item} />
        <h1 className="docs-title">{item.title}</h1>
        {summary && <p className="docs-summary">{summary}</p>}
        <DocsToc headings={headings} variant="inline" />
        {item.body && (
          <div ref={bodyRef}>
            <Markdown className="modal-content docs-prose">{item.body}</Markdown>
          </div>
        )}
        {isIndex && <SectionContents item={item} />}
        <footer className="docs-article-foot">
          <LastUpdated slug={item.slug} />
        </footer>
        <Pager slug={item.slug} />
      </article>
    </DocsShell>
  );
}

export function DocsPage() {
  // `path="/docs/*"` puts everything after /docs in the splat param, which is
  // the whole point: react-router's `:slug` matches ONE segment and a docs URL
  // carries two.
  const params = useParams();
  const slug = (params["*"] ?? "").replace(/^\/+|\/+$/g, "");
  if (!slug) return <DocsIndex />;
  return <DocsItem slug={slug} />;
}

export default DocsPage;
