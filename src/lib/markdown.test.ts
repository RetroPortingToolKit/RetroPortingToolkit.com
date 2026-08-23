import { describe, expect, it } from "vitest";
import {
  calloutKindFromLabel,
  fenceFilename,
  languageLabel,
  parseFenceInfo,
} from "./markdown";

describe("calloutKindFromLabel", () => {
  it("recognises the three labels the writing guide allows", () => {
    expect(calloutKindFromLabel("Note.")).toBe("note");
    expect(calloutKindFromLabel("Warning.")).toBe("warning");
    expect(calloutKindFromLabel("You provide this.")).toBe("provide");
  });

  it("tolerates case, spacing and a colon", () => {
    expect(calloutKindFromLabel("note")).toBe("note");
    expect(calloutKindFromLabel(" WARNING ")).toBe("warning");
    expect(calloutKindFromLabel("Warning:")).toBe("warning");
    expect(calloutKindFromLabel("You  provide  this")).toBe("provide");
  });

  it("leaves an ordinary blockquote alone", () => {
    // The exact lead-in the writing guide uses on a real quotation. It starts
    // with the word note and must NOT become a callout.
    expect(
      calloutKindFromLabel("A note on the upstream contributing files."),
    ).toBe(null);
    expect(calloutKindFromLabel("Note that the renderer is experimental.")).toBe(null);
    expect(calloutKindFromLabel("Warnings are logged to stderr.")).toBe(null);
    expect(calloutKindFromLabel("You provide this file yourself.")).toBe(null);
    expect(calloutKindFromLabel("")).toBe(null);
    expect(calloutKindFromLabel(null)).toBe(null);
  });
});

describe("fence info strings", () => {
  it("reads the house convention, title=\"path\"", () => {
    expect(fenceFilename('title="recompiler/translate.c"')).toBe(
      "recompiler/translate.c",
    );
    expect(fenceFilename("title='a/b.c'")).toBe("a/b.c");
    expect(fenceFilename("file=\"Makefile.local\"")).toBe("Makefile.local");
    expect(fenceFilename("filename=scripts/build.sh")).toBe("scripts/build.sh");
  });

  it("accepts a bare path", () => {
    expect(fenceFilename("recompiler/translate.c")).toBe("recompiler/translate.c");
    expect(fenceFilename("  Makefile.local  ")).toBe("Makefile.local");
  });

  it("refuses anything that is not a path", () => {
    expect(fenceFilename("{1,3}")).toBe(null);
    expect(fenceFilename("showLineNumbers")).toBe(null);
    expect(fenceFilename("two words here")).toBe(null);
    expect(fenceFilename("")).toBe(null);
    expect(fenceFilename(undefined)).toBe(null);
  });

  it("parses the class list and meta a code element carries", () => {
    expect(parseFenceInfo(["language-c"], 'title="recompiler/translate.c"')).toEqual({
      lang: "c",
      label: "C",
      file: "recompiler/translate.c",
    });
    expect(parseFenceInfo(["language-sh"], "scripts/build.sh")).toEqual({
      lang: "sh",
      label: "Shell",
      file: "scripts/build.sh",
    });
    expect(parseFenceInfo(["language-json"], null)).toEqual({
      lang: "json",
      label: "JSON",
      file: null,
    });
    expect(parseFenceInfo(undefined, undefined)).toEqual({
      lang: null,
      label: null,
      file: null,
    });
  });

  it("treats a lone path in the language slot as a filename", () => {
    // ```recompiler/translate.c with no language at all.
    expect(parseFenceInfo(["language-recompiler/translate.c"], null)).toEqual({
      lang: null,
      label: null,
      file: "recompiler/translate.c",
    });
  });

  it("labels a language for a human", () => {
    expect(languageLabel("cpp")).toBe("C++");
    expect(languageLabel("yml")).toBe("YAML");
    expect(languageLabel("ninja")).toBe("Ninja");
    expect(languageLabel(null)).toBe(null);
  });
});
