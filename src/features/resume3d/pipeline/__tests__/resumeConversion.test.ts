import { describe, expect, it, vi } from "vitest";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import {
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  type Material,
  type BufferGeometry,
} from "three";

import { RESUME_PIPELINE_CONFIG } from "../../config.ts";
import { buildLineMesh } from "../buildLineMesh.ts";
import { exportLinesToGLB } from "../GLBExporter.ts";
import fontJson from "../../../../assets/fonts/helvetiker_regular.typeface.json?raw";

function loadFont() {
  const loader = new FontLoader();
  return loader.parse(JSON.parse(fontJson));
}


describe("resume conversion pipeline", () => {
  it("exports a GLB that loads back with paper and text segments", async () => {
    const font = loadFont();
    const imageWidth = 1024;
    const imageHeight = 1536;
    const scale = RESUME_PIPELINE_CONFIG.planeWidth / imageWidth;

    const paperMesh = new Mesh<BufferGeometry, Material>(
      new PlaneGeometry(
        RESUME_PIPELINE_CONFIG.planeWidth * RESUME_PIPELINE_CONFIG.planePaddingRatio,
        (imageHeight * scale) * RESUME_PIPELINE_CONFIG.planePaddingRatio,
      ),
      new MeshBasicMaterial(),
    );
    paperMesh.name = "PaperBackdrop";
    paperMesh.userData.paperTexture = true;

    const lines = [
      buildLineMesh(
        {
          text: "Senior Engineer",
          bounds: { left: 120, right: 900, top: 140, bottom: 210 },
        },
        {
          font,
          imageWidth,
          imageHeight,
          scale,
          fontSize: RESUME_PIPELINE_CONFIG.fontSize,
          depth: RESUME_PIPELINE_CONFIG.lineExtrudeDepth,
          curveSegments: RESUME_PIPELINE_CONFIG.curveSegments,
          depthScaleMultiplier: RESUME_PIPELINE_CONFIG.depthScaleMultiplier,
          zOffset: RESUME_PIPELINE_CONFIG.lineLift,
        },
      ),
      buildLineMesh(
        {
          text: "TypeScript · WebGL · Privacy",
          bounds: { left: 120, right: 940, top: 260, bottom: 320 },
        },
        {
          font,
          imageWidth,
          imageHeight,
          scale,
          fontSize: RESUME_PIPELINE_CONFIG.fontSize,
          depth: RESUME_PIPELINE_CONFIG.lineExtrudeDepth,
          curveSegments: RESUME_PIPELINE_CONFIG.curveSegments,
          depthScaleMultiplier: RESUME_PIPELINE_CONFIG.depthScaleMultiplier,
          zOffset: RESUME_PIPELINE_CONFIG.lineLift,
        },
      ),
    ];

    lines.forEach((mesh, index) => {
      mesh.userData.confidence = 90 - index * 5;
    });

    let captured: unknown;
    const originalParse = GLTFExporter.prototype.parse;
    const parseSpy = vi
      .spyOn(GLTFExporter.prototype, "parse")
      .mockImplementation(function parseOverride(
        this: GLTFExporter,
        input,
        onDone,
        onError,
        options,
      ) {
        return originalParse.call(
          this,
          input,
          (data) => {
            captured = data;
            onDone(data);
          },
          onError,
          options,
        );
      });

    const blob = await exportLinesToGLB(
      [
        { mesh: paperMesh, preserveMaterial: true },
        { mesh: lines[0], color: [48, 84, 196] },
        { mesh: lines[1], color: [32, 112, 168] },
      ],
      { binary: false },
    );

    parseSpy.mockRestore();

    expect(blob).toBeInstanceOf(Blob);
    expect(captured).toBeDefined();

    const gltf =
      captured instanceof ArrayBuffer
        ? (JSON.parse(new TextDecoder().decode(captured)) as Record<
            string,
            unknown
          >)
        : (captured as Record<string, unknown>);

    const materials = (gltf.materials ?? []) as Array<{ name?: string }>;
    expect(materials.some((mat) => mat.name === "SharedLineMat")).toBe(true);

    const nodes = (gltf.nodes ?? []) as Array<{ name?: string; extras?: Record<string, unknown> }>;
    const paperNode = nodes.find((node) => node.extras?.paperTexture === true);
    expect(paperNode).toBeDefined();

    const segmentNodes = nodes.filter(
      (node) => node.name?.startsWith("Segment_") && Array.isArray(node.extras?.lineColor),
    );
    expect(segmentNodes.length).toBe(2);
    expect(
      segmentNodes.every((node) =>
        typeof node.extras === "object" && node.extras !== null && "lineColor" in node.extras
      ),
    ).toBe(true);
  });
});
