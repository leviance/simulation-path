import {
  applyBoundary,
  contains,
  defaultSettings,
  measure,
  paintStroke,
  sample,
  type BrushMode,
  type Boundary,
  type Point,
} from "./model.ts";
import { makeField, settingsForSize } from "./presets.ts";
import { diffuse, emptyStep, stability, stepMessages } from "./solver.ts";
import { planSteps } from "./timing.ts";
import { validatePlate } from "./reference.ts";

export type Summary = ReturnType<HeatSession["summary"]>;
export class HeatSession {
  readonly stage: number;
  field;
  settings = defaultSettings();
  size = 32;
  preset = 0;
  radius = 2;
  brushValue = 1;
  brushMode: BrushMode = "temperature";
  cursor: Point = { x: 16, y: 16 };
  probe: Point = { x: 16, y: 16 };
  history: { time: number; theta: number }[] = [];
  paused = true;
  clean = false;
  showPins = true;
  drawing = false;
  erasing = false;
  previous: Point | null = null;
  accumulator = 0;
  dropped = 0;
  speed = 1;
  fps = 60;
  gridRevision = 0;
  clockRevision = 0;
  updateMs = 0;
  lastStep = emptyStep();
  report: ReturnType<typeof validatePlate> | null = null;
  note = "Đang dừng. Mỗi theta được đổi thành một màu theo thang cố định; chưa có bước lan nhiệt.";
  disposed = false;
  private readonly now: () => number;

  constructor(stage: number, now = () => performance.now()) {
    if (!Number.isInteger(stage) || stage < 1 || stage > 9)
      throw new Error("Mốc học phải từ 1 đến 9.");
    this.stage = stage;
    this.now = now;
    if (stage >= 7) {
      this.size = 192;
      this.radius = 8;
      this.settings = settingsForSize(this.size);
    }
    this.field = makeField(this.preset, this.size, stage);
    this.cursor = { x: Math.floor(this.size / 2), y: Math.floor(this.size / 2) };
    this.selectProbe(this.cursor);
  }

  mount() {
    this.disposed = false;
    this.pause();
  }
  resize() {
    this.endStroke();
  }
  endStroke() {
    this.drawing = false;
    this.erasing = false;
    this.previous = null;
  }
  pause() {
    this.paused = true;
    this.accumulator = 0;
    this.clockRevision++;
    this.endStroke();
  }
  resume() {
    if (this.stage < 6 || this.disposed) return;
    this.paused = false;
    this.accumulator = 0;
    this.clockRevision++;
    this.note = "Đang chạy; tối đa 8 bước mô hình trong một khung hình.";
  }
  toggleRun() {
    if (this.paused) this.resume();
    else this.pause();
  }
  dispose() {
    this.pause();
    this.disposed = true;
  }

  reset(preset = this.preset, clear = false, size = this.size) {
    if (
      !Number.isInteger(preset) ||
      preset < 0 ||
      preset > 5 ||
      (this.stage < 8 &&
        ![0, 5].includes(preset) &&
        !(this.stage >= 6 && preset === 2) &&
        !(this.stage >= 5 && preset === 4))
    )
      throw new Error("Cảnh này chưa có ở bài đang học.");
    if ((this.stage < 7 && size !== 32) || (this.stage >= 7 && ![128, 192, 256].includes(size)))
      throw new Error("Độ phân giải không phù hợp với mốc học.");
    let candidatePreset = preset;
    if (clear) candidatePreset = 5;
    const candidate = makeField(candidatePreset, size, this.stage);
    const settings = { ...this.settings };
    if (this.stage >= 7) settings.dx = settings.dy = 96 / size;
    if (this.stage >= 5) applyBoundary(candidate, settings);
    this.field = candidate;
    this.settings = settings;
    this.size = size;
    this.preset = preset;
    this.pause();
    this.dropped = 0;
    this.updateMs = 0;
    this.lastStep = emptyStep();
    this.report = null;
    this.cursor = { x: Math.floor(size / 2), y: Math.floor(size / 2) };
    this.selectProbe(this.cursor);
    this.gridRevision++;
    this.note = "Đã tạo lại đúng cảnh mẫu; thời gian mô hình về 0, D/dt được giữ nguyên.";
    if (clear) this.note = "Đã xóa nhiệt và heater. Đặt lại vẫn khôi phục cảnh mẫu đã chọn.";
  }

