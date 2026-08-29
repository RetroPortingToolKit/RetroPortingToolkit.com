import { describe, expect, it } from "vitest";
import { originTrialExpiry } from "./originTrial";

describe("origin-trial token expiry", () => {
  it("reads the expiry from a Chromium token payload", () => {
    const payload = JSON.stringify({
      origin: "https://retroportingtoolkit.com:443",
      feature: "WebMCP",
      expiry: 1_800_000_000,
    });
    const token = btoa(payload);
    expect(originTrialExpiry(token)).toBe(1_800_000_000_000);
  });

  it("does not treat malformed or empty values as valid tokens", () => {
    expect(originTrialExpiry("")).toBeUndefined();
    expect(originTrialExpiry("not-a-token")).toBeUndefined();
    expect(originTrialExpiry(btoa('{"origin":"https://example.test"}'))).toBeUndefined();
  });
});
