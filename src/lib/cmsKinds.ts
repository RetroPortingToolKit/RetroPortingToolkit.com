// The vocabulary shared by the editor UI and the two CMS backends.
//
// These are the `data/` DIRECTORY names, not the singular `Kind` the site's
// content layer uses. A game page lives in data/games, so POST /api/cms/new
// wants "games"; sending the content layer's "game" is rejected as
// unknown_kind. cmsKinds.test.ts holds the three lists to each other so that
// divergence fails the build instead of the Add button.

export const CMS_KINDS = ["blog", "hardware", "games", "docs"] as const;
export type CmsKind = (typeof CMS_KINDS)[number];

/** Sidebar folder label -> kind. The blog folder appears twice because the dev
    middleware labels it "Articles" and the prod function labels it "Blog". */
export const FOLDER_KIND: Record<string, CmsKind> = {
  Blog: "blog",
  Articles: "blog",
  Hardware: "hardware",
  Games: "games",
  Docs: "docs",
};

/** Reads naturally in the UI: "New project title", not "New games title". */
export const NEW_LABEL: Record<CmsKind, string> = {
  blog: "article",
  hardware: "platform",
  games: "project",
  docs: "docs page",
};

/** Docs are the one kind whose folders nest: a section holds its own index.md
    and one folder per page, so an id carries two folder segments rather than
    one. Both backends read this to decide what a valid id looks like. */
export const MAX_FOLDER_DEPTH: Record<CmsKind, number> = {
  blog: 1,
  hardware: 1,
  games: 1,
  docs: 2,
};
