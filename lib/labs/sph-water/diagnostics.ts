import { gradient, kernel } from "./kernel.ts";
import { buildNeighbors } from "./neighbors.ts";
import {
  defaultSettings,
  finiteState,
  h,
  length,
  makeState,
  mass,
  restDensity,
  type State,
} from "./model.ts";
import { accelerations, computeDensity, computePressure, step } from "./solver.ts";

export function measure(state: State) {
  let momentumX = 0,
    momentumY = 0,
    energy = 0,
    maxCompression = 0;
  for (const p of state.particles) {
    momentumX += mass * p.velocity.x;
    momentumY += mass * p.velocity.y;
    energy += 0.5 * mass * length(p.velocity) ** 2;
    maxCompression = Math.max(maxCompression, p.density / restDensity - 1);
  }
  return { mass: state.particles.length * mass, momentumX, momentumY, energy, maxCompression };
}
export function validateWater() {
  const results: { label: string; pass: boolean; value: number }[] = [];
  let integral = 0;
  const bins = 2000,
    dr = (2 * h) / bins;
  for (let k = 0; k < bins; k++) {
    const r = (k + 0.5) * dr;
    integral += 2 * Math.PI * r * kernel(r) * dr;
  }
  results.push({
    label: "Kernel 2D: integral≈1",
    pass: Math.abs(integral - 1) < 1e-6,
    value: integral,
  });
  const state = makeState("dam");
  const brute = buildNeighbors(state, false),
    grid = buildNeighbors(state, true);
  const matching = grid.lists.every((list, i) => list.join(",") === brute.lists[i].join(","));
  results.push({
    label: "Grid = all-pairs",
    pass: matching,
    value: grid.candidates / brute.candidates,
  });
  const pair = makeState("pair");
  pair.walls = [];
  pair.particles.forEach((p) => {
    p.density = 1100;
    p.pressure = 14400;
  });
  const a = accelerations(pair, buildNeighbors(pair, false), { ...defaultSettings, gravity: 0 }, 6);
  const residual = Math.hypot(a[0].x + a[1].x, a[0].y + a[1].y);
  results.push({ label: "Internal pair: net force≈0", pass: residual < 1e-10, value: residual });
  const finite = makeState("dam");
  for (let i = 0; i < 300; i++) step(finite);
  results.push({
    label: "Dam: 300 finite steps",
    pass:
      finiteState(finite) &&
      finite.particles.every(
        (p) => p.position.x >= 0 && p.position.x <= 1 && p.position.y >= 0 && p.position.y <= 0.8,
      ),
    value: measure(finite).maxCompression,
  });
  const d = { x: 0.03, y: 0.02 },
    epsilon = 1e-6;
  const difference =
    (kernel(length({ x: d.x + epsilon, y: d.y })) - kernel(length({ x: d.x - epsilon, y: d.y }))) /
    (2 * epsilon);
  results.push({
    label: "Gradient: finite difference",
    pass: Math.abs(difference - gradient(d).x) < 1e-4,
    value: Math.abs(difference - gradient(d).x),
  });
  computeDensity(state, grid);
  computePressure(state, defaultSettings.soundSpeed);
  // No density correction is used to make this diagnostic look better.
  return results;
}
