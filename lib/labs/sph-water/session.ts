import {
  makeState,
  defaultSettings,
  width,
  height,
  spacing,
  maxDt,
  validateSettings,
  type Preset,
  type Settings,
  type Vec2,
} from "./model.ts";
import { step, inspectCurrent } from "./solver.ts";
import { targetPaddle } from "./boundary.ts";
import { emitBurst } from "./emitter.ts";
import { measure } from "./diagnostics.ts";
import { validateReference } from "./reference.ts";
export type View = "surface" | "particles" | "density" | "pressure" | "speed";
export type Tool = "pour" | "paddle" | "inspect";
export class WaterSession {
  count: number;
  preset: Preset = "dam";
  state;
  settings: Settings = { ...defaultSettings };
  view: View = "particles";
  tool: Tool = "inspect";
  nozzle: Vec2 = { x: 8.6, y: 6.5 };
  paused = true;
  pouring = false;
  debug = false;
  selected = 0;
  accumulator = 0;
  dropped = 0;
  emitClock = 0;
  stepMs = 0;
  error = "";
  report = "Chưa chạy";
  revision = 0;
  clockRevision = 0;
  disposed = false;
  dragging = false;
  drawn = 0;
  readonly stage: number;
  constructor(stage = 12) {
    this.stage = stage;
    this.count = stage >= 9 ? 5000 : 1000;
    this.state = makeState(this.preset, this.count, stage);
    if (stage >= 9) this.view = "surface";
    if (stage >= 10) this.tool = "pour";
    this.inspect();
  }
  invalidate() {
    this.revision++;
  }
  inspect() {
    try {
      inspectCurrent(this.state, this.settings, this.stage);
    } catch (e) {
      this.pause();
      this.error = String(e);
    }
    this.invalidate();
  }
  pause() {
    this.paused = true;
    this.accumulator = 0;
    this.clockRevision++;
  }
  cancelInput() {
    this.pouring = false;
    this.dragging = false;
  }
  resume() {
    if (this.stage >= 8 && !this.error && !this.disposed) {
      this.paused = false;
      this.clockRevision++;
      this.invalidate();
    }
  }
  mount() {
    this.disposed = false;
  }
  dispose() {
    this.pause();
    this.dragging = false;
    this.pouring = false;
    this.disposed = true;
  }
  reset() {
    this.pause();
    this.dragging = false;
    this.pouring = false;
    this.state = makeState(this.preset, this.count, this.stage);
    this.error = "";
    this.report = "Chưa chạy";
    this.dropped = 0;
    this.emitClock = 0;
    this.selected = 0;
    this.inspect();
  }
  chooseScene(preset: Preset) {
    this.preset = preset;
    this.reset();
  }
  chooseCount(count: number) {
    if (this.stage < 9) return;
    if (![1000, 5000, 10000].includes(count)) throw new RangeError("Invalid count");
    this.count = count;
    this.settings.useGrid = true;
    this.reset();
  }
  parameter(patch: Partial<Settings>) {
    const next = { ...this.settings, ...patch };
    validateSettings(next);
    if (!next.useGrid && this.state.particles.length > 1000) {
      throw new RangeError("All-pairs chỉ dùng tối đa 1.000 hạt");
    }
    this.pause();
    this.settings = next;
    this.inspect();
  }
  oneStep(now = () => performance.now()) {
    if (this.stage < 2 || this.disposed || this.error) return false;
    try {
      const started = now();
      step(this.state, this.settings, this.stage);
      this.stepMs = now() - started;
      this.emitClock += this.state.dt;
      if (this.stage >= 10 && this.pouring && this.emitClock >= 0.025) {
        emitBurst(this.state, this.nozzle);
        this.emitClock = 0;
      }
      this.invalidate();
      return true;
    } catch (e) {
      this.pause();
      this.pouring = false;
      this.error = String(e);
      this.invalidate();
      return false;
    }
  }
  singleStep() {
    this.pause();
    this.oneStep();
    this.inspect();
  }
  advance(elapsed: number, budgetMs = 10, now = () => performance.now()) {
    if (!Number.isFinite(elapsed) || elapsed < 0 || !Number.isFinite(budgetMs) || budgetMs < 0)
      throw new RangeError("Invalid frame time/budget");
    if (this.paused || this.disposed || this.stage < 8 || this.error) return;
    this.dropped += Math.max(0, elapsed - 0.05);
    this.accumulator += Math.min(elapsed, 0.05);
    const start = now();
    let steps = 0;
    while (this.accumulator >= maxDt && steps < 24) {
      if (!this.oneStep(now)) break;
      this.accumulator -= this.state.dt;
      steps++;
      if (now() - start >= budgetMs) break;
    }
    if (steps === 24 || this.accumulator >= maxDt) {
      this.dropped += this.accumulator;
      this.accumulator = 0;
    }
    if (steps > 0) this.inspect();
  }
  emit() {
    if (this.stage >= 10) {
      emitBurst(this.state, this.nozzle);
      this.inspect();
    }
  }
  verify() {
    this.pause();
    const report = validateReference();
    this.report = `${report.passed ? "PASS" : "FAIL"} · ∫W=${report.integral.toFixed(8)}, grid=${report.gridError.toExponential(1)}, drift=${report.equilibriumDrift.toExponential(1)} m`;
    this.invalidate();
    return report;
  }
  setPoint(point: Vec2, down = false) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
    if (this.tool === "paddle" && this.stage >= 11) {
      targetPaddle(this.state, point.x, point.y);
    } else if (this.tool === "pour" && this.stage >= 10) {
      this.nozzle = {
        x: Math.max(spacing, Math.min(width - spacing, point.x)),
        y: Math.max(spacing, Math.min(height - spacing, point.y)),
      };
      if (down) this.emit();
    } else {
      let best = Infinity;
      this.state.particles.forEach((p, i) => {
        const d = Math.hypot(p.x - point.x, p.y - point.y);
        if (d < best) {
          best = d;
          this.selected = i;
        }
      });
      this.debug = true;
    }
    this.invalidate();
  }
  beginStroke(p: Vec2) {
    this.dragging = true;
    this.setPoint(p, true);
  }
  moveStroke(p: Vec2 | null) {
    if (this.dragging && p) this.setPoint(p);
  }
  endStroke() {
    this.dragging = false;
  }
  moveCursor(dx: number, dy: number) {
    if (this.tool === "inspect") {
      this.selected = Math.max(
        0,
        Math.min(this.state.particles.length - 1, this.selected + Math.sign(dx + dy)),
      );
      this.debug = true;
      this.invalidate();
      return;
    }
    const p = this.nozzle;
    if (this.tool === "paddle") {
      this.setPoint({
        x: this.state.paddle.targetX + dx * 2 * spacing,
        y: this.state.paddle.targetY + dy * 2 * spacing,
      });
    } else this.setPoint({ x: p.x + dx * 2 * spacing, y: p.y + dy * 2 * spacing });
  }
  snapshot() {
    return {
      count: this.state.particles.length,
      requested: this.count,
      mass: massFor(this.state.particles.length),
      time: this.state.time,
      dt: this.state.dt,
      tick: this.state.tick,
      updated: this.state.updated,
      drawn: this.drawn,
      emitted: this.state.emitted,
      rejected: this.state.rejected,
      candidates: this.state.candidates,
      metrics: measure(this.state),
      selected: this.selected,
      particle: this.state.particles[this.selected]
        ? { ...this.state.particles[this.selected] }
        : null,
      view: this.view,
      tool: this.tool,
      preset: this.preset,
      settings: { ...this.settings },
      paused: this.paused,
      pouring: this.pouring,
      debug: this.debug,
      paddle: this.state.paddle.enabled,
      dropped: this.dropped,
      stepMs: this.stepMs,
      error: this.error,
      report: this.report,
    };
  }
}
function massFor(count: number) {
  return 1000 * spacing * spacing * count;
}
export type Snapshot = ReturnType<WaterSession["snapshot"]>;
