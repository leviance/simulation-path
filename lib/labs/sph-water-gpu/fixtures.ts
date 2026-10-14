import { makeParticles, type Particle, type Plan } from "./model.ts";

export type ForcePreset = "lattice" | "compressed" | "approaching" | "separating";

// Small, deterministic scenes isolate pressure from artificial viscosity.
export function forceFixture(plan: Plan, preset: ForcePreset): Particle[] {
  if (preset === "approaching" || preset === "separating") {
    const speed = preset === "approaching" ? 0.6 : -0.6;
    return [
      { position: { x: 0.45, y: 0.5, z: 0.5 }, velocity: { x: speed, y: 0, z: 0 } },
      { position: { x: 0.55, y: 0.5, z: 0.5 }, velocity: { x: -speed, y: 0, z: 0 } },
    ];
  }
  const particles = makeParticles(plan);
  if (preset === "compressed") {
    // Compress about the original block centre, keeping mass and h unchanged.
    const centre = { x: 0.28, y: 0.32, z: 0.5 };
    for (const particle of particles) {
      for (const axis of ["x", "y", "z"] as const) {
        particle.position[axis] = centre[axis] + 0.65 * (particle.position[axis] - centre[axis]);
      }
    }
  }
  return particles;
}
