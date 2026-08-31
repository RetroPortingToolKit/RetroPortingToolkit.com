import { useEffect } from "react";

export function useBackgroundIsolation(active = true) {
  useEffect(() => {
    if (!active) return;
    const elements = [...document.querySelectorAll<HTMLElement>("#root")];
    const previous = elements.map((element) => ({
      element,
      inert: element.hasAttribute("inert"),
      ariaHidden: element.getAttribute("aria-hidden"),
    }));
    for (const { element } of previous) {
      element.setAttribute("inert", "");
      element.setAttribute("aria-hidden", "true");
    }
    return () => {
      for (const { element, inert, ariaHidden } of previous) {
        if (!inert) element.removeAttribute("inert");
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      }
    };
  }, [active]);
}
