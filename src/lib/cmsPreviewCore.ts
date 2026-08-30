import { useSyncExternalStore } from "react";

// Shared transport for the two content-domain preview hooks. This module owns
// no static content, so importing it from the lazy documentation route cannot
// pull either catalogue or documentation Markdown across the boundary.
export const IS_CMS_PREVIEW =
  typeof window !== "undefined" &&
  typeof window.location !== "undefined" &&
  new URLSearchParams(window.location.search).has("cmsPreview");

export interface CmsDraft {
  // The CMS id of the document, e.g. data/blog/03_post/index.md.
  id: string;
  // The public path this draft renders on.
  previewPath: string;
  // The editor's current buffer, in the same shape as the CMS read response.
  payload: Record<string, unknown>;
}

let current: CmsDraft | null = null;
const listeners = new Set<() => void>();

if (IS_CMS_PREVIEW) {
  window.addEventListener("message", (event) => {
    // The editor and preview frame share an origin. Ignore every other sender.
    if (event.origin !== window.location.origin) return;
    const data = event.data as {
      type?: string;
      id?: string;
      previewPath?: string;
      payload?: Record<string, unknown>;
    };
    if (!data || data.type !== "cms-draft" || typeof data.previewPath !== "string") return;
    current = {
      id: typeof data.id === "string" ? data.id : "",
      previewPath: data.previewPath,
      payload: data.payload || {},
    };
    listeners.forEach((listener) => listener());
  });

  // Tell the editor that the frame can receive the initial draft. This is what
  // makes a brand-new document render before it has ever existed in data/.
  const announce = () => {
    try {
      window.parent?.postMessage({ type: "cms-preview-ready" }, window.location.origin);
    } catch {
      /* no parent or a cross-origin parent */
    }
  };
  if (document.readyState === "complete") announce();
  else window.addEventListener("load", announce);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function snapshot() {
  return current;
}

function serverSnapshot(): CmsDraft | null {
  return null;
}

export function useCmsDraft(): CmsDraft | null {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
