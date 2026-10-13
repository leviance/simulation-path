export type Vec2 = { x: number; y: number };
export type Particle = { position: Vec2; velocity: Vec2; density: number; pressure: number };
export type State = {
  particles: Particle[];
  walls: Vec2[];
  time: number;
  emitted: number;
  rejected: number;
};
export type Preset = "dam" | "pool" | "pair" | "empty";
export const spacing = 0.045;
export const h = 1.3 * spacing;
export const support = 2 * h;
export const restDensity = 1000;
export const mass = restDensity * spacing * spacing;
export const capacity = 384;
export const maxDt = 0.001;
export const defaultSettings = { soundSpeed: 12, alpha: 0.15, gravity: 9.81, useGrid: true };
export type Settings = typeof defaultSettings;
export const subtract = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const dot = (a: Vec2, b: Vec2) => a.x * b.x + a.y * b.y;
export const length = (a: Vec2) => Math.hypot(a.x, a.y);

export function particle(position: Vec2, velocity: Vec2 = { x: 0, y: 0 }): Particle {
  return {
    position: { ...position },
    velocity: { ...velocity },
    density: restDensity,
    pressure: 0,
  };
}
export function makeState(preset: Preset = "dam", stage = 10): State {
  const state: State = { particles: [], walls: [], time: 0, emitted: 0, rejected: 0 };
  if (preset === "pair") {
    state.particles = [
      particle({ x: 0.47, y: 0.4 }, { x: 0.3, y: 0 }),
      particle({ x: 0.53, y: 0.4 }, { x: -0.3, y: 0 }),
    ];
  } else if (preset !== "empty") {
    const columns = preset === "pool" ? 20 : 8;
    const rows = preset === "pool" ? 5 : 12;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        state.particles.push(
          particle({ x: spacing / 2 + x * spacing, y: spacing / 2 + y * spacing }),
        );
      }
    }
  }
  if (stage >= 4) {
    // Sample walls outside the fluid domain. There is deliberately no lid.
    for (let y = -3; y <= 18; y++) {
      for (let x = -3; x <= 24; x++) {
        const position = { x: spacing / 2 + x * spacing, y: spacing / 2 + y * spacing };
        if (position.y < 0 || position.x < 0 || position.x > 1) state.walls.push(position);
      }
    }
  }
  return state;
}
export function validateSettings(settings: Settings) {
  if (
    !Number.isFinite(settings.soundSpeed) ||
    settings.soundSpeed < 8 ||
    settings.soundSpeed > 20 ||
    !Number.isFinite(settings.alpha) ||
    settings.alpha < 0 ||
    settings.alpha > 0.3 ||
    !Number.isFinite(settings.gravity) ||
    settings.gravity < 0 ||
    settings.gravity > 9.81
  ) {
    throw new RangeError("SPH parameters outside the teaching range");
  }
}
export function finiteState(state: State) {
  return (
    state.particles.length <= capacity &&
    state.particles.every(
      (p) =>
        [p.position.x, p.position.y, p.velocity.x, p.velocity.y, p.density, p.pressure].every(
          Number.isFinite,
        ) && p.density > 0,
    )
  );
}
