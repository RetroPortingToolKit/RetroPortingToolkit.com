// DEV-ONLY passkey (WebAuthn) auth for the CMS. Self-hosted Face ID / Touch ID:
// the admin registers a passkey once (bootstrapped by CMS_PASSWORD), then signs
// in biometrically. Registered credentials live in .cms-passkey.json (gitignored)
// in the repo root. @simplewebauthn/server is imported lazily so it is never
// bundled into the Vite config.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CRED_FILE = path.join(ROOT, ".cms-passkey.json");
const RP_NAME = process.env.CMS_RP_NAME || "Content editor";

// Single in-flight challenge is fine: one admin, one ceremony at a time.
let currentChallenge = null;

let _lib;
async function lib() {
  return (_lib ||= await import("@simplewebauthn/server"));
}

function loadCreds() {
  try {
    const data = JSON.parse(fs.readFileSync(CRED_FILE, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
function saveCreds(creds) {
  fs.writeFileSync(CRED_FILE, JSON.stringify(creds, null, 2) + "\n");
}
export function hasPasskey() {
  return loadCreds().length > 0;
}

// Derive the Relying Party ID + origin from the request host so the same code
// works on localhost and on a dev tunnel host. A passkey is bound to the
// domain it was registered on.
function rpInfo(req) {
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "localhost")
    .split(",")[0]
    .trim();
  const hostname = host.split(":")[0];
  const proto = String(
    req.headers["x-forwarded-proto"] || (hostname === "localhost" ? "http" : "https"),
  )
    .split(",")[0]
    .trim();
  return { rpID: hostname, origin: `${proto}://${host}` };
}

const toB64 = (u8) => Buffer.from(u8).toString("base64url");
const fromB64 = (s) => new Uint8Array(Buffer.from(s, "base64url"));

export async function passkeyRegisterOptions(req) {
  const { generateRegistrationOptions } = await lib();
  const { rpID } = rpInfo(req);
  const creds = loadCreds();
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userName: "admin",
    userID: new TextEncoder().encode("cms-admin"),
    attestationType: "none",
    excludeCredentials: creds.map((c) => ({ id: c.id, transports: c.transports })),
    authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
  });
  currentChallenge = options.challenge;
  return options;
}

export async function passkeyRegisterVerify(req, body) {
  const { verifyRegistrationResponse } = await lib();
  const { rpID, origin } = rpInfo(req);
  if (!currentChallenge) return { ok: false, error: "no_challenge" };
  let result;
  try {
    result = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: currentChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }
  currentChallenge = null;
  if (!result.verified || !result.registrationInfo) return { ok: false, error: "not_verified" };
  const c = result.registrationInfo.credential;
  const creds = loadCreds();
  creds.push({ id: c.id, publicKey: toB64(c.publicKey), counter: c.counter, transports: c.transports });
  saveCreds(creds);
  return { ok: true };
}

export async function passkeyAuthOptions(req) {
  const { generateAuthenticationOptions } = await lib();
  const { rpID } = rpInfo(req);
  const creds = loadCreds();
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: creds.map((c) => ({ id: c.id, transports: c.transports })),
    userVerification: "preferred",
  });
  currentChallenge = options.challenge;
  return options;
}

export async function passkeyAuthVerify(req, body) {
  const { verifyAuthenticationResponse } = await lib();
  const { rpID, origin } = rpInfo(req);
  if (!currentChallenge) return { ok: false, error: "no_challenge" };
  const creds = loadCreds();
  const cred = creds.find((c) => c.id === body.id);
  if (!cred) return { ok: false, error: "unknown_credential" };
  let result;
  try {
    result = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: currentChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: cred.id,
        publicKey: fromB64(cred.publicKey),
        counter: cred.counter,
        transports: cred.transports,
      },
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }
  currentChallenge = null;
  if (!result.verified) return { ok: false, error: "not_verified" };
  cred.counter = result.authenticationInfo.newCounter;
  saveCreds(creds);
  return { ok: true };
}
