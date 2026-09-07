/**
 * Newsletter endpoint: subscribe, confirm, unsubscribe.
 *
 * Same shape as api/cms.ts — a Vercel serverless function on the Web API
 * signature, subpath arriving via the vercel.json rewrite as ?__sub=.
 *
 * Two deliberate choices:
 *
 * 1. Double opt-in. Nothing is ever mailed to an address that has not clicked a
 *    confirmation link, because anyone can type anyone else's address into a
 *    form on a public website.
 * 2. The subscriber list is NEVER written to the repository. This repo is
 *    public, so the list lives in a GitHub gist reached with the token the CMS
 *    already uses. A gist made with `public: false` is *secret* rather than
 *    private — the id alone is enough to read it — so the contents are
 *    encrypted before they are written; see src/lib/newsletterStore.ts.
 *    Swapping the gist for a database later means replacing readList and
 *    writeList and nothing else.
 *
 * Env:
 *   NEWSLETTER_SECRET    HMAC secret for confirm/unsubscribe links (required)
 *   NEWSLETTER_GIST_ID   secret gist holding subscribers.json (required)
 *   GITHUB_TOKEN         gist read/write; shared with the CMS (required)
 *   NEWSLETTER_STORE_KEY encrypts that list at rest; without it the list is
 *                        stored in plain, which is the pre-encryption
 *                        behaviour and still works (optional)
 *   NEWSLETTER_SMTP_*    SMTP transport, see src/lib/newsletterMail.ts
 *   NEWSLETTER_FROM      From: header, e.g. "Name <hello@example.com>"
 */
import {
  addPending,
  confirm as confirmSubscriber,
  dropStalePending,
  normalizeEmail,
  remove as removeSubscriber,
  signToken,
  subscribeDecision,
  verifyToken,
  type Subscriber,
} from "../src/lib/newsletterCore.js";
import { mailConfigured, sendMail } from "../src/lib/newsletterMail.js";
import { decryptList, encryptList } from "../src/lib/newsletterStore.js";

const SECRET = process.env.NEWSLETTER_SECRET || "";
const GIST_ID = process.env.NEWSLETTER_GIST_ID || "";
const TOKEN = process.env.GITHUB_TOKEN || "";
const STORE_KEY = process.env.NEWSLETTER_STORE_KEY || "";
const SITE = process.env.NEWSLETTER_SITE_URL || "https://retroportingtoolkit.com";

const GIST_FILE = "subscribers.json";
// A confirmation link should be short-lived: it is an invitation, and a stale
// one is no loss. An unsubscribe link must outlive the archive it appears in —
// someone opening a year-old issue and clicking Unsubscribe has to succeed, or
// their only remaining move is the spam button, and repeated failures on the
// One-Click endpoint are exactly what gets a sender filtered.
const CONFIRM_MAX_AGE_MS = 14 * 24 * 3600_000;
const UNSUB_MAX_AGE_MS = 10 * 365 * 24 * 3600_000;
const PENDING_MAX_AGE_MS = 14 * 24 * 3600_000;

/* ------------------------------------------------------------------ storage */

async function readList(): Promise<Subscriber[]> {
  const r = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    headers: { authorization: `Bearer ${TOKEN}`, accept: "application/vnd.github+json" },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`gist read failed: ${r.status}`);
  const gist = (await r.json()) as { files?: Record<string, { content?: string; truncated?: boolean }> };
  const file = gist.files?.[GIST_FILE];
  if (!file?.content) return [];
  // GitHub truncates file content in the gist API response past ~1MB. Parsing
  // the prefix would look like a corrupt list and, worse, writing it back would
  // silently drop every subscriber past the cut.
  if (file.truncated) throw new Error("gist contents were truncated by the API");
  // Reads both forms: an envelope written with the key, and a plain array from
  // before there was one. Never destroys a list it failed to read — decryptList
  // throws rather than answering [], which writeList would then make true.
  return decryptList(file.content, STORE_KEY);
}

