import { describe, expect, it } from "vitest";
import { focusWrapTarget } from "./useDialogFocus";

describe("focusWrapTarget", () => {
  it("wraps forward from the last control", () => expect(focusWrapTarget(3, 2, false)).toBe(0));
  it("wraps backward from the first control", () => expect(focusWrapTarget(3, 0, true)).toBe(2));
  it("enters a dialog whose focus is outside", () => {
    expect(focusWrapTarget(3, -1, false)).toBe(0);
    expect(focusWrapTarget(3, -1, true)).toBe(2);
  });
  it("leaves interior focus alone", () => expect(focusWrapTarget(3, 1, false)).toBeNull());
});
