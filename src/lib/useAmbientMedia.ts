import { useSyncExternalStore } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const REDUCED_DATA = "(prefers-reduced-data: reduce)";

interface SaveDataConnection {
  readonly saveData?: boolean;
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
}

interface AmbientMediaInputs {
  reducedMotion: boolean;
  reducedData: boolean;
  saveData: boolean;
}

export function ambientMediaAllowed({
  reducedMotion,
  reducedData,
  saveData,
}: AmbientMediaInputs): boolean {
  return !reducedMotion && !reducedData && !saveData;
}

function dataConnection(): SaveDataConnection | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { connection?: SaveDataConnection }).connection;
}

function currentPreference(): boolean {
  if (typeof window === "undefined") return false;
  return ambientMediaAllowed({
    reducedMotion: window.matchMedia(REDUCED_MOTION).matches,
    reducedData: window.matchMedia(REDUCED_DATA).matches,
    saveData: dataConnection()?.saveData === true,
  });
}

const listeners = new Set<() => void>();
let current = false;
let detach: (() => void) | undefined;

function attachPreferenceSources() {
  if (detach || typeof window === "undefined") return;
  const motion = window.matchMedia(REDUCED_MOTION);
  const data = window.matchMedia(REDUCED_DATA);
  const connection = dataConnection();
  const read = () =>
    ambientMediaAllowed({
      reducedMotion: motion.matches,
      reducedData: data.matches,
      saveData: connection?.saveData === true,
    });
  const sync = () => {
    const next = read();
    if (next === current) return;
    current = next;
    for (const listener of listeners) listener();
  };

  current = read();
  motion.addEventListener("change", sync);
  data.addEventListener("change", sync);
  connection?.addEventListener?.("change", sync);
  detach = () => {
    motion.removeEventListener("change", sync);
    data.removeEventListener("change", sync);
    connection?.removeEventListener?.("change", sync);
  };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  attachPreferenceSources();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      detach?.();
      detach = undefined;
    }
  };
}

// Ambient video is optional decoration. Follow both accessibility and data-use
// preferences, including changes made while the page is open. All cards share
// one set of browser listeners rather than installing three listeners apiece.
export function useAmbientMediaAllowed(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => (detach ? current : currentPreference()),
    () => false,
  );
}

// Keep capability detection separate from canvasVideo: importing this helper
// must not pull mp4box into the application's startup bundle.
export function webCodecsAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    "VideoDecoder" in window &&
    "EncodedVideoChunk" in window
  );
}
