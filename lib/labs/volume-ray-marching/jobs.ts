import { presets, validate, type Camera, type Point, type Preset, type Settings } from "./model.ts";
import { allocateVolume, fillSlab, histogram, type Volume } from "./volume.ts";
import { integrate, march, pixel, rawOutput } from "./march.ts";
import { cameraRay } from "./model.ts";

async function withBudget<T>(
  signal: AbortSignal,
  milliseconds: number,
  work: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  signal.throwIfAborted();
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  signal.addEventListener("abort", abort, { once: true });
  const watchdog = setTimeout(
    () => controller.abort(new Error("Job exceeded its 20-second budget")),
    milliseconds,
  );
  try {
    return await work(controller.signal);
  } finally {
    clearTimeout(watchdog);
    signal.removeEventListener("abort", abort);
  }
}
export function yieldJob(signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, 0);
    signal.addEventListener("abort", abort, { once: true });
  });
}
export interface Dataset {
  volume: Volume;
  bins: Uint32Array;
  preset: Preset;
  generationMs: number;
}
export function buildDataset(
  preset: Preset,
  side: number,
  signal: AbortSignal,
  onProgress?: (fraction: number) => void,
) {
  if (!presets.includes(preset)) throw new RangeError("Unknown dataset");
  return withBudget(signal, 20000, async (current) => {
    const volume = allocateVolume(side);
    const started = performance.now();
    let lastProgress = -Infinity;
    let z = 0;
    while (z < side) {
      current.throwIfAborted();
      const batchStarted = performance.now();
      let slabs = 0;
      do {
        current.throwIfAborted();
        fillSlab(volume, preset, z);
        z++;
        slabs++;
      } while (z < side && slabs < 8 && performance.now() - batchStarted < 6);
      if (performance.now() - lastProgress >= 80 || z === side) {
        onProgress?.(z / side);
        lastProgress = performance.now();
      }
      if (z < side) await yieldJob(current);
    }
    current.throwIfAborted();
    const bins = histogram(volume);
    return { volume, bins, preset, generationMs: performance.now() - started };
  });
}
export interface Preview {
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
}
export function renderPreview(
  camera: Camera,
  volume: Volume | null,
  settings: Settings,
  stage: number,
  width: number,
  height: number,
  signal: AbortSignal,
  onProgress?: (fraction: number) => void,
  aspect = width / height,
) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 192 ||
    height > 192 ||
    width * height > 32768
  )
    throw new RangeError("CPU preview budget exceeded");
  validate(settings);
  if (!Number.isFinite(aspect) || aspect <= 0)
    throw new RangeError("Positive preview aspect required");
  return withBudget(signal, 20000, async (current) => {
    const rgba = new Uint8ClampedArray(width * height * 4);
    let address = 0,
      lastProgress = 0;
    while (address < width * height) {
      current.throwIfAborted();
      const started = performance.now();
      let pixels = 0;
      while (address < width * height && pixels < 128 && performance.now() - started < 6) {
        const x = address % width,
          y = Math.floor(address / width);
        const color = pixel(
          camera,
          volume,
          settings,
          (x + 0.5) / width,
          (y + 0.5) / height,
          stage,
          aspect,
        );
        if (!color.every(Number.isFinite)) throw new Error("Nonfinite preview color");
        for (let component = 0; component < 3; component++)
          rgba[address * 4 + component] = Math.round(
            255 * Math.max(0, Math.min(1, color[component])) ** (1 / 2.2),
          );
        rgba[address * 4 + 3] = 255;
        address++;
        pixels++;
      }
      if (performance.now() - lastProgress > 80 || address === width * height) {
        onProgress?.(address / (width * height));
        lastProgress = performance.now();
      }
      if (address < width * height) await yieldJob(current);
    }
    current.throwIfAborted();
    return { rgba, width, height };
  });
}
export interface Measurement {
  step: number;
  error: number;
  medianMs: number;
  lowerMs: number;
  upperMs: number;
  samples: number;
}
export function compareSteps(
  camera: Camera,
  volume: Volume,
  settings: Settings,
  u: number,
  v: number,
  aspect: number,
  signal: AbortSignal,
) {
  validate(settings);
  return withBudget(signal, 20000, async (current) => {
    const ray = cameraRay(camera, u, v, aspect),
      fixed = { ...settings, early: false };
    const reference = rawOutput(integrate(ray, volume, fixed, 0.002, 4096, false), fixed.mode);
    const results: Measurement[] = [];
    for (const step of [0.08, 0.04, 0.02, 0.008]) {
      const test = { ...fixed, stepLength: step };
      march(ray, volume, test);
      const times: number[] = [];
      for (let repetition = 0; repetition < 5; repetition++) {
        current.throwIfAborted();
        const start = performance.now();
        march(ray, volume, test);
        times.push(performance.now() - start);
      }
      const result = march(ray, volume, test),
        actual = rawOutput(result, fixed.mode);
      const error = Math.max(...actual.map((value, i) => Math.abs(value - reference[i])));
      times.sort((a, b) => a - b);
      results.push({
        step,
        error,
        medianMs: times[2],
        lowerMs: times[1],
        upperMs: times[3],
        samples: result.samples,
      });
      await yieldJob(current);
    }
    return results;
  });
}

// Keep a type-level relationship with the C++ three-component convention.
export type LinearColor = Point;
