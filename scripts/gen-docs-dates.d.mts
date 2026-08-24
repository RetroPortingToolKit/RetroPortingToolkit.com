// Types for the documentation "last updated" generator. vite.config.ts imports
// this module and is outside tsconfig's `include`; the declarations exist so
// that anything under src/ can import the real functions too. Only what TS
// actually consumes is declared here.

/** Where a page's published date came from. */
export type UpdatedSource = "frontmatter" | "git";

/** One page's resolved date. */
export interface DocsUpdatedEntry {
  /** ISO calendar date, "YYYY-MM-DD". */
  date: string;
  source: UpdatedSource;
}

/** What one `git log` over data/docs could tell us. */
export interface DocsGitDates {
  /** slug -> the date of the last commit that touched its index.md */
  dates: Map<string, string>;
  /** how many commits the log actually reported */
  commits: number;
  /** false when git could not answer at all */
  available: boolean;
  /** true when the clone has a graft, so history is incomplete */
  shallow: boolean;
  /** why `available` is false, when it is */
  reason: string;
}

/** The subset of a published page this generator reads. */
export interface DocsDatedPage {
  slug: string;
  updated?: string;
}

/** One page whose declared date is older than its last commit. */
export interface StaleUpdated {
  slug: string;
  declared: string;
  committed: string;
}

/** "data/docs/01_start/05_quickstart/index.md" -> "start/quickstart". */
export declare function slugFromDocsPath(repoPath: string): string | null;

/** Last commit date per page, from one `git log`. `run` is injectable so the
    tests can drive the parser and the fallbacks without a repository. */
export declare function gitDocsDates(options?: {
  cwd?: string;
  run?: (args: string[], cwd: string) => string;
}): DocsGitDates;

/** False when git's answer is an artefact of the clone (a depth-1 checkout). */
export declare function gitDatesAreTrustworthy(git: DocsGitDates | undefined): boolean;

/** Frontmatter first, git second, nothing third. */
export declare function resolveUpdated(
  page: DocsDatedPage,
  git: DocsGitDates | undefined,
): DocsUpdatedEntry | null;

/** Pages whose declared date is older than the last commit that touched them. */
export declare function staleUpdated(
  pages: DocsDatedPage[],
  git: DocsGitDates | undefined,
): StaleUpdated[];

/** slug -> resolved date, for every page that has one. */
export declare function buildDocsUpdated(
  pages: DocsDatedPage[],
  git: DocsGitDates | undefined,
): Record<string, DocsUpdatedEntry>;

/** Everything the vite plugin needs, in one call and one `git log`. */
export declare function docsUpdated(
  pages: DocsDatedPage[],
  options?: { cwd?: string; run?: (args: string[], cwd: string) => string },
): {
  map: Record<string, DocsUpdatedEntry>;
  stale: StaleUpdated[];
  git: DocsGitDates;
};
