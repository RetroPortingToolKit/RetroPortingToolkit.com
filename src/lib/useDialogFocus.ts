import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE = [
  "a[href]", "button:not([disabled])", "input:not([disabled])",
  "select:not([disabled])", "textarea:not([disabled])", "audio[controls]",
  "video[controls]", "iframe", "object", "embed",
  '[contenteditable="true"]', '[tabindex]:not([tabindex="-1"])',
].join(",");

const ACTIVE_DIALOGS: symbol[] = [];

export function focusWrapTarget(count: number, currentIndex: number, backwards: boolean) {
  if (count <= 0) return null;
  if (currentIndex < 0) return backwards ? count - 1 : 0;
  if (backwards && currentIndex === 0) return count - 1;
  if (!backwards && currentIndex === count - 1) return 0;
  return null;
}

function focusableWithin(root: HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => element.tabIndex >= 0 &&
      !element.closest('[inert], [aria-hidden="true"]') &&
      element.getClientRects().length > 0,
  );
}

export function useDialogFocus(
  rootRef: RefObject<HTMLElement | null>,
  { active = true, initialFocus }: {
    active?: boolean;
    initialFocus?: (root: HTMLElement) => HTMLElement | null;
  } = {},
) {
  const openerRef = useRef<HTMLElement | null>(null);
  const focusedOnceRef = useRef(false);
  const dialogIdRef = useRef(Symbol("dialog"));
  const initialFocusRef = useRef(initialFocus);
  initialFocusRef.current = initialFocus;

  useEffect(() => () => {
    const opener = openerRef.current;
    if (!opener?.isConnected) return;
    requestAnimationFrame(() => {
      const activeModal = document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]');
      if (!activeModal || activeModal.contains(opener)) opener.focus({ preventScroll: true });
    });
  }, []);

  useEffect(() => {
    if (!active) return;
    const dialogId = dialogIdRef.current;
    ACTIVE_DIALOGS.push(dialogId);
    openerRef.current ??= document.activeElement instanceof HTMLElement
      ? document.activeElement : null;
    const root = rootRef.current;
    if (!root) {
      ACTIVE_DIALOGS.splice(ACTIVE_DIALOGS.lastIndexOf(dialogId), 1);
      return;
    }
    let frame: number | null = null;
    if (!focusedOnceRef.current) {
      focusedOnceRef.current = true;
      frame = requestAnimationFrame(() => {
        const initial = initialFocusRef.current?.(root) ??
          root.querySelector<HTMLElement>(".modal-close") ?? focusableWithin(root)[0] ?? root;
        initial.focus({ preventScroll: true });
      });
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (ACTIVE_DIALOGS.at(-1) !== dialogId || event.key !== "Tab") return;
      const focusable = focusableWithin(root);
      if (!focusable.length) {
        event.preventDefault();
        root.focus({ preventScroll: true });
        return;
      }
      const index = focusable.findIndex((element) => element === document.activeElement);
      const target = focusWrapTarget(focusable.length, index, event.shiftKey);
      if (target === null) return;
      event.preventDefault();
      focusable[target].focus({ preventScroll: true });
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown, true);
      const index = ACTIVE_DIALOGS.lastIndexOf(dialogId);
      if (index >= 0) ACTIVE_DIALOGS.splice(index, 1);
    };
  }, [active, rootRef]);
}
