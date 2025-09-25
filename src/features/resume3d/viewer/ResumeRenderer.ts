import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type Pointer = { id: number; x: number; y: number };

export type ResumeRendererOptions = {
  canvas: HTMLCanvasElement;
  glbUrl: string;
  onLoaded?: () => void;
  onError?: (error: unknown) => void;
  onStats?: (stats: THREE.WebGLInfo) => void;
};

const MIN_RADIUS = 20;
const MAX_RADIUS = 400;
const DAMPING = 0.08;

export class ResumeRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly scene: THREE.Scene;
  private readonly root: THREE.Group;
  private readonly controlsTarget: THREE.Vector3;
  private readonly spherical: THREE.Spherical;
  private readonly targetSpherical: THREE.Spherical;
  private readonly pointers = new Map<number, Pointer>();
  private readonly matcapTexture: THREE.Texture;
  private readonly materialByColor = new Map<string, THREE.MeshMatcapMaterial>();
  private readonly resizeObserver: ResizeObserver;
  private animationFrame: number | null = null;
  private pinchStartDistance: number | null = null;
  private disposed = false;

  constructor(private readonly opts: ResumeRendererOptions) {
    this.canvas = opts.canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x101114, 1);

    this.scene = new THREE.Scene();
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.9));

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.6);
    keyLight.position.set(200, 260, 200);
    this.scene.add(keyLight);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this.controlsTarget = new THREE.Vector3();
    this.spherical = new THREE.Spherical(140, Math.PI / 3, Math.PI / 4);
    this.targetSpherical = this.spherical.clone();

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.matcapTexture = createDefaultMatcapTexture();

    this.handleResize();
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.canvas);
    this.bindEvents();
    this.animate();

    this.loadGlb(opts.glbUrl).catch((error) => {
      console.error(error);
      opts.onError?.(error);
    });
  }

  private bindEvents() {
    const canvas = this.canvas;
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
    this.pointers.set(event.pointerId, { id: event.pointerId, x: event.clientX, y: event.clientY });
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
      const deltaX = (pointer.x - prev.x) * 0.005;
      const deltaY = (pointer.y - prev.y) * 0.005;
      this.targetSpherical.theta -= deltaX;
      this.targetSpherical.phi = clamp(
        this.targetSpherical.phi + deltaY,
        0.3,
        Math.PI - 0.2,
      );
    } else if (this.pointers.size === 2 && this.pinchStartDistance) {
      const distance = this.currentPointerDistance();
      if (distance && distance > 0) {
        const ratio = this.pinchStartDistance / distance;
        this.targetSpherical.radius = clamp(
          this.targetSpherical.radius * ratio,
          MIN_RADIUS,
          MAX_RADIUS,
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
    const delta = event.deltaY * 0.01;
    this.targetSpherical.radius = clamp(
      this.targetSpherical.radius + delta,
      MIN_RADIUS,
      MAX_RADIUS,
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
    this.spherical.radius = damp(this.spherical.radius, this.targetSpherical.radius, DAMPING);
    this.spherical.theta = dampAngle(this.spherical.theta, this.targetSpherical.theta, DAMPING);
    this.spherical.phi = damp(this.spherical.phi, this.targetSpherical.phi, DAMPING);

    const position = new THREE.Vector3().setFromSpherical(this.spherical).add(this.controlsTarget);
    this.camera.position.copy(position);
    this.camera.lookAt(this.controlsTarget);

    this.renderer.render(this.scene, this.camera);
    this.opts.onStats?.(this.renderer.info); // developer hook
  };

  private async loadGlb(url: string) {
    const loader = new GLTFLoader();
    const glb = await loader.loadAsync(url);

    this.root.clear();
    this.materialByColor.clear();

    const meshes: THREE.Mesh[] = [];
    glb.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        this.applyMaterial(mesh);
        mesh.geometry.computeBoundingSphere();
        meshes.push(mesh);
      }
    });

    this.root.add(glb.scene);

    if (meshes.length) {
      const box = new THREE.Box3().setFromObject(glb.scene);
      box.getCenter(this.controlsTarget);
      const size = box.getSize(new THREE.Vector3()).length();
      const radius = clamp(size * 0.9, 40, 260);
      this.spherical.radius = radius;
      this.targetSpherical.radius = radius;
    }

    this.opts.onLoaded?.();
  }

  private applyMaterial(mesh: THREE.Mesh) {
    const colorData = mesh.userData?.resumeColor as [number, number, number] | undefined;
    if (colorData && Array.isArray(colorData)) {
      const key = colorData.join("-");
      let material = this.materialByColor.get(key);
      if (!material) {
        material = new THREE.MeshMatcapMaterial({
          matcap: this.matcapTexture,
          color: new THREE.Color(colorData[0] / 255, colorData[1] / 255, colorData[2] / 255),
        });
        material.name = `Matcap_${this.materialByColor.size}`;
        this.materialByColor.set(key, material);
      }
      mesh.material = material;
      return;
    }

    if (!(mesh.material instanceof THREE.MeshMatcapMaterial)) {
      mesh.material = new THREE.MeshMatcapMaterial({
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
    this.materialByColor.forEach((material) => material.dispose());
    this.matcapTexture.dispose();
    this.resizeObserver.disconnect();
  }
}

function createDefaultMatcapTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Matcap canvas context unavailable");

  const gradient = ctx.createRadialGradient(size * 0.3, size * 0.3, size * 0.2, size * 0.7, size * 0.7, size * 0.75);
  gradient.addColorStop(0, "#f6f6f6");
  gradient.addColorStop(0.5, "#b5bcc6");
  gradient.addColorStop(1, "#3a3f49");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function damp(current: number, target: number, lambda: number) {
  return THREE.MathUtils.damp(current, target, lambda, 1 / 60);
}

function dampAngle(current: number, target: number, lambda: number) {
  return current + THREE.MathUtils.damp(0, normalizeAngle(target - current), lambda, 1 / 60);
}

function normalizeAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
