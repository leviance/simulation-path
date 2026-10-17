export type PlaybackClock = { previous: number | null; elapsed: number };

export function createPlaybackClock(): PlaybackClock {
  return { previous: null, elapsed: 0 };
}

// Match native Stepper: at most one rectangle, no catch-up after a long frame.
export function playbackDue(clock: PlaybackClock, now: number) {
  if (!Number.isFinite(now)) return false;
  if (clock.previous === null) {
    clock.previous = now;
    return false;
  }
  if (now < clock.previous) return false;
  clock.elapsed += Math.min(0.1, (now - clock.previous) / 1000);
  clock.previous = now;
  if (clock.elapsed + 1e-12 < 0.15) return false;
  clock.elapsed = 0;
  return true;
}
