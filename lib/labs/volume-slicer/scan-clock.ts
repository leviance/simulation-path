// Limit image refreshes, not simulated elapsed time. Blur already pauses the scan.
export function createScanClock(start: number) {
  let previous = start;
  let pending = 0;
  return (now: number) => {
    pending += Math.max(0, now - previous) / 1000;
    previous = now;
    if (pending < 0.1) return 0;
    // Discard only a genuine long stall, not ordinary 100–117 ms refresh intervals.
    const elapsed = Math.min(0.25, pending);
    pending = 0;
    return elapsed;
  };
}
