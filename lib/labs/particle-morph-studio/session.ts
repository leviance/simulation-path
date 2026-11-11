import {
  Random,
  curveOffset,
  morphPosition,
  nativeMemory,
  type Vec3,
  type Shape,
  type Sampling,
  type Matching,
  type Easing,
  type Path,
} from "./math.ts";
import { makeMesh } from "./mesh.ts";
import { AreaDistribution, histogramBins } from "./sampler.ts";
import { SpatialOrder } from "./ordering.ts";

export interface Settings {
  source: Shape;
  target: Shape;
  count: number;
  seed: number;
  sampling: Sampling;
}
export const defaultSettings: Settings = {
  source: "sphere",
  target: "knot",
  count: 2048,
  seed: 42,
  sampling: "area",
};
export const maxCanvasCount = 4096;
export function validateSettings(settings: Settings) {
  if (
    !["sphere", "torus", "knot"].includes(settings.source) ||
    !["sphere", "torus", "knot"].includes(settings.target)
  )
    throw new Error("Hình nguồn/đích không hợp lệ.");
  if (!Number.isInteger(settings.count) || settings.count < 1 || settings.count > maxCanvasCount)
    throw new Error("Canvas chỉ nhận N từ 1 tới 4.096; mốc một triệu thuộc ứng dụng C++.");
  if (!Number.isInteger(settings.seed) || settings.seed < 0 || settings.seed > 0xffffffff)
    throw new Error("Seed phải là uint32.");
  if (!["area", "triangle"].includes(settings.sampling))
    throw new Error("Chế độ lấy mẫu không hợp lệ.");
}
export interface Prepared {
  settings: Readonly<Settings>;
  generation: number;
  source: Vec3[];
  target: Vec3[];
  path: Vec3[];
  bins: number[];
  random: Uint32Array;
  spatial: Uint32Array;
  observed: Uint32Array;
  expected: Float64Array;
  density: Float64Array;
}
class Preparation {
  readonly data: Prepared;
  private sourceArea: AreaDistribution;
  private targetArea: AreaDistribution;
  private sourceRandom: Random;
  private targetRandom: Random;
  private shuffleRandom: Random;
  private sourceOrder: SpatialOrder;
  private targetOrder: SpatialOrder;
  phase = 0;
  private cursor = 0;
  private steps = 0;
  constructor(settings: Settings, generation: number) {
    validateSettings(settings);
    this.sourceArea = new AreaDistribution(makeMesh(settings.source));
    this.targetArea = new AreaDistribution(makeMesh(settings.target));
    this.sourceRandom = new Random(settings.seed ^ 0x13579bdf);
    this.targetRandom = new Random(settings.seed ^ 0x2468ace0);
    this.shuffleRandom = new Random(settings.seed ^ 0x51f15e5d);
    this.sourceOrder = new SpatialOrder(settings.count);
    this.targetOrder = new SpatialOrder(settings.count);
    this.data = {
      settings: Object.freeze({ ...settings }),
      generation,
      source: [],
      target: [],
      path: [],
      bins: [],
      random: new Uint32Array(settings.count),
      spatial: new Uint32Array(settings.count),
      observed: new Uint32Array(histogramBins),
      expected: this.sourceArea.expected.slice(),
      density: new Float64Array(settings.count),
    };
  }
  advance(batch = 512) {
    if (++this.steps > 20000) throw new Error("Đã vượt giới hạn số batch, giữ bản đang có.");
    batch = Math.max(1, Math.min(4096, Math.floor(batch)));
    const data = this.data;
    const count = data.settings.count;
    if (this.phase === 0) {
      const end = Math.min(count, this.cursor + batch);
      while (this.cursor < end) {
        const id = this.cursor++;
        const a = this.sourceArea.sample(this.sourceRandom, data.settings.sampling);
        const b = this.targetArea.sample(this.targetRandom, data.settings.sampling);
        data.source.push(a.position);
        data.target.push(b.position);
        data.path.push(curveOffset(a.position));
        data.bins.push(a.bin);
        data.observed[a.bin]++;
        data.random[id] = id;
      }
      if (this.cursor === count) {
        this.phase = 1;
        this.cursor = 0;
      }
    } else if (this.phase === 1) {
      const end = Math.min(count, this.cursor + batch);
      while (this.cursor < end) {
        const id = this.cursor++;
        const bin = data.bins[id];
        const expected = data.expected[bin] * count;
        data.density[id] = expected > 0 ? data.observed[bin] / expected : 0;
      }
      if (this.cursor === count) {
        this.phase = 2;
        this.cursor = count - 1;
      }
    } else if (this.phase === 2) {
      let steps = 0;
      while (this.cursor > 0 && steps++ < batch) {
        const other = this.shuffleRandom.index(this.cursor + 1);
        const retained = data.random[this.cursor];
        data.random[this.cursor] = data.random[other];
        data.random[other] = retained;
        this.cursor--;
      }
      if (this.cursor === 0) this.phase = 3;
    } else if (this.phase === 3) {
      if (this.sourceOrder.advance(data.source, batch)) this.phase = 4;
    } else if (this.phase === 4) {
      if (this.targetOrder.advance(data.target, batch)) {
        this.phase = 5;
        this.cursor = 0;
      }
    } else if (this.phase === 5) {
      const end = Math.min(count, this.cursor + batch);
      while (this.cursor < end) {
        const rank = this.cursor++;
        data.spatial[this.sourceOrder.order[rank]] = this.targetOrder.order[rank];
      }
      if (this.cursor === count) this.phase = 6;
    }
    return this.phase === 6;
  }
}
export class MorphSession {
  active: Prepared | null = null;
  private candidate: Preparation | null = null;
  private generation = 0;
  error = "";
  request(settings: Settings) {
    try {
      validateSettings(settings);
      this.candidate = null;
      this.candidate = new Preparation({ ...settings }, ++this.generation);
      this.error = "";
      return true;
    } catch (error) {
      this.candidate = null;
      this.error = String(error instanceof Error ? error.message : error);
      return false;
    }
  }
  advance(batch = 512) {
    if (!this.candidate) return false;
    try {
      if (this.candidate.advance(batch)) {
        this.active = this.candidate.data;
        this.candidate = null;
      }
    } catch (error) {
      this.error = String(error instanceof Error ? error.message : error);
      this.candidate = null;
    }
    return true;
  }
  cancel() {
    this.candidate = null;
    this.error = "Đã hủy yêu cầu mới; giữ bản hợp lệ gần nhất.";
  }
  get busy() {
    return this.candidate !== null;
  }
  get phase() {
    return this.candidate?.phase ?? -1;
  }
}
export function positionAt(
  data: Prepared,
  id: number,
  t: number,
  matching: Matching,
  easing: Easing,
  path: Path,
) {
  if (!Number.isInteger(id) || id < 0 || id >= data.settings.count)
    throw new Error("ID nằm ngoài ACTIVE.");
  const targetId = matching === "spatial" ? data.spatial[id] : data.random[id];
  return morphPosition(data.source[id], data.target[targetId], data.path[id], t, easing, path, id);
}
export function meanTravel(data: Prepared, mode: Matching) {
  let distance = 0;
  for (let id = 0; id < data.settings.count; id++) {
    const b = data.target[mode === "spatial" ? data.spatial[id] : data.random[id]];
    const a = data.source[id];
    distance += Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  }
  return distance / data.settings.count;
}
export { nativeMemory };
