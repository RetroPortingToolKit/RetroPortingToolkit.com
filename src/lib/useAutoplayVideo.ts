import { useEffect, type RefObject } from "react";

// Safari (mac + iOS) is strict about muted-autoplay videos:
//   - the muted attribute must be present in the DOM (not just the prop)
//   - playsinline must be set (and webkit-playsinline for older iOS)
//   - autoplay can be ignored by the parser; calling play() after metadata
//     loads is a reliable backup
//   - iOS Low Power Mode (and some Lockdown-style policies) block muted
//     autoplay outright until the first user gesture, so we also queue any
//     play() that rejects and retry on the next pointerdown/touch/keydown.
// This hook applies all of the above to a video ref. When `whenVisible` is
// true (default), playback is gated on the video being in (or near) the
// viewport so that grids of card-sized videos don't all decode at once.

const PENDING_AUTOPLAY = new Set<HTMLVideoElement>();
let gestureHookInstalled = false;
// once the user has interacted at all, Safari grants media autoplay for the
// rest of the page's life, so we only need to catch the first gesture
let gestureUnlocked = false;

// Armed eagerly (before any play() fails) so the user's very first scroll/tap
// primes autoplay site-wide, instead of waiting for a rejection to install it.
function installGestureHook() {
  if (gestureHookInstalled || gestureUnlocked || typeof document === "undefined") {
    return;
  }
  gestureHookInstalled = true;
  const opts: AddEventListenerOptions = { capture: true, passive: true };
  const events = ["pointerdown", "touchstart", "keydown", "scroll", "wheel"];
  const kick = () => {
    gestureUnlocked = true;
    gestureHookInstalled = false;
    for (const e of events) document.removeEventListener(e, kick, opts);
    // retry the ones that were blocked, plus any visible autoplay video that
    // hasn't started yet
    const blocked = new Set<HTMLVideoElement>(PENDING_AUTOPLAY);
    PENDING_AUTOPLAY.clear();
    for (const v of blocked) {
      v.muted = true;
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    }
  };
  for (const e of events) document.addEventListener(e, kick, opts);
}

export function useAutoplayVideo(
  ref: RefObject<HTMLVideoElement | null>,
  {
    autoplay = true,
    whenVisible = true,
    rootMargin = "200px",
  }: { autoplay?: boolean; whenVisible?: boolean; rootMargin?: string } = {},
) {
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute("muted", "");
    v.setAttribute("playsinline", "");
    v.setAttribute("webkit-playsinline", "");
    if (!autoplay) return;
    // arm the unlock listener now, so the first interaction anywhere primes
    // autoplay before the user even reaches the cards
    installGestureHook();

    const tryPlay = () => {
      // Re-assert muted at call time, Safari sometimes silently un-mutes
      // when the element is moved in the DOM (e.g. Embla's slide cloning).
      v.muted = true;
      const p = v.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          PENDING_AUTOPLAY.add(v);
          installGestureHook();
        });
      }
    };

    if (!whenVisible || typeof IntersectionObserver === "undefined") {
      tryPlay();
      v.addEventListener("loadedmetadata", tryPlay);
      v.addEventListener("canplay", tryPlay);
      return () => {
        v.removeEventListener("loadedmetadata", tryPlay);
        v.removeEventListener("canplay", tryPlay);
        PENDING_AUTOPLAY.delete(v);
      };
    }

    let visible = false;
    const onCanPlay = () => {
      if (visible) tryPlay();
    };
    v.addEventListener("loadedmetadata", onCanPlay);
    v.addEventListener("canplay", onCanPlay);

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visible = entry.isIntersecting;
          if (visible) tryPlay();
          else v.pause();
        }
      },
      { rootMargin, threshold: 0.01 },
    );
    io.observe(v);

    return () => {
      io.disconnect();
      v.removeEventListener("loadedmetadata", onCanPlay);
      v.removeEventListener("canplay", onCanPlay);
      PENDING_AUTOPLAY.delete(v);
    };
  }, [ref, autoplay, whenVisible, rootMargin]);
}
