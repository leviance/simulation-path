export type Vec2 = { x: number; y: number };
export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  density: number;
  pressure: number;
  ax: number;
  ay: number;
};
export type Preset = "dam" | "pool" | "obstacle" | "empty";
export type Settings = { soundSpeed: number; alpha: number; gravity: number; useGrid: boolean };
export type Paddle = {
  enabled: boolean;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  radius: number;
};
export type State = {
  particles: Particle[];
  walls: Particle[];
  paddle: Paddle;
  time: number;
  dt: number;
  tick: number;
  updated: number;
  emitted: number;
  rejected: number;
  contacts: number;
  candidates: number;
};
export const width = 12.6,
  height = 7.56,
  spacing = 0.07,
  h = 1.3 * spacing,
  support = 2 * h;
export const restDensity = 1000,
  mass = restDensity * spacing * spacing,
  capacity = 12000,
  maxDt = 0.001;
export const defaultSettings: Settings = {
  soundSpeed: 20,
  alpha: 0.3,
  gravity: 9.81,
  useGrid: true,
};
export const particle = (x: number, y: number, vx = 0, vy = 0): Particle => ({
  x,
  y,
  vx,
  vy,
  density: restDensity,
  pressure: 0,
  ax: 0,
  ay: 0,
});
export function validateSettings(settings: Settings) {
  if (
    !Number.isFinite(settings.soundSpeed) ||
    settings.soundSpeed < 12 ||
    settings.soundSpeed > 40 ||
    !Number.isFinite(settings.alpha) ||
    settings.alpha < 0 ||
    settings.alpha > 1 ||
    !Number.isFinite(settings.gravity) ||
    settings.gravity < 0 ||
    settings.gravity > 12 ||
    typeof settings.useGrid !== "boolean"
  )
    throw new RangeError("c=[12,40], alpha=[0,1], gravity=[0,12]");
}
export function requireFinite(state: State) {
  if (
    state.particles.length > capacity ||
    !Number.isFinite(state.time) ||
    !Object.values(state.paddle).every((v) => typeof v === "boolean" || Number.isFinite(v))
  )
    throw new RangeError("Invalid SPH state");
  for (const p of state.particles) {
    if (
      ![p.x, p.y, p.vx, p.vy, p.density, p.pressure, p.ax, p.ay].every(Number.isFinite) ||
      p.density <= 0
    )
      throw new RangeError("Dữ liệu không hữu hạn: dừng và đặt lại, không clamp velocity");
  }
}
export function makeState(preset: Preset = "dam", count = 5000, stage = 12): State {
  if (
    ![1000, 5000, 10000].includes(count) ||
    !["dam", "pool", "obstacle", "empty"].includes(preset) ||
    !Number.isInteger(stage) ||
    stage < 0 ||
    stage > 12
  )
    throw new RangeError("Invalid count/preset/stage");
  const state: State = {
    particles: [],
    walls: [],
    paddle: {
      enabled: stage >= 11 && preset === "obstacle",
      x: 6.3,
      y: 2.2,
      targetX: 6.3,
      targetY: 2.2,
      vx: 0,
      vy: 0,
      radius: 0.63,
    },
    time: 0,
    dt: 0,
    tick: 0,
    updated: 0,
    emitted: 0,
    rejected: 0,
    contacts: 0,
    candidates: 0,
  };
  if (stage >= 1 && preset !== "empty") {
    let columns = count / 100;
    if (count === 1000) columns = 20;
    if (preset === "pool") columns = 125;
    for (let i = 0; i < count; i++)
      state.particles.push(
        particle(((i % columns) + 0.5) * spacing, (Math.floor(i / columns) + 0.5) * spacing),
      );
  }
  if (stage >= 4) {
    for (let y = -3; y < 111; y++)
      for (let x = -3; x < 183; x++)
        if (x < 0 || x >= 180 || y < 0 || y >= 108)
          state.walls.push(particle((x + 0.5) * spacing, (y + 0.5) * spacing));
  }
  return state;
}
export function samples(state: State): Particle[] {
  const result = [...state.particles, ...state.walls];
  if (state.paddle.enabled) {
    for (let layer = 0; layer < 3; layer++) {
      const radius = state.paddle.radius - (layer + 0.5) * spacing;
      const count = Math.ceil((2 * Math.PI * radius) / spacing);
      for (let k = 0; k < count; k++) {
        const angle = (2 * Math.PI * k) / count;
        result.push(
          particle(
            state.paddle.x + radius * Math.cos(angle),
            state.paddle.y + radius * Math.sin(angle),
            state.paddle.vx,
            state.paddle.vy,
          ),
        );
      }
    }
  }
  return result;
}
