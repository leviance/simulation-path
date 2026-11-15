export function planSteps(accumulator: number, elapsed: number, dt: number, speed = 1) {
  const idle = { steps: 0, remainder: 0, dropped: 0 };
  if (![dt, elapsed, speed].every(Number.isFinite) || dt <= 0 || elapsed < 0 || speed <= 0)
    return idle;
  speed = Math.max(0.25, Math.min(4, speed));
  if (!Number.isFinite(elapsed * speed)) return idle;
  if (!Number.isFinite(accumulator) || accumulator < 0 || accumulator >= dt) accumulator = 0;
  const accepted = Math.min(elapsed, 0.25);
  const total = accumulator + accepted * speed;
  if (!Number.isFinite(total)) return idle;
  const ratio = total / dt;
  if (!Number.isFinite(ratio)) {
    const remainder = total % dt;
    return {
      steps: 8,
      remainder,
      dropped: (elapsed - accepted) * speed + total - 8 * dt - remainder,
    };
  }
  const due = Math.floor(ratio + 1e-9);
  const steps = Math.min(due, 8);
  const remainder = Math.max(0, Math.min(dt * (1 - Number.EPSILON), total - due * dt));
  return { steps, remainder, dropped: (elapsed - accepted) * speed + (due - steps) * dt };
}
