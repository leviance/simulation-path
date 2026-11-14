import {
  Cell,
  ScanOrder,
  contains,
  cellAt,
  countMaterials,
  checksum,
  paintDisk,
  paintStroke,
  isMaterial,
  type Grid,
  type Material,
  type Order,
  type Point,
} from "./model.ts";
import { makeScene } from "./presets.ts";
import { stepGrid, type StepStats } from "./rules.ts";
import { planSteps, speeds } from "./timing.ts";
import { validateSmallScene, type Validation } from "./validation.ts";

export type Summary = ReturnType<SandSession["summary"]>;

/** Mutable simulation storage. React receives summary numbers, never this grid. */
export class SandSession {
  readonly stage: number;
  grid: Grid;
  material: Material = Cell.Sand;
  radius = 2;
  cursor: Point = { x: 48, y: 10 };
  preset = 0;
  seed = 46;
  order: Order = ScanOrder.Alternating;
  speed = 1;
  fps = 60;
  paused = true;
  plain = false;
  showMoved = false;
  clean = false;
  drawing = false;
  erasing = false;
  previous: Point | null = null;
  accumulator = 0;
  dropped = 0;
  gridRevision = 0;
  clockRevision = 0;
  stats: StepStats = { visited: 0, movable: 0, swaps: 0 };
  updateMs = 0;
  report: Validation | null = null;
  note = "Vẽ hoặc chọn một ô; chưa có bước cập nhật nào chạy.";
  disposed = false;
  private readonly now: () => number;

  constructor(stage: number, now = () => performance.now()) {
    if (!Number.isInteger(stage) || stage < 1 || stage > 9)
      throw new Error("Mốc học phải từ 1 đến 9.");
    this.stage = stage;
    this.now = now;
    this.grid = makeScene(stage);
    if (stage >= 7) {
      this.radius = 6;
      this.cursor = { x: 256, y: 64 };
    }
  }

  endStroke() {
    this.drawing = false;
    this.erasing = false;
    this.previous = null;
  }

  pause() {
    this.paused = true;
    this.accumulator = 0;
    this.clockRevision += 1;
    this.endStroke();
  }

  toggleRun() {
    if (this.stage < 6 || this.disposed) return;
    this.paused = !this.paused;
    this.accumulator = 0;
    this.clockRevision += 1;
  }

  reset(preset = this.preset, seed = this.seed, clear = false) {
    if (
      !Number.isInteger(preset) ||
      preset < 0 ||
      preset > 4 ||
      (this.stage < 8 && preset !== 0 && preset !== 4)
    ) {
      throw new Error("Cảnh này chưa có ở mốc đang học.");
    }
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
      throw new Error("Seed phải nằm trong 0–4294967295.");
    let targetPreset = preset;
    if (clear) targetPreset = 4;
    const candidate = makeScene(this.stage, targetPreset, seed);
    candidate.order = this.order;
    this.grid = candidate;
    this.preset = preset;
    this.seed = seed;
    this.pause();
    this.dropped = 0;
    this.stats = { visited: 0, movable: 0, swaps: 0 };
    this.updateMs = 0;
    this.report = null;
    this.gridRevision += 1;
    this.cursor = {
      x: Math.min(candidate.width - 1, this.cursor.x),
      y: Math.min(candidate.height - 1, this.cursor.y),
    };
    this.note = "Đã đặt lại cùng cảnh/seed/order; tick trở về 0 và đang dừng.";
    if (clear) this.note = "Đã xóa vật liệu. Đặt lại sẽ khôi phục cảnh đang chọn.";
  }

  setOrder(order: number) {
    if (this.stage < 8 || !Number.isInteger(order) || order < 0 || order > 3)
      throw new Error("Thứ tự quét chưa hợp lệ ở mốc này.");
    this.pause();
    this.order = order as Order;
    this.grid.order = this.order;
    this.note = "Đổi luật quét không đổi mảng hiện tại. Đặt lại để so cùng input.";
  }

  setSpeed(speed: number) {
    if (this.stage < 6 || !speeds.some((value) => value === speed))
      throw new Error("Tốc độ chưa hợp lệ.");
    this.speed = speed;
    this.accumulator = 0;
    this.clockRevision += 1;
  }

  setFps(fps: number) {
    if (this.stage < 6 || ![15, 30, 60, 120].includes(fps))
      throw new Error("Giới hạn FPS chưa hợp lệ.");
    this.fps = fps;
    this.accumulator = 0;
    this.clockRevision += 1;
  }

