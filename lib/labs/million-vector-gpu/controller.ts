import {
  makeDispatchPlan,
  oracleAt,
  validateOutput,
  vectorAt,
  type VectorOperation,
} from "../million-vector-gpu.ts";
import type { MeasurementScope } from "./scopes.ts";

export type BarrierMode = "correct" | "missing" | "wrong";
export type InjectedError =
  "none" | "roundoff" | "large" | "nan" | "infinity" | "missing" | "nan-tolerance";
export interface VectorLabState {
  mode: string;
  elementCount: number;
  localSize: number;
  operation: VectorOperation;
  scalar: number;
  selectedIndex: number;
  selectedLane: number;
  component: number;
  limitsPreset: "desktop" | "weak" | "bindings" | "capacity";
  barrierMode: BarrierMode;
  injectedError: InjectedError;
  tolerance: number;
  scope: MeasurementScope;
  paused: boolean;
  tourStep: number;
  pointer: number | null;
  viewportWidth: number;
  viewportHeight: number;
}
export type VectorLabSettings = Pick<
  VectorLabState,
  | "elementCount"
  | "localSize"
  | "operation"
  | "scalar"
  | "selectedIndex"
  | "selectedLane"
  | "component"
  | "limitsPreset"
  | "barrierMode"
  | "injectedError"
  | "tolerance"
  | "scope"
>;

export function labView(mode: string) {
  if (mode === "compute-limits") return "limits";
  if (mode === "ssbo-layout") return "layout";
  if (mode === "one-workgroup" || mode === "dispatch-tail") return "group";
  if (mode === "barrier-readback") return "barrier";
  if (mode === "gpu-timing" || mode === "vector-benchmark") return "timing";
  return "vectors";
}

function initialState(mode: string): Readonly<VectorLabState> {
  return Object.freeze({
    mode,
    elementCount: mode === "one-workgroup" || mode === "vector-workload" ? 256 : 1_000_003,
    localSize: 256,
    operation: "add",
    scalar: 1.25,
    selectedIndex: 0,
    selectedLane: 0,
    component: 0,
    limitsPreset: "desktop",
    barrierMode: "correct",
    injectedError: "none",
    tolerance: 2e-6,
    scope: "kernel",
    paused: true,
    tourStep: 0,
    pointer: null,
    viewportWidth: 760,
    viewportHeight: 340,
  });
}

export class VectorLabController {
  private state: Readonly<VectorLabState>;
  private listeners = new Set<() => void>();
  private disposed = false;
  private elapsed = 0;

