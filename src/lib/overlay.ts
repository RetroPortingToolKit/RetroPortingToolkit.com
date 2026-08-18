import { createContext, useContext } from "react";

// True while a modal layer (an item or a collection) is mounted over the tab
// page. The tab page underneath stays mounted so closing the layer reveals it
// instantly, which also means it must not fight the layer over shared global
// state. Today that means document.title (see useDocumentTitle).
export const OverlayOpenContext = createContext(false);

export function useOverlayOpen(): boolean {
  return useContext(OverlayOpenContext);
}
