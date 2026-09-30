/**
 * The one way this site sends mail.
 *
 * Server-only: imported by api/newsletter.ts (the confirmation mail) and by
 * scripts/newsletter-send.ts (the issue itself). Nothing in the browser bundle
 * reaches it, so Vite never sees nodemailer.
 *
 * Transport is plain SMTP to MXroute, which already hosts the owner's mail and
 * is authorised to send as this domain (SPF include:mxroute.com, DKIM selector
 * "x"). That is why there is no third-party mail API here: the account, the
 * DNS and the reputation already exist.
 *
 * Env:
 *   NEWSLETTER_SMTP_HOST  e.g. shadow.mxrouting.net
 *   NEWSLETTER_SMTP_PORT  587 (STARTTLS) or 465 (implicit TLS); default 587
 *   NEWSLETTER_SMTP_USER  the mailbox, e.g. newsletter@example.com
 *   NEWSLETTER_SMTP_PASS  that mailbox's password
 *   NEWSLETTER_FROM       From: header, e.g. "Name <newsletter@example.com>"
 */
import nodemailer from "nodemailer";

export interface MailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

/** Reads the transport out of the environment, or null when it is not set up. */
export function mailConfig(env: NodeJS.ProcessEnv = process.env): MailConfig | null {
  const host = env.NEWSLETTER_SMTP_HOST || "";
  const user = env.NEWSLETTER_SMTP_USER || "";
  const pass = env.NEWSLETTER_SMTP_PASS || "";
  const from = env.NEWSLETTER_FROM || "";
  if (!host || !user || !pass || !from) return null;
  const port = Number(env.NEWSLETTER_SMTP_PORT || 587) || 587;
  return { host, port, user, pass, from };
}

export function mailConfigured(env?: NodeJS.ProcessEnv): boolean {
  return mailConfig(env) !== null;
}

let cached: ReturnType<typeof nodemailer.createTransport> | null = null;

function transport(cfg: MailConfig) {
  // One connection pool per process, so a bulk send (scripts/newsletter-send.ts)
  // reuses its TLS handshake and login.
  if (!cached) {
    cached = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: { user: cfg.user, pass: cfg.pass },
      pool: true,
      maxConnections: 2,
    });
  }
  return cached;
}

// The site's API runs in a Cloudflare Worker, where nodemailer's sockets fail
// (it resolves the host to an address itself, which Workers refuse) and a
// socket cannot outlive the request that opened it. There, each confirmation
// goes through worker-mailer on Cloudflare's own sockets, as STARTTLS on 587:
// MXroute accepts it and Workers cannot reach its port 465.
const IN_WORKER = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

/** Splits `Name <address>` into its parts; a bare address has no name. */
export function parseAddress(from: string): { name?: string; email: string } {
  const m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(from);
  return m ? { ...(m[1] ? { name: m[1] } : {}), email: m[2].trim() } : { email: from.trim() };
}

async function sendFromWorker(cfg: MailConfig, message: { to: string; subject: string; html: string; text: string; headers: Record<string, string> }) {
  const { WorkerMailer } = await import("worker-mailer");
  await WorkerMailer.send(
    { host: cfg.host, port: 587, secure: false, startTls: true, credentials: { username: cfg.user, password: cfg.pass }, authType: ["plain", "login"] },
    { from: parseAddress(cfg.from), ...message },
  );
}

export async function sendMail(
  to: string,
  subject: string,
  html: string,
  text: string,
  extraHeaders: Record<string, string> = {},
): Promise<void> {
  const cfg = mailConfig();
  if (!cfg) throw new Error("mail transport is not configured");
  try {
    const message = { to, subject, html, text, headers: extraHeaders };
    if (IN_WORKER) await sendFromWorker(cfg, message);
    else await transport(cfg).sendMail({ from: cfg.from, ...message });
  } catch (err) {
    // The provider's message can echo the recipient; keep the address out of
    // the logs and let the caller decide what the reader sees.
    throw new Error(`mail send failed: ${err instanceof Error ? err.message.slice(0, 80) : "unknown"}`);
  }
}
