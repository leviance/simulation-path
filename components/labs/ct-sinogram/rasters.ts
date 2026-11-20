import { averageAt, detectorCount, sliceSide, type Scan } from "@/lib/labs/ct-sinogram";
import { specimenField } from "@/lib/labs/ct-sinogram/specimen";

function surface(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Không tạo được mặt vẽ Canvas 2D");
  return { canvas, ctx, pixels: ctx.createImageData(width, height) };
}
const sino = new WeakMap<
  Scan,
  { target: ReturnType<typeof surface>; rows: number; range: number; invert: boolean }
>();
const specimens = new WeakMap<Scan, HTMLCanvasElement>();
const estimates = new WeakMap<Scan, { target: ReturnType<typeof surface>; rows: number }>();

export function sinogramRaster(scan: Scan, range: number, invert: boolean) {
  let entry = sino.get(scan);
  if (!entry) {
    const target = surface(detectorCount, scan.settings.views);
    target.ctx.fillStyle = "#1c2a41";
    target.ctx.fillRect(0, 0, detectorCount, scan.settings.views);
    entry = { target, rows: 0, range, invert };
    sino.set(scan, entry);
  }
  if (entry.range !== range || entry.invert !== invert) {
    entry.rows = 0; // Recolour only the stored numbers. Never ask for a new projection.
    entry.range = range;
    entry.invert = invert;
  }
  if (entry.rows < scan.acquired) {
    const { target, rows } = entry;
    for (let i = rows * detectorCount; i < scan.acquired * detectorCount; i++) {
      const normalized = Math.min(1, Math.max(0, scan.values[i] / range));
      const shade = Math.round(255 * (invert ? 1 - normalized : normalized));
      target.pixels.data.set([shade, shade, shade, 255], 4 * i);
    }
    target.ctx.putImageData(target.pixels, 0, 0, 0, rows, detectorCount, scan.acquired - rows);
    entry.rows = scan.acquired;
  }
  return entry.target.canvas;
}

export function specimenRaster(scan: Scan) {
  const previous = specimens.get(scan);
  if (previous) return previous;
  const side = 224;
  const target = surface(side, side);
  const field = specimenField(scan.scene, scan.settings.strength, side);
  for (let i = 0; i < field.length; i++) {
    const value = Math.min(1, Math.sqrt(field[i] / 1.65));
    target.pixels.data.set([13 + 233 * value, 25 + 163 * value, 29 + 78 * value, 255], 4 * i);
  }
  target.ctx.putImageData(target.pixels, 0, 0);
  specimens.set(scan, target.canvas);
  return target.canvas;
}

export function estimateRaster(scan: Scan) {
  if (!scan.image) throw new Error("Chưa bật bước trải ngược");
  let entry = estimates.get(scan);
  if (!entry) {
    entry = { target: surface(sliceSide, sliceSide), rows: -1 };
    estimates.set(scan, entry);
  }
  if (entry.rows !== scan.image.rows) {
    const { target } = entry;
    for (let i = 0; i < scan.image.sum.length; i++) {
      const value = Math.min(1, Math.max(0, averageAt(scan.image, i) / 1.4));
      target.pixels.data.set(
        [12 + 230 * value * value, 23 + 200 * value, 34 + 155 * value, 255],
        4 * i,
      );
    }
    target.ctx.putImageData(target.pixels, 0, 0);
    entry.rows = scan.image.rows;
  }
  return entry.target.canvas;
}
