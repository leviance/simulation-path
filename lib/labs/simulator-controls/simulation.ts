export const fixedDt = 1 / 120;
export const ballRadius = 14;
export const floorY = 460;
export type Model = {
  y: number;
  velocity: number;
  gravity: number;
  accumulator: number;
  ticks: number;
  paused: boolean;
  clockRevision: number;
  scenePresses: number;
};
export function createModel(): Model {
  return {
    y: 90,
    velocity: 0,
    gravity: 480,
    accumulator: 0,
    ticks: 0,
    paused: true,
    clockRevision: 0,
    scenePresses: 0,
  };
}
export function stepPhysics(model: Model) {
  model.velocity += model.gravity * fixedDt;
  model.y += model.velocity * fixedDt;
  if (model.y < 48) {
    model.y = 48;
    model.velocity = Math.abs(model.velocity) * 0.72;
  }
  if (model.y > floorY - ballRadius) {
    model.y = floorY - ballRadius;
    model.velocity = -model.velocity * 0.72;
    if (Math.abs(model.velocity) < 8) model.velocity = 0;
  }
  model.ticks++;
}
export function advance(model: Model, elapsed: number) {
  if (model.paused) {
    model.accumulator = 0;
    return 0;
  }
  if (!Number.isFinite(elapsed) || elapsed < 0) return 0;
  model.accumulator += Math.min(elapsed, 0.1);
  let count = 0;
  while (count < 12 && model.accumulator + 1e-12 >= fixedDt) {
    stepPhysics(model);
    model.accumulator = Math.max(0, model.accumulator - fixedDt);
    count++;
  }
  return count;
}
export function setPaused(model: Model, paused: boolean) {
  if (model.paused === paused) return;
  model.paused = paused;
  model.accumulator = 0;
  model.clockRevision++;
}
export function resetSimulation(model: Model) {
  model.y = 90;
  model.velocity = 0;
  model.accumulator = 0;
  model.ticks = 0;
  model.scenePresses = 0;
  model.clockRevision++;
}
export function setGravity(model: Model, value: number) {
  if (Number.isFinite(value)) model.gravity = Math.max(0, Math.min(1200, value));
}
