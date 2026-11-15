import { restDensity, mass, spacing, width, height, type State } from "./model.ts";
export function measure(state: State) {
  const ratios = state.particles.map((p) => p.density / restDensity).sort((a, b) => a - b);
  let maxSpeed = 0,
    kinetic = 0,
    leaked = 0;
  for (const p of state.particles) {
    maxSpeed = Math.max(maxSpeed, Math.hypot(p.vx, p.vy));
    kinetic += 0.5 * mass * (p.vx * p.vx + p.vy * p.vy);
    if (
      p.x < spacing / 2 - 1e-9 ||
      p.x > width - spacing / 2 + 1e-9 ||
      p.y < spacing / 2 - 1e-9 ||
      p.y > height - spacing / 2 + 1e-9
    )
      leaked++;
  }
  return {
    minimum: ratios[0] ?? 0,
    median: ratios[Math.floor(ratios.length / 2)] ?? 0,
    maximum: ratios.at(-1) ?? 0,
    p95Compression: Math.max(0, (ratios[Math.floor(0.95 * (ratios.length - 1))] ?? 0) - 1),
    maxSpeed,
    kinetic,
    leaked,
  };
}
