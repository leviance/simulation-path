import { detectorCount, detectorRadius, detectorWidth, sourceRadius, type Point } from "./model.ts";

export const sliceSide = 112;
export const sliceRadius = 1.55;
const pitch = (2 * sliceRadius) / sliceSide;
const centres = Float64Array.from(
  { length: sliceSide },
  (_, x) => -sliceRadius + (x + 0.5) * pitch,
);

export function slicePoint(x: number, y: number): Point {
  return [centres[x], -centres[y]];
}
export interface Reconstruction {
  sum: Float64Array;
  rows: number;
}
export function makeReconstruction(): Reconstruction {
  return { sum: new Float64Array(sliceSide * sliceSide), rows: 0 };
}

// Flat detector coordinates refer to column centres, not pixel edges.
export function readDetector(detector: Float64Array, offset: number) {
  const column = (offset / detectorWidth + 0.5) * detectorCount - 0.5;
  if (column < 0 || column > detectorCount - 1) return 0;
  const left = Math.floor(column);
  const right = Math.min(left + 1, detectorCount - 1);
  return detector[left] + (detector[right] - detector[left]) * (column - left);
}

// Only an acquired detector row and its angle enter here. No specimen or target image is passed in.
export function backproject(image: Reconstruction, angle: number, detector: Float64Array) {
  if (
    !Number.isFinite(angle) ||
    detector.length !== detectorCount ||
    image.sum.length !== sliceSide ** 2 ||
    !Number.isInteger(image.rows) ||
    image.rows < 0 ||
    image.rows >= 180 ||
    !detector.every((p) => Number.isFinite(p) && p >= 0)
  )
    throw new RangeError(
      "A complete, finite projection and room for another measured row are required",
    );
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  let index = 0;
  for (let y = 0; y < sliceSide; y++) {
    const py = -centres[y];
    for (let x = 0; x < sliceSide; x++) {
      const px = centres[x];
      const depth = sourceRadius - (px * cosine + py * sine);
      const offset = ((sourceRadius + detectorRadius) * (-px * sine + py * cosine)) / depth;
      image.sum[index++] += readDetector(detector, offset);
    }
  }
  image.rows++;
}

export function averageAt(image: Reconstruction, index: number) {
  return image.rows === 0 ? 0 : image.sum[index] / image.rows;
}

// Assessment is separate: compare two images after scaling each by its own peak, not by a UI palette.
export function shapeError(image: Reconstruction, reference: Float64Array) {
  if (!image.rows || reference.length !== image.sum.length)
    throw new RangeError("Two matching images and at least one measurement required");
  let peakReference = 0,
    peakSum = 0;
  for (let i = 0; i < reference.length; i++) {
    peakReference = Math.max(peakReference, reference[i]);
    peakSum = Math.max(peakSum, image.sum[i]);
  }
  let squared = 0;
  for (let i = 0; i < reference.length; i++) {
    const truth = peakReference > 0 ? reference[i] / peakReference : 0;
    const estimate = peakSum > 0 ? image.sum[i] / peakSum : 0;
    squared += (truth - estimate) ** 2;
  }
  return Math.sqrt(squared / reference.length);
}
