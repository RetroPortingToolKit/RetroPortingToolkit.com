import { useMemo, useSyncExternalStore } from "react";
import { ABOUT, findItem, pathFor, parseItem, parseAboutFrom } from "./content";
import type { About, Item, Kind } from "./types";

// Live CMS preview: when a page is loaded inside the /admin editor's preview
// iframe (URL carries ?cmsPreview=1), it listens for the editor to stream the
// current draft over postMessage and re-renders from it INSTANTLY, with no save
// and no commit. This is what makes the preview reflect edits in place on both
// dev and the static prod site (which has no dev server to render drafts).
//
// SAFETY: everything here is gated on IS_CMS_PREVIEW, which is only true when the
// query flag is present (set exclusively by the editor's iframe). On the real
// site the listener never registers and useCmsDraft() always returns null, so
// normal rendering is completely unaffected.

export const IS_CMS_PREVIEW =
  typeof window !== "undefined" &&
  typeof window.location !== "undefined" &&
  new URLSearchParams(window.location.search).has("cmsPreview");

export interface CmsDraft {
  // the CMS id of the doc, e.g. "data/blog/03_retro-radio/index.md" or
  // "page:home". Item/source pages reconstruct the file path from this so the
  // app's parser resolves their media against the right folder.
  id: string;
  // the public path this draft renders on (previewFor(id) in the editor), e.g.
  // "/", "/blog/first-post", "/source/foo": pages match on this.
  previewPath: string;
  // the editor's current buffer for the selected doc, in the same shape the
  // read API returns (so the app's own parsers can consume it):
  //   home:   { about: { frontmatter, body }, home: { proof, recognition, philosophy } }
  //   md:     { frontmatter, body }
  //   json:   { raw }
  payload: Record<string, unknown>;
}

let current: CmsDraft | null = null;
const listeners = new Set<() => void>();

if (IS_CMS_PREVIEW) {
  window.addEventListener("message", (e) => {
    // same-origin only (the editor and the previewed page share an origin)
    if (e.origin !== window.location.origin) return;
    const d = e.data as { type?: string; id?: string; previewPath?: string; payload?: Record<string, unknown> };
    if (!d || d.type !== "cms-draft" || typeof d.previewPath !== "string") return;
    current = { id: typeof d.id === "string" ? d.id : "", previewPath: d.previewPath, payload: d.payload || {} };
    listeners.forEach((l) => l());
  });
  // Tell the editor a frame is mounted and ready to receive drafts, so it can
  // stream the initial state without waiting for the first keystroke.
  const announce = () => {
    try {
      window.parent?.postMessage({ type: "cms-preview-ready" }, window.location.origin);
    } catch {
      /* no parent / cross-origin: ignore */
    }
  };
  if (document.readyState === "complete") announce();
  else window.addEventListener("load", announce);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
function snapshot() {
  return current;
}
function serverSnapshot(): CmsDraft | null {
  return null; // prerender / SSR: no draft
}

// Returns the live draft when in preview mode, else null. Pages call this and,
// if the draft's previewPath matches theirs, render from the draft.
export function useCmsDraft(): CmsDraft | null {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

// Draft-aware item/source lookups, used by BOTH the full-page routes and the
// modal-layer routes so a live preview works however an item/source is shown.
// Off the editor's preview iframe these return the static content unchanged.
export function useItem(kind: Kind, slug: string): Item | undefined {
  const draft = useCmsDraft();
  const staticItem = findItem(kind, slug);
  return useMemo(() => {
    if (!draft || draft.previewPath !== pathFor(kind, slug) || !draft.id) return staticItem;
    const fm = String((draft.payload as { frontmatter?: string }).frontmatter ?? "");
    const body = String((draft.payload as { body?: string }).body ?? "");
    return parseItem(`/${draft.id}`, `---\n${fm}\n---\n\n${body}`) ?? staticItem;
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
    return parseAboutFrom("/data/about.md", `---\n${about.frontmatter ?? ""}\n---\n\n${about.body ?? ""}`);
  }, [draft]);
}

// Upstream also exported a useSource() hook here, for live-previewing cached
// source articles (data/sources/*.md). It depended on src/lib/cachedSources,
// which belongs to the citations layer this template does not ship. Restore it
// alongside that module if you add cached sources.
