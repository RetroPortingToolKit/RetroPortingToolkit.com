import { describe, expect, it } from "vitest";
import {
  addPending,
  confirm,
  confirmedEmails,
  dropStalePending,
  issueBody,
  issueSubject,
  normalizeEmail,
  postsSince,
  remove,
  signToken,
  verifyToken,
  type Subscriber,
  subscribeDecision,
  CONFIRM_COOLDOWN_MS,
  MAX_PENDING,
} from "./newsletterCore";

const SECRET = "test-secret-not-a-real-one";

describe("newsletter addresses", () => {
  it("normalises case and surrounding space", () => {
    expect(normalizeEmail("  Person@Example.COM ")).toBe("person@example.com");
  });

  it("rejects what could never be an address", () => {
    for (const bad of ["", "nope", "a@b", "no spaces@example.com", "x@example", "@example.com", null, 42]) {
      expect(normalizeEmail(bad as unknown)).toBe(null);
    }
    expect(normalizeEmail("a".repeat(250) + "@example.com")).toBe(null);
  });
});

describe("newsletter tokens", () => {
  it("round-trips a payload it signed", async () => {
    const t = await signToken({ email: "a@example.com", action: "confirm", issued: Date.now() }, SECRET);
    const p = await verifyToken(t, SECRET, 60_000);
    expect(p?.email).toBe("a@example.com");
    expect(p?.action).toBe("confirm");
  });

  it("refuses a token signed with a different secret", async () => {
    const t = await signToken({ email: "a@example.com", action: "confirm", issued: Date.now() }, SECRET);
    expect(await verifyToken(t, "another-secret", 60_000)).toBe(null);
  });

  it("refuses a tampered payload", async () => {
    const t = await signToken({ email: "a@example.com", action: "unsubscribe", issued: Date.now() }, SECRET);
    const [body, sig] = t.split(".");
    const forged = btoa(JSON.stringify({ email: "victim@example.com", action: "unsubscribe", issued: Date.now() }))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(await verifyToken(`${forged}.${sig}`, SECRET, 60_000)).toBe(null);
    expect(await verifyToken(`${body}.${sig}xx`, SECRET, 60_000)).toBe(null);
  });

  it("expires, and refuses a token issued in the future", async () => {
    const issued = Date.now() - 10_000;
    const t = await signToken({ email: "a@example.com", action: "confirm", issued }, SECRET);
    expect(await verifyToken(t, SECRET, 5_000)).toBe(null);
    const ahead = await signToken({ email: "a@example.com", action: "confirm", issued: Date.now() + 600_000 }, SECRET);
    expect(await verifyToken(ahead, SECRET, 60_000)).toBe(null);
  });

  it("refuses garbage and an unconfigured secret", async () => {
    expect(await verifyToken("not-a-token", SECRET, 60_000)).toBe(null);
    expect(await verifyToken("", SECRET, 60_000)).toBe(null);
    const t = await signToken({ email: "a@example.com", action: "confirm", issued: Date.now() }, SECRET);
    expect(await verifyToken(t, "", 60_000)).toBe(null);
    await expect(signToken({ email: "a@example.com", action: "confirm", issued: 0 }, "")).rejects.toThrow();
  });
});

describe("newsletter list", () => {
  const now = new Date("2026-09-06T12:00:00.000Z");

  it("adds a pending record and does not duplicate on resubmit", () => {
    let list = addPending([], "a@example.com", now);
    list = addPending(list, "a@example.com", new Date("2026-09-06T13:00:00.000Z"));
    expect(list).toHaveLength(1);
    expect(list[0].confirmed).toBeUndefined();
    // resubmitting refreshes the record so a lost mail can be re-requested
    expect(list[0].added).toBe("2026-09-06T13:00:00.000Z");
  });

  it("leaves an already-confirmed record untouched on resubmit", () => {
    let list = confirm(addPending([], "a@example.com", now), "a@example.com", now);
    const again = addPending(list, "a@example.com", new Date("2026-09-07T00:00:00.000Z"));
    expect(again).toEqual(list);
  });

  it("only mails confirmed addresses", () => {
    let list = addPending([], "pending@example.com", now);
    list = addPending(list, "yes@example.com", now);
    list = confirm(list, "yes@example.com", now);
    expect(confirmedEmails(list)).toEqual(["yes@example.com"]);
  });

  it("treats a confirm for a removed address as a fresh confirmed signup", () => {
    const list = confirm([], "a@example.com", now);
    expect(confirmedEmails(list)).toEqual(["a@example.com"]);
  });

  it("removes an address entirely", () => {
    const list = confirm(addPending([], "a@example.com", now), "a@example.com", now);
    expect(remove(list, "a@example.com")).toEqual([]);
  });

  it("drops pending records that were never confirmed, keeping confirmed ones", () => {
    const old = new Date("2026-08-01T00:00:00.000Z");
    let list: Subscriber[] = addPending([], "stale@example.com", old);
    list = confirm(addPending(list, "kept@example.com", old), "kept@example.com", old);
    const pruned = dropStalePending(list, 7 * 24 * 3600_000, now.getTime());
    expect(pruned.map((s) => s.email)).toEqual(["kept@example.com"]);
  });
});

