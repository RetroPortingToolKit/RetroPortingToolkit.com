// Types for the machine-readable surfaces generator, so
// src/lib/agentSurfaces.test.ts can import the real renderers and assert they
// agree with DOCS and DOCS_SECTIONS in src/lib/content.ts. vite.config.ts also
// imports this module, but is outside tsconfig's `include`. Only what TS
// actually consumes is declared here.

/** One published documentation page, as this generator sees it. */
export interface DocsMdPage {
  /** full path under /docs: "concepts" or "concepts/co-simulation" */
  slug: string;
  section: string;
  sectionOrder: number;
  order: number;
  isSectionIndex: boolean;
  title: string;
  summary: string;
  desc: string;
  sectionTitle: string;
  pageType: string;
  tags: string[];
  repos: string[];
  updated: string;
  /** absolute canonical URL */
  url: string;
  /** absolute URL of the raw markdown */
  mdUrl: string;
  body: string;
}

/** One documentation section, in sidebar order. Mirrors DocsSection. */
export interface DocsMdSection {
  slug: string;
  path: string;
  url: string;
  title: string;
  summary: string;
  order: number;
  index?: DocsMdPage;
  pages: DocsMdPage[];
}

/** The published documentation, in sidebar order. */
export declare function collectDocs(): {
  pages: DocsMdPage[];
  sections: DocsMdSection[];
};

/** The llms.txt index. */
export declare function renderLlmsTxt(): string;

/** Every published documentation page concatenated, in sidebar order. */
export declare function renderLlmsFull(): string;

/** The /docs landing page as markdown. */
export declare function renderDocsIndexMarkdown(): string;

/** robots.txt, naming the sitemap and the agent surfaces. */
export declare function renderRobots(): string;

/** One documentation page as a standalone markdown document. */
export declare function renderPageMarkdown(
  page: DocsMdPage,
  sectionTitle: string,
  mdSlugs: Set<string>,
): string;

/** Everything this generator produces, in memory. `pageFiles` is keyed by the
    path relative to the dist root ("docs/concepts/co-simulation.md"). */
export declare function renderAgentSurfaces(): {
  pages: DocsMdPage[];
  sections: DocsMdSection[];
  llms: string;
  llmsFull: string;
  docsIndex: string;
  robots: string;
  pageFiles: Map<string, string>;
};

/** Pages with neither a summary nor a desc, so no description in llms.txt. */
export declare function pagesMissingDescription(pages: DocsMdPage[]): string[];

/** Writes every surface into a built site, asserting the .md count matches the
    number of published pages. Throws on a mismatch. */
export declare function generateAgentSurfaces(distDir?: string): {
  pages: number;
  sections: number;
  missingDescription: string[];
};
