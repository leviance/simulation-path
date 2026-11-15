import {
  h,
  maxDt,
  requireFinite,
  validateSettings,
  defaultSettings,
  type State,
  type Settings,
} from "./model.ts";
import { buildNeighbors } from "./neighbors.ts";
import { computeDensity, computePressure, computeForces } from "./forces.ts";
import { integrate, movePaddle } from "./boundary.ts";
export function chooseDt(state: State, settings: Settings) {
  validateSettings(settings);
  requireFinite(state);
  let maximumSpeed = 0,
    maximumAcceleration = 0;
  for (const p of state.particles) {
    maximumSpeed = Math.max(maximumSpeed, Math.hypot(p.vx, p.vy));
    maximumAcceleration = Math.max(maximumAcceleration, Math.hypot(p.ax, p.ay));
  }
  const acoustic = (0.25 * h) / (settings.soundSpeed + maximumSpeed + 3),
    forceBound = 0.25 * Math.sqrt(h / Math.max(maximumAcceleration, 1e-12));
  const dt = Math.min(maxDt, acoustic, forceBound);
  if (!Number.isFinite(dt) || dt < 1e-7)
    throw new RangeError("dt nhỏ hơn 1e-7 s: giảm lực hoặc đặt lại");
  return dt;
}
export function inspectCurrent(state: State, settings: Settings = defaultSettings, stage = 12) {
  validateSettings(settings);
  requireFinite(state);
  if (stage >= 4) {
    const search = buildNeighbors(state, stage >= 7 && settings.useGrid);
    computeDensity(state, search);
    state.candidates = search.candidates;
    if (stage >= 5) computePressure(state, settings);
  }
  requireFinite(state);
}
export function step(state: State, settings: Settings = defaultSettings, stage = 12) {
  validateSettings(settings);
  requireFinite(state);
  if (stage < 2) return;
  for (const p of state.particles) {
    p.ax = 0;
    p.ay = -settings.gravity;
  }
  if (stage >= 4) {
    const search = buildNeighbors(state, stage >= 7 && settings.useGrid);
    computeDensity(state, search);
    state.candidates = search.candidates;
    if (stage >= 5) {
      computePressure(state, settings);
      computeForces(state, search, settings, stage);
    }
  }
  requireFinite(state);
  let dt = 0.00025;
  if (stage < 5) dt = 0.01;
  if (stage >= 8) dt = chooseDt(state, settings);
  if (stage >= 11) movePaddle(state, dt);
  integrate(state, dt, stage);
  requireFinite(state);
}
