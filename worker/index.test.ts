import { describe, expect, it } from "vitest";
import { route } from "./index";

describe("worker API routing", () => {
  it("passes subpaths the way the old rewrites did", () => {
    const m = route(new Request("https://retroportingtoolkit.com/api/newsletter/confirm?t=abc"))!;
    const url = new URL(m.request.url);
    expect(url.pathname).toBe("/api/newsletter");
    expect(url.searchParams.get("__sub")).toBe("confirm");
    expect(url.searchParams.get("t")).toBe("abc");

    const cms = new URL(route(new Request("https://retroportingtoolkit.com/api/cms/auth/github/callback"))!.request.url);
    expect(cms.pathname).toBe("/api/cms");
    expect(cms.searchParams.get("__sub")).toBe("auth/github/callback");
  });

  it("keeps a POST body and method on rewritten requests", async () => {
    const m = route(new Request("https://retroportingtoolkit.com/api/newsletter/subscribe", { method: "POST", body: '{"email":"a@b.c"}' }))!;
    expect(m.request.method).toBe("POST");
    expect(await m.request.text()).toBe('{"email":"a@b.c"}');
  });

  it("leaves submissions flat and rejects unknown API paths", () => {
    expect(new URL(route(new Request("https://retroportingtoolkit.com/api/submissions"))!.request.url).pathname).toBe("/api/submissions");
    expect(route(new Request("https://retroportingtoolkit.com/api/submissions/x"))).toBeNull();
    expect(route(new Request("https://retroportingtoolkit.com/api/other"))).toBeNull();
  });
});
