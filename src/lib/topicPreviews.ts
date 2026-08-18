// One-line preview blurbs for each curated topic, shown when a visitor hovers a
// link that opens that topic. Authored copy, so the hover preview stays fully
// static: a hover never triggers a fetch or a model call.
//
// This ships empty on purpose: a topic without an entry falls back to a blurb
// derived from its real item titles (see topicPreview in src/lib/preview.ts), so
// every topic has context whether or not you curate one. Add entries keyed by
// the topic id from src/lib/topics.ts.
export const TOPIC_BLURBS: Record<string, string> = {};

// The one-line description shown at the top of a topic collection page (so it
// reads as a real section, not a bare title + cards). Curated blurb when
// present, else a derived line so every topic has context.
export function topicBlurb(id: string, label: string): string {
  return TOPIC_BLURBS[id] || `Selected platforms, projects, and articles about ${label}.`;
}
