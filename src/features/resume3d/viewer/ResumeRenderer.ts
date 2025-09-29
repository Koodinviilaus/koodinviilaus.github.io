import {
  MathUtils,
  WebGLRenderer,
  Texture,
  PerspectiveCamera,
  Scene,
  Group,
  Vector3,
  Spherical,
  MeshMatcapMaterial,
  Mesh,
  Color,
  AmbientLight,
  DirectionalLight,
  HemisphereLight,
  Box3,
  PlaneGeometry,
  MeshStandardMaterial,
  DoubleSide,
  CanvasTexture,
  SRGBColorSpace,
  type WebGLInfo,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RESUME_VIEWER_CONFIG } from "../config.ts";

type Pointer = { id: number; x: number; y: number };

export type ResumeRendererOptions = {
  canvas: HTMLCanvasElement;
  resumeGLBUrl: string;
  onLoaded?: () => void;
  onError?: (error: unknown) => void;
  onStats?: (stats: WebGLInfo) => void;
  rendererFactory?: (canvas: HTMLCanvasElement) => WebGLRenderer;
  loaderFactory?: () => GLTFLoader;
  matcapFactory?: () => Texture;
};

const {
  renderer: RENDERER_CFG,
  lighting: LIGHTING_CFG,
  controls: CONTROLS_CFG,
  paper: PAPER_CFG,
} = RESUME_VIEWER_CONFIG;

const MIN_RADIUS = CONTROLS_CFG.zoom.minRadius;
const MAX_RADIUS = CONTROLS_CFG.zoom.maxRadius;
const DAMPING = CONTROLS_CFG.orbitDamping;
const POLAR_MIN = 0.3;
const POLAR_MAX = Math.PI - 0.2;

// ResumeRenderer wraps the Three.js scene with unified pointer input and
// matcap-driven shading tailored for the mobile résumé viewer.
export class ResumeRenderer {
  private readonly opts: ResumeRendererOptions;
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: WebGLRenderer;
  private readonly camera: PerspectiveCamera;
  private readonly scene: Scene;
  private readonly root: Group;
  private readonly controlsTarget: Vector3;
  private readonly spherical: Spherical;
  private readonly targetSpherical: Spherical;
  private readonly pointers = new Map<number, Pointer>();
  private readonly matcapTexture: Texture;
  private readonly loader: GLTFLoader;
  private readonly materialByColor = new Map<string, MeshMatcapMaterial>();
  private readonly resizeObserver: ResizeObserver;
  private paper: Mesh | null = null;
  private animationFrame: number | null = null;
  private pinchStartDistance: number | null = null;
  private disposed = false;

  constructor(opts: ResumeRendererOptions) {
    this.opts = opts;
    this.canvas = opts.canvas;
    const rendererFactory =
      opts.rendererFactory ??
      ((canvasEl: HTMLCanvasElement) =>
        new WebGLRenderer({ canvas: canvasEl, antialias: true }));
    this.renderer = rendererFactory(this.canvas);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(RENDERER_CFG.clearColor, 1);

    this.scene = new Scene();
    this.scene.background = new Color(RENDERER_CFG.backgroundColor);
    this.scene.add(new AmbientLight(0xffffff, LIGHTING_CFG.ambientIntensity));

    const keyLight = new DirectionalLight(
      LIGHTING_CFG.directional.color,
      LIGHTING_CFG.directional.intensity
    );
    keyLight.position.set(
      LIGHTING_CFG.directional.position.x,
      LIGHTING_CFG.directional.position.y,
      LIGHTING_CFG.directional.position.z
    );
    this.scene.add(keyLight);
    this.scene.add(
      new HemisphereLight(
        LIGHTING_CFG.hemisphere.skyColor,
        LIGHTING_CFG.hemisphere.groundColor,
        LIGHTING_CFG.hemisphere.intensity
      )
    );

    this.camera = new PerspectiveCamera(45, 1, 0.1, 1000);
    this.controlsTarget = new Vector3();
    this.spherical = new Spherical(140, Math.PI / 3, Math.PI / 4);
    this.targetSpherical = this.spherical.clone();

    this.root = new Group();
    this.scene.add(this.root);

    this.matcapTexture = opts.matcapFactory?.() ?? createDefaultMatcapTexture();
    this.loader = opts.loaderFactory?.() ?? new GLTFLoader();

    this.handleResize();
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.canvas);
    this.bindEvents();
    this.animate();

