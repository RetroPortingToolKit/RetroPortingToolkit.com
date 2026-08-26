import { useSyncExternalStore } from "react";

/**
 * Who has the command palette open, in one module because more than one thing
 * opens it: the button in the nav bar, the search box at the head of the
 * documentation sidebar, and the keyboard (Cmd-K / Ctrl-K, or "/" outside a
 * field). There is exactly ONE palette, mounted by the nav bar, and these are
 * all ways of asking for it.
 *
 * A module-level store rather than a context, so a trigger does not have to be
 * under a provider to reach it, and so the shortcut can be registered once.
 *
 * Nothing here touches the DOM at import time: the site prerenders, and this
 * module is loaded during that build.
 */

let open = false;
/** Where the keyboard goes when the palette closes. */
let returnFocus: HTMLElement | null = null;
/** The nav bar's own button, the answer when nothing better had focus. */
let fallback: HTMLElement | null = null;

const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** The nav bar's button, so a palette opened by the keyboard still has a
    sensible place to put focus back. Returns its own undo. */
export function registerPaletteFallback(el: HTMLElement | null): () => void {
  fallback = el;
  return () => {
    if (fallback === el) fallback = null;
  };
}

/** Open it. Pass the control that asked, so closing returns the keyboard. */
export function openSearchPalette(trigger?: HTMLElement | null) {
  const active = typeof document === "undefined" ? null : document.activeElement;
  // <body> is where focus sits when nothing has it, and focusing it back is the
  // same as dropping the keyboard on the floor, so that case falls through to
  // the nav bar's button below.
  const from = active instanceof HTMLElement && active !== document.body ? active : null;
  returnFocus = trigger ?? from;
  if (open) return;
  open = true;
  emit();
}

export function closeSearchPalette() {
  if (!open) return;
  open = false;
  emit();
  // Before the dialog unmounts: moving focus first means the browser never has
  // to fall back to <body> when the input goes away.
  const target = returnFocus?.isConnected ? returnFocus : fallback;
  returnFocus = null;
  target?.focus();
}

export function useSearchPaletteOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => open,
    () => false,
  );
}
