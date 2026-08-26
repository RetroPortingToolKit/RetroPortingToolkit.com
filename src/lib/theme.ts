// The light/dark mechanism, in one place because TWO surfaces drive it now:
//
//   - src/components/ThemeToggle.tsx, the button in the nav bar, which flips
//     between light and dark, and
//   - the command palette's "Theme: light / dark / system" commands, which can
//     also hand the choice back to the operating system.
//
// The rules are unchanged from when they lived inside the toggle: an explicit
// choice is stored under "theme" and stamped on <html data-theme>, and no
// stored choice means no attribute at all, which is what lets the
// prefers-color-scheme block in 01-base.css decide.

export type Resolved = "light" | "dark";
/** What a person can ask for. "system" is the absence of a stored choice. */
export type ThemeChoice = Resolved | "system";

const STORAGE_KEY = "theme";

/** The stored choice, or null when the reader has never made one. */
export function readStoredTheme(): Resolved | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

/** What the operating system is asking for right now. */
export function systemTheme(): Resolved {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** What the page is actually showing: the stored choice, else the system's. */
export function resolveTheme(): Resolved {
  return readStoredTheme() ?? systemTheme();
}

/** Stamp (or clear) the attribute the palette in 01-base.css keys off. */
export function applyTheme(theme: Resolved | null) {
  const root = document.documentElement;
  if (theme === null) root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

// Both surfaces render the current theme, so a change made in one has to reach
// the other. One set of listeners, notified after every setTheme.
const listeners = new Set<() => void>();

export function subscribeTheme(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Make a choice. "system" forgets the stored one and drops the attribute, so
 * the media query takes over again; the other two store and stamp.
 * Returns what the page now shows.
 */
export function setTheme(choice: ThemeChoice): Resolved {
  if (choice === "system") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    applyTheme(null);
  } else {
    applyTheme(choice);
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {}
  }
  for (const fn of listeners) fn();
  return resolveTheme();
}
