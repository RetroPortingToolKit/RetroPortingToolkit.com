import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serializeMd, serializeJson, fileBaseSha, readEditable } from "./cms-dev.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("serializeMd", () => {
  it("produces the canonical frontmatter + body format", () => {
    expect(serializeMd('title: "X"', "body")).toBe(`---\ntitle: "X"\n---\n\nbody\n`);
  });
  it("trims surrounding whitespace in frontmatter and trailing whitespace in body", () => {
    expect(serializeMd('  title: "X"  ', "body\n\n\n")).toBe(`---\ntitle: "X"\n---\n\nbody\n`);
  });
  it("is idempotent under re-parse (round-trip stable)", () => {
    const once = serializeMd('a: "1"\nb: "2"', "line one\nline two");
    const m = once.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)\n$/);
    expect(m).not.toBeNull();
    const twice = serializeMd(m[1], m[2]);
    expect(twice).toBe(once);
  });
});

describe("serializeJson", () => {
  it("ensures exactly one trailing newline (idempotent)", () => {
    expect(serializeJson('{"a":1}')).toBe('{"a":1}\n');
    expect(serializeJson('{"a":1}\n')).toBe('{"a":1}\n');
  });
});

describe("fileBaseSha (optimistic-concurrency guard)", () => {
  it("is deterministic for the same id", () => {
    const a = fileBaseSha("page:home");
    const b = fileBaseSha("page:home");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
  it("differs across different docs", () => {
    expect(fileBaseSha("page:home")).not.toBe(fileBaseSha("data/about.md"));
  });
  it("returns empty string for an unknown id", () => {
    expect(fileBaseSha("data/nope/missing.md")).toBe("");
  });
});

describe("read -> save is idempotent for every real content file (no drift)", () => {
  // The safety property that matters: editing a real doc and saving it produces
  // bytes that, read + saved again, are unchanged. So the editor can never
  // slowly corrupt content across successive saves. (A FIRST save may normalize
  // pre-existing frontmatter spacing; what must never happen is continued drift.)
  const dirs = ["blog", "hardware", "games", "docs"];
  const ids = [];
  for (const kind of dirs) {
    const base = path.join(ROOT, "data", kind);
    if (!fs.existsSync(base)) continue;
    for (const folder of fs.readdirSync(base)) {
      const rel = `data/${kind}/${folder}/index.md`;
      if (fs.existsSync(path.join(ROOT, rel))) ids.push(rel);
      // Docs nest: a section folder holds its own index.md and one folder per
      // page, and every one of those is an editable doc.
      const section = path.join(ROOT, "data", kind, folder);
      if (kind !== "docs" || !fs.statSync(section).isDirectory()) continue;
      for (const page of fs.readdirSync(section)) {
        const nested = `data/${kind}/${folder}/${page}/index.md`;
        if (fs.existsSync(path.join(ROOT, nested))) ids.push(nested);
      }
    }
  }
  it(`found content files to check (${ids.length})`, () => {
    expect(ids.length).toBeGreaterThan(0);
  });
  // mirror readOne's md parse (splitFrontmatter + strip leading body newlines)
  const reparse = (raw) => {
    const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    return { frontmatter: m[1], body: m[2].replace(/^\n+/, "") };
  };
  for (const id of ids) {
    it(`${id} saves stably (serialize is a fixed point)`, () => {
      const doc = readEditable(id);
      expect(doc).not.toBeNull();
      const s1 = serializeMd(doc.frontmatter, doc.body);
      const re = reparse(s1);
      const s2 = serializeMd(re.frontmatter, re.body);
      expect(s2).toBe(s1); // saving the saved output changes nothing
    });
  }
});
