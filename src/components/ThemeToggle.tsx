import { useCallback, useEffect, useState } from "react";
import {
  readStoredTheme,
  resolveTheme,
  setTheme,
  subscribeTheme,
  systemTheme,
  type Resolved,
} from "@/lib/theme";

// The button itself. The mechanism it drives lives in src/lib/theme.ts, because
// the command palette offers the same three choices and the two must not keep
// separate ideas of what the page is showing.

export function ThemeToggle() {
  const [resolved, setResolved] = useState<Resolved>(() =>
    typeof window === "undefined" ? "light" : resolveTheme(),
  );

  // A choice made in the palette ("Theme: dark") has to move this button's icon
  // too, or the bar goes on offering to switch to the theme already on screen.
  useEffect(() => subscribeTheme(() => setResolved(resolveTheme())), []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    // Only while nothing is stored, checked per event rather than once: the
    // palette's "Theme: system" clears the stored choice while this is mounted,
    // and from that moment the system's preference is the answer again.
    const onChange = () => {
      if (readStoredTheme() === null) setResolved(systemTheme());
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggle = useCallback(() => {
    setResolved(setTheme(resolved === "dark" ? "light" : "dark"));
  }, [resolved]);

  const label = resolved === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    // Real <button>. CSS sets cursor:pointer on .theme-toggle so macOS
    // Safari still shows the hand cursor (Safari honors the CSS cursor on
    // buttons; the old <a href="#"> workaround is no longer needed).
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={label}
      title={label}
    >
      {resolved === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="3.6" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <line x1="10" y1="1.5" x2="10" y2="3.5" />
        <line x1="10" y1="16.5" x2="10" y2="18.5" />
        <line x1="1.5" y1="10" x2="3.5" y2="10" />
        <line x1="16.5" y1="10" x2="18.5" y2="10" />
        <line x1="3.9" y1="3.9" x2="5.3" y2="5.3" />
        <line x1="14.7" y1="14.7" x2="16.1" y2="16.1" />
        <line x1="3.9" y1="16.1" x2="5.3" y2="14.7" />
        <line x1="14.7" y1="5.3" x2="16.1" y2="3.9" />
      </g>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M16.5 12.5A7 7 0 0 1 7.5 3.5a7 7 0 1 0 9 9z"
        fill="currentColor"
      />
    </svg>
  );
}
