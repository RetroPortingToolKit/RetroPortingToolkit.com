// Browser-safe platform detection used by keyboard labels and Safari-specific
// gesture handling. Shortcut-format helpers that duplicated their callers
// were removed; this is the single shared fact those surfaces need.
function detectMac(): boolean {
  if (typeof navigator === "undefined") return false;
  const uaData = (navigator as unknown as { userAgentData?: { platform?: string } })
    .userAgentData;
  const platform = uaData?.platform || navigator.platform || navigator.userAgent;
  return /Mac|iPhone|iPad|iPod/i.test(platform);
}

export const isMac = detectMac();
