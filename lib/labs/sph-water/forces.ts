import { mass, restDensity, type State, type Settings } from "./model.ts";
import { kernel, gradient, artificialViscosity } from "./kernel.ts";
import type { Search } from "./neighbors.ts";
export function computeDensity(state: State, search: Search) {
  for (let i = 0; i < state.particles.length; i++) {
    let density = 0;
    for (const j of search.lists[i]) {
      const dx = state.particles[i].x - search.samples[j].x,
        dy = state.particles[i].y - search.samples[j].y;
      density += mass * kernel(Math.sqrt(dx * dx + dy * dy));
    }
    state.particles[i].density = density;
  }
}
export function pressure(density: number, soundSpeed: number) {
  return Math.max(0, soundSpeed * soundSpeed * (density - restDensity));
}
export function computePressure(state: State, settings: Settings) {
  for (const p of state.particles) p.pressure = pressure(p.density, settings.soundSpeed);
}
export function computeForces(state: State, search: Search, settings: Settings, stage = 12) {
  const count = state.particles.length;
  for (let i = 0; i < count; i++) {
    const p = state.particles[i];
    p.ax = 0;
    p.ay = -settings.gravity;
    for (const j of search.lists[i]) {
      if (j === i) continue;
      const point = search.samples[j];
      let densityB = restDensity,
        pressureB = p.pressure;
      if (j < count) {
        densityB = state.particles[j].density;
        pressureB = state.particles[j].pressure;
      }
      const dx = p.x - point.x,
        dy = p.y - point.y,
        grad = gradient(dx, dy);
      let coefficient = p.pressure / (p.density * p.density) + pressureB / (densityB * densityB);
      if (stage >= 6)
        coefficient += artificialViscosity(
          dx,
          dy,
          p.vx - point.vx,
          p.vy - point.vy,
          p.density,
          densityB,
          settings,
        );
      p.ax -= mass * coefficient * grad.x;
      p.ay -= mass * coefficient * grad.y;
    }
  }
}
