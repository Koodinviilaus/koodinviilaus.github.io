import { describe, expect, it } from "vitest";
import { averageColor, rgbToHex } from "../colorSampler.ts";

describe("colorSampler", () => {
  it("returns average color for solid patch", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 10;
    canvas.height = 10;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("ctx missing");

    ctx.fillStyle = "#336699";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const [r, g, b] = averageColor(ctx, { x: 0, y: 0, width: 10, height: 10 });
    expect(r).toBeGreaterThan(0);
    expect(rgbToHex([r, g, b]).toString(16)).toEqual((0x336699).toString(16));
  });
});
