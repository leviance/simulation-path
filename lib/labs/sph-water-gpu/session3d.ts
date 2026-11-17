import {
  makeFluid,
  initialParameters,
  type FluidPreset,
  type FluidParameters,
  type FluidState,
  type Vec3,
  tank,
  validateParameters,
} from "./state.ts";
import { FluidSolver } from "./fluid-solver.ts";

// Mutable simulation data lives outside React state; the UI observes a version number.
export class WaterSession {
  state: FluidState;
  solver: FluidSolver;
  parameters: FluidParameters = { ...initialParameters };
  paused = true;
  error = "";
  solveMs = 0;
  version = 0;
  private readonly listeners = new Set<() => void>();
  side: number;
  preset: FluidPreset;
  constructor(side = 12, preset: FluidPreset = "dam") {
    this.side = side;
    this.preset = preset;
    this.state = makeFluid(side, preset);
    this.solver = new FluidSolver(this.state);
    this.solver.evaluate(this.state, this.parameters);
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  snapshot = () => this.version;
  notify() {
    this.version++;
    for (const listener of this.listeners) listener();
  }
  pause() {
    if (!this.paused) {
      this.paused = true;
      this.notify();
    }
  }
  play() {
    if (!this.error && this.paused) {
      this.paused = false;
      this.notify();
    }
  }
  reset(side = this.side, preset = this.preset) {
    this.paused = true;
    const state = makeFluid(side, preset);
    const solver = new FluidSolver(state);
    solver.evaluate(state, this.parameters);
    this.side = side;
    this.preset = preset;
    this.error = "";
    this.state = state;
    this.solver = solver;
    this.notify();
  }
  configure(patch: Partial<FluidParameters>) {
    this.pause();
    const candidate = { ...this.parameters, ...patch };
    validateParameters(candidate);
    this.parameters = candidate;
    this.solver.evaluate(this.state, this.parameters);
    this.notify();
  }
  step(maxSteps = 1, budgetMs = 12) {
    if (this.error) return;
    if (
      !Number.isInteger(maxSteps) ||
      maxSteps < 1 ||
      maxSteps > 4 ||
      !Number.isFinite(budgetMs) ||
      budgetMs < 0.5 ||
      budgetMs > 20
    )
      throw new RangeError("Mỗi batch Canvas có 1–4 bước và ngân sách 0,5–20 ms");
    const start = performance.now();
    try {
      for (let i = 0; i < maxSteps; i++) {
        this.solver.step(this.state, this.parameters);
        if (performance.now() - start >= budgetMs) break;
      }
    } catch (error) {
      this.paused = true;
      this.error = String(error);
    }
    this.solveMs = performance.now() - start;
    this.notify();
  }
  target(point: Vec3) {
    if (this.preset !== "obstacle" || point.some((v) => !Number.isFinite(v))) return;
    const r = this.state.paddle.radius + this.state.spacing;
    this.state.paddle.target = [
      Math.max(r, Math.min(tank[0] - r, point[0])),
      0.22,
      Math.max(r, Math.min(tank[2] - r, point[2])),
    ];
    this.notify();
  }
  dispose() {
    this.paused = true;
    this.listeners.clear();
  }
}
