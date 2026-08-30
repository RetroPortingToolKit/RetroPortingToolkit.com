import { lazy, Suspense, useEffect } from "react";
import { openSearchPalette, useSearchPaletteOpen } from "@/lib/searchPalette";

const SearchPaletteDialog = lazy(() =>
  import("./SearchPalette").then((module) => ({ default: module.SearchPaletteDialog })),
);

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export function SearchPaletteHost() {
  const open = useSearchPaletteOpen();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearchPalette();
        return;
      }
      if (event.key === "/" && !mod && !event.altKey && !isTypingTarget(event.target)) {
        event.preventDefault();
        openSearchPalette();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;
  return (
    <Suspense fallback={null}>
      <SearchPaletteDialog />
    </Suspense>
  );
}
