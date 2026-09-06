/**
 * Newsletter logic, with no I/O in it.
 *
 * Everything here is pure or crypto-only so it can be exercised by tests and
 * shared by the serverless endpoint and the send script without either of them
 * having to be running. The storage and the mail provider live behind the
 * adapters in api/newsletter.ts; this file decides *what* is true, never where
 * it is kept.
 *
 * Web Crypto rather than node:crypto on purpose: this module sits under src/,
 * and a node-only import here would break the moment something on the client
 * touched it.
 */

export interface Subscriber {
  /** Lower-cased address. The identity of a record. */
  email: string;
  /** ISO timestamp the address was first submitted. */
  added: string;
  /** ISO timestamp the double opt-in was completed; absent until then. */
  confirmed?: string;
}

export interface FeedPost {
  slug: string;
  title: string;
  summary?: string;
  /** ISO date of publication. */
  date: string;
}

/* --------------------------------------------------------------- addresses */

// Deliberately permissive rather than clever. A regex cannot decide whether an
// address exists, and the confirmation mail is what actually proves it, so this
// only rejects what could never be an address at all.
const EMAIL = /^[^\s@,;:<>"']+@[^\s@,;:<>"'.]+\.[^\s@,;:<>"']{2,}$/;

/** Trims, lower-cases and validates. Returns null when it could not be one. */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (email.length < 6 || email.length > 254) return null;
  return EMAIL.test(email) ? email : null;
}

/* ------------------------------------------------------------------ tokens */

/**
 * Confirmation and unsubscribe links carry a signed token instead of a lookup
 * key. Nothing has to be stored to issue one, an expired or edited link simply
 * fails to verify, and an unsubscribe link keeps working even if the list has
 * been migrated to different storage.
 */
export interface TokenPayload {
  email: string;
  action: "confirm" | "unsubscribe";
  issued: number;
}

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function hmac(data: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

export async function signToken(payload: TokenPayload, secret: string): Promise<string> {
  if (!secret) throw new Error("newsletter: signing secret is not configured");
  const body = b64url(enc.encode(JSON.stringify(payload)));
  return `${body}.${b64url(await hmac(body, secret))}`;
}

/** Returns the payload, or null for anything tampered with, malformed or stale. */
export async function verifyToken(
  token: unknown,
  secret: string,
  maxAgeMs: number,
  now = Date.now(),
): Promise<TokenPayload | null> {
  if (typeof token !== "string" || !secret) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = b64url(await hmac(body, secret));
  // Length-independent compare: both sides are fixed-length base64url of a
  // SHA-256, so a plain !== would leak nothing useful, but constant time costs
  // nothing here.
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;
  let payload: TokenPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(unb64url(body)));
  } catch {
    return null;
  }
  if (!payload || typeof payload.issued !== "number") return null;
  if (payload.action !== "confirm" && payload.action !== "unsubscribe") return null;
  if (!normalizeEmail(payload.email)) return null;
  if (now - payload.issued > maxAgeMs || payload.issued > now + 60_000) return null;
  return payload;
}

/* --------------------------------------------------------------------- list */

/**
 * Re-submitting an address is not an error and must not leak whether it was
 * already on the list: it refreshes the pending record so a lost confirmation
 * mail can simply be requested again.
 */
export function addPending(list: Subscriber[], email: string, now = new Date()): Subscriber[] {
  const iso = now.toISOString();
  const existing = list.find((s) => s.email === email);
  if (existing?.confirmed) return list;
  if (existing) return list.map((s) => (s.email === email ? { ...s, added: iso } : s));
  return [...list, { email, added: iso }];
}

export function confirm(list: Subscriber[], email: string, now = new Date()): Subscriber[] {
  const iso = now.toISOString();
  const existing = list.find((s) => s.email === email);
  // A confirm link for an address that was removed re-adds it, already
  // confirmed: the person proved they wanted it by clicking.
  if (!existing) return [...list, { email, added: iso, confirmed: iso }];
  if (existing.confirmed) return list;
  return list.map((s) => (s.email === email ? { ...s, confirmed: iso } : s));
}

export function remove(list: Subscriber[], email: string): Subscriber[] {
  return list.filter((s) => s.email !== email);
}

/** Only confirmed addresses are ever mailed an issue. */
export function confirmedEmails(list: Subscriber[]): string[] {
  return list.filter((s) => s.confirmed).map((s) => s.email);
}

/**
 * Pending records are not kept for ever: an address that never confirmed is
 * someone who did not want this, or a typo, or a third party's address entered
 * by somebody else.
 */
export function dropStalePending(
  list: Subscriber[],
  maxAgeMs: number,
  now = Date.now(),
): Subscriber[] {
  return list.filter((s) => s.confirmed || now - Date.parse(s.added) <= maxAgeMs);
}

/* -------------------------------------------------------------------- issue */

/** Posts published since the last send, newest first. */
export function postsSince(posts: FeedPost[], sinceIso: string | undefined): FeedPost[] {
  const since = sinceIso ? Date.parse(sinceIso) : NaN;
  return posts
    .filter((p) => {
      const at = Date.parse(p.date);
      if (Number.isNaN(at)) return false;
      return Number.isNaN(since) ? true : at > since;
    })
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export function issueSubject(posts: FeedPost[], siteTitle: string): string {
  if (posts.length === 1) return `${siteTitle}: ${posts[0].title}`;
  return `${siteTitle}: ${posts.length} new posts`;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function issueBody(
  posts: FeedPost[],
  siteUrl: string,
  unsubscribeUrl: string,
): { html: string; text: string } {
  const items = posts.map((p) => ({
    ...p,
    url: `${siteUrl}/blog/${p.slug}`,
  }));
  const html = [
    '<div style="font:16px/1.55 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#1d1d1f;max-width:34rem">',
    ...items.map(
      (p) =>
        `<p style="margin:0 0 22px"><a href="${escapeHtml(p.url)}" style="color:#1d1d1f;font-weight:600;text-decoration:none">${escapeHtml(p.title)}</a>` +
        (p.summary ? `<br><span style="color:#6e6e73">${escapeHtml(p.summary)}</span>` : "") +
        "</p>",
    ),
    `<p style="margin:32px 0 0;font-size:13px;color:#6e6e73">You are receiving this because you subscribed at ${escapeHtml(siteUrl)}. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#6e6e73">Unsubscribe</a>.</p>`,
    "</div>",
  ].join("");
  const text = [
    ...items.map((p) => `${p.title}\n${p.url}${p.summary ? `\n${p.summary}` : ""}`),
    `\n--\nYou are receiving this because you subscribed at ${siteUrl}.\nUnsubscribe: ${unsubscribeUrl}`,
  ].join("\n\n");
  return { html, text };
}
