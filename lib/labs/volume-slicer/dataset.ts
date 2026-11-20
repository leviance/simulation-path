import { makeGrid, Volume } from "./model.ts";
import { fillSlab, presets, type Preset } from "./field.ts";
import { measure } from "./analysis.ts";
import type { Mesh } from "./context-mesh.ts";
export interface Dataset {
  volume: Volume;
  preset: Preset;
  side: number;
  statistics: ReturnType<typeof measure>;
  mesh?: Mesh;
}
function yieldTask(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      reject(new DOMException("Dataset cancelled", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, 0);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
}
export async function createDataset(
  preset: Preset,
  side: number,
  context: boolean,
  signal: AbortSignal,
  progress: (text: string) => void,
): Promise<Dataset> {
  if (!presets.includes(preset)) throw new RangeError("Unknown preset");
  const deadline = performance.now() + 20000;
  const guard = () => {
    signal.throwIfAborted();
    if (performance.now() > deadline)
      throw new Error("Canvas CPU vượt ngân sách tạo dữ liệu 20 giây; bản cũ được giữ nguyên.");
  };
  guard();
  const volume = new Volume(makeGrid(side));
  for (let z = 0; z < side; z += 4) {
    guard();
    fillSlab(volume, preset, z, Math.min(side, z + 4));
    progress("Đang tạo volume: " + Math.round((100 * Math.min(side, z + 4)) / side) + "%");
    await yieldTask(signal);
  }
  const statistics = measure(volume);
  let mesh: Mesh | undefined;
  if (context) {
    const { meshSlabs } = await import("./context-mesh.ts");
    guard();
    const job = meshSlabs(volume, preset === "specimen");
    try {
      let step = job.next();
      while (!step.done) {
        guard();
        progress("Đang dựng vỏ định hướng: " + Math.round(step.value.progress * 100) + "%");
        await yieldTask(signal);
        guard();
        step = job.next();
      }
      mesh = step.value;
    } finally {
      job.return({ vertices: new Float32Array(), triangles: 0 });
    }
  }
  guard();
  return { volume, statistics, preset, side, mesh };
}
