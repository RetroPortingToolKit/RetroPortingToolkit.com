// Pure helpers behind src/components/Markdown.tsx. They are here rather than in
// the component so they can be unit tested without a DOM, and so the rules they
// encode (what counts as a callout, what an info string may say) are stated in
// one place instead of inside JSX.

// ---- callouts ----

/**
 * The three labels docs/WRITING_GUIDE allows on a callout. Anything else that
 * opens a blockquote in bold is ordinary prose, and most importantly a verbatim
 * quotation from a repository, which must keep rendering as a quotation.
 */
export type CalloutKind = "note" | "warning" | "provide";

const CALLOUT_BY_LABEL: Record<string, CalloutKind> = {
  note: "note",
  warning: "warning",
  "you provide this": "provide",
};

/** The three kinds, for tests and for anything that wants to enumerate them. */
export const CALLOUT_KINDS: CalloutKind[] = ["note", "warning", "provide"];

/**
 * The callout kind for the bold lead-in of a blockquote, or null when the
 * blockquote is just a blockquote.
 *
 * Matching is exact on the whole label, ignoring case and a single trailing
 * period or colon. "A note on the upstream contributing files." is not a
 * callout: it merely starts with the word note, and the writing guide uses that
 * exact phrasing for a real quotation.
 */
export function calloutKindFromLabel(label: string | null | undefined): CalloutKind | null {
  if (!label) return null;
  const key = label
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.:]$/, "")
    .trim()
    .toLowerCase();
  return CALLOUT_BY_LABEL[key] ?? null;
}

// ---- code fences ----

export interface FenceInfo {
  /** The language token, lowercased: "c" for ```c. Null when the fence has none. */
  lang: string | null;
  /** That language written for a human: "C", "Shell", "JSON". */
  label: string | null;
  /** The filename the info string names, if any. */
  file: string | null;
}

// The house convention is title="path/to/file", the same spelling Astro,
// Docusaurus and Nextra use. `file=` and `filename=` are accepted as aliases,
// and a bare token that looks like a path (```sh scripts/build.sh) is accepted
// too, because that is what people write when they are not looking it up.
const TITLE_RE = /(?:^|\s)(?:title|file|filename)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/;
const BARE_PATH_RE = /^[\w.@/\\+-]+$/;

const LANGUAGE_LABELS: Record<string, string> = {
  asm: "Assembly",
  bash: "Shell",
  c: "C",
  cmake: "CMake",
  console: "Console",
  cpp: "C++",
  cs: "C#",
  css: "CSS",
  diff: "Diff",
  dockerfile: "Dockerfile",
  glsl: "GLSL",
  go: "Go",
  h: "C",
  hlsl: "HLSL",
  html: "HTML",
  ini: "INI",
  java: "Java",
  js: "JavaScript",
  json: "JSON",
  jsonc: "JSONC",
  jsx: "JSX",
  lua: "Lua",
  make: "Makefile",
  makefile: "Makefile",
  markdown: "Markdown",
  md: "Markdown",
  mips: "MIPS assembly",
  nasm: "Assembly",
  patch: "Patch",
  powershell: "PowerShell",
  ps1: "PowerShell",
  py: "Python",
  python: "Python",
  rs: "Rust",
  rust: "Rust",
  sh: "Shell",
  shell: "Shell",
  sql: "SQL",
  text: "Text",
  toml: "TOML",
  ts: "TypeScript",
  tsx: "TSX",
  txt: "Text",
  xml: "XML",
  yaml: "YAML",
  yml: "YAML",
  zsh: "Shell",
};

/** The label shown on a code block for a language token. */
export function languageLabel(lang: string | null | undefined): string | null {
  if (!lang) return null;
  const key = lang.toLowerCase();
  return LANGUAGE_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

/** The filename an info string's trailing text names, or null. */
export function fenceFilename(meta: string | null | undefined): string | null {
  if (!meta) return null;
  const quoted = meta.match(TITLE_RE);
  if (quoted) {
    const value = (quoted[1] ?? quoted[2] ?? quoted[3] ?? "").trim();
    return value || null;
  }
  const bare = meta.trim();
  // Only a token that reads as a path: this keeps things like {1,3} or
  // showLineNumbers, which other toolchains put here, out of the filename slot.
  if (BARE_PATH_RE.test(bare) && /[./\\]/.test(bare)) return bare;
  return null;
}

/**
 * What a fence declares. `className` is the `<code>` element's class list as
 * remark-rehype writes it (["language-c"]); `meta` is everything after the
 * language token, which mdast-util-to-hast keeps on the node as `data.meta`.
 */
export function parseFenceInfo(
  className?: unknown,
  meta?: string | null,
): FenceInfo {
  const classes = Array.isArray(className)
    ? className.map(String)
    : typeof className === "string"
      ? className.split(/\s+/)
      : [];
  const match = classes.find((c) => c.startsWith("language-"));
  const token = match ? match.slice("language-".length) : "";
  // A first token that reads as a path is a filename, not a language: ```yaml
  // is a language, ```.github/workflows/ci.yml is not.
  const tokenIsPath = !!token && BARE_PATH_RE.test(token) && /[./\\]/.test(token);
  const lang = tokenIsPath ? null : token.toLowerCase();
  return {
    lang: lang || null,
    label: languageLabel(lang),
    file: fenceFilename(meta) ?? (tokenIsPath ? token : null),
  };
}
