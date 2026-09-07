import { useEffect, useRef, useState } from "react";
import { readBoxState, shouldReveal, writeBoxState } from "../lib/subscribeBox";
import { useSubscribeForm } from "./useSubscribeForm";

/**
 * The small dismissible offer in the corner, in the manner of Medium or
 * Substack — with the parts of that pattern that are worth keeping and not the
 * parts that are not.
 *
 * What it does not do: appear on arrival, cover the page, dim anything behind
 * it, or come back once it has been closed. It waits until the reader has
 * scrolled far enough to have shown some interest, it can always be closed, and
 * closing it is remembered.
 *
 * It renders nothing until after mount. Every page here is prerendered, so
 * markup that depended on localStorage would either be wrong in the HTML or
 * mismatch on hydration; starting hidden and revealing in an effect avoids
 * both.
 */
export function SubscribeCorner() {
  const [visible, setVisible] = useState(false);
  const [closed, setClosed] = useState(false);
  const dismissRef = useRef<HTMLButtonElement | null>(null);
  const { email, setEmail, company, setCompany, state, onSubmit } = useSubscribeForm(() =>
    writeBoxState("subscribed", safeStorage()),
  );

  useEffect(() => {
    if (readBoxState(safeStorage()) !== "open") return;

    // Hidden while the full form at the end of the blog list is on screen:
    // offering the same thing twice in one view is just clutter.
    const inline = document.querySelector(".subscribe");
    let inlineShowing = false;
    const observer =
      inline && "IntersectionObserver" in window
        ? new IntersectionObserver(
            ([entry]) => {
              inlineShowing = entry.isIntersecting;
              if (inlineShowing) setVisible(false);
            },
            { rootMargin: "0px 0px -10% 0px" },
          )
        : null;
    if (inline && observer) observer.observe(inline);

    const onScroll = () => {
      if (inlineShowing) return;
      if (shouldReveal(window.scrollY, window.innerHeight, document.body.scrollHeight)) {
        setVisible(true);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      observer?.disconnect();
    };
  }, []);

  function dismiss() {
    writeBoxState("dismissed", safeStorage());
    setClosed(true);
  }

  // Escape closes it, the same as any other dismissible overlay.
  useEffect(() => {
    if (!visible || closed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, closed]);

  if (!visible || closed) return null;

  return (
    <aside
      className="subbox"
      aria-labelledby="subbox-heading"
      // Not a dialog: it takes no focus and traps none. A reader who ignores it
      // should be able to carry on reading as though it were not there.
    >
      <button
        className="subbox-close"
        type="button"
        onClick={dismiss}
        ref={dismissRef}
        aria-label="Close this and do not show it again"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
          <path
            d="M4 4l8 8M12 4l-8 8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </button>

      {state.status === "done" ? (
        <>
          <h2 className="subbox-title" id="subbox-heading">
            Check your inbox
          </h2>
          <p className="subbox-sub">{state.message}</p>
        </>
      ) : (
        <>
          <h2 className="subbox-title" id="subbox-heading">
            New posts by email
          </h2>
          <p className="subbox-sub">Occasional. No tracking. Unsubscribe in one click.</p>
          <form className="subbox-form" onSubmit={onSubmit} noValidate>
            <label className="subbox-label" htmlFor="subbox-email">
              Email address
            </label>
            <input
              id="subbox-email"
              className="subbox-input"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
              aria-describedby={state.status === "error" ? "subbox-error" : undefined}
            />
            <button className="subbox-button" type="submit" disabled={state.status === "busy"}>
              {state.status === "busy" ? "Sending…" : "Subscribe"}
            </button>
            <div className="subbox-hp" aria-hidden="true">
              <label htmlFor="subbox-company">Company</label>
              <input
                id="subbox-company"
                name="company"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            {state.status === "error" && (
              <p className="subbox-error" id="subbox-error" role="alert">
                {state.message}
              </p>
            )}
          </form>
        </>
      )}
    </aside>
  );
}

/** localStorage access itself throws in some privacy modes, so never touch it bare. */
function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
