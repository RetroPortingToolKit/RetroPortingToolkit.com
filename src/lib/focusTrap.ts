import type { KeyboardEvent as ReactKeyboardEvent } from "react";

/** Keep keyboard focus inside a modal while it is open. */
export function trapFocus(e: ReactKeyboardEvent<HTMLElement>): void {
  if (e.key !== "Tab") return;

  // Nested dialogs (video lightboxes and carousels) own their own focus ring.
  // Do not let the parent dialog rewrite their Tab navigation.
  const target = e.target as HTMLElement;
  if (target.closest('[role="dialog"]') !== e.currentTarget) return;

  const focusable = Array.from(
    e.currentTarget.querySelectorAll<HTMLElement>(
      'a[href], area[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => {
    const style = window.getComputedStyle(el);
    return style.visibility !== "hidden" && style.display !== "none";
  });

  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (e.shiftKey && (active === first || !e.currentTarget.contains(active))) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (active === last || !e.currentTarget.contains(active))) {
    e.preventDefault();
    first.focus();
  }
}
