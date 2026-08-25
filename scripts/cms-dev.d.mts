// Types for the dev CMS middleware, so src/lib/cmsKinds.test.ts can import the
// real KIND_DIRS and hold it to the editor's and the prod function's kind
// lists. vite.config.ts also imports this module, but is outside tsconfig's
// `include`. Only what TS actually consumes is declared here.
import type { Connect } from "vite";

/** The `data/` directory names POST /api/cms/new accepts. */
export declare const KIND_DIRS: Set<string>;

/** Singular noun per kind, used in the stub description. Mirrors api/cms.ts. */
export declare const KIND_NOUN: Record<string, string>;

/** The frontmatter keys POST /api/cms/post copies through. Mirrors api/cms.ts. */
export declare const PUBLISH_FIELDS: readonly string[];

/** The publishable keys that are lists, not strings. Mirrors api/cms.ts. */
export declare const PUBLISH_LIST_FIELDS: readonly string[];

/** Which of those keys each kind may receive. Mirrors api/cms.ts. */
export declare const PUBLISH_KIND_FIELDS: Record<string, readonly string[]>;

/** The structured fields the editor shows, parsed off raw frontmatter.
    Mirrors mdFields() in api/cms.ts, catch included. */
export declare function mdFields(fmText: string): {
  title: string;
  desc: string;
  kicker: string;
  date: string;
  cover: string;
  platform: string;
  status: string;
  repo: string;
  author: string;
  authorAvatar: string;
  summary: string;
  pageType: string;
  sectionTitle: string;
  draft: boolean;
  featured: boolean;
  tags: string[];
};

/** An item id taken apart: data/<kind>/<folder>/index.md, with docs nesting one
    level deeper. Null for anything that is not an item. */
export declare function itemParts(id: string): {
  kind: string;
  folder: string;
  parent: string;
  leaf: string;
  slug: string;
} | null;

/** Dev middleware serving the /api/cms routes against the working tree. */
export declare function createCmsMiddleware(): Connect.NextHandleFunction;

/** Background `git pull` poller; returns its stop function. */
export declare function startAutoPull(opts?: {
  enabled?: boolean;
  intervalMs?: number;
}): () => void;
