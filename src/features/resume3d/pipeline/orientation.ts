import { orientation, parse } from "exifr";

export type Orientation = number | undefined;

export async function readOrientation(file: File): Promise<Orientation> {
  try {
    if (orientation) {
      return await orientation(file);
    }
    if (parse) {
      const data = await parse(file, ["Orientation"]);
      const value = data?.Orientation;
      if (typeof value === "number") return value;
    }
    return undefined;
  } catch (error) {
    console.warn("Failed to read orientation", error);
    return undefined;
  }
}

export async function createOrientedBitmap(
  source: Blob,
  orientation: Orientation
): Promise<{
  bitmap: ImageBitmap;
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
}> {
  const bitmap = await createImageBitmap(source);
  if (!orientation || orientation === 1) {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable");
    ctx.drawImage(bitmap, 0, 0);
    return { bitmap, width: canvas.width, height: canvas.height, canvas };
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  const swap = orientation >= 5 && orientation <= 8;
  canvas.width = swap ? bitmap.height : bitmap.width;
  canvas.height = swap ? bitmap.width : bitmap.height;

  ctx.save();
  applyOrientationTransform(ctx, orientation, bitmap.width, bitmap.height);
  ctx.drawImage(bitmap, 0, 0);
  ctx.restore();

  const fixedBitmap = await createImageBitmap(canvas);
  return {
    bitmap: fixedBitmap,
    width: canvas.width,
    height: canvas.height,
    canvas,
  };
}

function applyOrientationTransform(
  ctx: CanvasRenderingContext2D,
  orientation: number,
  width: number,
  height: number
) {
  switch (orientation) {
    case 2:
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      break;
    case 3:
      ctx.translate(width, height);
      ctx.rotate(Math.PI);
      break;
    case 4:
      ctx.translate(0, height);
      ctx.scale(1, -1);
      break;
    case 5:
      ctx.rotate(0.5 * Math.PI);
      ctx.scale(1, -1);
      break;
    case 6:
      ctx.rotate(0.5 * Math.PI);
      ctx.translate(0, -height);
      break;
    case 7:
      ctx.rotate(0.5 * Math.PI);
      ctx.translate(width, -height);
      ctx.scale(-1, 1);
      break;
    case 8:
      ctx.rotate(-0.5 * Math.PI);
      ctx.translate(-width, 0);
      break;
    default:
      break;
  }
}
