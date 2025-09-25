import { describe, expect, it } from "vitest";
import { averageColor, rgbToHex } from "../colorSampler.ts";

describe("colorSampler", () => {
  it("returns average color for solid patch", () => {
    const expected = [0x33, 0x66, 0x99];
    const ctx = {
      getImageData: () => ({
        data: new Uint8ClampedArray([
          ...expected,
          255,
          ...expected,
          255,
        ]),
      }),
    } as unknown as CanvasRenderingContext2D;

    const [r, g, b] = averageColor(ctx, { x: 0, y: 0, width: 2, height: 1 });
    expect([r, g, b]).toEqual(expected);
    expect(rgbToHex([r, g, b])).toBe(0x336699);
  });
});
