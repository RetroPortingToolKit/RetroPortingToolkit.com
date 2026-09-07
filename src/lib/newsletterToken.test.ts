/**
 * Adversarial cover for the confirm/unsubscribe token.
 *
 * Written after a subscriber record turned up confirmed with no obvious
 * explanation. It was in the end a leftover from testing, but "probably fine"
 * is not a thing to conclude about a signature check, so these cases pin the
 * property down: only a token this secret actually signed is ever accepted.
 */
import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "./newsletterCore.ts";
const S = "a-secret-of-reasonable-length-1234567890";
const AGE = 48 * 3600 * 1000;
const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
describe("token forgery", () => {
  it("accepts only a genuinely signed token", async () => {
    const t = await signToken({ email: "a@b.com", action: "confirm", issued: Date.now() }, S);
    expect((await verifyToken(t, S, AGE))?.email).toBe("a@b.com");
  });
  it("rejects garbage, unsigned, truncated and swapped signatures", async () => {
    const good = await signToken({ email: "a@b.com", action: "confirm", issued: Date.now() }, S);
    const other = await signToken({ email: "z@z.com", action: "confirm", issued: Date.now() }, S);
    const body = good.split(".")[0], sig = good.split(".")[1];
    for (const bad of [
      "forged.deadbeef", "", ".", "a.b", body, `${body}.`, `.${sig}`,
      `${body}.${other.split(".")[1]}`,                 // signature from another token
      `${b64({email:"evil@x.com",action:"confirm",issued:Date.now()})}.${sig}`, // body swapped
      `${body}.${sig.slice(0,-1)}x`,                    // one char changed
      `${body}.${sig}extra`,                            // lengthened
      good.toUpperCase(),
    ]) expect(await verifyToken(bad, S, AGE), `should reject: ${String(bad).slice(0,40)}`).toBeNull();
  });
  it("rejects the right signature under the wrong secret", async () => {
    const t = await signToken({ email: "a@b.com", action: "confirm", issued: Date.now() }, S);
    expect(await verifyToken(t, "different-secret-entirely-0987654321", AGE)).toBeNull();
    expect(await verifyToken(t, "", AGE)).toBeNull();
  });
  it("rejects expired and future-dated tokens, and honours the action", async () => {
    const old = await signToken({ email: "a@b.com", action: "confirm", issued: Date.now() - AGE - 1000 }, S);
    expect(await verifyToken(old, S, AGE)).toBeNull();
    const future = await signToken({ email: "a@b.com", action: "confirm", issued: Date.now() + 600_000 }, S);
    expect(await verifyToken(future, S, AGE)).toBeNull();
    const unsub = await signToken({ email: "a@b.com", action: "unsubscribe", issued: Date.now() }, S);
    expect((await verifyToken(unsub, S, AGE))?.action).toBe("unsubscribe");
  });
});
