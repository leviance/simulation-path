import { cameraRay, defaultCamera, validateCamera, type Camera } from "./camera.ts";
import { evaluate } from "./field.ts";
import {
  add,
  batchBound,
  imageHeight,
  imageWidth,
  previewHeight,
  previewSettings,
  previewWidth,
  scale,
  validate,
  type Settings,
  type Vec3,
} from "./math.ts";
import { budgetFlag, hitFlag, insideFlag, invalidFlag, march, missFlag, shade } from "./trace.ts";
export interface Pixel {
  color: Vec3;
  normal: Vec3;
  state: number;
  steps: number;
  iterations: number;
  samples: number;
  t: number;
  generation: number;
}
export interface Frame {
  width: number;
  height: number;
  pixels: (Pixel | null)[];
  completedSamples: number;
}
export interface Snapshot {
  generation: number;
  settings: Settings;
  camera: Camera;
}
export interface Active extends Snapshot {
  preview: Frame;
  final: Frame;
}
interface Candidate extends Snapshot {
  frame: Frame;
  cursor: number;
}
export interface Counters {
  samples: number;
  hits: number;
  misses: number;
  budget: number;
  inside: number;
  invalid: number;
  steps: number;
  iterations: number;
}
const blankCounters = (): Counters => ({
  samples: 0,
  hits: 0,
  misses: 0,
  budget: 0,
  inside: 0,
  invalid: 0,
  steps: 0,
  iterations: 0,
});
const frame = (width: number, height: number): Frame => ({
  width,
  height,
  pixels: Array<Pixel | null>(width * height).fill(null),
  completedSamples: 0,
});
export function tileOrder(width: number, height: number, tileWidth = 12, tileHeight = 6): number[] {
  if (
    ![width, height, tileWidth, tileHeight].every(Number.isInteger) ||
    width < 1 ||
    height < 1 ||
    width > 96 ||
    height > 54 ||
    tileWidth < 1 ||
    tileHeight < 1
  )
    throw new Error("Kích thước tile Canvas không hợp lệ.");
  const ids: number[] = [];
  for (let top = 0; top < height; top += tileHeight)
    for (let left = 0; left < width; left += tileWidth)
      for (let y = top; y < Math.min(top + tileHeight, height); y++)
        for (let x = left; x < Math.min(left + tileWidth, width); x++) ids.push(y * width + x);
  return ids;
}
function renderPixel(
  snapshot: Snapshot,
  x: number,
  y: number,
  width: number,
  height: number,
  sample: number,
): Pixel {
  const s = snapshot.settings;
  let jitterX = 0.5,
    jitterY = 0.5;
  if (s.samples === 4) {
    jitterX = 0.25 + 0.5 * (sample & 1);
    jitterY = 0.25 + 0.5 * ((sample >> 1) & 1);
  }
  if (s.slice) {
    const field = evaluate(
      { x: ((x + jitterX) / width - 0.5) * 4, y: s.sliceY, z: (0.5 - (y + jitterY) / height) * 3 },
      s,
    );
    let color = { x: 0.015, y: 0.025, z: 0.04 },
      state = hitFlag;
    if (field.state === "escaped") {
      const value = field.iterations / s.iterations;
      color = { x: 0.03 + 0.09 * value, y: 0.05 + 0.75 * value, z: 0.09 + 0.81 * value };
    }
    if (field.state === "invalid") {
      color = { x: 0.8, y: 0.04, z: 0.35 };
      state = invalidFlag;
    }
    return {
      color,
      normal: { x: 0, y: 0, z: 0 },
      state,
      steps: 0,
      iterations: field.iterations,
      samples: 1,
      t: 0,
      generation: snapshot.generation,
    };
  }
  const ray = cameraRay(snapshot.camera, x + jitterX, y + jitterY, width, height);
  const hit = march(ray.origin, ray.direction, s);
  const shaded = shade(ray.origin, ray.direction, hit, s);
  return {
    color: shaded.color,
    normal: shaded.normal,
    state: shaded.state,
    steps: hit.raySteps,
    iterations: hit.orbitIterations + shaded.iterations,
    samples: 1,
    t: hit.t,
    generation: snapshot.generation,
  };
}
export class BulbSession {
  active: Active | null = null;
  requested: Snapshot | null = null;
  paused = false;
  cancelled = false;
  counters = blankCounters();
  lastBatchPixels = 0;
  lastBatchWork = 0;
  private candidate: Candidate | null = null;
  private generation = 0;
  private cursor = 0;
  private readonly order = tileOrder(imageWidth, imageHeight);
  get pendingPreview() {
    return this.candidate !== null;
  }
  get complete() {
    return this.active !== null && this.cursor === this.order.length * this.active.settings.samples;
  }
  get busy() {
    return (
      this.pendingPreview ||
      (!this.cancelled && !this.paused && this.active !== null && !this.complete)
    );
  }
  get progress() {
    if (!this.active) return 0;
    return this.cursor / (this.order.length * this.active.settings.samples);
  }
  get previewProgress() {
    if (!this.candidate) return 1;
    return this.candidate.cursor / this.candidate.frame.pixels.length;
  }
  request(settings: Settings, camera: Camera = defaultCamera()) {
    validate(settings);
    validateCamera(camera);
    batchBound(settings);
    if (this.generation >= 0xffffffff) throw new Error("Hết generation ID; hãy reset trang.");
    // Freeze nested settings/camera values by COPYING, not by retaining a mutable control object.
    this.requested = {
      settings: { ...settings },
      camera: { ...camera, target: { ...camera.target } },
      generation: ++this.generation,
    };
    this.candidate = { ...this.requested, frame: frame(previewWidth, previewHeight), cursor: 0 };
    this.cancelled = false;
  }
  cancel() {
    this.candidate = null;
    this.cancelled = true;
  }
  pause(value: boolean) {
    this.paused = value;
  }
  advance(limit = 48, clock: () => number = () => performance.now()) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 48)
      throw new Error("Chỉ chạy 1–48 pixel trong một batch.");
    const deadline = clock() + 5;
    this.lastBatchPixels = 0;
    this.lastBatchWork = 0;
    while (this.lastBatchPixels < limit && this.busy) {
      const pending = this.candidate;
      if (pending) {
        const settings = previewSettings(pending.settings);
        const index = pending.cursor;
        const pixel = renderPixel(
          { ...pending, settings },
          index % previewWidth,
          Math.floor(index / previewWidth),
          previewWidth,
          previewHeight,
          0,
        );
        pending.frame.pixels[index] = pixel;
        pending.frame.completedSamples++;
        pending.cursor++;
        this.lastBatchPixels++;
        this.lastBatchWork += pixel.iterations;
        if (
          pending.cursor === pending.frame.pixels.length &&
          pending.generation === this.requested?.generation
        ) {
          this.active = {
            generation: pending.generation,
            settings: pending.settings,
            camera: pending.camera,
            preview: pending.frame,
            final: frame(imageWidth, imageHeight),
          };
          this.candidate = null;
          this.cursor = 0;
          this.counters = blankCounters();
          break;
        }
      } else if (this.active) {
        const active = this.active;
        const index = this.order[this.cursor % this.order.length];
        const sample = Math.floor(this.cursor / this.order.length);
        const pixel = renderPixel(
          active,
          index % imageWidth,
          Math.floor(index / imageWidth),
          imageWidth,
          imageHeight,
          sample,
        );
        const work = { steps: pixel.steps, iterations: pixel.iterations, state: pixel.state };
        const previous = active.final.pixels[index];
        if (previous) {
          pixel.color = add(previous.color, pixel.color);
          pixel.steps += previous.steps;
          pixel.iterations += previous.iterations;
          pixel.state |= previous.state;
          pixel.samples += previous.samples;
        }
        active.final.pixels[index] = pixel;
        active.final.completedSamples++;
        this.cursor++;
        this.lastBatchPixels++;
        this.lastBatchWork += work.iterations;
        this.counters.samples++;
        this.counters.steps += work.steps;
        this.counters.iterations += work.iterations;
        if (work.state === hitFlag) this.counters.hits++;
        if (work.state === missFlag) this.counters.misses++;
        if (work.state === budgetFlag) this.counters.budget++;
        if (work.state === insideFlag) this.counters.inside++;
        if (work.state === invalidFlag) this.counters.invalid++;
      }
      // This check is between bounded pixels; a single ray also has a strict finite cap.
      if (clock() >= deadline) break;
    }
    return this.lastBatchPixels;
  }
  pixelAt(x: number, y: number): Pixel | null {
    const active = this.active;
    if (!active) return null;
    const ix = Math.max(0, Math.min(imageWidth - 1, Math.floor(x * imageWidth))),
      iy = Math.max(0, Math.min(imageHeight - 1, Math.floor(y * imageHeight)));
    const pixel = active.final.pixels[iy * imageWidth + ix];
    if (pixel && pixel.generation === active.generation) return pixel;
    const px = Math.floor((ix * previewWidth) / imageWidth),
      py = Math.floor((iy * previewHeight) / imageHeight);
    return active.preview.pixels[py * previewWidth + px];
  }
  colorAt(x: number, y: number): Vec3 {
    const pixel = this.pixelAt(x, y);
    if (!pixel) return { x: 0.012, y: 0.022, z: 0.041 };
    return scale(pixel.color, 1 / pixel.samples);
  }
}
