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
