import { orbital, orbitalIds, type OrbitalId } from "./catalog.ts";
import { buildTables, samplePosition, type SampleTables, type SamplingMode } from "./sampler.ts";

export const maxCanvasSamples = 20_000;
export const tableResolutions = {
  radialBins: [64, 256, 1024, 2048],
  muBins: [32, 64],
  phiBins: [64, 128],
} as const;
export interface CloudConfig {
  orbital: OrbitalId;
  count: number;
  seed: number;
  sampling: SamplingMode;
  radialBins: number;
  muBins: number;
  phiBins: number;
}
export interface Cloud {
  config: Readonly<CloudConfig>;
  generation: number;
  records: Float32Array;
  tables: SampleTables;
  count: number;
}
export interface GenerationJob {
  config: Readonly<CloudConfig>;
  generation: number;
  records: Float32Array;
  tables: SampleTables;
  generated: number;
  phase: "generating" | "ready" | "cancelled" | "failed";
  error: string;
}
export const defaultConfig = (): CloudConfig => ({
  orbital: "pz",
  count: 8192,
  seed: 45,
  sampling: "weighted",
  radialBins: 2048,
  muBins: 64,
  phiBins: 128,
});
export function validateConfig(value: CloudConfig): CloudConfig {
  if (
    !value ||
    !orbitalIds.includes(value.orbital) ||
    !Number.isInteger(value.count) ||
    value.count < 256 ||
    value.count > maxCanvasSamples ||
    !Number.isInteger(value.seed) ||
    value.seed < 0 ||
    value.seed > 0xffffffff ||
    !["weighted", "uniformRadius", "uniformAngle"].includes(value.sampling) ||
    !tableResolutions.radialBins.some((size) => size === value.radialBins) ||
    !tableResolutions.muBins.some((size) => size === value.muBins) ||
    !tableResolutions.phiBins.some((size) => size === value.phiBins)
  )
    throw new RangeError(
      "Cấu hình không hợp lệ: N từ 256–20.000, seed uint32 và preset có trong catalog.",
    );
  return {
    orbital: value.orbital,
    count: value.count,
    seed: value.seed,
    sampling: value.sampling,
    radialBins: value.radialBins,
    muBins: value.muBins,
    phiBins: value.phiBins,
  };
}
export function encodeConfig(config: CloudConfig) {
  return JSON.stringify({ schema: 1, ...validateConfig(config) }, null, 2);
}
export function decodeConfig(text: string): CloudConfig {
  if (text.length > 2048) throw new RangeError("Cấu hình lab tối đa 2 KiB.");
  const value = JSON.parse(text);
  if (
    !value ||
    Array.isArray(value) ||
    value.schema !== 1 ||
    Object.keys(value).some(
      (key) =>
        ![
          "schema",
          "orbital",
          "count",
          "seed",
          "sampling",
          "radialBins",
          "muBins",
          "phiBins",
        ].includes(key),
    )
  )
    throw new RangeError("Schema cấu hình không được hỗ trợ.");
  return validateConfig(value);
}

// Candidate records never replace active until every requested sample is valid.
export class AtomicSession {
  private requestedConfig: CloudConfig;
  private pausedValue = false;
  private disposed = false;
  private message = "";
  active: Cloud | null = null;
  job: GenerationJob | null = null;
  generation = 0;

  constructor(config = defaultConfig()) {
    this.requestedConfig = validateConfig(config);
    this.request(config);
  }
  get requested() {
    return { ...this.requestedConfig };
  }
  get paused() {
    return this.pausedValue;
  }
  get notice() {
    return this.message;
  }
  get needsWork() {
    return !this.disposed && this.job?.phase === "generating";
  }
  get current() {
    return (
      this.active !== null &&
      this.active.generation === this.generation &&
      this.job?.phase === "ready"
    );
  }
  setPaused(value: boolean) {
    this.pausedValue = value;
  }
  report(error: unknown) {
    this.message = error instanceof Error ? error.message : "Không thể thực hiện thao tác.";
  }

  request(config: CloudConfig) {
    if (this.disposed) throw new Error("Session đã dispose.");
    const next = validateConfig(config);
    // Check complete memory before allocating, including retained last-good data.
    const nextBytes = next.count * 32,
      previousBytes = this.active?.records.byteLength ?? 0;
    if (nextBytes + previousBytes > maxCanvasSamples * 64)
      throw new RangeError("Vượt ngân sách candidate + last-good của lab.");
    const tables = buildTables(next.orbital, undefined, next.radialBins, next.muBins, next.phiBins);
    const records = new Float32Array(next.count * 8);
    if (this.job?.phase === "generating") this.job.phase = "cancelled";
    this.requestedConfig = next;
    ++this.generation;
    this.job = {
      config: Object.freeze({ ...next }),
      generation: this.generation,
      records,
      tables,
      generated: 0,
      phase: "generating",
      error: "",
    };
    this.message = "";
  }
  advance(force = false, batch = 512) {
    if (!Number.isInteger(batch) || batch < 1 || batch > 1024)
      throw new RangeError("Batch từ 1–1.024 mẫu.");
    const job = this.job;
    if (this.disposed || (!force && this.pausedValue) || !job || job.phase !== "generating")
      return false;
    try {
      const end = Math.min(job.config.count, job.generated + batch);
      for (let index = job.generated; index < end; ++index) {
        const sample = samplePosition(job.tables, index, job.config.seed, job.config.sampling),
          offset = index * 8;
        job.records.set(
          [sample.point.x, sample.point.y, sample.point.z, sample.density, sample.sign, 0, 0, 0],
          offset,
        );
      }
      job.generated = end;
      if (end === job.config.count) {
        job.phase = "ready";
        this.active = {
          config: job.config,
          generation: job.generation,
          records: job.records,
          tables: job.tables,
          count: end,
        };
      }
    } catch (error) {
      job.phase = "failed";
      job.records = new Float32Array(0);
      job.error = error instanceof Error ? error.message : "Sample không hợp lệ.";
      this.message = job.error;
    }
    return true;
  }
  cancel() {
    if (this.job?.phase !== "generating") return false;
    this.job.phase = "cancelled";
    this.job.records = new Float32Array(0);
    this.message =
      "Đã hủy candidate; cloud last-good và nhãn của nó vẫn giữ nguyên. Enter để thử lại.";
    return true;
  }
  reset() {
    this.request(this.requestedConfig);
  }
  mount() {
    if (this.disposed) {
      this.disposed = false;
      this.request(this.requestedConfig);
    }
  }
  dispose() {
    this.cancel();
    this.disposed = true;
    this.job = null;
    this.active = null;
  }
  get label() {
    return this.active ? orbital(this.active.config.orbital).label : "Chưa có cloud hoàn chỉnh";
  }
}

export function hasGenerationWork(
  primary: AtomicSession,
  secondary: AtomicSession,
  compare: boolean,
) {
  return primary.needsWork || (compare && secondary.needsWork);
}
