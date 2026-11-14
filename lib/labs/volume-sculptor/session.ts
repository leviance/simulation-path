import type { Vec3 } from "../normal.ts";
import {
  applyBrush,
  dirtyChunks,
  emptyBox,
  includeBox,
  StrokeSampler,
  validateBrush,
  type Brush,
  type SampleBox,
} from "./brush.ts";
import { GridSpec, ScalarGrid, type Shape } from "./grid.ts";
import { MeshJob, meshVertexCapacity, type VolumeMesh } from "./mesh-job.ts";

interface Stroke {
  owner: number;
  before: Float32Array<ArrayBuffer>;
  brush: Brush;
  sampler: StrokeSampler;
  queue: Vec3[];
  ending: boolean;
  writes: number;
}

export class SculptSession {
  grid: ScalarGrid;
  shape: Shape;
  isovalue = 0;
  gradientNormals = true;
  fieldRevision = 1;
  requestedGeneration = 0;
  lastGood: VolumeMesh | null = null;
  job: MeshJob | null = null;
  paused = false;
  notice = "";
  capacity = meshVertexCapacity;
  changedWrites = 0;
  private changedSinceMesh: SampleBox = emptyBox();
  private forceFull = true;
  private stroke: Stroke | null = null;
  private undoSnapshots: Float32Array<ArrayBuffer>[] = [];
  private redoSnapshots: Float32Array<ArrayBuffer>[] = [];
  private archive: { grid: ScalarGrid; isovalue: number } | null = null;

  constructor(samples = 24, shape: Shape = "sphere") {
    this.grid = new ScalarGrid(new GridSpec(samples));
    this.shape = shape;
    this.grid.fill(shape);
    this.requestRemesh(true);
  }

  get strokeOwner() {
    return this.stroke?.owner ?? null;
  }
  get undoCount() {
    return this.undoSnapshots.length;
  }
  get redoCount() {
    return this.redoSnapshots.length;
  }
  get saved() {
    return this.archive !== null;
  }
  get queuedStamps() {
    return this.stroke?.queue.length ?? 0;
  }
  get needsWork() {
    return this.queuedStamps > 0 || this.job?.phase === "count" || this.job?.phase === "emit";
  }
  get current() {
    return (
      this.lastGood !== null &&
      this.lastGood.fieldRevision === this.fieldRevision &&
      this.lastGood.generation === this.requestedGeneration &&
      this.lastGood.isovalue === this.isovalue &&
      this.lastGood.gradientNormals === this.gradientNormals &&
      this.queuedStamps === 0
    );
  }

  requestRemesh(full = false) {
    this.job?.cancel();
    // A reset/resample/restore invalidates every old chunk until a complete new
    // generation publishes, even if brush input arrives before that happens.
    if (full) this.forceFull = true;
    ++this.requestedGeneration;
    this.job = new MeshJob(
      this.grid,
      this.isovalue,
      this.gradientNormals,
      this.fieldRevision,
      this.requestedGeneration,
      this.lastGood,
      this.forceFull ? null : dirtyChunks(this.grid.spec, this.changedSinceMesh),
      this.capacity,
    );
    this.notice = "";
  }

  setIsovalue(value: number) {
    if (!Number.isFinite(value) || Math.abs(value) > 1)
      throw new RangeError("Isovalue cần nằm trong [-1, 1].");
    if (value === this.isovalue) return false;
    this.cancelStroke();
    this.isovalue = value;
    this.requestRemesh(true);
    return true;
  }

  setGradientNormals(enabled: boolean) {
    if (this.gradientNormals === enabled) return;
    this.cancelStroke();
    this.gradientNormals = enabled;
    this.requestRemesh(true);
  }

  setCapacity(value: number) {
    if (!Number.isInteger(value) || value < 0 || value > meshVertexCapacity)
      throw new RangeError("Capacity không hợp lệ.");
    if (value === this.capacity) return;
    this.capacity = value;
    this.requestRemesh(true);
  }

  beginStroke(owner: number, brush: Brush) {
    validateBrush(brush);
    if (this.paused || this.stroke || !Number.isSafeInteger(owner)) return false;
    this.stroke = {
      owner,
      before: this.grid.values.slice(),
      brush: { ...brush, center: { ...brush.center } },
      sampler: new StrokeSampler(brush.center, brush.radius),
      queue: [{ ...brush.center }],
      ending: false,
      writes: 0,
    };
    return true;
  }

  continueStroke(owner: number, point: Vec3) {
    const stroke = this.stroke;
    if (!stroke || stroke.owner !== owner || stroke.ending || this.paused) return false;
    try {
      const stamps = stroke.sampler.advance(point);
      if (stroke.queue.length + stamps.length > 256)
        throw new RangeError("Hàng đợi vượt 256 stamp; trả lại field trước stroke.");
      stroke.queue.push(...stamps);
    } catch (error) {
      this.cancelStroke(owner);
      this.notice = error instanceof Error ? error.message : "Đã hủy stroke.";
    }
    return true;
  }

  finishStroke(owner: number) {
    if (!this.stroke || this.stroke.owner !== owner) return false;
    this.stroke.ending = true;
    this.commitStrokeIfDrained();
    return true;
  }

  cancelStroke(owner?: number) {
    const stroke = this.stroke;
    if (!stroke || (owner !== undefined && stroke.owner !== owner)) return false;
    this.stroke = null;
    if (stroke.writes > 0) {
      this.grid.replaceValues(stroke.before);
      ++this.fieldRevision;
      this.requestRemesh(true);
    }
    return true;
  }

