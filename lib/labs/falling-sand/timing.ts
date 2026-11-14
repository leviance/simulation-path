export const TICK_SECONDS = 1 / 30;
export const speeds = [0.25, 0.5, 1, 2, 4] as const;

export function planSteps(accumulator: number, elapsed: number, speed = 1) {
  if (!Number.isFinite(accumulator) || accumulator < 0 || accumulator >= TICK_SECONDS)
    accumulator = 0;
  if (!Number.isFinite(elapsed) || elapsed < 0) elapsed = 0;
  if (!Number.isFinite(speed)) speed = 1;
  speed = Math.max(0.25, Math.min(4, speed));
  const accepted = Math.min(elapsed, 0.25);
  const total = accumulator + accepted * speed;
  const due = Math.floor((total + 1e-9) / TICK_SECONDS);
  const steps = Math.min(due, 4);
  return {
    steps,
    remainder: Math.max(0, Math.min(TICK_SECONDS - 1e-12, total - due * TICK_SECONDS)),
    dropped: (elapsed - accepted) * speed + (due - steps) * TICK_SECONDS,
  };
}
