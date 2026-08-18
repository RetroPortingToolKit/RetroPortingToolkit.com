import { createElement, type CSSProperties, type ElementType } from "react";

interface BlurTextProps {
  text: string;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  /** ms between each part's animation start */
  stagger?: number;
  /** animation duration in ms */
  duration?: number;
  /** initial delay before first part begins, in ms */
  delay?: number;
  /** split text into characters or whole words */
  splitBy?: "char" | "word";
  id?: string;
}

export function BlurText({
  text,
  as = "span",
  className,
  style,
  stagger = 22,
  duration = 600,
  delay = 0,
  splitBy = "char",
  id,
}: BlurTextProps) {
  if (splitBy === "word") {
    const parts = text.split(/(\s+)/).filter((p) => p.length > 0);
    const children = parts.map((part, i) => (
      <span
        key={i}
        aria-hidden="true"
        className="blur-text-part"
        style={{
          animationDelay: `${delay + i * stagger}ms`,
          animationDuration: `${duration}ms`,
        }}
      >
        {part}
      </span>
    ));
    return createElement(as, { className, style, id, "aria-label": text }, children);
  }

  // char mode: group characters into word-level inline-block spans so lines
  // never break mid-word
  let charIndex = 0;
  const words = text.split(/(\s+)/);
  const children = words.map((word, wi) => {
    if (/^\s+$/.test(word)) {
      charIndex += word.length;
      return word;
    }
    const chars = Array.from(word).map((ch, ci) => {
      const idx = charIndex + ci;
      return (
        <span
          key={idx}
          aria-hidden="true"
          className="blur-text-part"
          style={{
            animationDelay: `${delay + idx * stagger}ms`,
            animationDuration: `${duration}ms`,
          }}
        >
          {ch}
        </span>
      );
    });
    charIndex += word.length;
    return (
      <span key={`w${wi}`} style={{ display: "inline-block", whiteSpace: "nowrap" }}>
        {chars}
      </span>
    );
  });

  return createElement(
    as,
    { className, style, id, "aria-label": text },
    children,
  );
}
