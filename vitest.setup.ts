import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from "node:util";
import { expect } from "vitest";

const globalObject = globalThis as typeof globalThis & Record<string, unknown>;

// Basic ResizeObserver stub for jsdom.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalObject.ResizeObserver === "undefined") {
  globalObject.ResizeObserver = ResizeObserverStub;
}

// Ensure TextEncoder/TextDecoder exist in Node <19.
if (!globalObject.TextEncoder) {
  globalObject.TextEncoder = NodeTextEncoder as unknown as typeof globalThis.TextEncoder;
}

if (!globalObject.TextDecoder) {
  globalObject.TextDecoder = NodeTextDecoder as unknown as typeof globalThis.TextDecoder;
}

const canvasCtor = globalObject.HTMLCanvasElement as typeof HTMLCanvasElement | undefined;
if (canvasCtor) {
  const canvasProto = canvasCtor.prototype as {
    setPointerCapture?: (pointerId: number) => void;
    releasePointerCapture?: (pointerId: number) => void;
    hasPointerCapture?: (pointerId: number) => boolean;
  };

  if (!canvasProto.setPointerCapture) {
    canvasProto.setPointerCapture = () => {};
  }
  if (!canvasProto.releasePointerCapture) {
    canvasProto.releasePointerCapture = () => {};
  }
  if (!canvasProto.hasPointerCapture) {
    canvasProto.hasPointerCapture = () => false;
  }
}

if (typeof globalObject.PointerEvent === "undefined") {
  const MouseEventCtor = globalObject.MouseEvent as typeof MouseEvent | undefined;
  class PointerEventShim extends (MouseEventCtor ?? Event) {
    pointerId: number;
    pointerType: string;

    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? "mouse";
    }
  }

  globalObject.PointerEvent = PointerEventShim as unknown as typeof PointerEvent;
}

if (!globalObject.requestAnimationFrame) {
  globalObject.requestAnimationFrame = ((callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now()), 16) as unknown as number) as typeof requestAnimationFrame;
}

if (!globalObject.cancelAnimationFrame) {
  globalObject.cancelAnimationFrame = ((handle: number) => {
    clearTimeout(handle);
  }) as typeof cancelAnimationFrame;
}

expect.extend({});
