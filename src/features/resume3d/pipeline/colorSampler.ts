export type SamplerRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type RGB = [number, number, number];

export function averageColor(
  ctx: CanvasRenderingContext2D,
  rect: SamplerRect,
): RGB {
  const { x, y, width, height } = rect;
  const clampedWidth = Math.max(1, Math.floor(width));
  const clampedHeight = Math.max(1, Math.floor(height));
  const data = ctx.getImageData(Math.floor(x), Math.floor(y), clampedWidth, clampedHeight).data;

  if (data.length === 0) return [0, 0, 0];

  let r = 0;
  let g = 0;
  let b = 0;
  const pixels = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }

  return [Math.round(r / pixels), Math.round(g / pixels), Math.round(b / pixels)];
}

export function rgbToHex([r, g, b]: RGB): number {
  return (r << 16) | (g << 8) | b;
}

export function hexToRgb(hex: number): RGB {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  return [r, g, b];
}

export function mixRgb(base: RGB, target: RGB, blend: number): RGB {
  const clamped = Math.min(1, Math.max(0, blend));
  return [0, 1, 2].map((index) => {
    const value = base[index] * (1 - clamped) + target[index] * clamped;
    return Math.round(value);
  }) as RGB;
}
