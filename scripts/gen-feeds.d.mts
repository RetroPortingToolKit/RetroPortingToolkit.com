// Types for the feed generator, so src/lib/docsContent.test.ts can import the
// real renderFeeds() and assert the feeds stay blog-only. vite.config.ts also
// imports this module, but is outside tsconfig's `include`. Only what TS
// actually consumes is declared here.

/** RSS 2.0, Atom 1.0 and JSON Feed 1.1 for the blog, rendered in memory. */
export declare function renderFeeds(): {
  count: number;
  rss: string;
  atom: string;
  json: string;
};

/** Writes those three files into a built site; returns how many posts. */
export declare function generateFeeds(distDir?: string): number;
