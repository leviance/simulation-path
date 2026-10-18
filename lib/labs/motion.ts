export type MotionPreset = "even" | "jitter" | "stall";
export type MotionSample = { elapsed: number; frameDistance: number; timeDistance: number };
export type MotionState = MotionSample & { discarded: number; history: MotionSample[] };

export function freshMotionState(): MotionState {
  return {
    elapsed: 0,
    frameDistance: 0,
    timeDistance: 0,
    discarded: 0,
    history: [{ elapsed: 0, frameDistance: 0, timeDistance: 0 }],
  };
}

// Cùng giới hạn 0.05 giây như lab::sanitizeDeltaTime của C++.
export function sanitizeDeltaTime(dt: number): number {
  if (!Number.isFinite(dt)) return 0;
  return Math.max(0, Math.min(dt, 0.05));
}

export function advanceMotion(state: MotionState, rawDt: number): void {
  if (!Number.isFinite(rawDt) || rawDt <= 0 || state.elapsed >= 5) return;
  const usedDt = Math.min(rawDt, 5 - state.elapsed);
  state.frameDistance += 3 * (usedDt / rawDt);
  state.timeDistance += 180 * sanitizeDeltaTime(usedDt);
  state.discarded += usedDt - sanitizeDeltaTime(usedDt);
  state.elapsed += usedDt;
  if (state.elapsed >= 5 - 1e-9) state.elapsed = 5;
  state.history.push({
    elapsed: state.elapsed,
    frameDistance: state.frameDistance,
    timeDistance: state.timeDistance,
  });
}

export function createMotionTimeline(fps: number, preset: MotionPreset): number[] {
  if (!Number.isInteger(fps) || fps < 15 || fps > 120) {
    throw new RangeError("FPS must be an integer from 15 to 120");
  }
  const timeline: number[] = [];
  let elapsed = 0;
  while (elapsed < 5 - 1e-9) {
    let dt = 1 / fps;
    if (preset === "jitter") dt *= timeline.length % 2 === 0 ? 0.75 : 1.25;
    if (preset === "stall" && timeline.length === 0) dt = 0.2;
    timeline.push(dt);
    elapsed += Math.min(dt, 5 - elapsed);
  }
  return timeline;
}

// Dùng cùng bước cập nhật với animation, không tính tắt kết quả bằng FPS * 5.
export function simulateMotion(fps: number, preset: MotionPreset): MotionState {
  const state = freshMotionState();
  for (const dt of createMotionTimeline(fps, preset)) advanceMotion(state, dt);
  return state;
}

export function remainingFrameNs(targetFps: number, workNs: number): number {
  if (!Number.isFinite(targetFps) || targetFps <= 0) return 0;
  const targetNs = Math.floor(1_000_000_000 / targetFps);
  return Math.max(0, targetNs - Math.max(0, workNs));
}
