export const RESUME_PIPELINE_CONFIG = {
  /** Target width of the generated résumé plane in world units. */
  planeWidth: 22,
  /** Depth assigned to each extruded text line. */
  lineExtrudeDepth: 2.4,
  /** Default font size passed to TextGeometry. */
  fontSize: 28,
  /** Number of curve segments in the generated text geometry. */
  curveSegments: 6,
  /** Additional padding added to keep text slightly inside the paper edges. */
  planePaddingRatio: 1.08,
  /** Step used to push consecutive lines on the Z axis to avoid z-fighting. */
  zFightingOffset: 0.4,
  /** Multiplier applied to the Z scale for extruded meshes. */
  depthScaleMultiplier: 3.2,
};

export const RESUME_VIEWER_CONFIG = {
  renderer: {
    clearColor: 0xf5f4f0,
    backgroundColor: 0xf6f5f2,
  },
  lighting: {
    ambientIntensity: 0.82,
    directional: {
      color: 0xffffff,
      intensity: 0.55,
      position: { x: 200, y: 260, z: 200 },
    },
    hemisphere: {
      skyColor: 0xf8f6f3,
      groundColor: 0xcac7c1,
      intensity: 0.4,
    },
  },
  controls: {
    rotationSensitivity: {
      x: 0.005,
      y: 0.005,
    },
    invertHorizontalDrag: true,
    orbitDamping: 0.08,
    zoom: {
      deltaMultiplier: 0.012,
      minRadius: 18,
      maxRadius: 360,
    },
  },
  paper: {
    color: 0xf8f6f0,
    scalePadding: 1.1,
    depthOffsetRatio: 0.2,
    minDepthOffset: 2,
  },
};
