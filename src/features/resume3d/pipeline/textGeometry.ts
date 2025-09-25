import * as THREE from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import type { Font } from "three/examples/jsm/loaders/FontLoader.js";

export type TextLineBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type TextLineDefinition = {
  text: string;
  bounds: TextLineBounds;
};

export type LineGeometryOptions = {
  font: Font;
  fontSize?: number;
  extrudeDepth?: number;
  curveSegments?: number;
};

const DEFAULT_SIZE = 8;
const DEFAULT_DEPTH = 1.2;
const DEFAULT_CURVE_SEGMENTS = 6;

export function createTextLineGeometry(
  line: TextLineDefinition,
  opts: LineGeometryOptions,
): TextGeometry {
  const {
    font,
    fontSize = DEFAULT_SIZE,
    extrudeDepth = DEFAULT_DEPTH,
    curveSegments = DEFAULT_CURVE_SEGMENTS,
  } = opts;

  const geometry = new TextGeometry(line.text, {
    font,
    size: fontSize,
    depth: extrudeDepth,
    curveSegments,
    bevelEnabled: false,
  });

  geometry.computeBoundingBox();
  geometry.computeVertexNormals();

  // Remove text parameter payload to avoid leaking strings when exporting.
  if (geometry.parameters && "text" in geometry.parameters) {
    geometry.parameters.text = "";
  }

  // Center geometry around its origin — simplifies downstream placement.
  const bbox = geometry.boundingBox;
  if (bbox) {
    const offset = new THREE.Vector3();
    bbox.getCenter(offset).negate();
    geometry.translate(offset.x, offset.y, offset.z);
  }

  return geometry;
}

export function placeLineMesh(
  mesh: THREE.Mesh,
  bounds: TextLineBounds,
  layout: { width: number; height: number; scale?: number; zOffset?: number },
) {
  const { width, height, scale = 0.01, zOffset = 0 } = layout;
  const centerX = (bounds.left + bounds.right) / 2;
  const centerY = (bounds.top + bounds.bottom) / 2;

  const x = (centerX - width / 2) * scale;
  const y = (height / 2 - centerY) * scale;

  mesh.position.set(x, y, zOffset);
}

export type BannedStringScanOptions = {
  banned: string[];
};

export function scanForBannedStrings(input: string, opts: BannedStringScanOptions): string[] {
  const lowered = input.toLowerCase();
  return opts.banned.filter((needle) => needle && lowered.includes(needle.toLowerCase()));
}
