import { describe, expect, it } from "vitest";
import { BOX_KEY, readBoxState, REVEAL_AFTER_PX, shouldReveal, writeBoxState } from "./subscribeBox";

/** A localStorage stand-in that can be told to behave like a locked-down one. */
function fakeStorage(initial: Record<string, string> = {}, throws = false) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(k: string) {
      if (throws) throw new DOMException("denied");
      return map.get(k) ?? null;
    },
    setItem(k: string, v: string) {
      if (throws) throw new DOMException("denied");
      map.set(k, v);
    },
    read: (k: string) => map.get(k) ?? null,
  };
}

describe("corner subscribe box, remembering", () => {
  it("is offered when nothing has been stored", () => {
    expect(readBoxState(fakeStorage())).toBe("open");
  });

  it("stays closed once dismissed", () => {
    const s = fakeStorage();
    writeBoxState("dismissed", s);
    expect(s.read(BOX_KEY)).toBe("dismissed");
    expect(readBoxState(s)).toBe("dismissed");
  });

  it("stays closed once someone has subscribed", () => {
    const s = fakeStorage();
    writeBoxState("subscribed", s);
    expect(readBoxState(s)).toBe("subscribed");
  });

  it("ignores a stored value it does not recognise", () => {
    expect(readBoxState(fakeStorage({ [BOX_KEY]: "banana" }))).toBe("open");
  });

  it("offers the box rather than throwing when storage is unavailable", () => {
    // Safari private mode and "block all cookies" make the accessor itself
    // throw. Forgetting a dismissal is acceptable; a broken page is not.
    expect(() => readBoxState(fakeStorage({}, true))).not.toThrow();
    expect(readBoxState(fakeStorage({}, true))).toBe("open");
    expect(() => writeBoxState("dismissed", fakeStorage({}, true))).not.toThrow();
    expect(() => readBoxState(null)).not.toThrow();
    expect(() => writeBoxState("dismissed", null)).not.toThrow();
  });
});

describe("corner subscribe box, when it appears", () => {
  const TALL = 6000;
  const VIEW = 900;

  it("stays hidden on arrival", () => {
    expect(shouldReveal(0, VIEW, TALL)).toBe(false);
  });

  it("appears once the reader has scrolled far enough to be interested", () => {
    expect(shouldReveal(REVEAL_AFTER_PX - 1, VIEW, TALL)).toBe(false);
    expect(shouldReveal(REVEAL_AFTER_PX, VIEW, TALL)).toBe(true);
  });

  it("never appears on a page that does not scroll", () => {
    // Otherwise a short page would show it at scrollY 0, which is a pop-up.
    expect(shouldReveal(0, VIEW, VIEW)).toBe(false);
    expect(shouldReveal(0, VIEW, VIEW - 100)).toBe(false);
  });

  it("scales the threshold down on a page too short to reach the fixed one", () => {
    // 1400 tall, 900 viewport => 500 reachable; two thirds of that is ~330.
    expect(shouldReveal(200, VIEW, 1400)).toBe(false);
    expect(shouldReveal(340, VIEW, 1400)).toBe(true);
  });
});
