import type { TabId } from "./Tabs";

// The site's primary navigation, in ONE place because two surfaces render the
// same bar and must not drift:
//
//   - Home.tsx, where a tab is also a pager pane (TAB_ORDER below is that
//     pager's order, and the swipe/keyboard nav walks it), and
//   - DocsShell.tsx, where the same bar is pure navigation: /docs is not a
//     pane, so it just navigates.
//
// Documentation itself is deliberately NOT in this array. It is a link at the
// end of the row rather than a tab; see the comment at its call site in
// Tabs.tsx and section 5 of the docs design handoff.

/** Where each tab lives. The pager commits a gesture by navigating here. */
export const TAB_PATH: Record<TabId, string> = {
  home: "/",
  hardware: "/hardware",
  game: "/games",
  blog: "/blog",
};

/** The row itself, left to right. */
export const NAV_TABS: { id: TabId; label: string; path: string }[] = [
  { id: "home", label: "Home", path: TAB_PATH.home },
  { id: "hardware", label: "Platforms", path: TAB_PATH.hardware },
  { id: "game", label: "Games", path: TAB_PATH.game },
  { id: "blog", label: "Blog", path: TAB_PATH.blog },
];

/** Home's pager order. Derived, so a tab can never be in the row but not in
    the pager (or the other way round). */
export const TAB_ORDER: TabId[] = NAV_TABS.map((t) => t.id);
