import { Group, MeshStandardMaterial, Mesh } from "three";
import type { Material, BufferGeometry } from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import type { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import type { RGB } from "./colorSampler.ts";

export type LineMeshInput = {
  mesh: Mesh<TextGeometry | BufferGeometry, Material | Material[]>;
  color?: RGB;
  preserveMaterial?: boolean;
};

export type ExportOptions = {
  binary?: boolean;
  backgroundColor?: number;
};

export const DEFAULT_BANNED_STRINGS = ["resume", "curriculum", "vitae"];

export async function exportLinesToGLB(
  lines: LineMeshInput[],
  options: ExportOptions = {}
): Promise<Blob> {
  if (!lines.length) throw new Error("No line meshes provided");

  const scene = new Group();
  scene.name = "GeometryRoot";

  // All line meshes share one material to keep draw calls predictable on mobile GPUs.
  const material = new MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.2,
    roughness: 0.7,
  });
  material.name = "SharedLineMat";

  lines.forEach(({ mesh, color, preserveMaterial }, index) => {
    mesh.name = `Segment_${index}`;
    if (!preserveMaterial) {
      mesh.material = material;
      if (color) {
        mesh.userData.lineColor = color;
      }
    }
    scene.add(mesh);
  });

  if (typeof options.backgroundColor === "number") {
    scene.userData.backgroundColor = options.backgroundColor;
  }

  const exporter = new GLTFExporter();

  const result = await new Promise<ArrayBuffer | Record<string, unknown>>(
    (resolve, reject) => {
      exporter.parse(
        scene,
        (data) => resolve(data as never),
        (err) => reject(err ?? new Error("Failed to export GLB")),
        { binary: options.binary ?? true }
      );
    }
  );

  if (result instanceof ArrayBuffer) {
    return new Blob([result], { type: "model/gltf-binary" });
  }

  const json = JSON.stringify(result);
  ensureNoBannedStrings(json, DEFAULT_BANNED_STRINGS);
  const buffer = new TextEncoder().encode(json);
  return new Blob([buffer], { type: "model/gltf+json" });
}

export function ensureNoBannedStrings(input: string, banned: string[]): void {
  const lowered = input.toLowerCase();
  const offending = banned.filter((needle) =>
    lowered.includes(needle.toLowerCase())
  );
  if (offending.length) {
    throw new Error(
      `Banned strings detected in payload: ${offending.join(", ")}`
    );
  }
}
