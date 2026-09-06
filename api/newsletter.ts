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
 *    public, so the list lives in a private GitHub gist reached with the token
 *    the CMS already uses. Swapping that for a database later means replacing
 *    readList/writeList and nothing else.
 *
 * Env:
 *   NEWSLETTER_SECRET    HMAC secret for confirm/unsubscribe links (required)
 *   NEWSLETTER_GIST_ID   private gist holding subscribers.json (required)
 *   GITHUB_TOKEN         gist read/write; shared with the CMS (required)
 *   RESEND_API_KEY       mail provider (required to send anything)
 *   NEWSLETTER_FROM      From: header, e.g. "Name <hello@example.com>"
 */
import {
  addPending,
  confirm as confirmSubscriber,
  dropStalePending,
  normalizeEmail,
  remove as removeSubscriber,
  signToken,
  verifyToken,
  type Subscriber,
} from "../src/lib/newsletterCore";

const SECRET = process.env.NEWSLETTER_SECRET || "";
const GIST_ID = process.env.NEWSLETTER_GIST_ID || "";
const TOKEN = process.env.GITHUB_TOKEN || "";
const RESEND_KEY = process.env.RESEND_API_KEY || "";
const FROM = process.env.NEWSLETTER_FROM || "";
const SITE = process.env.NEWSLETTER_SITE_URL || "https://retroportingtoolkit.com";

const GIST_FILE = "subscribers.json";
const LINK_MAX_AGE_MS = 14 * 24 * 3600_000;
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
  try {
    const parsed = JSON.parse(file.content);
    return Array.isArray(parsed) ? (parsed as Subscriber[]) : [];
  } catch {
    // Never destroy a list we failed to parse: refuse instead.
    throw new Error("gist contents are not valid JSON");
  }
}

async function writeList(list: Subscriber[]): Promise<void> {
  const r = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${TOKEN}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ files: { [GIST_FILE]: { content: JSON.stringify(list, null, 2) } } }),
  });
  if (!r.ok) throw new Error(`gist write failed: ${r.status}`);
}

/* --------------------------------------------------------------------- mail */

async function sendMail(to: string, subject: string, html: string, text: string): Promise<void> {
  if (!RESEND_KEY || !FROM) throw new Error("mail provider is not configured");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${RESEND_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, text }),
  });
  if (!r.ok) {
    // The body can echo the address; keep it out of the logs.
    throw new Error(`mail send failed: ${r.status}`);
  }
}

/* ------------------------------------------------------------------ replies */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

/** A small self-contained page, so confirm/unsubscribe need no client route. */
function page(title: string, message: string, status = 200): Response {
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
 a{display:inline-block;padding:10px 18px;border-radius:999px;background:#1d1d1f;color:#fff;
   text-decoration:none;font-weight:600;font-size:.875rem}
 @media(prefers-color-scheme:dark){a{background:#f5f5f7;color:#1d1d1f}}
</style></head><body><main>
<h1>${esc(title)}</h1><p>${esc(message)}</p><a href="${SITE}/blog">Back to the blog</a>
</main></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );
}

const configured = () => Boolean(SECRET && GIST_ID && TOKEN);

/* ------------------------------------------------------------------ handler */

export default async function handler(req: Request): Promise<Response> {
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
        return json({ ok: true, pending: true });
      }
      const email = normalizeEmail(body.email);
      if (!email) return json({ ok: false, error: "That does not look like an email address." }, 400);
      if (!RESEND_KEY || !FROM) {
        return json({ ok: false, error: "The newsletter is not configured yet." }, 503);
      }

      const list = dropStalePending(await readList(), PENDING_MAX_AGE_MS);
      const already = list.find((s) => s.email === email)?.confirmed;
      if (!already) {
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
      // is not something a stranger gets to probe for.
      return json({ ok: true, pending: true });
    }

    if (sub === "confirm" || sub === "unsubscribe") {
      const payload = await verifyToken(url.searchParams.get("token"), SECRET, LINK_MAX_AGE_MS);
      if (!payload || payload.action !== sub) {
        return page("That link did not work", "It may have expired. Subscribe again from the blog page.", 400);
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
