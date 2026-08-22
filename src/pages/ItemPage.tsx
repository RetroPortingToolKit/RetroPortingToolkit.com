import { useEffect, type CSSProperties } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import type { Kind } from "@/lib/types";
import { IS_CMS_PREVIEW, useItem } from "@/lib/cmsPreview";
import { ItemDetail } from "@/components/ItemDetail";
import { SITE } from "@/lib/site";
import { titleForItem, useDocumentTitle } from "@/lib/pageTitle";

interface Props {
  kind: Kind;
}

export function ItemPage({ kind }: Props) {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  // Draft-aware: inside the editor's preview frame this resolves from the
  // streamed draft, so a page renders while it is being written and updates as
  // it is typed, without a save, a commit or a build.
  const item = useItem(kind, slug);

  // Matches the title scripts/vite-prerender.mjs serves for this URL, so
  // hydration does not change it.
  useDocumentTitle(item ? titleForItem(item) : "", !!item);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [slug]);

  if (!item) {
    return (
      <div className="page page-missing">
        <div className="container" style={{ padding: "120px 0" }}>
          <h1 className="hero-title">{IS_CMS_PREVIEW ? "Loading the draft" : "Not found"}</h1>
          <p className="hero-sub" style={{ marginTop: 16 }}>
            {IS_CMS_PREVIEW ? "This page renders here as you write it." : "That page doesn't exist."}
          </p>
          {!IS_CMS_PREVIEW && (
            <Link to="/" className="btn btn-secondary" style={{ marginTop: 24 }}>
              ← Home
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page page-fade">
      <header className="page-bar">
        <div className="page-bar-inner">
          <button
            className="page-back"
            onClick={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate("/");
            }}
            aria-label="Back"
          >
            <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M9 1L3 7L9 13"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Back</span>
          </button>
          <Link to="/" className="page-home">
            {SITE.name}
            <span className="dot">{SITE.nameSuffix}</span>
          </Link>
        </div>
      </header>
      <main className="page-main">
        <article
          className="page-article"
          style={
            item.kickerColor
              ? ({ "--article-accent": item.kickerColor } as CSSProperties)
              : undefined
          }
        >
            <ItemDetail item={item} variant="page" />
        </article>
      </main>
    </div>
  );
}
