/**
 * Cover for the subscriber list's encryption at rest.
 *
 * These are the properties the change is worth anything for: that a leaked
 * gist id yields a blob, that a wrong key or an edited file is refused rather
 * than half-read, and — the part that could quietly destroy the list — that
 * nothing unreadable is ever answered with an empty array, because the caller
 * writes that array straight back.
 */
import { describe, expect, it } from "vitest";
import { ENVELOPE_VERSION, decryptList, encryptList, storeKeyConfigured } from "./newsletterStore";
import type { Subscriber } from "./newsletterCore";

const KEY = "a-store-key-of-reasonable-length-1234567890";
const OTHER_KEY = "a-different-store-key-0987654321";

const LIST: Subscriber[] = [
  { email: "reader@example.com", added: "2026-09-01T10:00:00.000Z", confirmed: "2026-09-01T10:04:00.000Z" },
  { email: "pending@example.org", added: "2026-09-05T08:30:00.000Z" },
];

/** Flip a base64url character to a different one, so the bytes really differ. */
const flip = (c: string) => (c === "A" ? "B" : "A");

const envelopeOf = (stored: string) => JSON.parse(stored) as { v: number; iv: string; ct: string };

describe("subscriber store, with a key", () => {
  it("round-trips a list through encrypt and decrypt", async () => {
    const stored = await encryptList(LIST, KEY);
    expect(await decryptList(stored, KEY)).toEqual(LIST);
  });

  it("round-trips an empty list", async () => {
    const stored = await encryptList([], KEY);
    expect(envelopeOf(stored).v).toBe(ENVELOPE_VERSION);
    expect(await decryptList(stored, KEY)).toEqual([]);
  });

  it("stores no address in the clear", async () => {
    const stored = await encryptList(LIST, KEY);
    expect(stored).not.toContain("reader@example.com");
    expect(stored).not.toContain("pending@example.org");
    // What a stranger with the gist id gets: an envelope, not a list. toEqual
    // is exact both ways, so this also says no fourth field leaks out beside
    // the two base64url blobs below.
    const envelope = envelopeOf(stored);
    expect(Array.isArray(envelope)).toBe(false);
    expect(envelope).toEqual({ v: 1, iv: expect.any(String), ct: expect.any(String) });
    expect(envelope.iv).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(envelope.ct).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("uses a fresh nonce for every write", async () => {
    const a = envelopeOf(await encryptList(LIST, KEY));
    const b = envelopeOf(await encryptList(LIST, KEY));
    expect(a.iv).not.toBe(b.iv);
    expect(a.ct).not.toBe(b.ct);
  });

  it("tolerates whitespace around the key, which is copied by hand twice", async () => {
    const stored = await encryptList(LIST, KEY);
    expect(await decryptList(stored, `  ${KEY}\n`)).toEqual(LIST);
  });
});

describe("subscriber store, refusing what it cannot read", () => {
  it("fails on a wrong key rather than returning anything", async () => {
    const stored = await encryptList(LIST, KEY);
    await expect(decryptList(stored, OTHER_KEY)).rejects.toThrow(/could not be decrypted/);
  });

  it("rejects a tampered ciphertext, nonce or truncation", async () => {
    const envelope = envelopeOf(await encryptList(LIST, KEY));
    const edits = [
      { ...envelope, ct: flip(envelope.ct[0]) + envelope.ct.slice(1) },
      { ...envelope, iv: flip(envelope.iv[0]) + envelope.iv.slice(1) },
      { ...envelope, ct: envelope.ct.slice(0, -4) }, // authentication tag cut short
      { ...envelope, ct: "" },
      { ...envelope, iv: "" },
    ];
    for (const edit of edits) {
      await expect(decryptList(JSON.stringify(edit), KEY)).rejects.toThrow(/could not be decrypted/);
    }
  });

  it("refuses an encrypted store when no key is configured", async () => {
    const stored = await encryptList(LIST, KEY);
    // The dangerous answer here would be []: the endpoint writes the list it
    // was given straight back, so an empty one deletes every subscriber.
    await expect(decryptList(stored, "")).rejects.toThrow(/NEWSLETTER_STORE_KEY is not set/);
    await expect(decryptList(stored, undefined)).rejects.toThrow(/NEWSLETTER_STORE_KEY is not set/);
  });

  it("refuses an envelope from a version it does not know", async () => {
    const envelope = { ...envelopeOf(await encryptList(LIST, KEY)), v: ENVELOPE_VERSION + 1 };
    await expect(decryptList(JSON.stringify(envelope), KEY)).rejects.toThrow(/version 2 is not supported/);
  });

  it("refuses content that is neither a list nor an envelope", async () => {
    for (const bad of ["not json at all", "{", '{"subscribers":[]}', '"a string"', "42"]) {
      await expect(decryptList(bad, KEY), `should refuse: ${bad}`).rejects.toThrow();
    }
  });

  it("reveals nothing in the messages it throws", async () => {
    const stored = await encryptList(LIST, KEY);
    const err = await decryptList(stored, OTHER_KEY).catch((e: unknown) => e as Error);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).not.toContain("reader@example.com");
  });
});

describe("subscriber store, without a key", () => {
  it("reads a plain list written before any of this existed", async () => {
    const legacy = JSON.stringify(LIST, null, 2);
    expect(await decryptList(legacy, "")).toEqual(LIST);
    expect(await decryptList(legacy, undefined)).toEqual(LIST);
  });

  it("still reads a plain list once a key is configured", async () => {
    // The rollout order: the key is set while the gist is still plaintext.
    expect(await decryptList(JSON.stringify(LIST), KEY)).toEqual(LIST);
  });

  it("writes plain JSON instead of throwing", async () => {
    const stored = await encryptList(LIST, undefined);
    expect(JSON.parse(stored)).toEqual(LIST);
    expect(await decryptList(stored, undefined)).toEqual(LIST);
  });

  it("treats an absent or empty file as an empty list", async () => {
    for (const empty of ["", "   ", undefined, null]) {
      expect(await decryptList(empty, KEY)).toEqual([]);
      expect(await decryptList(empty, "")).toEqual([]);
    }
  });
});

describe("storeKeyConfigured", () => {
  it("is true only for a key with something in it", () => {
    expect(storeKeyConfigured(KEY)).toBe(true);
    expect(storeKeyConfigured(" k ")).toBe(true);
    for (const none of ["", "   ", "\n", undefined, null]) {
      expect(storeKeyConfigured(none)).toBe(false);
    }
  });
});
