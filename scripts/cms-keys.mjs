#!/usr/bin/env node
// Mint an agent token for every member of the site's GitHub organisation.
//
//   node scripts/cms-keys.mjs                  # everyone in the org
//   node scripts/cms-keys.mjs alice bob        # just these logins
//
// Tokens are written to files, one per person, and never printed: the only
// thing on stdout is the CMS_AGENT_KEYS line, which contains hashes and is not
// a secret. Hand each person their file's contents over whatever channel you
// would send a password over, then delete the file.
//
// Requires the `gh` CLI to be authenticated when discovering org members.

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ORG = process.env.CMS_ALLOWED_ORG || "RetroPortingToolKit";
const LABEL = process.env.CMS_KEY_LABEL || "agent";
const OUT_DIR = process.env.CMS_KEY_DIR || path.join(os.homedir(), ".config", "stack", "rpt-agent-tokens");

const VALID = /^[A-Za-z0-9][A-Za-z0-9-]*$/;

function orgMembers() {
  const raw = execFileSync("gh", ["api", `/orgs/${ORG}/members`, "--jq", ".[].login"], {
    encoding: "utf8",
  });
  return raw.split("\n").map((l) => l.trim()).filter(Boolean);
}

function mint() {
  // 32 bytes of randomness, url-safe, prefixed so it is recognisable in a log
  // as something that should not have been logged.
  return `rpt_${crypto.randomBytes(32).toString("base64url")}`;
}

const hash = (t) => crypto.createHash("sha256").update(t, "utf8").digest("hex");

function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  let logins;
  try {
    logins = args.length ? args : orgMembers();
  } catch (e) {
    console.error(`Could not list members of ${ORG}: ${e.message}`);
    console.error("Pass logins explicitly, or authenticate the gh CLI first.");
    process.exit(1);
  }

  const bad = logins.filter((l) => !VALID.test(l));
  if (bad.length) {
    console.error(`Not usable as GitHub logins: ${bad.join(", ")}`);
    process.exit(1);
  }
  if (!VALID.test(LABEL)) {
    console.error(`CMS_KEY_LABEL must match ${VALID}; got "${LABEL}".`);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true, mode: 0o700 });

  const entries = [];
  const written = [];
  for (const login of logins) {
    const token = mint();
    const file = path.join(OUT_DIR, `${login}.txt`);
    fs.writeFileSync(
      file,
      [
        `Token for ${login} to publish to retroportingtoolkit.com.`,
        ``,
        token,
        ``,
        `Give this to ${login}, then delete this file. It cannot be recovered:`,
        `only its hash is stored on the server. Point their AI at`,
        `https://retroportingtoolkit.com/agent.md and give it this token.`,
        ``,
      ].join("\n"),
      { mode: 0o600 },
    );
    entries.push(`${login}:${LABEL}:${hash(token)}`);
    written.push(file);
  }

  console.log(`Wrote ${written.length} token ${written.length === 1 ? "file" : "files"} to ${OUT_DIR}`);
  for (const f of written) console.log(`  ${path.basename(f)}`);
  console.log("");
  console.log("Set this as CMS_AGENT_KEYS (hashes only, safe to paste):");
  console.log("");
  console.log(entries.join(","));
  console.log("");
  console.log("Then, once everyone has their token:");
  console.log(`  rm -rf ${OUT_DIR}`);
}

main();
