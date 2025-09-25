import { describe, expect, it } from "vitest";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { buildLineMesh } from "../buildLineMesh.ts";
import { exportLinesToGLB, DEFAULT_BANNED_STRINGS } from "../GLBExporter.ts";
import { RESUME_PIPELINE_CONFIG } from "../../config.ts";
import fontJson from "../../../../assets/fonts/helvetiker_regular.typeface.json?raw";

function loadFont() {
  const loader = new FontLoader();
  return loader.parse(JSON.parse(fontJson));
}

describe("GLB export", () => {
  it("exports meshes without leaking banned strings", async () => {
    const font = loadFont();
    const safePlaneWidth =
      RESUME_PIPELINE_CONFIG.planeWidth /
      RESUME_PIPELINE_CONFIG.planePaddingRatio;
    const scale = safePlaneWidth / 800;
    const mesh = buildLineMesh(
      {
        text: "Confidential",
        bounds: { left: 0, right: 200, top: 0, bottom: 32 },
      },
      {
        font,
        imageWidth: 800,
        imageHeight: 1200,
        fontSize: RESUME_PIPELINE_CONFIG.fontSize,
        depth: RESUME_PIPELINE_CONFIG.lineExtrudeDepth,
        scale,
        curveSegments: RESUME_PIPELINE_CONFIG.curveSegments,
        depthScaleMultiplier: RESUME_PIPELINE_CONFIG.depthScaleMultiplier,
        zOffset: RESUME_PIPELINE_CONFIG.zFightingOffset,
      }
    );

    const blob = await exportLinesToGLB([{ mesh, color: [64, 128, 192] }], {
      binary: false,
    });

    const exported = await new Response(blob).text();
    const lower = exported.toLowerCase();
    DEFAULT_BANNED_STRINGS.forEach((needle) => {
      expect(lower.includes(needle.toLowerCase())).toBe(false);
    });
    expect(lower.includes("confidential")).toBe(false);
  });
});
