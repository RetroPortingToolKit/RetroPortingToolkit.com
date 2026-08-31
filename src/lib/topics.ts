import type { Topic } from "./types";

// Topics group items across kinds, so a topic link opens a curated card set.
// `items` is the hand-picked, strongest-first list; `keywords` is the fallback
// match for topics that don't pin an explicit list.
export const TOPICS: Topic[] = [
  {
    id: "widescreen",
    label: "widescreen",
    keywords: ["widescreen", "aspect ratio", "21:9", "16:9"],
  },
  {
    id: "translation",
    label: "translations & mods",
    keywords: ["translation", "text override", "mod loader", "mods"],
  },
];

export function findTopic(id: string): Topic | undefined {
  return TOPICS.find((t) => t.id === id);
}
