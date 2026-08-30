import { describe, expect, it } from "vitest";
import { ambientMediaAllowed } from "./useAmbientMedia";

describe("ambientMediaAllowed", () => {
  it("allows ambient media only when every preference permits it", () => {
    expect(
      ambientMediaAllowed({
        reducedMotion: false,
        reducedData: false,
        saveData: false,
      }),
    ).toBe(true);
  });

  it.each([
    { reducedMotion: true, reducedData: false, saveData: false },
    { reducedMotion: false, reducedData: true, saveData: false },
    { reducedMotion: false, reducedData: false, saveData: true },
    { reducedMotion: true, reducedData: true, saveData: true },
  ])("blocks ambient media for %#", (preferences) => {
    expect(ambientMediaAllowed(preferences)).toBe(false);
  });
});
