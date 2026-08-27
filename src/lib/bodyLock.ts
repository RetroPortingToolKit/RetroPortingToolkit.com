// Refcounted body scroll lock. With stacked modals (a source opened over a
// project) several layers are mounted at once; the class must only drop when
// the LAST one unmounts, or the page behind unlocks while a modal is still up.
let locks = 0;

export function lockBody() {
  locks++;
  document.body.classList.add("modal-open");
}

export function unlockBody() {
  locks = Math.max(0, locks - 1);
  if (locks === 0) document.body.classList.remove("modal-open");
}

// The other half of the lock: with the document held still, the keyboard has
// nothing to scroll unless the container that replaced it holds focus. Neither
// container is focusable on its own, so give the one that actually overflows a
// tabindex and focus it. Usually that is the modal; the split layout used by
// hardware and project pages keeps the modal at viewport height and scrolls
// its left column instead.
export function focusScroller(modal: HTMLElement | null) {
  if (!modal) return;
  const scrolls = (el: HTMLElement) => el.scrollHeight > el.clientHeight + 1;
  const target = scrolls(modal)
    ? modal
    : modal.querySelector<HTMLElement>(".project-split-left") ?? modal;
  target.tabIndex = -1;
  target.focus({ preventScroll: true });
}
