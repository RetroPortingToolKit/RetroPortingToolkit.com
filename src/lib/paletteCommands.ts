import { NAV_TABS } from "@/components/navTabs";
import DOCS_MANIFEST from "virtual:docs-manifest";
import { COLLECTION_TITLE } from "./pageTitle";
import type { PaletteCommand } from "./siteSearch";
import type { ThemeChoice } from "./theme";

/**
 * What the command palette can DO, as opposed to what it can find.
 *
 * The rule for this list: every entry is something the site already does
 * somewhere else. Navigation is the bar's own row (NAV_TABS) and the
 * documentation's own sections (DOCS_SECTIONS); the theme commands drive
 * src/lib/theme.ts, which is the same mechanism the toggle in the bar drives;
 * the markdown twin is the file scripts/gen-llms.mjs writes for every published
 * documentation page. Nothing here is a capability invented for the palette.
 *
 * A pure function of its context so the catalog can be asserted without a DOM.
 */

export interface PaletteCommandContext {
  /** The router's push, for anything the app renders itself. */
  navigate: (path: string) => void;
  /** A real page load, for the things the app does NOT render: /admin (which
      App.tsx mounts outside the router) and the .md twins (static files). */
  load: (url: string) => void;
  /** The path being read right now, for the page-specific commands. */
  pathname: string;
  /** Put this page's URL on the clipboard. The row confirms once it is done. */
  copyLink: () => void | Promise<unknown>;
  setTheme: (choice: ThemeChoice) => void;
}

interface PaletteDocsSection {
  slug: string;
  path: string;
  title: string;
  summary: string;
  order: number;
}

// Section index entries carry the same title and reader-facing description
// the docs navigation uses. The second pass retains the old fallback for a
// section that has pages but no index of its own, without importing docs bodies
// into the palette chunk.
const PALETTE_DOCS_SECTIONS: PaletteDocsSection[] = (() => {
  const sections = new Map<string, PaletteDocsSection>();
  for (const entry of DOCS_MANIFEST) {
    let section = sections.get(entry.section);
    if (!section) {
      section = {
        slug: entry.section,
        path: `/docs/${entry.section}`,
        title: entry.section
          .replace(/-/g, " ")
          .replace(/^./, (character) => character.toUpperCase()),
        summary: "",
        order: entry.sectionOrder,
      };
      sections.set(entry.section, section);
    }
    if (entry.isSectionIndex) {
      section.title = entry.sectionTitle || entry.title;
      section.summary = entry.desc;
      // Match DOCS_SECTIONS: an index page's explicit `order` moves the whole
      // section; a section without an index keeps its folder-derived order.
      section.order = entry.order;
    }
  }
  return [...sections.values()].sort(
    (a, b) => a.order - b.order || a.slug.localeCompare(b.slug),
  );
})();

/**
 * The markdown twin of a documentation URL, or undefined off /docs.
 * scripts/gen-llms.mjs writes dist/docs.md for the landing page and
 * dist/docs/<slug>.md for every published page, so the rule really is "append
 * .md to the URL you are on".
 */
export function docsMarkdownPath(pathname: string): string | undefined {
  const clean = pathname.replace(/\/+$/, "");
  if (clean === "/docs") return "/docs.md";
  if (!clean.startsWith("/docs/")) return undefined;
  return `${clean}.md`;
}

export function buildPaletteCommands(ctx: PaletteCommandContext): PaletteCommand[] {
  const commands: PaletteCommand[] = [];

  // 1. The bar's own row, and then the documentation's sections. Same targets a
  //    click on the bar has, so the palette can never offer a place that is not
  //    in the navigation.
  const NAV_HINT: Record<string, string> = {
    home: "The front page",
    hardware: "Every console this site covers",
    game: "Every port, and what state it is in",
    blog: "Articles, videos and coverage",
  };
  for (const tab of NAV_TABS) {
    commands.push({
      id: `go:${tab.id}`,
      label: tab.label,
      hint: NAV_HINT[tab.id] ?? "",
      group: "Go",
      run: () => ctx.navigate(tab.path),
    });
  }
  commands.push({
    id: "go:docs",
    label: COLLECTION_TITLE.docs,
    hint: "The whole handbook, section by section",
    group: "Go",
    keywords: "docs manual handbook reference",
    run: () => ctx.navigate("/docs"),
  });
  for (const section of PALETTE_DOCS_SECTIONS) {
    commands.push({
      id: `go:docs/${section.slug}`,
      label: `${COLLECTION_TITLE.docs}: ${section.title}`,
      hint: section.summary,
      group: "Go",
      keywords: "docs section",
      run: () => ctx.navigate(section.path),
    });
  }

  // 2. This page.
  commands.push({
    id: "page:copy-link",
    label: "Copy link to this page",
    hint: "Put this page's URL on the clipboard",
    group: "Page",
    keywords: "url share clipboard",
    confirm: "Link copied",
    run: ctx.copyLink,
  });
  const markdown = docsMarkdownPath(ctx.pathname);
  if (markdown) {
    commands.push({
      id: "page:markdown",
      label: "Open this page as Markdown",
      hint: "The same page as raw markdown, which is what an agent wants",
      group: "Page",
      keywords: "md raw source plain text agent",
      run: () => ctx.load(markdown),
    });
  }

  // 3. The theme, the same three states the toggle in the bar knows about.
  const THEMES: { choice: ThemeChoice; label: string; hint: string }[] = [
    { choice: "light", label: "Light", hint: "Always the light palette" },
    { choice: "dark", label: "Dark", hint: "Always the dark palette" },
    { choice: "system", label: "System", hint: "Follow the operating system" },
  ];
  for (const theme of THEMES) {
    commands.push({
      id: `theme:${theme.choice}`,
      label: `Theme: ${theme.label}`,
      hint: theme.hint,
      group: "Theme",
      keywords: "appearance colour color mode dark light",
      run: () => ctx.setTheme(theme.choice),
    });
  }

  // 4. The editor. A real page load: /admin is mounted outside the router.
  commands.push({
    id: "site:admin",
    label: "Open the editor",
    hint: "Write or edit a page in the CMS",
    group: "Site",
    keywords: "admin cms publish write new page",
    run: () => ctx.load("/admin"),
  });

  return commands;
}
