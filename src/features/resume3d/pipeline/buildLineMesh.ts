import * as THREE from "three";
import type { Font } from "three/examples/jsm/loaders/FontLoader.js";
import type { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { createTextLineGeometry, placeLineMesh, type TextLineDefinition } from "./textGeometry.ts";

export type CreateLineMeshOptions = {
  font: Font;
  imageWidth: number;
  imageHeight: number;
  scale?: number;
  depth?: number;
  fontSize?: number;
};

export function buildLineMesh(
  line: TextLineDefinition,
  options: CreateLineMeshOptions,
): THREE.Mesh<TextGeometry, THREE.Material | THREE.Material[]> {
  const geometry = createTextLineGeometry(line, {
    font: options.font,
    extrudeDepth: options.depth,
    fontSize: options.fontSize,
  });

  const mesh = new THREE.Mesh<TextGeometry, THREE.Material | THREE.Material[]>(
    geometry,
    new THREE.MeshBasicMaterial(),
  );
  placeLineMesh(mesh, line.bounds, {
    width: options.imageWidth,
    height: options.imageHeight,
    scale: options.scale,
    zOffset: 0,
  });

  return mesh;
}