  setParameter(key: "diffusivity" | "dt", value: number) {
    if (this.stage < 6) return;
    if (
      !Number.isFinite(value) ||
      (key === "diffusivity" && (value < 0 || value > 6)) ||
      (key === "dt" && (value < 0.002 || value > 0.1))
    )
      throw new Error("D phải trong 0–6; dt trong 0,002–0,1 giây mô hình.");
    this.pause();
    if (key === "diffusivity") value = Math.round(value * 20) / 20;
    else value = Math.max(0.002, Math.min(0.1, Math.round(value * 600) / 600));
    this.settings = { ...this.settings, [key]: value };
    this.history = [];
    this.recordProbe();
    this.note = "Đã đổi tham số và dừng. Không tự sửa dt để làm điều kiện ổn định đạt.";
  }
  setBoundary(boundary: Boundary) {
    if (this.stage < 5) return;
    if (boundary !== "insulated" && boundary !== "rim")
      throw new Error("Điều kiện biên không hợp lệ.");
    this.pause();
    this.settings = { ...this.settings, boundary };
    applyBoundary(this.field, this.settings);
    this.gridRevision++;
    this.lastStep = emptyStep();
    this.history = [];
    this.recordProbe();
    this.note =
      "Đổi sang vành lạnh sẽ xóa nhiệt/heater ở vành; đổi lại không khôi phục phần đã mất.";
  }
  toggleExperiment() {
    if (this.stage < 6) return;
    this.pause();
    this.settings = { ...this.settings, experiment: !this.settings.experiment };
    this.gridRevision++;
    this.history = [];
    this.recordProbe();
    this.note =
      "Thí nghiệm cho phép nghiệm vượt 0–1 thật; dừng trước ứng viên |theta| > 16 hoặc sau 400 bước.";
  }
  setRadius(value: number) {
    if (Number.isFinite(value)) this.radius = Math.max(0, Math.min(24, Math.round(value)));
  }
  setBrush(mode: BrushMode, value = this.brushValue) {
    if (this.stage < 2 || (mode !== "temperature" && this.stage < 5)) return;
    if (!["temperature", "heater", "unpin"].includes(mode) || ![0, 1].includes(value))
      throw new Error("Bút không hợp lệ.");
    this.endStroke();
    this.brushMode = mode;
    this.brushValue = value;
  }
  setSpeed(value: number) {
    if (this.stage < 6 || ![0.25, 0.5, 1, 2, 4].includes(value)) return;
    this.pause();
    this.speed = value;
  }
  setFps(value: number) {
    if ([15, 30, 60, 120].includes(value)) {
      this.pause();
      this.fps = value;
    }
  }
  moveCursor(dx: number, dy: number) {
    this.cursor = {
      x: Math.max(0, Math.min(this.size - 1, this.cursor.x + dx)),
      y: Math.max(0, Math.min(this.size - 1, this.cursor.y + dy)),
    };
  }
  selectProbe(point: Point) {
    if (!contains(this.field, point.x, point.y)) return;
    this.probe = { ...point };
    this.history = [];
    this.recordProbe();
  }
  private recordProbe() {
    if (this.stage < 8) return;
    this.history.push({
      time: this.field.time,
      theta: sample(this.field, this.probe.x, this.probe.y),
    });
    if (this.history.length > 120) this.history.shift();
  }
  stampAtCursor() {
    if (this.stage < 2 || this.disposed) return;
    const from = this.previous ?? this.cursor;
    let value = this.brushValue;
    if (this.erasing) value = 0;
    paintStroke(
      this.field,
      this.settings,
      from,
      this.cursor,
      this.radius,
      value,
      this.brushMode,
      this.stage,
    );
    this.previous = { ...this.cursor };
    this.gridRevision++;
  }
  pointerBegin(point: Point, erasing = false) {
    if (!contains(this.field, point.x, point.y) || this.disposed) return;
    this.endStroke();
    this.cursor = { ...point };
    if (this.stage < 2) return;
    this.drawing = true;
    this.erasing = erasing;
    this.stampAtCursor();
  }
  pointerMove(point: Point | null) {
    if (this.disposed) return;
    if (!point || !contains(this.field, point.x, point.y)) {
      this.previous = null;
      return;
    }
    this.cursor = { ...point };
    if (this.drawing) this.stampAtCursor();
  }
  private updateOne() {
    const start = this.now();
    this.lastStep = diffuse(this.field, this.settings, this.stage);
    this.updateMs = Math.max(0, this.now() - start);
    this.note = stepMessages[this.lastStep.status];
    if (!this.lastStep.advanced) {
      this.pause();
      return false;
    }
    this.gridRevision++;
    this.recordProbe();
    return true;
  }
  singleStep() {
    if (this.stage >= 3 && !this.disposed) {
      this.pause();
      this.updateOne();
    }
  }
  advance(elapsed: number) {
    if (this.stage < 6 || this.paused || this.disposed) return 0;
    const plan = planSteps(this.accumulator, elapsed, this.settings.dt, this.speed);
    this.accumulator = plan.remainder;
    this.dropped += plan.dropped;
    let advanced = 0;
    let totalMs = 0;
    for (let step = 0; step < plan.steps; step++) {
      if (!this.updateOne()) break;
      advanced++;
      totalMs += this.updateMs;
    }
    if (advanced > 0) this.updateMs = totalMs / advanced;
    return advanced;
  }
  validate() {
    if (this.stage >= 9) {
      this.pause();
      this.report = validatePlate();
    }
  }
  summary() {
    return {
      stage: this.stage,
      size: this.size,
      tick: this.field.tick,
      time: this.field.time,
      settings: { ...this.settings },
      stability: stability(this.settings, this.stage),
      stats: measure(this.field, this.settings),
      lastStep: { ...this.lastStep },
      preset: this.preset,
      radius: this.radius,
      brushValue: this.brushValue,
      brushMode: this.brushMode,
      paused: this.paused,
      speed: this.speed,
      fps: this.fps,
      dropped: this.dropped,
      cursor: { ...this.cursor },
      theta: sample(this.field, this.cursor.x, this.cursor.y),
      probe: { ...this.probe },
      probeTheta: sample(this.field, this.probe.x, this.probe.y),
      history: this.history.map((point) => ({ ...point })),
      clean: this.clean,
      showPins: this.showPins,
      updateMs: this.updateMs,
      bytes:
        this.field.current.byteLength + this.field.next.byteLength + this.field.pins.byteLength,
      note: this.note,
      report: this.report,
    };
  }
}