    this.loadGLB(opts.resumeGLBUrl).catch((error) => {
      console.error(error);
      opts.onError?.(error);
    });
  }

  private bindEvents() {
    const canvas = this.canvas;
    // PointerEvents give us a unified mouse/touch API (wheel used for desktop zoom).
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("resize", this.handleResize);
  }

  private unbindEvents() {
    const canvas = this.canvas;
    canvas.removeEventListener("pointerdown", this.onPointerDown);
    canvas.removeEventListener("pointermove", this.onPointerMove);
    canvas.removeEventListener("pointerup", this.onPointerUp);
    canvas.removeEventListener("pointercancel", this.onPointerUp);
    canvas.removeEventListener("wheel", this.onWheel as EventListener);
    window.removeEventListener("resize", this.handleResize);
  }

  private readonly onPointerDown = (event: PointerEvent) => {
    if (!this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.setPointerCapture(event.pointerId);
    }
    this.pointers.set(event.pointerId, {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    });
    if (this.pointers.size === 2) {
      this.pinchStartDistance = this.currentPointerDistance();
    }
  };

  private readonly onPointerMove = (event: PointerEvent) => {
    const pointer = this.pointers.get(event.pointerId);
    if (!pointer) return;

    const prev = { x: pointer.x, y: pointer.y };
    pointer.x = event.clientX;
    pointer.y = event.clientY;

    if (this.pointers.size === 1) {
      const rawDeltaX =
        (pointer.x - prev.x) * CONTROLS_CFG.rotationSensitivity.x;
      const rawDeltaY =
        (pointer.y - prev.y) * CONTROLS_CFG.rotationSensitivity.y;
      const thetaDelta = CONTROLS_CFG.invertHorizontalDrag
        ? rawDeltaX
        : -rawDeltaX;
      this.targetSpherical.theta += thetaDelta;
      this.targetSpherical.phi = clamp(
        this.targetSpherical.phi + rawDeltaY,
        POLAR_MIN,
        POLAR_MAX
      );
    } else if (this.pointers.size === 2 && this.pinchStartDistance) {
      const distance = this.currentPointerDistance();
      if (distance && distance > 0) {
        const ratio = this.pinchStartDistance / distance;
        this.targetSpherical.radius = clamp(
          this.targetSpherical.radius * ratio,
          MIN_RADIUS,
          MAX_RADIUS
        );
        this.pinchStartDistance = distance;
      }
    }
  };

  private readonly onPointerUp = (event: PointerEvent) => {
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) {
      this.pinchStartDistance = null;
    }
  };

  private readonly onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const delta = event.deltaY * CONTROLS_CFG.zoom.deltaMultiplier;
    this.targetSpherical.radius = clamp(
      this.targetSpherical.radius + delta,
      MIN_RADIUS,
      MAX_RADIUS
    );
  };

  private currentPointerDistance(): number | null {
    if (this.pointers.size !== 2) return null;
    const [a, b] = Array.from(this.pointers.values());
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private handleResize = () => {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  private animate = () => {
    if (this.disposed) return;
    this.animationFrame = requestAnimationFrame(this.animate);

    // Damped transition toward the target spherical values.
    this.spherical.radius = damp(
      this.spherical.radius,
      this.targetSpherical.radius,
      DAMPING
    );
    this.spherical.theta = dampAngle(
      this.spherical.theta,
      this.targetSpherical.theta,
      DAMPING
    );
    this.spherical.phi = damp(
      this.spherical.phi,
      this.targetSpherical.phi,
      DAMPING
    );

    const position = new Vector3()
      .setFromSpherical(this.spherical)
      .add(this.controlsTarget);
    this.camera.position.copy(position);
    this.camera.lookAt(this.controlsTarget);

    this.renderer.render(this.scene, this.camera);
    this.opts.onStats?.(this.renderer.info); // developer hook
  };

  private async loadGLB(url: string) {
    const glTF = await this.loader.loadAsync(url);

    this.root.clear();
    if (this.paper) {
      disposeMesh(this.paper);
      this.paper = null;
    }
    this.materialByColor.clear();

    const meshes: Mesh[] = [];
    glTF.scene.traverse((child) => {
      if (child instanceof Mesh) {
        const mesh = child as Mesh;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        this.applyMaterial(mesh);
        mesh.geometry.computeBoundingSphere();
        meshes.push(mesh);
      }
    });
    const hasEmbeddedPaper = meshes.some(
      (mesh) => mesh.userData?.paperTexture === true,
    );

    const sceneBackground = glTF.scene.userData?.backgroundColor;
    if (typeof sceneBackground === "number") {
      this.renderer.setClearColor(sceneBackground, 1);
      this.scene.background = new Color(sceneBackground);
    } else {
      this.renderer.setClearColor(RENDERER_CFG.clearColor, 1);
      this.scene.background = new Color(RENDERER_CFG.backgroundColor);
    }

    if (meshes.length) {
      const box = new Box3().setFromObject(glTF.scene);
      box.getCenter(this.controlsTarget);
      const dimensions = box.getSize(new Vector3());
      const radius = clamp(dimensions.length() * 0.9, 40, 260);
      this.spherical.radius = radius;
      this.targetSpherical.radius = radius;

      if (!this.paper && !hasEmbeddedPaper) {
        const fallbackPaper = new Mesh(
          new PlaneGeometry(
            dimensions.x * PAPER_CFG.scalePadding,
            dimensions.y * PAPER_CFG.scalePadding
          ),
          new MeshStandardMaterial({
            color: PAPER_CFG.color,
            metalness: 0.05,
            roughness: 0.95,
            side: DoubleSide,
          })
        );
        fallbackPaper.name = "PaperBackdrop";
        fallbackPaper.position.set(
          this.controlsTarget.x,
          this.controlsTarget.y,
          box.min.z -
            Math.max(
              PAPER_CFG.minDepthOffset,
              dimensions.z * PAPER_CFG.depthOffsetRatio
            )
        );
        fallbackPaper.renderOrder = -1;
        this.paper = fallbackPaper;
        this.root.add(fallbackPaper);
      }
    }

    this.root.add(glTF.scene);

    this.opts.onLoaded?.();
  }

  private applyMaterial(mesh: Mesh) {
    if (mesh.userData?.paperTexture) {
      return;
    }
    const colorData = mesh.userData?.lineColor as
      | [number, number, number]
      | undefined;
    if (colorData && Array.isArray(colorData)) {
      const key = colorData.join("-");
      let material = this.materialByColor.get(key);
      if (!material) {
        material = new MeshMatcapMaterial({
          matcap: this.matcapTexture,
          color: new Color(
            colorData[0] / 255,
            colorData[1] / 255,
            colorData[2] / 255
          ),
        });
        material.name = `Matcap_${this.materialByColor.size}`;
        this.materialByColor.set(key, material);
      }
      mesh.material = material;
      return;
    }

    if (!(mesh.material instanceof MeshMatcapMaterial)) {
      mesh.material = new MeshMatcapMaterial({
        matcap: this.matcapTexture,
        color: 0xffffff,
      });
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);
    this.unbindEvents();
    this.renderer.dispose();
    if (this.paper) {
      disposeMesh(this.paper);
      this.paper = null;
    }
    this.materialByColor.forEach((material) => material.dispose());
    this.matcapTexture.dispose();
    this.resizeObserver.disconnect();
  }

  getDebugState() {
    return {
      radius: this.targetSpherical.radius,
      theta: this.targetSpherical.theta,
      phi: this.targetSpherical.phi,
      pointerCount: this.pointers.size,
      drawCalls: this.renderer.info.render.calls,
    };
  }
}

function disposeMesh(mesh: Mesh) {
  mesh.geometry.dispose();
  const mat = mesh.material;
  if (Array.isArray(mat)) {
    mat.forEach((entry) => entry.dispose());
  } else {
    mat.dispose();
  }
}

function createDefaultMatcapTexture(): Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Matcap canvas context unavailable");

  const gradient = ctx.createRadialGradient(
    size * 0.3,
    size * 0.3,
    size * 0.2,
    size * 0.7,
    size * 0.7,
    size * 0.75
  );
  gradient.addColorStop(0, "#f6f6f6");
  gradient.addColorStop(0.5, "#b5bcc6");
  gradient.addColorStop(1, "#3a3f49");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function damp(current: number, target: number, lambda: number) {
  return MathUtils.damp(current, target, lambda, 1 / 60);
}

function dampAngle(current: number, target: number, lambda: number) {
  return (
    current +
    MathUtils.damp(0, normalizeAngle(target - current), lambda, 1 / 60)
  );
}

function normalizeAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
