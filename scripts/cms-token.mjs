#!/usr/bin/env node
// Mint an agent key for the CMS.
//
//   node scripts/cms-token.mjs <github-login> <label>
//
// Prints the token ONCE (it is never recoverable afterwards) and the entry to
// append to the CMS_AGENT_KEYS environment variable on the host. Only the
// SHA-256 hash is ever stored, so a leak of the environment does not yield a
// working token.
import crypto from "node:crypto";

const [login, label] = process.argv.slice(2);
if (!login || !label) {
  console.error("usage: node scripts/cms-token.mjs <github-login> <label>");
  console.error('example: node scripts/cms-token.mjs alice laptop-agent');
  process.exit(1);
}
if (!/^[A-Za-z0-9-]+$/.test(login)) {
  console.error("login must be a GitHub username (letters, digits, hyphens)");
  process.exit(1);
}
if (!/^[A-Za-z0-9._-]+$/.test(label)) {
  console.error("label must be letters, digits, dot, underscore or hyphen (no colons or commas)");
  process.exit(1);
}

const token = `rpt_${crypto.randomBytes(32).toString("base64url")}`;
const hash = crypto.createHash("sha256").update(token, "utf8").digest("hex");

console.log(`
Token for ${login} (agent "${label}") — copy it now, it is not stored anywhere:

  ${token}

Append this to CMS_AGENT_KEYS (comma-separated) in the host's environment:

  ${login.toLowerCase()}:${label}:${hash}

The agent authenticates by sending it as a bearer token:

  curl -X POST https://retroportingtoolkit.com/api/cms/save \\
    -H "authorization: Bearer ${token}" \\
    -H "content-type: application/json" \\
    -d '{"id":"data/blog/01_example/index.md","raw":"..."}'

Revoke by deleting that entry, or by removing ${login} from CMS_ALLOWED_LOGINS,
which revokes every agent belonging to them.
`);
