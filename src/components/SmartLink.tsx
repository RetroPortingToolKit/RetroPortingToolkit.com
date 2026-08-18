import { useNavigate, useLocation } from "react-router-dom";
import type {
  FocusEventHandler,
  MouseEvent,
  MouseEventHandler,
  ReactNode,
} from "react";

interface SmartLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  // Pointer/focus handlers are forwarded to the anchor so wrappers (e.g.
  // PreviewLink's hover card) can attach to the real link element.
  onMouseEnter?: MouseEventHandler<HTMLAnchorElement>;
  onMouseLeave?: MouseEventHandler<HTMLAnchorElement>;
  onFocus?: FocusEventHandler<HTMLAnchorElement>;
  onBlur?: FocusEventHandler<HTMLAnchorElement>;
}

const ITEM_PATH_RE = /^\/(projects|talks|writing)\/[^/]+\/?$/;
const MODAL_PATH_RE =
  /^\/(projects|talks|writing)\/[^/]+\/?$|^\/source\/[^/]+\/?$|^\/all\/[^/]+\/?$|^\/topic\/[^/]+\/?$/;

export function SmartLink({
  href,
  className,
  children,
  onClick: onClickProp,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
}: SmartLinkProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const hoverProps = { onMouseEnter, onMouseLeave, onFocus, onBlur };

  const isInternal =
    href.startsWith("/") || href.startsWith("#") || href.startsWith("?");
  const isModalPath = MODAL_PATH_RE.test(href);
  void ITEM_PATH_RE;

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (!isInternal) return;
    if (href.startsWith("#")) return;
    e.preventDefault();
    onClickProp?.();
    if (!isModalPath) {
      navigate(href);
      return;
    }
    // Chain: the modal opens OVER whatever is on screen right now (including
    // another modal -- the stored Location carries its own state, so closing
    // walks back one layer instead of collapsing the whole stack).
    navigate(href, { state: { background: location } });
  };

  if (!isInternal) {
    return (
      <a
        href={href}
        className={className}
        target="_blank"
        rel="noopener noreferrer"
        {...hoverProps}
      >
        {children}
      </a>
    );
  }

  return (
    <a href={href} className={className} onClick={onClick} {...hoverProps}>
      {children}
    </a>
  );
}