  constructor(mode = "vector-gpu-final") {
    this.state = initialState(mode);
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  mount() {
    this.disposed = false;
  }
  dispose() {
    this.pause();
    this.patch({ pointer: null });
    this.disposed = true;
  }
  private patch(value: Partial<VectorLabState>) {
    if (
      this.disposed ||
      Object.entries(value).every(([key, item]) => this.state[key as keyof VectorLabState] === item)
    )
      return;
    this.state = Object.freeze({ ...this.state, ...value });
    for (const listener of this.listeners) listener();
  }
  configure(value: Partial<VectorLabSettings>) {
    const next = { ...this.state, ...value };
    if (next.mode === "one-workgroup") {
      next.elementCount = 256;
      next.localSize = 256;
    }
    makeDispatchPlan(next.elementCount, next.localSize);
    if (next.elementCount < 1) throw new RangeError("Mô hình tương tác cần N >= 1.");
    if (!["add", "axpy", "difference"].includes(next.operation))
      throw new RangeError("Operation không hợp lệ.");
    if (!Number.isFinite(next.scalar) || Math.abs(next.scalar) > 4)
      throw new RangeError("Scalar ngoài [-4,4].");
    if (!Number.isFinite(next.tolerance) || next.tolerance < 0)
      throw new RangeError("Tolerance không hợp lệ.");
    next.selectedIndex = Math.max(
      0,
      Math.min(next.elementCount - 1, Math.floor(next.selectedIndex)),
    );
    next.selectedLane = Math.max(0, Math.min(next.localSize - 1, Math.floor(next.selectedLane)));
    if (!Number.isFinite(next.selectedIndex) || !Number.isFinite(next.selectedLane))
      throw new RangeError("Index/lane không hợp lệ.");
    if (!Number.isInteger(next.component) || next.component < 0 || next.component > 3)
      throw new RangeError("Component ngoài 0…3.");
    this.elapsed = 0;
    const view = labView(next.mode);
    let tourStep = 0;
    if (view === "group" && value.selectedLane !== undefined) tourStep = next.selectedLane;
    if ((view === "vectors" || view === "layout") && value.component !== undefined)
      tourStep = next.component;
    this.patch({ ...next, tourStep, paused: true });
  }
  resize(width: number, height: number) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
      throw new RangeError("Viewport không hợp lệ.");
    this.patch({ viewportWidth: width, viewportHeight: height });
  }
  pause = () => {
    this.elapsed = 0;
    this.patch({ paused: true });
  };
  resume() {
    if (this.state.tourStep >= this.lastStep())
      this.patch({ tourStep: 0, selectedLane: 0, component: 0 });
    this.elapsed = 0;
    this.patch({ paused: false });
  }
  reset() {
    const { mode, viewportWidth, viewportHeight } = this.state;
    this.elapsed = 0;
    this.patch({ ...initialState(mode), viewportWidth, viewportHeight });
  }
  lastStep() {
    const view = labView(this.state.mode);
    if (view === "group") return this.state.localSize - 1;
    if (view === "limits") return 5;
    if (view === "barrier" || view === "timing") return 6;
    return 3;
  }
  step() {
    const tourStep = Math.min(this.lastStep(), this.state.tourStep + 1);
    const view = labView(this.state.mode);
    this.patch({
      tourStep,
      paused: tourStep >= this.lastStep() || this.state.paused,
      ...(view === "group" ? { selectedLane: tourStep } : {}),
      ...(view === "vectors" || view === "layout" ? { component: tourStep } : {}),
    });
  }
  tick(milliseconds: number) {
    if (this.state.paused || this.disposed || !Number.isFinite(milliseconds) || milliseconds < 0)
      return;
    this.elapsed += Math.min(milliseconds, 500);
    if (this.elapsed >= 450) {
      this.elapsed = 0;
      this.step();
    }
  }
  beginPointer(pointer: number, primary: boolean, button: number) {
    if (this.disposed || !primary || button !== 0 || this.state.pointer !== null) return false;
    this.pause();
    this.patch({ pointer });
    return true;
  }
  endPointer(pointer: number) {
    if (pointer !== this.state.pointer) return false;
    this.patch({ pointer: null });
    return true;
  }
  selectPoint(pointer: number, x: number, y: number) {
    if (pointer !== this.state.pointer || !Number.isFinite(x) || !Number.isFinite(y)) return;
    const view = labView(this.state.mode);
    if (view === "group") {
      const grid = workgroupGrid(this.state);
      const column = Math.floor((x - grid.left) / grid.cell);
      const row = Math.floor((y - grid.top) / grid.cell);
      const lane = row * grid.columns + column;
      if (
        column >= 0 &&
        column < grid.columns &&
        row >= 0 &&
        row < grid.rows &&
        lane < this.state.localSize
      ) {
        this.patch({ selectedLane: lane, tourStep: lane });
      }
    } else if (view === "vectors" || view === "layout") {
      const fraction = Math.max(
        0,
        Math.min(1, (x - 30) / Math.max(1, this.state.viewportWidth - 60)),
      );
      this.patch({ selectedIndex: Math.round(fraction * (this.state.elementCount - 1)) });
    }
  }
}

export function workgroupGrid(state: Readonly<VectorLabState>) {
  const columns = Math.ceil(Math.sqrt(state.localSize));
  const rows = Math.ceil(state.localSize / columns);
  const cell = Math.min(
    24,
    (state.viewportWidth - 60) / columns,
    (state.viewportHeight - 95) / rows,
  );
  return { columns, rows, cell, left: (state.viewportWidth - columns * cell) / 2, top: 44 };
}

export function probeData(state: Readonly<VectorLabState>) {
  const a = vectorAt(state.selectedIndex, "a");
  const b = vectorAt(state.selectedIndex, "b");
  const expected = oracleAt(state.selectedIndex, state.operation, state.scalar);
  const actual = { ...expected };
  const channel = (["x", "y", "z", "w"] as const)[state.component];
  if (state.injectedError === "roundoff") actual[channel] = Math.fround(actual[channel] + 1e-7);
  if (state.injectedError === "large") actual[channel] = Math.fround(actual[channel] + 0.01);
  if (state.injectedError === "nan") actual[channel] = NaN;
  if (state.injectedError === "infinity") actual[channel] = Infinity;
  const tolerance = state.injectedError === "nan-tolerance" ? NaN : state.tolerance;
  const report = validateOutput(
    [expected],
    state.injectedError === "missing" ? [] : [actual],
    tolerance,
    tolerance,
  );
  return { a, b, expected, actual, report };
}
