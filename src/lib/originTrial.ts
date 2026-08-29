/** Decode the public Chromium origin-trial token expiry without exposing it. */
export function originTrialExpiry(token: string): number | undefined {
  if (!token.trim()) return undefined;
  try {
    const bytes = Uint8Array.from(atob(token), (c) => c.charCodeAt(0));
    const text = new TextDecoder().decode(bytes);
    const start = text.indexOf('{"origin"');
    if (start < 0) return undefined;
    const payload = JSON.parse(text.slice(start)) as { expiry?: unknown };
    return typeof payload.expiry === "number" && Number.isFinite(payload.expiry)
      ? payload.expiry * 1000
      : undefined;
  } catch {
    return undefined;
  }
}
