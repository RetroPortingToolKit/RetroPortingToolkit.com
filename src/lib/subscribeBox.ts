/**
 * Whether the corner subscribe box should be offered at all.
 *
 * Kept out of the component and given a storage argument so it can be tested
 * without a DOM, and so every read and write goes through one try/catch. Every
 * storage call here can throw rather than return null — Safari's private mode
 * and "block all cookies" both make `localStorage` itself throw on access — and
 * a box that crashes the page it sits on is far worse than one that forgets it
 * was closed.
 */
export type BoxState = "open" | "dismissed" | "subscribed";

/** Versioned: bumping the suffix re-offers the box to everyone who closed it. */
export const BOX_KEY = "rpt:subscribe-box:v1";

export function readBoxState(storage?: Pick<Storage, "getItem"> | null): BoxState {
  try {
    const raw = storage?.getItem(BOX_KEY);
    return raw === "dismissed" || raw === "subscribed" ? raw : "open";
  } catch {
    return "open";
  }
}

export function writeBoxState(
  state: Exclude<BoxState, "open">,
  storage?: Pick<Storage, "setItem"> | null,
): void {
  try {
    storage?.setItem(BOX_KEY, state);
  } catch {
    // Remembering is a courtesy, not a requirement.
  }
}

/**
 * The box waits for a reader to show some interest before appearing, which is
 * the difference between an offer and a pop-up. Distance rather than a timer,
 * so it never interrupts someone who is still deciding whether to stay.
 */
export const REVEAL_AFTER_PX = 700;

export function shouldReveal(scrollY: number, viewportH: number, docH: number): boolean {
  // On a page too short to scroll that far, reveal once the reader has reached
  // the bottom two-thirds rather than never.
  const reachable = docH - viewportH;
  if (reachable <= 0) return false;
  const threshold = Math.min(REVEAL_AFTER_PX, reachable * 0.66);
  return scrollY >= threshold;
}
