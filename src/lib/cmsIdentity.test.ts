import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import {
  allowedLogins,
  isAllowedLogin,
  parseAgentKeys,
  hashToken,
  agentKeyForToken,
  mayEdit,
  allowedOrg,
  accessConfigured,
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

describe("agentKeyForToken", () => {
  const token = "rpt_good";
  const env = `alice:laptop:${hash(token)}`;

  it("matches a correct token to its key", () => {
    expect(agentKeyForToken(token, env)).toEqual({
      login: "alice",
      label: "laptop",
      hash: hash(token),
    });
  });

  it("rejects a wrong token, an empty token, and the hash itself", () => {
    expect(agentKeyForToken("rpt_wrong", env)).toBeNull();
    expect(agentKeyForToken("", env)).toBeNull();
    expect(agentKeyForToken(hash(token), env)).toBeNull();
  });

  it("resolves the key without deciding whether the owner may edit", () => {
    // Identity only. Authorization is mayEdit's job, which is what revokes an
    // agent when its owner is removed.
    process.env.CMS_ALLOWED_LOGINS = "bob";
    expect(agentKeyForToken(token, env)?.login).toBe("alice");
  });
});

describe("mayEdit", () => {
  // Every case here leaves CMS_ALLOWED_ORG unset, so nothing reaches GitHub:
  // mayEdit answers from the allowlist and returns false before any fetch.
  it("admits a login on the allowlist", async () => {
    process.env.CMS_ALLOWED_LOGINS = "alice,bob";
    await expect(mayEdit("ALICE")).resolves.toBe(true);
  });

  it("refuses a login that is neither listed nor in an org", async () => {
    process.env.CMS_ALLOWED_LOGINS = "alice";
    await expect(mayEdit("carol")).resolves.toBe(false);
  });

  it("refuses an empty login", async () => {
    process.env.CMS_ALLOWED_LOGINS = "alice";
    await expect(mayEdit("")).resolves.toBe(false);
  });

  it("revokes an agent's owner, and so the agent, on removal", async () => {
    process.env.CMS_ALLOWED_LOGINS = "bob";
    await expect(mayEdit("alice")).resolves.toBe(false);
  });
});

describe("access configuration", () => {
  it("reads the org, trimmed", () => {
    expect(allowedOrg("  RetroPortingToolKit ")).toBe("RetroPortingToolKit");
    expect(allowedOrg("")).toBe("");
  });

  it("is unconfigured, and so open, only when nothing at all is set", () => {
    process.env.CMS_ALLOWED_ORG = "";
    process.env.CMS_ALLOWED_LOGINS = "";
    process.env.CMS_AGENT_KEYS = "";
    expect(accessConfigured()).toBe(false);
  });

  it("is closed when only the org is set", () => {
    process.env.CMS_ALLOWED_ORG = "RetroPortingToolKit";
    process.env.CMS_ALLOWED_LOGINS = "";
    process.env.CMS_AGENT_KEYS = "";
    expect(accessConfigured()).toBe(true);
    process.env.CMS_ALLOWED_ORG = "";
  });
});
