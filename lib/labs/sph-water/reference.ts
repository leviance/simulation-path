import { spacing, support, mass, makeState, particle, defaultSettings } from "./model.ts";
import { kernel } from "./kernel.ts";
import { buildNeighbors } from "./neighbors.ts";
import { computeDensity, computePressure, computeForces } from "./forces.ts";
import { step } from "./solver.ts";
export function validateReference() {
  let integral = 0,
    gridError = 0,
    forceError = 0,
    equilibriumDrift = 0;
  const dr = support / 10000;
  for (let i = 0; i < 10000; i++) {
    const r = (i + 0.5) * dr;
    integral += 2 * Math.PI * r * kernel(r) * dr;
  }
  const fixture = makeState("empty");
  fixture.walls = [];
  for (let y = 0; y < 10; y++)
    for (let x = 0; x < 10; x++)
      fixture.particles.push(particle(2 + (x + 0.5) * spacing, 2 + (y + 0.5) * spacing));
  const slow = structuredClone(fixture),
    settings = { ...defaultSettings, gravity: 0 },
    grid = buildNeighbors(fixture, true),
    all = buildNeighbors(fixture, false);
  computeDensity(fixture, grid);
  computeDensity(slow, all);
  computePressure(fixture, settings);
  computePressure(slow, settings);
  computeForces(fixture, grid, settings);
  computeForces(slow, all, settings);
  let netX = 0,
    netY = 0;
  for (let i = 0; i < fixture.particles.length; i++) {
    const a = fixture.particles[i],
      b = slow.particles[i];
    gridError = Math.max(
      gridError,
      Math.abs(a.density - b.density),
      Math.abs(a.ax - b.ax),
      Math.abs(a.ay - b.ay),
    );
    netX += mass * a.ax;
    netY += mass * a.ay;
  }
  forceError = Math.hypot(netX, netY);
  const initial = fixture.particles.map((p) => ({ x: p.x, y: p.y }));
  for (let i = 0; i < 50; i++) step(fixture, settings);
  for (let i = 0; i < initial.length; i++)
    equilibriumDrift = Math.max(
      equilibriumDrift,
      Math.hypot(fixture.particles[i].x - initial[i].x, fixture.particles[i].y - initial[i].y),
    );
  const passed =
    Math.abs(integral - 1) < 1e-6 &&
    gridError < 1e-10 &&
    forceError < 1e-8 &&
    equilibriumDrift < 1e-4 &&
    JSON.stringify(grid.lists) === JSON.stringify(all.lists);
  return { passed, integral, gridError, forceError, equilibriumDrift };
}
