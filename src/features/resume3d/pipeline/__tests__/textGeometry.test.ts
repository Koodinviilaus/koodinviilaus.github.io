import { describe, expect, it } from "vitest";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import fontJson from "../../../assets/fonts/helvetiker_regular.typeface.json?raw";
import { createTextLineGeometry } from "../textGeometry.ts";

function loadFont() {
  const loader = new FontLoader();
  return loader.parse(JSON.parse(fontJson));
}

describe("Text geometry", () => {
  it("extrudes lines with depth", () => {
    const font = loadFont();
    const geometry = createTextLineGeometry(
      { text: "Sample", bounds: { left: 0, top: 0, right: 10, bottom: 10 } },
      { font, extrudeDepth: 2, fontSize: 16 },
    );

    expect(geometry.parameters.depth).toBeGreaterThan(0);
    expect(geometry.boundingBox).not.toBeNull();
  });

  it("clears text from parameters to avoid leaks", () => {
    const font = loadFont();
    const geometry = createTextLineGeometry(
      { text: "Secret", bounds: { left: 0, top: 0, right: 10, bottom: 10 } },
      { font },
    );

    // @ts-expect-error Accessing internal structure for validation
    expect(geometry.parameters.text).toBe("");
  });
});
