import { useMemo } from "react";
import { pathFor } from "./contentCore";
import { useCmsDraft } from "./cmsPreviewCore";
import { findDocsItem, parseDocsItem } from "./docsContent";
import type { CmsDraft } from "./cmsPreviewCore";
import type { Item } from "./types";

export { IS_CMS_PREVIEW } from "./cmsPreviewCore";

// Kept pure so the brand-new-page case is testable without a browser or a
// mounted hook. `staticItem` is deliberately optional: a CMS draft must render
// before its index.md has ever existed in the build's eager docs glob.
export function resolveDocsPreviewItem(
  draft: CmsDraft | null,
  slug: string,
  staticItem?: Item,
): Item | undefined {
  if (!draft || draft.previewPath !== pathFor("docs", slug) || !draft.id) {
    return staticItem;
  }
  const frontmatter = String(
    (draft.payload as { frontmatter?: string }).frontmatter ?? "",
  );
  const body = String((draft.payload as { body?: string }).body ?? "");
  return (
    parseDocsItem(
      `/${draft.id}`,
      `---\n${frontmatter}\n---\n\n${body}`,
    ) ?? staticItem
  );
}

// Draft-aware documentation lookup. This hook sits behind DocsPage's lazy
// route, so its static docs loader and media map are absent from every
// catalogue route while a brand-new docs draft can still be parsed directly
// from the editor buffer before it exists in data/.
export function useDocsItem(slug: string): Item | undefined {
  const draft = useCmsDraft();
  const staticItem = findDocsItem(slug);
  return useMemo(
    () => resolveDocsPreviewItem(draft, slug, staticItem),
    [draft, slug, staticItem],
  );
}