async function writeList(list: Subscriber[]): Promise<void> {
  // Encrypted whenever the key is set, so the file converts itself from plain
  // to ciphertext on the first subscribe, confirm or unsubscribe after that.
  const content = await encryptList(list, STORE_KEY);
  const r = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${TOKEN}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ files: { [GIST_FILE]: { content } } }),
  });
  if (!r.ok) throw new Error(`gist write failed: ${r.status}`);
}

/* --------------------------------------------------------------------- mail */


/* ------------------------------------------------------------------ replies */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

/** A small self-contained page, so confirm/unsubscribe need no client route. */
/**
 * A one-screen HTML reply. Pass `action` and it renders a button that POSTs
 * instead of a link: the pages that change something must never do it on a GET,
 * because mail security products (Defender Safe Links, Proofpoint, Mimecast)
 * fetch every URL in an inbound message. A GET that confirms would let a
 * victim's own scanner complete the double opt-in on their behalf, and a GET
 * that unsubscribes would quietly remove people who never clicked.
 */
function page(
  title: string,
  message: string,
  status = 200,
  action?: { href: string; label: string },
): Response {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
<style>
 :root{color-scheme:light dark}
 body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f5f7;color:#1d1d1f;
      font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:24px}
 @media(prefers-color-scheme:dark){body{background:#1d1d1f;color:#f5f5f7}}
 main{max-width:30rem;text-align:center}
 h1{font-size:1.5rem;margin:0 0 .6rem;letter-spacing:-.01em}
 p{margin:0 0 1.6rem;color:#6e6e73}
 @media(prefers-color-scheme:dark){p{color:#a1a1a6}}
 a,button{display:inline-block;padding:10px 18px;border-radius:999px;background:#1d1d1f;color:#fff;
   text-decoration:none;font-weight:600;font-size:.875rem;border:0;cursor:pointer;font-family:inherit}
 .after{margin:1.1rem 0 0}
 a.plain{background:none;color:#6e6e73;padding:0;font-weight:400;text-decoration:underline}
 @media(prefers-color-scheme:dark){a,button{background:#f5f5f7;color:#1d1d1f}
   a.plain{background:none;color:#a1a1a6}}
</style></head><body><main>
<h1>${esc(title)}</h1><p>${esc(message)}</p>${
      action
        ? `<form method="post" action="${esc(action.href)}"><button type="submit">${esc(action.label)}</button></form>
<p class="after"><a class="plain" href="${SITE}/blog">No thanks, back to the blog</a></p>`
        : `<a href="${SITE}/blog">Back to the blog</a>`
    }
</main></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );
}

const configured = () => Boolean(SECRET && GIST_ID && TOKEN);

/**
 * Floor on how fast /subscribe may answer.
 *
 * The bodies and status codes are already identical whatever happens, but the
 * clock was not: an address already confirmed did one GitHub read and returned,
 * while an unknown one did a read, a write and a full SMTP send. That is a
 * five-to-ten-fold gap, which makes a single request a membership oracle. This
 * does not make the endpoint constant-time — it collapses the obvious tell into
 * something that needs real statistical work.
 */
const SUBSCRIBE_FLOOR_MS = 1200;

async function settle(startedAt: number, floorMs = SUBSCRIBE_FLOOR_MS): Promise<void> {
  const remaining = floorMs - (Date.now() - startedAt);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
}

/* ------------------------------------------------------------------ handler */

// Exported as named GET/POST rather than a default handler, which is what
// api/cms.ts does and the reason it works. Vercel routes a default export
// through the legacy Node launcher, where `req.url` is a bare path like
// "/api/newsletter/subscribe?__sub=subscribe" and `new URL()` on it throws
// ERR_INVALID_URL. Named method exports get the Web-standard Request, whose
// url is absolute.
async function handle(req: Request): Promise<Response> {
  const startedAt = Date.now();
  const url = new URL(req.url);
  const sub = (url.searchParams.get("__sub") || "").replace(/^\/+|\/+$/g, "");

  if (!configured()) {
    // Say so plainly rather than accepting an address we cannot keep.
    return sub === "subscribe"
      ? json({ ok: false, error: "The newsletter is not configured yet." }, 503)
      : page("Not available yet", "The newsletter is not configured yet.", 503);
  }

  try {
    if (sub === "subscribe") {
      if (req.method !== "POST") return json({ ok: false, error: "Use POST." }, 405);
      const body = (await req.json().catch(() => ({}))) as { email?: unknown; company?: unknown };
      // Honeypot: a field no person sees and every naive bot fills in. Answer
      // exactly as success so filling it in teaches nothing.
      if (typeof body.company === "string" && body.company.trim() !== "") {
        await settle(startedAt);
        return json({ ok: true, pending: true });
      }
      const email = normalizeEmail(body.email);
      if (!email) return json({ ok: false, error: "That does not look like an email address." }, 400);
      if (!mailConfigured()) {
        return json({ ok: false, error: "The newsletter is not configured yet." }, 503);
      }

      const list = dropStalePending(await readList(), PENDING_MAX_AGE_MS);
      // The address here is not necessarily the requester's, so this decides
      // whether we are willing to put anything in that inbox at all. See
      // subscribeDecision: one mail per address per cooldown, never a second to
      // someone already confirmed, and a ceiling on unconfirmed records.
      if (subscribeDecision(list, email) === "send") {
        await writeList(addPending(list, email));
        const token = await signToken({ email, action: "confirm", issued: Date.now() }, SECRET);
        const link = `${SITE}/api/newsletter/confirm?token=${encodeURIComponent(token)}`;
        await sendMail(
          email,
          "Confirm your subscription",
          `<div style="font:16px/1.55 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#1d1d1f;max-width:34rem"><p>Confirm your subscription to new posts from Retro Porting Toolkit:</p><p><a href="${link}">Confirm subscription</a></p><p style="color:#6e6e73;font-size:13px">If this was not you, ignore this message and nothing more will be sent.</p></div>`,
          `Confirm your subscription to new posts from Retro Porting Toolkit:\n\n${link}\n\nIf this was not you, ignore this message and nothing more will be sent.`,
        );
      }
      // Identical answer either way: whether an address is already subscribed
      // is not something a stranger gets to probe for. Same for how long it
      // took to say so.
      await settle(startedAt);
      return json({ ok: true, pending: true });
    }

    if (sub === "confirm" || sub === "unsubscribe") {
      const payload = await verifyToken(
        url.searchParams.get("token"),
        SECRET,
        sub === "confirm" ? CONFIRM_MAX_AGE_MS : UNSUB_MAX_AGE_MS,
      );
      if (!payload || payload.action !== sub) {
        return page(
          "That link did not work",
          sub === "confirm"
            ? "It may have expired. Subscribe again from the blog page."
            : "We could not read that unsubscribe link. Reply to any issue and it will be done by hand.",
          400,
        );
      }
      // Nothing changes on a GET. A person sees a button; a link scanner that
      // fetched this URL out of their mail sees the same page and leaves.
      if (req.method !== "POST") {
        return sub === "confirm"
          ? page(
              "One more tap",
              "Confirm that you want new posts from Retro Porting Toolkit by email.",
              200,
              { href: `${url.pathname}${url.search}`, label: "Confirm subscription" },
            )
          : page("Unsubscribe?", "Confirm that you want to stop receiving these emails.", 200, {
              href: `${url.pathname}${url.search}`,
              label: "Unsubscribe",
            });
      }
      const list = await readList();
      if (sub === "confirm") {
        await writeList(confirmSubscriber(list, payload.email));
        return page("You are subscribed", "New posts will arrive by email. Every one has an unsubscribe link.");
      }
      await writeList(removeSubscriber(list, payload.email));
      return page("Unsubscribed", "Your address has been removed. Nothing further will be sent.");
    }

    return json({ ok: false, error: "Unknown route." }, 404);
  } catch (err) {
    // Errors can carry the address; log a category only.
    console.error("[newsletter]", sub, err instanceof Error ? err.message : "failed");
    return sub === "subscribe"
      ? json({ ok: false, error: "Something went wrong. Try again shortly." }, 500)
      : page("Something went wrong", "Try again shortly.", 500);
  }
}

export async function GET(req: Request): Promise<Response> {
  return handle(req);
}

export async function POST(req: Request): Promise<Response> {
  return handle(req);
}
