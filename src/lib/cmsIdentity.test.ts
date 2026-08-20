import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import {
  allowedLogins,
  isAllowedLogin,
  parseAgentKeys,
  hashToken,
  agentForToken,
} from "../../api/cms";

const hash = (t: string) => crypto.createHash("sha256").update(t, "utf8").digest("hex");

describe("CMS allowlist", () => {
  it("parses and normalises logins", () => {
    expect(allowedLogins(" Alice, bob ,, CarOl ")).toEqual(["alice", "bob", "carol"]);
  });

  it("is case-insensitive and ignores surrounding space", () => {
    expect(isAllowedLogin("ALICE", "alice,bob")).toBe(true);
    expect(isAllowedLogin("  bob  ", "alice,bob")).toBe(true);
  });

  it("refuses anyone not listed, including the empty login", () => {
    expect(isAllowedLogin("mallory", "alice,bob")).toBe(false);
    expect(isAllowedLogin("", "alice,bob")).toBe(false);
    expect(isAllowedLogin("alice", "")).toBe(false);
  });
});

describe("CMS agent keys", () => {
  it("parses entries and drops malformed ones", () => {
    const keys = parseAgentKeys("alice:laptop:abc,,garbage,bob:ci:def");
    expect(keys).toEqual([
      { login: "alice", label: "laptop", hash: "abc" },
      { login: "bob", label: "ci", hash: "def" },
    ]);
  });

  it("stores only a hash: the token is not recoverable from the entry", () => {
    const token = "rpt_secret";
    const entry = `alice:laptop:${hashToken(token)}`;
    expect(entry).not.toContain(token);
    expect(hashToken(token)).toHaveLength(64);
  });
});

describe("agentForToken", () => {
  const token = "rpt_good";
  const env = `alice:laptop:${hash(token)}`;

  it("matches a correct token for an allowed owner", () => {
    process.env.CMS_ALLOWED_LOGINS = "alice";
    expect(agentForToken(token, env)).toEqual({
      login: "alice",
      label: "laptop",
      hash: hash(token),
    });
  });

  it("rejects a wrong token, an empty token, and the hash itself", () => {
    process.env.CMS_ALLOWED_LOGINS = "alice";
    expect(agentForToken("rpt_wrong", env)).toBeNull();
    expect(agentForToken("", env)).toBeNull();
    expect(agentForToken(hash(token), env)).toBeNull();
  });

  it("revokes every agent when its owner leaves the allowlist", () => {
    process.env.CMS_ALLOWED_LOGINS = "bob";
    expect(agentForToken(token, env)).toBeNull();
  });
});
