import { FEED_PATHS } from "./FeedLink";
import { useSubscribeForm } from "./useSubscribeForm";

/**
 * Email signup for new posts.
 *
 * Double opt-in lives on the server; this only ever reports that a
 * confirmation has been sent, and says the same thing whether or not the
 * address was already on the list, because whether a given address subscribes
 * here is not a stranger's business.
 */
export function Subscribe() {
  const { email, setEmail, company, setCompany, state, onSubmit } = useSubscribeForm();

  return (
    <section className="subscribe" aria-labelledby="subscribe-heading">
      <h2 className="subscribe-title" id="subscribe-heading">
        Get new posts by email
      </h2>
      <p className="subscribe-sub">
        Occasional updates when something new is published. No tracking, and every message has an
        unsubscribe link. Prefer a reader?{" "}
        <a href={FEED_PATHS.rss}>Use the RSS feed</a>.
      </p>

      {state.status === "done" ? (
        <p className="subscribe-done" role="status">
          {state.message}
        </p>
      ) : (
        <form className="subscribe-form" onSubmit={onSubmit} noValidate>
          <label className="subscribe-label" htmlFor="subscribe-email">
            Email address
          </label>
          <div className="subscribe-row">
            <input
              id="subscribe-email"
              className="subscribe-input"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
              aria-describedby={state.status === "error" ? "subscribe-error" : undefined}
            />
            <button className="subscribe-button" type="submit" disabled={state.status === "busy"}>
              {state.status === "busy" ? "Sending…" : "Subscribe"}
            </button>
          </div>
          {/* Not display:none — some bots skip hidden fields. Off-screen and
              removed from the tab order and the accessibility tree instead. */}
          <div className="subscribe-hp" aria-hidden="true">
            <label htmlFor="subscribe-company">Company</label>
            <input
              id="subscribe-company"
              name="company"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>
          {state.status === "error" && (
            <p className="subscribe-error" id="subscribe-error" role="alert">
              {state.message}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
