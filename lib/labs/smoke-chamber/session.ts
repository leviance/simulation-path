import {
  fixedDt,
  inside,
  cyan,
  parametersForStage,
  startingResolution,
  startingScene,
  type Grid,
  type Ink,
  type Layer,
  type Scene,
  type Tool,
  type Vec2,
} from "./model.ts";
import { makeScene } from "./scenes.ts";
import { impulseAt, paintDisk, paintStroke, stirStroke } from "./interaction.ts";
import { diagnose, planSteps, step, validate } from "./solver.ts";
import { inspectJacobi, jacobiIteration, preparePressure, pressureResidual } from "./pressure.ts";
import { rms } from "./field.ts";
export class FluidSession {
  readonly stage: number;
  grid: Grid;
  parameters;
  scene: Scene;
  layer: Layer = "smoke";
  tool: Tool;
  ink: Ink = cyan;
  radius: number;
  selectedX = 0;
  selectedY = 0;
  paused: boolean;
  clean = true;
  colored = false;
  vectors = false;
  accumulator = 0;
  dropped = 0;
  updated = 0;
  revision = 0;
  clockRevision = 0;
  mounted = false;
  kernelMs = 0;
  error = "";
  reference: ReturnType<typeof validate> | null = null;
  previous: Vec2 | null = null;
  down: Vec2 | null = null;
  secondary = false;
  moved = false;
  constructor(stage = 15) {
    this.stage = stage;
    if (!Number.isInteger(stage) || stage < 1 || stage > 15)
      throw new RangeError("Stage in [1,15]");
    this.scene = startingScene(stage);
    this.grid = makeScene(stage === 5 ? 8 : startingResolution(stage), this.scene, stage);
    this.parameters = parametersForStage(stage);
    this.tool = stage >= 8 ? "stir" : "paint";
    this.radius = stage >= 11 ? 6 : 2;
    this.paused = stage < 10;
    if (stage === 4 || stage === 6) this.layer = "divergence";
    if (stage === 5) this.layer = "pressure";
    if (this.scene !== "jets") {
      this.parameters.emit = false;
      this.parameters.buoyancy = 0;
    }
    this.select({ x: 0.5 - this.grid.h / 2, y: 0.5 - this.grid.h / 2 });
  }
  mount() {
    this.mounted = true;
  }
  resize() {
    this.revision++;
  }
  invalidate() {
    this.revision++;
  }
  resume() {
    if (this.stage < 10) return;
    this.paused = false;
    this.accumulator = 0;
    this.clockRevision++;
    this.revision++;
  }
  dispose() {
    this.pause();
    this.endStroke(false);
    this.mounted = false;
  }
  pause() {
    this.paused = true;
    this.accumulator = 0;
    this.clockRevision++;
    this.revision++;
  }
  toggle() {
    if (this.stage < 10) return;
    this.paused = !this.paused;
    this.accumulator = 0;
    this.clockRevision++;
    this.revision++;
  }
  rebuild(n: number, scene = this.scene) {
    this.pause();
    this.endStroke(false);
    this.scene = scene;
    this.grid = makeScene(n, scene, this.stage);
    this.updated = 0;
    this.dropped = 0;
    this.kernelMs = 0;
    this.error = "";
    this.reference = null;
    this.selectedX = n / 2;
    this.selectedY = n / 2;
    if (scene === "jacobi") {
      this.selectedX--;
      this.selectedY--;
    }
    this.revision++;
  }
  reset() {
    this.rebuild(this.grid.n);
  }
  chooseScene(scene: Scene) {
    if (scene === "jacobi" && this.stage < 5) return;
    if (this.stage < 4 && scene !== "jets" && scene !== "empty") return;
    const n =
      scene === "jacobi" ? 8 : this.grid.n === 8 ? startingResolution(this.stage) : this.grid.n;
    this.rebuild(n, scene);
    this.parameters.emit = scene === "jets";
    this.parameters.buoyancy = scene === "jets" ? 0.8 : 0;
  }
  select(point: Vec2) {
    if (!inside(point)) return;
    this.selectedX = Math.min(this.grid.n - 1, Math.floor(point.x / this.grid.h));
    this.selectedY = Math.min(this.grid.n - 1, Math.floor(point.y / this.grid.h));
    this.revision++;
  }
  cursor() {
    return { x: (this.selectedX + 0.5) * this.grid.h, y: (this.selectedY + 0.5) * this.grid.h };
  }
  moveCursor(dx: number, dy: number) {
    this.selectedX = Math.max(0, Math.min(this.grid.n - 1, this.selectedX + dx));
    this.selectedY = Math.max(0, Math.min(this.grid.n - 1, this.selectedY + dy));
    this.revision++;
  }
  paint() {
    if (this.stage < 2 || this.tool === "probe") return;
    paintDisk(this.grid, this.cursor(), this.radius, this.tool === "erase", this.ink);
    this.revision++;
  }
  impulse(delta: Vec2) {
    if (this.stage < 8) return;
    impulseAt(this.grid, this.cursor(), delta);
    this.revision++;
  }
  beginStroke(point: Vec2, secondary = false) {
    if (this.stage < 2 || !inside(point)) return;
    this.down = point;
    this.previous = point;
    this.moved = false;
    this.secondary = secondary;
    this.select(point);
    if (!secondary && (this.tool === "paint" || this.tool === "erase"))
      paintDisk(this.grid, point, this.radius, this.tool === "erase", this.ink);
  }
  moveStroke(point: Vec2 | null) {
    if (!this.down) return;
    if (!point) {
      this.previous = null;
      this.moved = true;
      return;
    }
    this.select(point);
    if (Math.hypot(point.x - this.down.x, point.y - this.down.y) > 0.004) this.moved = true;
    if (this.tool !== "probe") {
      if (!this.secondary && (this.tool === "paint" || this.tool === "erase")) {
        if (this.previous)
          paintStroke(
            this.grid,
            this.previous,
            point,
            this.radius,
            this.tool === "erase",
            this.ink,
          );
        else paintDisk(this.grid, point, this.radius, this.tool === "erase", this.ink);
      }
      if (this.stage >= 8 && this.previous && (this.tool === "stir" || this.secondary))
        stirStroke(this.grid, this.previous, point);
    }
    this.previous = point;
    this.revision++;
  }
  endStroke(click = true) {
    if (
      click &&
      this.down &&
      this.previous &&
      !this.moved &&
      !this.secondary &&
      this.tool === "stir"
    )
      paintDisk(this.grid, this.down, this.radius, false, this.ink);
    this.down = null;
    this.previous = null;
    this.revision++;
  }
  singleStep(now: () => number = () => performance.now()) {
    if (this.stage < 3) return false;
    const started = now();
    try {
      if (!step(this.grid, this.parameters, this.scene, this.stage))
        throw new RangeError("Dữ liệu hoặc tham số không hợp lệ; mô phỏng đã dừng.");
    } catch (problem) {
      this.error = problem instanceof Error ? problem.message : "Mô phỏng đã dừng vì lỗi số học.";
      this.pause();
      return false;
    }
    this.kernelMs = Math.max(0, now() - started);
    this.updated = this.grid.density.length;
    this.revision++;
    return true;
  }
  advance(elapsed: number, budgetMs = 12, now: () => number = () => performance.now()) {
    if (this.paused || !this.mounted || this.stage < 10) return;
    const plan = planSteps(this.accumulator, elapsed);
    this.accumulator = plan.remainder;
    this.dropped += plan.dropped;
    const started = now();
    let completed = 0;
    for (let i = 0; i < plan.steps; i++) {
      if (!this.singleStep(now)) break;
      completed++;
      if (now() - started >= budgetMs) break;
    }
    this.dropped += (plan.steps - completed) * fixedDt;
  }
  jacobi(restart = false) {
    if (this.stage < 5) return;
    this.pause();
    if (!this.grid.pressureReady || restart) preparePressure(this.grid, true);
    if (!restart && this.grid.iterations < 160) jacobiIteration(this.grid);
    this.revision++;
  }
  verify() {
    this.pause();
    this.reference = validate();
    this.revision++;
  }
  snapshot() {
    const g = this.grid,
      x = this.selectedX,
      y = this.selectedY,
      i = y * g.n + x;
    return {
      n: g.n,
      scene: this.scene,
      layer: this.layer,
      tool: this.tool,
      radius: this.radius,
      paused: this.paused,
      clean: this.clean,
      colored: this.colored,
      vectors: this.vectors,
      parameters: { ...this.parameters },
      tick: g.tick,
      modelTime: g.tick * fixedDt,
      dropped: this.dropped,
      updated: this.updated,
      allocated: g.density.length,
      drawn: g.density.length,
      faces: g.u.length + g.v.length,
      kernelMs: this.kernelMs,
      error: this.error,
      reference: this.reference,
      diagnostics: diagnose(g),
      divRms: rms(g.divergence),
      projection: g.projection ? { ...g.projection } : null,
      pressureReady: g.pressureReady,
      residual: g.pressureReady ? pressureResidual(g) : null,
      iterations: g.iterations,
      cell: {
        x,
        y,
        density: g.density[i],
        pressure: g.pressure[i],
        divergence: g.divergence[i],
        uL: g.u[y * (g.n + 1) + x],
        uR: g.u[y * (g.n + 1) + x + 1],
        vB: g.v[y * g.n + x],
        vT: g.v[(y + 1) * g.n + x],
      },
      jacobi: this.stage >= 5 && g.pressureReady ? inspectJacobi(g, x, y) : null,
    };
  }
}
export type Snapshot = ReturnType<FluidSession["snapshot"]>;
