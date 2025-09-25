import { expect } from "vitest";

// Basic ResizeObserver stub for jsdom.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === "undefined") {
  // @ts-expect-error global assignment
  globalThis.ResizeObserver = ResizeObserverStub;
}

// Ensure TextEncoder/TextDecoder exist in Node <19.
if (!globalThis.TextEncoder) {
  // @ts-expect-error
  globalThis.TextEncoder = class TextEncoder {
    encode(str: string) {
      return new Uint8Array(Buffer.from(str, "utf-8"));
    }
  };
}

if (!globalThis.TextDecoder) {
  // @ts-expect-error
  globalThis.TextDecoder = class TextDecoder {
    decode(buffer?: BufferSource) {
      if (!buffer) return "";
      return Buffer.from(buffer as ArrayBufferLike).toString("utf-8");
    }
  };
}

expect.extend({});
