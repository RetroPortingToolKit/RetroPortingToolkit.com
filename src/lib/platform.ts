// Platform helpers. The modifier key for shortcuts is Command on Apple
// platforms and Control everywhere else (Windows, Linux, ChromeOS).

function detectMac(): boolean {
  if (typeof navigator === "undefined") return false;
  const uaData = (navigator as unknown as { userAgentData?: { platform?: string } })
    .userAgentData;
  const platform = uaData?.platform || navigator.platform || navigator.userAgent;
  return /Mac|iPhone|iPad|iPod/i.test(platform);
}

export const isMac = detectMac();

// "⌘" on Mac, "Ctrl" elsewhere.
export const MOD_KEY = isMac ? "⌘" : "Ctrl";

// "⌘K" on Mac, "Ctrl K" elsewhere.
export function modKeyLabel(key = "K"): string {
  return isMac ? `⌘${key}` : `Ctrl ${key}`;
}
