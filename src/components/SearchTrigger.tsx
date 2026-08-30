import { useEffect, useRef } from "react";
import { ModKbd } from "./ModKbd";
import {
  openSearchPalette,
  registerPaletteFallback,
  useSearchPaletteOpen,
} from "@/lib/searchPalette";

const DIALOG_LABEL = "Search and commands";

export function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="site-search-icon">
      <circle cx="7" cy="7" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10.2 10.2 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface TriggerProps {
  className?: string;
  primary?: boolean;
}

export function SearchTrigger({ className, primary }: TriggerProps) {
  const open = useSearchPaletteOpen();
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!primary) return;
    return registerPaletteFallback(ref.current);
  }, [primary]);

  return (
    <button
      ref={ref}
      type="button"
      className={"site-search-trigger" + (className ? ` ${className}` : "")}
      onClick={() => openSearchPalette(ref.current)}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={DIALOG_LABEL}
      title={DIALOG_LABEL}
    >
      <SearchIcon />
      <span className="site-search-trigger-label">Search</span>
      <ModKbd className="site-search-trigger-kbd" />
    </button>
  );
}

export function SearchPalette() {
  return <SearchTrigger primary />;
}
