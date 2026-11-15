export type Vec2 = { x: number; y: number };
export type Ink = { r: number; g: number; b: number };
export type Scene = "jets" | "vortex" | "compression" | "empty" | "jacobi";
export type Layer = "smoke" | "velocity" | "pressure" | "divergence";
export type Method = "jacobi" | "cg" | "pcg";
export type Tool = "stir" | "paint" | "erase" | "probe";
export const fixedDt = 1 / 60;
export const cyan: Ink = { r: 0.15, g: 0.78, b: 1 };
export const amber: Ink = { r: 1, g: 0.36, b: 0.1 };
export const white: Ink = { r: 0.93, g: 0.96, b: 1 };
export interface Parameters {
  viscosity: number;
  buoyancy: number;
  emit: boolean;
  highOrder: boolean;
  confinement: number;
  method: Method;
  pressureBudget: number;
}
export interface Projection {
  before: number;
  after: number;
  residual: number;
  target: number;
  iterations: number;
  available: boolean;
  converged: boolean;
  method: Method;
  budget: number;
}
export interface Level {
  n: number;
  value: Float64Array;
  rhs: Float64Array;
  residual: Float64Array;
}
export interface Grid {
  n: number;
  h: number;
  density: Float64Array;
  densityNext: Float64Array;
  u: Float64Array;
  uNext: Float64Array;
  v: Float64Array;
  vNext: Float64Array;
  divergence: Float64Array;
  pressure: Float64Array;
  pressureNext: Float64Array;
  rhs: Float64Array;
  pressureReady: boolean;
  iterations: number;
  pigment: [Float64Array, Float64Array, Float64Array];
  pigmentNext: [Float64Array, Float64Array, Float64Array];
  residualWork: Float64Array;
  direction: Float64Array;
  matrixDirection: Float64Array;
  preconditioned: Float64Array;
  scalarForward: Float64Array;
  scalarBackward: Float64Array;
  forwardOrigin: Float64Array;
  backwardOrigin: Float64Array;
  curl: Float64Array;
  forceX: Float64Array;
  forceY: Float64Array;
  hierarchy: Level[];
  projection: Projection | null;
  tick: number;
}
export function parametersForStage(stage = 15): Parameters {
  const method = stage >= 14 ? "pcg" : stage >= 11 ? "cg" : "jacobi";
  return {
    viscosity: 0,
    buoyancy: 0.8,
    emit: true,
    highOrder: stage >= 12,
    confinement: stage >= 13 ? 8 : 0,
    method,
    pressureBudget: method === "jacobi" ? 160 : 384,
  };
}
export const startingResolution = (stage = 15) => (stage >= 11 ? 128 : 32);
export function startingScene(stage: number): Scene {
  if (stage === 4 || stage === 6) return "compression";
  if (stage === 5) return "jacobi";
  if (stage === 7 || stage === 9) return "vortex";
  return "jets";
}
export function inside(p: Vec2) {
  return (
    Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1
  );
}
export function finiteState(grid: Grid) {
  for (const values of [grid.density, grid.u, grid.v, grid.pressure, ...grid.pigment])
    for (const value of values) if (!Number.isFinite(value)) return false;
  return true;
}
export function makeGrid(n = 128): Grid {
  if (!Number.isInteger(n) || n < 8 || n > 256 || (n & (n - 1)) !== 0)
    throw new RangeError("Resolution must be a power of two in [8,256]");
  const scalar = () => new Float64Array(n * n);
  const u = () => new Float64Array((n + 1) * n);
  const v = () => new Float64Array(n * (n + 1));
  const hierarchy: Level[] = [];
  for (let size = n; size >= 4; size /= 2)
    hierarchy.push({
      n: size,
      value: new Float64Array(size * size),
      rhs: new Float64Array(size * size),
      residual: new Float64Array(size * size),
    });
  return {
    n,
    h: 1 / n,
    density: scalar(),
    densityNext: scalar(),
    u: u(),
    uNext: u(),
    v: v(),
    vNext: v(),
    divergence: scalar(),
    pressure: scalar(),
    pressureNext: scalar(),
    rhs: scalar(),
    pressureReady: false,
    iterations: 0,
    pigment: [scalar(), scalar(), scalar()],
    pigmentNext: [scalar(), scalar(), scalar()],
    residualWork: scalar(),
    direction: scalar(),
    matrixDirection: scalar(),
    preconditioned: scalar(),
    scalarForward: scalar(),
    scalarBackward: scalar(),
    forwardOrigin: new Float64Array(2 * n * n),
    backwardOrigin: new Float64Array(2 * n * n),
    curl: scalar(),
    forceX: scalar(),
    forceY: scalar(),
    hierarchy,
    projection: null,
    tick: 0,
  };
}
