import { ABOUT } from "./content";
import type { About } from "./types";

// The upstream site resolved About through a live CMS draft channel. This
// template has no CMS, so the hook is a stable pass-through over the parsed
// data/about.md. It stays a hook so call sites don't change if a content
// source is added later.
export function useAbout(): About {
  return ABOUT;
}
