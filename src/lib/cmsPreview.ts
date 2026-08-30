import { useMemo } from "react";
import {
  ABOUT,
  findCatalogItem,
  parseCatalogAboutFrom,
  parseCatalogItem,
  type CatalogKind,
} from "./catalogContent";
import { pathFor } from "./contentCore";
import { useCmsDraft } from "./cmsPreviewCore";
import type { About, Item } from "./types";

export {
  IS_CMS_PREVIEW,
  useCmsDraft,
  type CmsDraft,
} from "./cmsPreviewCore";

// Live CMS preview: when a page is loaded inside the /admin editor's preview
// iframe (URL carries ?cmsPreview=1), it listens for the editor to stream the
// current draft over postMessage and re-renders from it INSTANTLY, with no save
// and no commit. This is what makes the preview reflect edits in place on both
// dev and the static prod site (which has no dev server to render drafts).
//
// SAFETY: the shared transport is gated on IS_CMS_PREVIEW. On the real site it
// never registers a listener and useCmsDraft() always returns null.

// Draft-aware item/source lookups, used by BOTH the full-page routes and the
// modal-layer routes so a live preview works however an item/source is shown.
// Off the editor's preview iframe these return the static content unchanged.
export function useItem(kind: CatalogKind, slug: string): Item | undefined {
  const draft = useCmsDraft();
  const staticItem = findCatalogItem(kind, slug);
  return useMemo(() => {
    if (!draft || draft.previewPath !== pathFor(kind, slug) || !draft.id) return staticItem;
    const fm = String((draft.payload as { frontmatter?: string }).frontmatter ?? "");
    const body = String((draft.payload as { body?: string }).body ?? "");
    return parseCatalogItem(`/${draft.id}`, `---\n${fm}\n---\n\n${body}`) ?? staticItem;
  }, [draft, kind, slug, staticItem]);
}

// Draft-aware identity (about.md), used wherever the name/role/email appear
// (hero, nav, footer) so a home edit previews everywhere at once.
export function useAbout(): About {
  const draft = useCmsDraft();
  return useMemo(() => {
    if (!draft || draft.previewPath !== "/") return ABOUT;
    const about = (draft.payload as { about?: { frontmatter?: string; body?: string } }).about;
    if (!about) return ABOUT;
    return parseCatalogAboutFrom(
      "/data/about.md",
      `---\n${about.frontmatter ?? ""}\n---\n\n${about.body ?? ""}`,
    );
  }, [draft]);
}

// Upstream also exported a useSource() hook here, for live-previewing cached
// source articles (data/sources/*.md). It depended on src/lib/cachedSources,
// which belongs to the citations layer this template does not ship. Restore it
// alongside that module if you add cached sources.
