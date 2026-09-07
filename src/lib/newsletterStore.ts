/**
 * Encryption at rest for the subscriber list.
 *
 * The list lives in a GitHub gist created with `public: false`. That is
 * GitHub's *secret* gist and not a private one: anyone who learns the id can
 * read every address in it without authenticating. The id was therefore the
 * only thing standing between other people's email addresses and the world,
 * which is obscurity rather than access control. This module ends that. What
 * gets written is ciphertext, so a leaked id yields a blob.
 *
 * AES-256-GCM through Web Crypto, for the same reason newsletterCore.ts signs
 * with Web Crypto rather than node:crypto: the identical code has to run both
 * in the Vercel serverless runtime and under `node --experimental-strip-types`
 * for scripts/newsletter-send.ts, and a node-only import in a file under src/
 * would break the moment something on the client touched it. GCM rather than
 * CBC because it authenticates as well as conceals: an edited file fails to
 * open instead of opening into something plausible.
 *
 * The AES key is the SHA-256 of NEWSLETTER_STORE_KEY. That is a plain hash and
 * not a password KDF, deliberately: the env var is a randomly generated
 * secret, not something a person remembers, so there is no small guess space
 * for PBKDF2 or scrypt's work factor to defend. The hash is only here to turn
 * a string of any length into exactly the 32 bytes AES-256 wants. If that
 * value ever becomes a phrase somebody chose, this has to become a real KDF.
 *
 * Reads are backward compatible and writes are not. A stored plain JSON array
 * is returned as it stands, because there was a live subscriber in a plaintext
 * list when this landed and the deployed function could not be allowed to fail
 * for even a moment during the rollout. Every write produces ciphertext once
 * the key is set, so the file converts itself on the first write after that.
 *
 * With no key configured this degrades to plaintext in both directions rather
 * than throwing, so the newsletter keeps working before the key exists. What
 * it will never do is answer with an empty list for input it could not read:
 * that empty list would be handed straight back to the next write and the
 * subscribers would be gone. Anything unreadable throws instead, which is the
 * same rule the endpoint already applied to unparseable JSON.
 *
 * No message thrown from here carries an address; the endpoint logs them.
 */

// Type-only, so nothing is imported at runtime and the extension conventions
// that differ between the endpoint, the send script and the tests never apply.
import type { Subscriber } from "./newsletterCore";

/** The stored form once a key is configured. Self-describing so a later
 *  version can change algorithm without guessing at what it is reading. */
export interface StoredEnvelope {
  /** Envelope format. Bump when any of the below changes meaning. */
  v: number;
  /** Base64url nonce, 96 bits, fresh for every single write. */
  iv: string;
  /** Base64url AES-256-GCM ciphertext with its authentication tag appended. */
  ct: string;
}

export const ENVELOPE_VERSION = 1;

/** 96 bits is the size GCM is specified and optimised for. */
const IV_BYTES = 12;

const enc = new TextEncoder();
const dec = new TextDecoder();

// The same base64url pair newsletterCore.ts uses for token parts. They are
// private there and this is ten lines; widening that module's public surface
// to share them would be the worse trade.
function b64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// The return type is inferred on purpose. Writing `: Uint8Array` here would
// widen it to Uint8Array<ArrayBufferLike>, which crypto.subtle no longer
// accepts as a BufferSource; inference keeps the ArrayBuffer-backed type.
function unb64url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/**
 * One rule for what counts as a key, so the callers cannot disagree about it.
 *
 * Trimmed because this value is copied by hand into two places, the login
 * Keychain and Vercel, and a trailing newline picked up by one of them would
 * silently derive a different key and leave the list unopenable.
 */
function normalizeKey(key: string | undefined | null): string {
  return (key || "").trim();
}

/** Whether writes will be encrypted. False means the plaintext fallback. */
export function storeKeyConfigured(key: string | undefined | null): boolean {
  return normalizeKey(key) !== "";
}

async function aesKey(key: string): Promise<CryptoKey> {
  const material = await crypto.subtle.digest("SHA-256", enc.encode(key));
  return crypto.subtle.importKey("raw", material, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

function asEnvelope(value: unknown): StoredEnvelope | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const e = value as Partial<StoredEnvelope>;
  if (typeof e.v !== "number" || typeof e.iv !== "string" || typeof e.ct !== "string") return null;
  return { v: e.v, iv: e.iv, ct: e.ct };
}

/** The bytes to store for this list: an envelope, or plain JSON with no key. */
export async function encryptList(
  list: readonly Subscriber[],
  key: string | undefined | null,
): Promise<string> {
  const plain = JSON.stringify(list, null, 2);
  const secret = normalizeKey(key);
  if (!secret) return plain;

  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const sealed = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await aesKey(secret),
    enc.encode(plain),
  );
  const envelope: StoredEnvelope = {
    v: ENVELOPE_VERSION,
    iv: b64url(iv),
    ct: b64url(new Uint8Array(sealed)),
  };
  return JSON.stringify(envelope, null, 2);
}

/**
 * The list held in `stored`, whether it was written encrypted or in plain.
 *
 * Throws rather than returning `[]` for anything it cannot read, because the
 * caller's next act is to write the list back.
 */
export async function decryptList(
  stored: string | undefined | null,
  key: string | undefined | null,
): Promise<Subscriber[]> {
  const raw = (stored || "").trim();
  // An absent or empty file is an empty list, which is not a failure to read.
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("subscriber store is not valid JSON");
  }

  // Backward compatibility, and the whole reason this is safe to deploy: a
  // list written before this module existed is a plain array and still reads.
  if (Array.isArray(parsed)) return parsed as Subscriber[];

  const envelope = asEnvelope(parsed);
  if (!envelope) throw new Error("subscriber store is neither a list nor an encrypted envelope");
  if (envelope.v !== ENVELOPE_VERSION) {
    throw new Error(`subscriber store envelope version ${envelope.v} is not supported`);
  }

  const secret = normalizeKey(key);
  if (!secret) throw new Error("subscriber store is encrypted but NEWSLETTER_STORE_KEY is not set");

  let plain: string;
  try {
    const opened = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: unb64url(envelope.iv) },
      await aesKey(secret),
      unb64url(envelope.ct),
    );
    plain = dec.decode(opened);
  } catch {
    // GCM's tag makes a wrong key and an edited file the same failure, which
    // is the point: neither can yield a list that looks plausible.
    throw new Error(
      "subscriber store could not be decrypted: wrong NEWSLETTER_STORE_KEY, or the file was altered",
    );
  }

  let list: unknown;
  try {
    list = JSON.parse(plain);
  } catch {
    throw new Error("decrypted subscriber store is not valid JSON");
  }
  if (!Array.isArray(list)) throw new Error("decrypted subscriber store is not a list");
  return list as Subscriber[];
}
