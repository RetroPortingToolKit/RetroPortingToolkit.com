/**
 * Sends one issue: every blog post published since the last send, to every
 * confirmed subscriber.
 *
 * Run by hand. There is deliberately no scheduler, cron entry or CI job here:
 * this repository's contract forbids adding one, and an unattended mailer that
 * fails silently is exactly the failure mode that rule exists to prevent.
 *
 *   npm run newsletter:send -- --dry-run     what would go out, and to how many
 *   npm run newsletter:send                  actually send
 *   npm run newsletter:send -- --since=2026-09-01   override the last-sent mark
 *
 * Env: NEWSLETTER_SECRET, NEWSLETTER_GIST_ID, GITHUB_TOKEN, RESEND_API_KEY,
 * NEWSLETTER_FROM, optionally NEWSLETTER_SITE_URL.
 *
 * Addresses are never printed, only counted.
 */
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import {
  confirmedEmails,
  issueBody,
  issueSubject,
  postsSince,
  signToken,
  type FeedPost,
  type Subscriber,
} from "../src/lib/newsletterCore.ts";

const SECRET = process.env.NEWSLETTER_SECRET || "";
const GIST_ID = process.env.NEWSLETTER_GIST_ID || "";
const TOKEN = process.env.GITHUB_TOKEN || "";
const RESEND_KEY = process.env.RESEND_API_KEY || "";
const FROM = process.env.NEWSLETTER_FROM || "";
const SITE = process.env.NEWSLETTER_SITE_URL || "https://retroportingtoolkit.com";
const SITE_TITLE = "Retro Porting Toolkit";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const sinceArg = args.find((a) => a.startsWith("--since="))?.slice("--since=".length);

function fail(message: string): never {
  console.error(`newsletter: ${message}`);
  process.exit(1);
}

/* ------------------------------------------------------------------- posts */

function readPosts(): FeedPost[] {
  const dir = path.join(process.cwd(), "data", "blog");
  const posts: FeedPost[] = [];
  for (const entry of fs.readdirSync(dir)) {
    const file = path.join(dir, entry, "index.md");
    if (!fs.existsSync(file)) continue;
    const raw = fs.readFileSync(file, "utf8");
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) continue;
    const fm = (yaml.load(m[1]) || {}) as Record<string, unknown>;
    // Drafts are not published, so they are not mailed.
    if (fm.draft === true) continue;
    const title = typeof fm.title === "string" ? fm.title : "";
    const date = typeof fm.date === "string" ? fm.date : "";
    if (!title || !date) continue;
    posts.push({
      slug: entry.replace(/^\d+_/, ""),
      title,
      date,
      summary: typeof fm.desc === "string" ? fm.desc : undefined,
    });
  }
  return posts;
}

/* ------------------------------------------------------------------- state */

interface GistFiles {
  files?: Record<string, { content?: string }>;
}

async function gistRead(): Promise<{ subscribers: Subscriber[]; lastSent?: string }> {
  const r = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    headers: { authorization: `Bearer ${TOKEN}`, accept: "application/vnd.github+json" },
  });
  if (!r.ok) fail(`could not read the subscriber gist (${r.status})`);
  const gist = (await r.json()) as GistFiles;
  const parse = <T,>(name: string, fallback: T): T => {
    const c = gist.files?.[name]?.content;
    if (!c) return fallback;
    try {
      return JSON.parse(c) as T;
    } catch {
      fail(`${name} in the gist is not valid JSON; refusing to continue`);
    }
  };
  return {
    subscribers: parse<Subscriber[]>("subscribers.json", []),
    lastSent: parse<{ lastSent?: string }>("state.json", {}).lastSent,
  };
}

async function gistWriteState(lastSent: string): Promise<void> {
  const r = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${TOKEN}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      files: { "state.json": { content: JSON.stringify({ lastSent }, null, 2) } },
    }),
  });
  if (!r.ok) fail(`could not record the send (${r.status}); some mail may already have gone out`);
}

/* -------------------------------------------------------------------- send */

async function sendOne(to: string, subject: string, html: string, text: string): Promise<void> {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${RESEND_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, text }),
  });
  if (!r.ok) throw new Error(`provider returned ${r.status}`);
}

/* -------------------------------------------------------------------- main */

if (!GIST_ID || !TOKEN) fail("NEWSLETTER_GIST_ID and GITHUB_TOKEN are required");
if (!SECRET) fail("NEWSLETTER_SECRET is required to sign unsubscribe links");
if (!dryRun && (!RESEND_KEY || !FROM)) fail("RESEND_API_KEY and NEWSLETTER_FROM are required to send");

const { subscribers, lastSent } = await gistRead();
const recipients = confirmedEmails(subscribers);
const since = sinceArg || lastSent;
const fresh = postsSince(readPosts(), since);

console.log(`newsletter: ${subscribers.length} on the list, ${recipients.length} confirmed`);
console.log(`newsletter: last sent ${since || "never"}; ${fresh.length} post(s) newer than that`);

if (fresh.length === 0) {
  console.log("newsletter: nothing new to send");
  process.exit(0);
}
for (const p of fresh) console.log(`  - ${p.date}  ${p.title}`);

if (recipients.length === 0) {
  console.log("newsletter: no confirmed subscribers, so nothing was sent");
  process.exit(0);
}

const subject = issueSubject(fresh, SITE_TITLE);
if (dryRun) {
  console.log(`newsletter: DRY RUN, would send "${subject}" to ${recipients.length} address(es)`);
  process.exit(0);
}

let sent = 0;
const failed: number[] = [];
for (const [i, email] of recipients.entries()) {
  const token = await signToken({ email, action: "unsubscribe", issued: Date.now() }, SECRET);
  const { html, text } = issueBody(
    fresh,
    SITE,
    `${SITE}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`,
  );
  try {
    await sendOne(email, subject, html, text);
    sent++;
  } catch (err) {
    // Index only: an address must not reach the logs.
    failed.push(i);
    console.error(`newsletter: recipient #${i} failed (${err instanceof Error ? err.message : "error"})`);
  }
  await new Promise((r) => setTimeout(r, 120)); // stay under provider rate limits
}

// Only advance the mark on a clean run, so a partial failure can be retried
// without the new posts being considered already sent.
if (failed.length === 0) {
  await gistWriteState(new Date().toISOString());
  console.log(`newsletter: sent ${sent} message(s); last-sent mark updated`);
} else {
  console.log(
    `newsletter: sent ${sent}, failed ${failed.length}; last-sent mark NOT updated so this can be re-run`,
  );
  process.exit(1);
}