  setMaterial(material: number) {
    if (this.stage < 2 || !isMaterial(material) || (material === Cell.Water && this.stage < 5))
      return;
    this.material = material;
  }

  setRadius(radius: number) {
    if (!Number.isFinite(radius) || this.stage < 2) return;
    this.radius = Math.max(0, Math.min(24, Math.floor(radius)));
  }

  setPlain(enabled: boolean) {
    this.plain = enabled;
  }

  setMovedOverlay(enabled: boolean) {
    this.showMoved = enabled;
    if (enabled) this.clean = false;
  }

  setClean(enabled: boolean) {
    this.clean = enabled;
    if (enabled) this.showMoved = false;
  }

  setNote(message: string) {
    this.note = message;
  }

  stampAtCursor() {
    this.stamp(this.cursor);
    this.previous = null;
  }

  moveCursor(dx: number, dy: number) {
    if (!Number.isInteger(dx) || !Number.isInteger(dy)) return;
    this.cursor = {
      x: Math.max(0, Math.min(this.grid.width - 1, this.cursor.x + dx)),
      y: Math.max(0, Math.min(this.grid.height - 1, this.cursor.y + dy)),
    };
  }

  stamp(point: Point, join = false) {
    if (this.stage < 2 || this.disposed || !contains(this.grid, point.x, point.y)) return;
    let material = this.material;
    if (this.erasing) material = Cell.Empty;
    if (join && this.previous) paintStroke(this.grid, this.previous, point, this.radius, material);
    else paintDisk(this.grid, point.x, point.y, this.radius, material);
    this.cursor = { ...point };
    this.previous = { ...point };
    this.gridRevision += 1;
  }

  pointerBegin(point: Point, erase: boolean) {
    if (!contains(this.grid, point.x, point.y) || this.disposed) return;
    this.cursor = { ...point };
    if (this.stage < 2) return;
    this.endStroke();
    this.drawing = true;
    this.erasing = erase;
    this.stamp(point);
  }

  pointerMove(point: Point | null) {
    if (this.disposed) return;
    if (!point || !contains(this.grid, point.x, point.y)) {
      this.previous = null;
      return;
    }
    this.cursor = { ...point };
    if (this.drawing) this.stamp(point, true);
  }

  private updateOne() {
    if (this.stage >= 8 && this.drawing && this.previous) this.stamp(this.cursor);
    const begin = this.now();
    this.stats = stepGrid(this.grid, this.stage);
    this.updateMs = Math.max(0, this.now() - begin);
    this.gridRevision += 1;
  }

  singleStep() {
    if (this.stage < 3 || this.disposed) return;
    this.pause();
    this.updateOne();
  }

  advance(elapsed: number) {
    if (this.paused || this.stage < 6 || this.disposed) return 0;
    const plan = planSteps(this.accumulator, elapsed, this.speed);
    this.accumulator = plan.remainder;
    this.dropped += plan.dropped;
    let totalMs = 0;
    for (let step = 0; step < plan.steps; step += 1) {
      this.updateOne();
      totalMs += this.updateMs;
    }
    if (plan.steps > 0) this.updateMs = totalMs / plan.steps;
    return plan.steps;
  }

  validate() {
    if (this.stage < 9) return;
    this.pause();
    this.report = validateSmallScene();
  }

  summary() {
    return {
      stage: this.stage,
      width: this.grid.width,
      height: this.grid.height,
      tick: this.grid.tick,
      counts: countMaterials(this.grid),
      checksum: checksum(this.grid),
      stats: { ...this.stats },
      gridBytes: this.grid.cells.byteLength + this.grid.moved.byteLength,
      updateMs: this.updateMs,
      material: this.material,
      radius: this.radius,
      preset: this.preset,
      seed: this.seed,
      order: this.order,
      paused: this.paused,
      speed: this.speed,
      fps: this.fps,
      dropped: this.dropped,
      cursor: { ...this.cursor },
      cell: cellAt(this.grid, this.cursor.x, this.cursor.y),
      moved: this.grid.moved[this.cursor.y * this.grid.width + this.cursor.x] === 1,
      plain: this.plain,
      showMoved: this.showMoved,
      clean: this.clean,
      note: this.note,
      report: this.report,
    };
  }

  dispose() {
    this.pause();
    this.disposed = true;
  }

  mount() {
    this.disposed = false;
    this.pause();
  }
}
