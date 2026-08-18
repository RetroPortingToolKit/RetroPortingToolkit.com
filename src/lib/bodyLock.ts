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