describe("newsletter issue", () => {
  const posts = [
    { slug: "b", title: "Second", date: "2026-09-05", summary: "About B" },
    { slug: "a", title: "First", date: "2026-09-01" },
    { slug: "c", title: "Third", date: "2026-09-06" },
  ];

  it("selects only posts newer than the last send, newest first", () => {
    expect(postsSince(posts, "2026-09-02").map((p) => p.slug)).toEqual(["c", "b"]);
  });

  it("treats a first-ever send as everything, and ignores undated posts", () => {
    expect(postsSince(posts, undefined)).toHaveLength(3);
    expect(postsSince([{ slug: "x", title: "X", date: "not a date" }], undefined)).toEqual([]);
  });

  it("titles one post by name and several by count", () => {
    expect(issueSubject([posts[0]], "Site")).toBe("Site: Second");
    expect(issueSubject(posts, "Site")).toBe("Site: 3 new posts");
  });

  it("builds a body with links, an unsubscribe and escaped content", () => {
    const { html, text } = issueBody(
      [{ slug: "a", title: 'Tom & "Jerry" <b>', date: "2026-09-01", summary: "S" }],
      "https://example.com",
      "https://example.com/api/newsletter/unsubscribe?token=t",
    );
    expect(html).toContain("https://example.com/blog/a");
    expect(html).toContain("Tom &amp; &quot;Jerry&quot; &lt;b&gt;");
    expect(html).not.toContain("<b>Jerry");
    expect(html).toContain("Unsubscribe");
    expect(text).toContain("https://example.com/blog/a");
    expect(text).toContain("Unsubscribe: https://example.com/api/newsletter/unsubscribe?token=t");
  });
});

describe("subscribeDecision", () => {
  const T0 = Date.parse("2026-09-07T12:00:00.000Z");
  const pending = (email: string, ageMs: number) => ({
    email,
    added: new Date(T0 - ageMs).toISOString(),
  });
  const confirmed = (email: string) => ({
    email,
    added: new Date(T0 - 86_400_000).toISOString(),
    confirmed: new Date(T0 - 80_000_000).toISOString(),
  });

  it("sends for an address that has never been seen", () => {
    expect(subscribeDecision([], "new@example.com", T0)).toBe("send");
  });

  it("never re-sends to a confirmed subscriber", () => {
    expect(subscribeDecision([confirmed("a@b.com")], "a@b.com", T0)).toBe("already-confirmed");
  });

  it("refuses a second confirmation inside the cooldown", () => {
    // This is the email-bomb case: the same address, hammered.
    const list = [pending("victim@example.com", 60_000)];
    expect(subscribeDecision(list, "victim@example.com", T0)).toBe("cooling-down");
  });

  it("allows a genuine retry once the cooldown has passed", () => {
    const list = [pending("someone@example.com", CONFIRM_COOLDOWN_MS + 1000)];
    expect(subscribeDecision(list, "someone@example.com", T0)).toBe("send");
  });

  it("treats the cooldown boundary as still cooling", () => {
    const list = [pending("edge@example.com", CONFIRM_COOLDOWN_MS - 1)];
    expect(subscribeDecision(list, "edge@example.com", T0)).toBe("cooling-down");
  });

  it("stops the pending list growing without bound", () => {
    const list = Array.from({ length: MAX_PENDING }, (_, i) => pending(`p${i}@example.com`, 0));
    expect(subscribeDecision(list, "one-more@example.com", T0)).toBe("too-many-pending");
  });

  it("counts only unconfirmed records against that ceiling", () => {
    // A popular newsletter must never lock itself out.
    const list = Array.from({ length: MAX_PENDING * 2 }, (_, i) => confirmed(`c${i}@example.com`));
    expect(subscribeDecision(list, "new@example.com", T0)).toBe("send");
  });

  it("still serves an existing pending address when the list is full", () => {
    const list = Array.from({ length: MAX_PENDING }, (_, i) => pending(`p${i}@example.com`, 0));
    list[0] = pending("known@example.com", CONFIRM_COOLDOWN_MS + 1000);
    expect(subscribeDecision(list, "known@example.com", T0)).toBe("send");
  });

  it("does not resend when the stored timestamp is unreadable", () => {
    const list = [{ email: "junk@example.com", added: "not a date" }];
    expect(subscribeDecision(list, "junk@example.com", T0)).toBe("cooling-down");
  });
});
