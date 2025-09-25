import { Mesh, MeshBasicMaterial, Material } from "three";
import type { Font } from "three/examples/jsm/loaders/FontLoader.js";
import type { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import {
  createTextLineGeometry,
  placeLineMesh,
  type TextLineDefinition,
} from "./textGeometry.ts";

export type CreateLineMeshOptions = {
  font: Font;
  imageWidth: number;
  imageHeight: number;
  scale: number;
  depth: number;
  fontSize: number;
  curveSegments: number;
  zOffset?: number;
  depthScaleMultiplier: number;
};

export function buildLineMesh(
  line: TextLineDefinition,
  options: CreateLineMeshOptions
): Mesh<TextGeometry, Material | Material[]> {
  const geometry = createTextLineGeometry(line, {
    font: options.font,
    extrudeDepth: options.depth,
    fontSize: options.fontSize,
    curveSegments: options.curveSegments,
  });

  const mesh = new Mesh<TextGeometry, Material | Material[]>(
    geometry,
    new MeshBasicMaterial()
  );
  mesh.scale.set(
    options.scale,
    options.scale,
    options.scale * options.depthScaleMultiplier
  );
  placeLineMesh(mesh, line.bounds, {
    width: options.imageWidth,
    height: options.imageHeight,
    scale: options.scale,
    zOffset: options.zOffset ?? 0,
  });

  return mesh;
}
