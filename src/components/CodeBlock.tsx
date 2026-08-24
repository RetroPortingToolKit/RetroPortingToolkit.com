import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

// A fenced code block: the language as a visible label, the filename when the
// info string names one, and a copy button for the raw source.
//
// The rendered <code> is passed through as `children` exactly as react-markdown
// built it, class list and all, so a syntax highlighter can be dropped into the
// rehype pipeline later without this component changing.

interface CodeBlockProps {
  /** Language token, lowercased, for CSS to hook on. */
  lang: string | null;
  /** That language written for a human. */
  label: string | null;
  /** Filename from the info string, if any. */
  file: string | null;
  /** The raw source, which is what the copy button puts on the clipboard. */
  code: string;
  children?: ReactNode;
}

type CopyState = "idle" | "copied" | "failed";

const COPY_TEXT: Record<CopyState, string> = {
  idle: "Copy",
  copied: "Copied",
  failed: "Copy failed",
};

async function writeToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Denied, or not a secure context. Fall through to the old way.
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "0";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export function CodeBlock({ lang, label, file, code, children }: CodeBlockProps) {
  // Starts "idle" on both the server and the first client render, so the
  // markup is the same in both and nothing shifts when React takes over.
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onCopy = useCallback(() => {
    void writeToClipboard(code).then((ok) => {
      setState(ok ? "copied" : "failed");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setState("idle"), 2000);
    });
  }, [code]);

  return (
    <figure className="md-code" data-lang={lang ?? undefined}>
      <figcaption className="md-code-head">
        {file && <span className="md-code-file">{file}</span>}
        {label && <span className="md-code-lang">{label}</span>}
        <button
          type="button"
          className="md-code-copy"
          data-state={state}
          aria-label={file ? `Copy ${file}` : "Copy code"}
          onClick={onCopy}
        >
          {/* The word changes, so it is announced; the button keeps a stable
              accessible name through aria-label above. */}
          <span className="md-code-copy-label" aria-live="polite">
            {COPY_TEXT[state]}
          </span>
        </button>
      </figcaption>
      <pre className="md-code-pre">{children}</pre>
    </figure>
  );
}
