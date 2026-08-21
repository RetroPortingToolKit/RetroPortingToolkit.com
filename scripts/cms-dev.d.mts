// Types for the dev CMS middleware, so src/lib/cmsKinds.test.ts can import the
// real KIND_DIRS and hold it to the editor's and the prod function's kind
// lists. vite.config.ts also imports this module, but is outside tsconfig's
// `include`. Only what TS actually consumes is declared here.
import type { Connect } from "vite";

/** The `data/` directory names POST /api/cms/new accepts. */
export declare const KIND_DIRS: Set<string>;

/** Dev middleware serving the /api/cms routes against the working tree. */
export declare function createCmsMiddleware(): Connect.NextHandleFunction;

/** Background `git pull` poller; returns its stop function. */
export declare function startAutoPull(opts?: {
  enabled?: boolean;
  intervalMs?: number;
}): () => void;
