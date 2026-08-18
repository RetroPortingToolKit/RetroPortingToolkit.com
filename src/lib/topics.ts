import type { Topic } from "./types";

// Topics group items across kinds, so a topic link opens a curated card set.
// `items` is the hand-picked, strongest-first list; `keywords` is the fallback
// match for topics that don't pin an explicit list. Replace these with your own.
export const TOPICS: Topic[] = [
  {
    id: "porting",
    label: "porting",
    keywords: ["porting", "portability", "recompile"],
    items: [
      { kind: "project", slug: "first-project" },
      { kind: "talk", slug: "first-talk" },
    ],
  },
  {
    id: "preservation",
    label: "preservation",
    keywords: ["preservation", "archive", "emulation"],
    items: [
      { kind: "project", slug: "second-project" },
      { kind: "writing", slug: "first-article" },
    ],
  },
];

export function findTopic(id: string): Topic | undefined {
  return TOPICS.find((t) => t.id === id);
}