  private commitStrokeIfDrained() {
    const stroke = this.stroke;
    if (!stroke?.ending || stroke.queue.length > 0) return;
    if (stroke.writes > 0) {
      this.undoSnapshots.push(stroke.before);
      if (this.undoSnapshots.length > 4) this.undoSnapshots.shift();
      this.redoSnapshots = [];
    }
    this.stroke = null;
  }

  advance(stepWhilePaused = false) {
    if (this.paused && !stepWhilePaused) return false;
    const stroke = this.stroke;
    let advancedStroke = false;
    if (stroke?.queue.length) {
      advancedStroke = true;
      let writes = 0;
      for (let stamp = 0; stamp < 4 && stroke.queue.length; ++stamp) {
        const center = stroke.queue.shift()!;
        const edit = applyBrush(this.grid, { ...stroke.brush, center });
        writes += edit.writes;
        includeBox(this.changedSinceMesh, edit.changed);
      }
      stroke.writes += writes;
      this.changedWrites += writes;
      if (writes > 0) {
        ++this.fieldRevision;
        this.requestRemesh();
      }
      this.commitStrokeIfDrained();
      if (this.queuedStamps > 0) return true;
    }
    const job = this.job;
    if (!job || !job.advance()) return advancedStroke;
    if (
      job.phase === "ready" &&
      job.fieldRevision === this.fieldRevision &&
      job.generation === this.requestedGeneration
    ) {
      this.lastGood = job.takeMesh();
      this.changedSinceMesh = emptyBox();
      this.forceFull = false;
    }
    if (job.phase === "failed") this.notice = job.error;
    return true;
  }

  cancelRemesh() {
    this.cancelStroke();
    this.job?.cancel();
    this.notice = "Đã hủy cập nhật; mesh last-good vẫn được giữ. Enter để dựng lại.";
  }

  undo() {
    return this.restoreHistory(this.undoSnapshots, this.redoSnapshots);
  }
  redo() {
    return this.restoreHistory(this.redoSnapshots, this.undoSnapshots);
  }

  private restoreHistory(
    source: Float32Array<ArrayBuffer>[],
    destination: Float32Array<ArrayBuffer>[],
  ) {
    if (this.paused || this.stroke || source.length === 0) return false;
    destination.push(this.grid.values.slice());
    if (destination.length > 4) destination.shift();
    this.grid.replaceValues(source.pop()!);
    ++this.fieldRevision;
    this.requestRemesh(true);
    return true;
  }

  reset(shape: Shape = this.shape) {
    this.cancelStroke();
    this.job?.cancel();
    this.shape = shape;
    this.grid = new ScalarGrid(this.grid.spec);
    this.grid.fill(shape);
    this.isovalue = 0;
    ++this.fieldRevision;
    this.changedWrites = 0;
    this.undoSnapshots = [];
    this.redoSnapshots = [];
    this.changedSinceMesh = emptyBox();
    this.requestRemesh(true);
  }

  changeResolution(samples: number) {
    if (samples === this.grid.spec.samples) return false;
    // Validate before canceling an in-flight edit.
    new GridSpec(samples, this.grid.spec.origin, this.grid.spec.extent);
    this.cancelStroke();
    this.grid = this.grid.resample(samples);
    ++this.fieldRevision;
    this.undoSnapshots = [];
    this.redoSnapshots = [];
    this.changedSinceMesh = emptyBox();
    this.requestRemesh(true);
    return true;
  }

  saveSnapshot() {
    if (this.stroke) return false;
    this.archive = { grid: this.grid.clone(), isovalue: this.isovalue };
    this.notice =
      "Đã giữ snapshot field trong RAM của lab, không phải file .scl. C++ có save/load và export OBJ thật.";
    return true;
  }

  restoreSnapshot() {
    if (!this.archive) return false;
    this.cancelStroke();
    this.grid = this.archive.grid.clone();
    this.isovalue = this.archive.isovalue;
    ++this.fieldRevision;
    this.undoSnapshots = [];
    this.redoSnapshots = [];
    this.changedSinceMesh = emptyBox();
    this.requestRemesh(true);
    this.notice = "Khôi phục bản lưu RAM; mesh chỉ được thay khi generation mới xong.";
    return true;
  }

  demonstrateProduct(kind: "drill" | "bridge") {
    this.reset(kind === "drill" ? "sphere" : "separatedSpheres");
    this.paused = false;
    const brush: Brush = {
      center: { x: 0, y: 0, z: -1.05 },
      radius: 0.4,
      strength: 0.8,
      mode: "subtract",
    };
    let end: Vec3 = { x: 0, y: 0, z: 1.05 };
    if (kind === "bridge") {
      brush.center = { x: -0.55, y: 0, z: 0 };
      brush.mode = "add";
      brush.radius = 0.3;
      brush.strength = 0.2;
      end = { x: 0.55, y: 0, z: 0 };
    }
    this.beginStroke(-2, brush);
    this.continueStroke(-2, end);
    this.finishStroke(-2);
  }

  dispose() {
    this.stroke = null;
    this.job?.cancel();
    this.job = null;
    this.lastGood = null;
    this.undoSnapshots = [];
    this.redoSnapshots = [];
    this.archive = null;
  }
}
