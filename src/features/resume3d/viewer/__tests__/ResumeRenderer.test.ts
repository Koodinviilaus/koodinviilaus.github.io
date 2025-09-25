import * as THREE from "three";
import type { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResumeRenderer } from "../ResumeRenderer.ts";

class WebGLRendererStub {
  readonly info: THREE.WebGLInfo;
  private readonly infoData = { render: { calls: 0 } };

  constructor() {
    this.info = this.infoData as unknown as THREE.WebGLInfo;
  }

  setPixelRatio() {}
  setClearColor() {}
  setSize() {}
  render() {
    this.infoData.render.calls += 1;
  }
  dispose() {}
}

describe("ResumeRenderer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("responds to pointer interactions and keeps draw calls bounded", async () => {
    const canvas = document.createElement("canvas");
    Object.assign(canvas, {
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
      hasPointerCapture: vi.fn().mockReturnValue(false),
    });

    canvas.getBoundingClientRect = () =>
      ({
        width: 320,
        height: 480,
        top: 0,
        left: 0,
        right: 320,
        bottom: 480,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect);

    const originalRaf = globalThis.requestAnimationFrame ?? ((): typeof requestAnimationFrame => {
      return ((callback: FrameRequestCallback) => setTimeout(() => callback(performance.now()), 16) as unknown as number);
    })();
    const originalCaf = globalThis.cancelAnimationFrame ?? ((): typeof cancelAnimationFrame => {
      return ((handle: number) => clearTimeout(handle)) as typeof cancelAnimationFrame;
    })();
    globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) =>
      setTimeout(() => callback(performance.now()), 16) as unknown as number) as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = ((handle: number) => clearTimeout(handle)) as typeof cancelAnimationFrame;

    const rendererStub = new WebGLRendererStub();
    const loaderStub: Pick<GLTFLoader, "loadAsync"> = {
      loadAsync: vi.fn(async (): Promise<GLTF> => {
        const group = new THREE.Group();
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(10, 2, 0.6),
          new THREE.MeshBasicMaterial(),
        );
        mesh.userData.lineColor = [64, 96, 160];
        group.add(mesh);
        return { scene: group } as GLTF;
      }),
    };

    let lastDrawCalls = 0;
    const renderer = new ResumeRenderer({
      canvas,
      glbUrl: "stub.glb",
      rendererFactory: () => rendererStub as unknown as THREE.WebGLRenderer,
      loaderFactory: () => loaderStub as GLTFLoader,
      matcapFactory: () => new THREE.Texture(),
      onStats: (info) => {
        lastDrawCalls = info.render.calls;
      },
    });

    await vi.advanceTimersByTimeAsync(32);

    const initial = renderer.getDebugState();

    canvas.dispatchEvent(
      new PointerEvent("pointerdown", { pointerId: 1, clientX: 160, clientY: 160, bubbles: true }),
    );
    canvas.dispatchEvent(
      new PointerEvent("pointermove", { pointerId: 1, clientX: 200, clientY: 200, bubbles: true }),
    );
    canvas.dispatchEvent(
      new PointerEvent("pointerup", { pointerId: 1, clientX: 200, clientY: 200, bubbles: true }),
    );

    await vi.advanceTimersByTimeAsync(32);
    const rotated = renderer.getDebugState();
    expect(rotated.theta).not.toBe(initial.theta);

    canvas.dispatchEvent(
      new PointerEvent("pointerdown", { pointerId: 1, clientX: 150, clientY: 150, bubbles: true }),
    );
    canvas.dispatchEvent(
      new PointerEvent("pointerdown", { pointerId: 2, clientX: 210, clientY: 150, bubbles: true }),
    );
    canvas.dispatchEvent(
      new PointerEvent("pointermove", { pointerId: 1, clientX: 140, clientY: 150, bubbles: true }),
    );
    canvas.dispatchEvent(
      new PointerEvent("pointermove", { pointerId: 2, clientX: 240, clientY: 150, bubbles: true }),
    );
    canvas.dispatchEvent(
      new PointerEvent("pointerup", { pointerId: 2, clientX: 240, clientY: 150, bubbles: true }),
    );
    canvas.dispatchEvent(
      new PointerEvent("pointerup", { pointerId: 1, clientX: 140, clientY: 150, bubbles: true }),
    );

    await vi.advanceTimersByTimeAsync(48);
    const zoomed = renderer.getDebugState();
    expect(zoomed.radius).toBeGreaterThan(20);
    expect(zoomed.radius).toBeLessThanOrEqual(400);

    expect(lastDrawCalls).toBeLessThan(20);

    renderer.dispose();
    globalThis.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = originalCaf;
    vi.useRealTimers();
  });
});
