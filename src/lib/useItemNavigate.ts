import {
  useNavigate,
  useLocation,
  type Location,
} from "react-router-dom";
import type { MouseEvent } from "react";
import type { Item } from "./types";
import { pathFor } from "./content";

interface BgState {
  background?: Location;
}

export interface NavLink {
  href: string;
  onClick: (e: MouseEvent) => void;
}

// Cards stash the current location as `background` in route state so App.tsx
// keeps that page rendered behind the modal overlay. The home page does this,
// but the Talks/Articles/Projects tab pages should too, clicking a card
// inside a tab should always open the same modal-over-page experience as
// clicking it from Home, never the bare item page.
const ITEM_PATH_RE = /^\/(projects|talks|writing)\/[^/]+\/?$/;

export function useItemNavigate(item: Item): NavLink {
  const navigate = useNavigate();
  const location = useLocation();
  const href = pathFor(item.kind, item.slug);
  return {
    href,
    onClick: (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      const state = location.state as BgState | null;
      // Preserve an existing background (sibling-nav inside an open modal),
      // otherwise use the current location as the background, but never an
      // item path itself, which would loop the modal back over an item page.
      const background =
        state?.background ??
        (ITEM_PATH_RE.test(location.pathname) ? undefined : location);
      navigate(href, background ? { state: { background } } : undefined);
    },
  };
}
