import { useEffect, useState } from "react";
import { isMac } from "@/lib/platform";

// Renders the shortcut hint (⌘K on Mac, Ctrl K elsewhere). The initial render is
// always "⌘K" so the prerendered HTML and the first client render match (no
// hydration mismatch); it resolves to the real platform label after mount.
export function ModKbd({ className, k = "K" }: { className?: string; k?: string }) {
  const [label, setLabel] = useState(`⌘${k}`);
  useEffect(() => {
    setLabel(isMac ? `⌘${k}` : `Ctrl ${k}`);
  }, [k]);
  return <span className={className}>{label}</span>;
}
