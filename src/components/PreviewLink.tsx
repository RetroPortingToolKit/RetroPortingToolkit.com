import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { SmartLink } from "./SmartLink";
import { previewForHref } from "@/lib/preview";

interface Props {
  href: string;
  className?: string;
  children: ReactNode;
}

// A link that shows a hover card describing where it goes: the destination's
// own cover, kicker, title, and description, resolved from site content at
// render time (see src/lib/preview.ts, no fetch on hover).
//
// Falls back to a plain SmartLink when the href has no useful preview, and on
// touch devices (no `hover: hover`), where a hover card cannot be dismissed.
export function PreviewLink({ href, className, children }: Props) {
  const preview = useMemo(() => previewForHref(href), [href]);

  const [open, setOpen] = useState(false);
  const [hoverCapable, setHoverCapable] = useState(false);
  const [pos, setPos] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover)");
    const sync = () => setHoverCapable(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const clearTimers = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  };
  useEffect(() => clearTimers, []);

  const scheduleOpen = (el: HTMLElement) => {
    clearTimers();
    anchorRef.current = el;
    openTimer.current = setTimeout(() => setOpen(true), 220);
  };
  const scheduleClose = () => {
    clearTimers();
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  };

  // Anchor the card beside the link, flipping above when it would overflow the
  // viewport bottom, clamped horizontally.
  const reposition = () => {
    const a = anchorRef.current;
    if (!a) return;
    const r = a.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 10;
    const width = Math.min(340, vw - margin * 2);
    let left = r.left + r.width / 2 - width / 2;
    left = Math.max(margin, Math.min(left, vw - width - margin));
    const h = cardRef.current?.offsetHeight ?? 0;
    let top = r.bottom + 8;
    if (h && top + h > vh - margin) {
      const above = r.top - 8 - h;
      top = above >= margin ? above : Math.max(margin, vh - h - margin);
    }
    setPos({ left, top, width });
  };

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    reposition();
    const raf = requestAnimationFrame(reposition);
    const t = setTimeout(reposition, 90);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => reposition();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const canHover = hoverCapable && !!preview;

  const hoverProps = {
    className,
    onMouseEnter: canHover
      ? (e: React.MouseEvent<HTMLElement>) => scheduleOpen(e.currentTarget)
      : undefined,
    onMouseLeave: canHover ? scheduleClose : undefined,
    onFocus: canHover
      ? (e: React.FocusEvent<HTMLElement>) => {
          anchorRef.current = e.currentTarget;
          clearTimers();
          setOpen(true);
        }
      : undefined,
    onBlur: canHover ? () => setOpen(false) : undefined,
  };

  const isExternal = !href.startsWith("/");
  const link = isExternal ? (
    <a href={href} target="_blank" rel="noopener noreferrer" {...hoverProps}>
      {children}
    </a>
  ) : (
    <SmartLink href={href} {...hoverProps}>
      {children}
    </SmartLink>
  );

  const cardStyle = pos
    ? { left: pos.left, top: pos.top, width: pos.width }
    : { left: -9999, top: 0, width: 340, visibility: "hidden" as const };

  return (
    <>
      {link}
      {open &&
        preview &&
        createPortal(
          <div
            ref={cardRef}
            className="lp-card"
            role="tooltip"
            style={cardStyle}
            onMouseEnter={canHover ? clearTimers : undefined}
            onMouseLeave={canHover ? scheduleClose : undefined}
          >
            {preview.image && (
              <div className="lp-figure">
                <img
                  className="lp-img"
                  src={preview.image}
                  alt={preview.title}
                  loading="lazy"
                  onLoad={reposition}
                  onError={(e) => {
                    const fig = e.currentTarget
                      .parentElement as HTMLElement | null;
                    if (fig) fig.style.display = "none";
                  }}
                />
                {preview.isVideo && <span className="lp-play" aria-hidden="true" />}
              </div>
            )}
            <div className="lp-body">
              <div className="lp-kicker">{preview.kicker}</div>
              <div className="lp-title">{preview.title}</div>
              {preview.meta && <div className="lp-meta">{preview.meta}</div>}
              {preview.description && (
                <p className="lp-desc">{preview.description}</p>
              )}
              <span className="lp-cta">
                {preview.cta}{" "}
                <span className="lp-arrow">{preview.internal ? "→" : "↗"}</span>
              </span>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
